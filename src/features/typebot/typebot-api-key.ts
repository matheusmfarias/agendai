/**
 * Typebot API authentication.
 *
 * Supports two modes:
 * 1. Per-tenant credentials (token format: agz_tb_<secret>)
 * 2. Global TYPEBOT_API_KEY fallback (only in dev or when explicitly enabled)
 *
 * Tokens are validated against typebot_credentials table by hashing the incoming
 * value and looking up the hash. The full token is never stored.
 */

import { hashToken } from "@/features/typebot/typebot-token-utils";
import { prisma } from "@/lib/prisma";

const TOKEN_PREFIX = "agz_tb_";

// ---------------------------------------------------------------------------
// Main validation entry point — used by all Typebot endpoints
// ---------------------------------------------------------------------------

export type AuthResult =
  | { ok: true; credentialId: string }
  | { ok: false; code: string };

export async function validateTypebotAuth(
  request: Request,
  tenantSlug: string,
): Promise<AuthResult> {
  const header = request.headers.get("x-typebot-api-key");

  // Must have a header
  if (!header) {
    return { ok: false, code: "UNAUTHORIZED" };
  }

  // If the header looks like a tenant credential, validate it
  if (header.startsWith(TOKEN_PREFIX)) {
    return validateTenantCredential(header, tenantSlug);
  }

  // Otherwise, try global fallback
  return validateGlobalFallback(header, tenantSlug);
}

// ---------------------------------------------------------------------------
// Tenant credential validation
// ---------------------------------------------------------------------------

async function validateTenantCredential(
  token: string,
  tenantSlug: string,
): Promise<AuthResult> {
  const hash = hashToken(token);

  const credential = await prisma.typebotCredential.findFirst({
    where: {
      tokenHash: hash,
      isActive: true,
      revokedAt: null,
    },
    include: {
      tenant: { select: { slug: true } },
    },
  });

  if (!credential) {
    return { ok: false, code: "UNAUTHORIZED" };
  }

  // Token must belong to the tenant in the URL
  if (credential.tenant.slug !== tenantSlug) {
    return { ok: false, code: "UNAUTHORIZED" };
  }

  // Update lastUsedAt (fire-and-forget)
  updateLastUsed(credential.id);

  return { ok: true, credentialId: credential.id };
}

// ---------------------------------------------------------------------------
// Global fallback validation
// ---------------------------------------------------------------------------

async function validateGlobalFallback(
  headerValue: string,
  tenantSlug: string,
): Promise<AuthResult> {
  const globalKey = process.env.TYPEBOT_API_KEY;

  // No global key configured
  if (!globalKey) {
    return { ok: false, code: "UNAUTHORIZED" };
  }

  // Check if fallback is allowed
  const isDev = process.env.NODE_ENV === "development";
  const fallbackEnabled =
    process.env.TYPEBOT_ALLOW_GLOBAL_KEY_FALLBACK === "true";

  if (!isDev && !fallbackEnabled) {
    return { ok: false, code: "UNAUTHORIZED" };
  }

  // In dev, allow if tenant has no own credentials
  if (isDev) {
    const count = await prisma.typebotCredential.count({
      where: {
        tenant: { slug: tenantSlug },
        isActive: true,
        revokedAt: null,
      },
    });

    // If tenant has own credentials, global key can't be used for it
    if (count > 0) {
      return { ok: false, code: "UNAUTHORIZED" };
    }
  }

  // Compare with global key
  if (headerValue !== globalKey) {
    return { ok: false, code: "UNAUTHORIZED" };
  }

  return { ok: true, credentialId: "global" };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function updateLastUsed(credentialId: string): void {
  prisma.typebotCredential
    .update({
      where: { id: credentialId },
      data: { lastUsedAt: new Date() },
    })
    .catch(() => {
      // best-effort — don't fail the request over lastUsedAt
    });
}

/** Legacy check — kept for backward compatibility with any non-endpoint usage */
export function isTypebotApiKeyValid(request: Request): boolean {
  const header = request.headers.get("x-typebot-api-key");
  if (!header) return false;

  const globalKey = process.env.TYPEBOT_API_KEY;
  if (globalKey && header === globalKey) return true;

  // For tenant tokens, we can't validate synchronously — this function
  // only checks the global key. Endpoints should use validateTypebotAuth.
  return false;
}

export function typebotApiKeyConfigured(): boolean {
  return Boolean(process.env.TYPEBOT_API_KEY);
}
