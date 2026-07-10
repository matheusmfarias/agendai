/**
 * In-memory rate limiter for Typebot API endpoints.
 *
 * Uses a Map with 1-minute sliding windows. Each key combines tenant slug,
 * credential ID (or IP for unauthenticated requests), and endpoint group.
 *
 * Limits:
 * - READ:  120 req/min (business, services, service-detail, slots, appointment-detail)
 * - WRITE:  30 req/min (identify, appointments)
 * - AUTH:   20 req/min (unauthenticated / failed auth)
 *
 * NOTE: This is in-memory only — does not work across multiple instances.
 * For horizontal scaling, replace with Redis or equivalent distributed store.
 */

import { typebotError, TYPEFBOT_ERROR_CODES } from "@/features/typebot/typebot-responses";
import { validateTypebotAuth } from "@/features/typebot/typebot-api-key";
import { logTypebotEvent } from "@/features/typebot/typebot-operational-log";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const READ_LIMIT = 120;
const WRITE_LIMIT = 30;
const AUTH_FAIL_LIMIT = 20;

const WINDOW_MS = 60_000;

const READ_GROUPS = new Set([
  "business",
  "services",
  "service-detail",
  "slots",
  "appointment-detail",
]);

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Periodic cleanup every 5 minutes (non-blocking)
if (typeof setInterval !== "undefined") {
  const interval = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (now >= entry.resetAt) {
        store.delete(key);
      }
    }
  }, 5 * 60_000);
  if (typeof interval === "object" && "unref" in interval) {
    interval.unref();
  }
}

// ---------------------------------------------------------------------------
// Rate limit check
// ---------------------------------------------------------------------------

export type RateLimitResult =
  | { ok: true }
  | { ok: false; retryAfter: number };

export function checkTypebotRateLimit(
  tenantSlug: string,
  endpointGroup: string,
  isAuthenticated: boolean,
  credentialId: string,
  ip: string,
): RateLimitResult {
  const now = Date.now();

  const scope = isAuthenticated
    ? `tenant:${tenantSlug}:cred:${credentialId}`
    : `tenant:${tenantSlug}:ip:${ip}`;

  const key = `${scope}:${isAuthenticated ? endpointGroup : "auth"}`;

  let limit: number;
  if (!isAuthenticated) {
    limit = AUTH_FAIL_LIMIT;
  } else if (READ_GROUPS.has(endpointGroup)) {
    limit = READ_LIMIT;
  } else {
    limit = WRITE_LIMIT;
  }

  const entry = store.get(key);

  if (!entry || now >= entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { ok: true };
  }

  if (entry.count >= limit) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return { ok: false, retryAfter };
  }

  entry.count++;
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function getClientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? request.headers.get("x-real-ip")
    ?? "unknown"
  );
}

// ---------------------------------------------------------------------------
// Guard — rate limit + auth wrapper for all Typebot endpoints
// ---------------------------------------------------------------------------

export type GuardResult =
  | { ok: true; credentialId: string }
  | { ok: false; response: Response };

export async function guardTypebotEndpoint(
  request: Request,
  tenantSlug: string,
  endpointGroup: string,
): Promise<GuardResult> {
  const ip = getClientIp(request);

  // 1. Auth-failure rate limit
  const authRateCheck = checkTypebotRateLimit(
    tenantSlug,
    "auth",
    false,
    "unauthenticated",
    ip,
  );
  if (!authRateCheck.ok) {
    void logTypebotEvent("TYPEBOT_RATE_LIMITED", {
      tenantSlug,
      endpoint: "auth",
    });
    return {
      ok: false,
      response: typebotError(
        TYPEFBOT_ERROR_CODES.RATE_LIMITED,
        "Muitas tentativas em pouco tempo. Tente novamente em instantes.",
        429,
      ),
    };
  }

  // 2. Auth
  const auth = await validateTypebotAuth(request, tenantSlug);
  if (!auth.ok) {
    void logTypebotEvent("TYPEBOT_AUTH_FAILED", { tenantSlug, endpoint: endpointGroup });
    return {
      ok: false,
      response: typebotError(
        TYPEFBOT_ERROR_CODES.UNAUTHORIZED,
        "Acesso não autorizado.",
        401,
      ),
    };
  }

  // 3. Endpoint rate limit
  const endpointCheck = checkTypebotRateLimit(
    tenantSlug,
    endpointGroup,
    true,
    auth.credentialId,
    ip,
  );
  if (!endpointCheck.ok) {
    void logTypebotEvent("TYPEBOT_RATE_LIMITED", {
      tenantSlug,
      endpoint: endpointGroup,
      credentialId: auth.credentialId,
    });
    return {
      ok: false,
      response: typebotError(
        TYPEFBOT_ERROR_CODES.RATE_LIMITED,
        "Muitas tentativas em pouco tempo. Tente novamente em instantes.",
        429,
      ),
    };
  }

  return { ok: true, credentialId: auth.credentialId };
}

// ---------------------------------------------------------------------------
// Exported constants for tests
// ---------------------------------------------------------------------------

export const RATE_LIMITS = {
  READ_LIMIT,
  WRITE_LIMIT,
  AUTH_FAIL_LIMIT,
  WINDOW_MS,
  READ_GROUPS,
} as const;
