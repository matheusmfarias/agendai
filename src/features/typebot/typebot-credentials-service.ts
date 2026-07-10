/**
 * Typebot Tenant Credentials — token generation, hashing, and validation.
 *
 * Tokens have the format: agz_tb_<random_base64url>
 * Only the SHA-256 hash is stored. The full token is returned once at generation.
 */

import { prisma } from "@/lib/prisma";
import { generateTypebotToken } from "@/features/typebot/typebot-token-utils";

// Re-export for convenience
export { generateTypebotToken, hashToken } from "@/features/typebot/typebot-token-utils";

// ---------------------------------------------------------------------------
// Create credential (stores only hash + prefix)
// ---------------------------------------------------------------------------

export type CreateCredentialInput = {
  tenantId: string;
  name: string;
};

export type CreatedCredential = {
  id: string;
  name: string;
  tokenPrefix: string;
  token: string; // only returned once — never stored
};

export async function createTypebotCredential(
  input: CreateCredentialInput,
): Promise<CreatedCredential> {
  const { token, hash, prefix } = generateTypebotToken();

  const record = await prisma.typebotCredential.create({
    data: {
      tenantId: input.tenantId,
      name: input.name,
      tokenHash: hash,
      tokenPrefix: prefix,
    },
    select: { id: true, name: true, tokenPrefix: true },
  });

  return {
    id: record.id,
    name: record.name,
    tokenPrefix: record.tokenPrefix,
    token,
  };
}

// ---------------------------------------------------------------------------
// List credentials (never returns hash/token)
// ---------------------------------------------------------------------------

export type CredentialSummary = {
  id: string;
  name: string;
  tokenPrefix: string;
  isActive: boolean;
  lastUsedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
};

export async function listTypebotCredentials(
  tenantId: string,
): Promise<CredentialSummary[]> {
  const records = await prisma.typebotCredential.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      tokenPrefix: true,
      isActive: true,
      lastUsedAt: true,
      revokedAt: true,
      createdAt: true,
    },
  });

  return records.map((r) => ({
    id: r.id,
    name: r.name,
    tokenPrefix: r.tokenPrefix,
    isActive: r.isActive,
    lastUsedAt: r.lastUsedAt?.toISOString() ?? null,
    revokedAt: r.revokedAt?.toISOString() ?? null,
    createdAt: r.createdAt.toISOString(),
  }));
}

// ---------------------------------------------------------------------------
// Revoke credential (soft delete)
// ---------------------------------------------------------------------------

export async function revokeTypebotCredential(
  credentialId: string,
  tenantId: string,
): Promise<{ id: string; name: string; tokenPrefix: string } | null> {
  const record = await prisma.typebotCredential.findFirst({
    where: { id: credentialId, tenantId },
  });

  if (!record || !record.isActive) return null;

  const updated = await prisma.typebotCredential.update({
    where: { id: credentialId },
    data: {
      isActive: false,
      revokedAt: new Date(),
    },
    select: { id: true, name: true, tokenPrefix: true },
  });

  return updated;
}

// ---------------------------------------------------------------------------
// Get active credential count for a tenant
// ---------------------------------------------------------------------------

export async function getActiveCredentialCount(tenantId: string): Promise<number> {
  return prisma.typebotCredential.count({
    where: {
      tenantId,
      isActive: true,
      revokedAt: null,
    },
  });
}
