/**
 * Safe operational logging for Typebot API events.
 *
 * Uses existing audit_log table. Fires and forgets — never throws.
 * Never logs: tokens, hashes, API key headers, cookies, or secrets.
 *
 * Events logged:
 * - TYPEBOT_RATE_LIMITED   — rate limit hit
 * - TYPEBOT_AUTH_FAILED     — invalid/revoked/wrong-tenant token
 * - TYPEBOT_BUSINESS_UNAVAILABLE — tenant not ready for Typebot
 */

import { createAuditLog } from "@/features/audit/audit-log-service";
import type { AuditActorType, Prisma } from "@/generated/prisma/client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type OperationalEvent =
  | "TYPEBOT_RATE_LIMITED"
  | "TYPEBOT_AUTH_FAILED"
  | "TYPEBOT_BUSINESS_UNAVAILABLE";

type SafeMetadata = {
  tenantSlug?: string;
  tenantId?: string | null;
  endpoint?: string;
  code?: string;
  credentialId?: string;
  tokenPrefix?: string;
  ipHash?: string;
  reason?: string;
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function logTypebotEvent(
  eventType: OperationalEvent,
  metadata: SafeMetadata,
): void {
  // Fire-and-forget — never await, never throw
  createAuditLog({
    actorType: "TYPEBOT" as AuditActorType,
    tenantId: metadata.tenantId ?? null,
    eventType,
    description: buildDescription(eventType, metadata),
    metadata: sanitizeMetadata(metadata) as Prisma.InputJsonValue,
    ipAddress: null, // never log raw IP in audit
  }).catch(() => {
    // best-effort — silently ignore logging failures
  });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildDescription(
  eventType: OperationalEvent,
  meta: SafeMetadata,
): string {
  const slug = meta.tenantSlug ? `[${meta.tenantSlug}] ` : "";

  switch (eventType) {
    case "TYPEBOT_RATE_LIMITED":
      return `${slug}Rate limit atingido — endpoint: ${meta.endpoint ?? "typebot"}.`;
    case "TYPEBOT_AUTH_FAILED":
      return `${slug}Falha de autenticação Typebot — endpoint: ${meta.endpoint ?? "typebot"}.`;
    case "TYPEBOT_BUSINESS_UNAVAILABLE":
      return `${slug}Prestador indisponível para Typebot: ${meta.reason ?? "verifique os checks"}.`;
  }
}

/**
 * Strip any sensitive fields before writing metadata to the audit log.
 * Only whitelisted fields pass through.
 */
function sanitizeMetadata(meta: SafeMetadata): Record<string, unknown> {
  const safe: Record<string, unknown> = {};
  if (meta.tenantSlug) safe.tenantSlug = meta.tenantSlug;
  if (meta.tenantId) safe.tenantId = meta.tenantId;
  if (meta.endpoint) safe.endpoint = meta.endpoint;
  if (meta.code) safe.code = meta.code;
  if (meta.credentialId) safe.credentialId = meta.credentialId;
  if (meta.tokenPrefix) safe.tokenPrefix = meta.tokenPrefix;
  if (meta.ipHash) safe.ipHash = meta.ipHash;
  if (meta.reason) safe.reason = meta.reason;
  return safe;
}
