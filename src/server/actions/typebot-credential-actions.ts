"use server";

import { revalidatePath } from "next/cache";

import { createAuditLog } from "@/features/audit/audit-log-service";
import { requireSuperAdmin } from "@/features/auth/permissions";
import { getRequestIpAddress } from "@/features/auth/request-context";
import {
  createTypebotCredential,
  listTypebotCredentials,
  revokeTypebotCredential,
  type CreatedCredential,
  type CredentialSummary,
} from "@/features/typebot/typebot-credentials-service";
import { getTypebotHealth, type TypebotHealth } from "@/features/typebot/typebot-health-service";
// ---------------------------------------------------------------------------
// List credentials
// ---------------------------------------------------------------------------

export async function loadTypebotCredentials(
  tenantId: string,
): Promise<CredentialSummary[]> {
  await requireSuperAdmin();
  return listTypebotCredentials(tenantId);
}

// ---------------------------------------------------------------------------
// Generate credential
// ---------------------------------------------------------------------------

export type GenerateResult = {
  ok: boolean;
  credential?: CreatedCredential;
  error?: string;
};

export async function generateTypebotCredentialAction(
  tenantId: string,
  tenantName: string,
  name: string,
): Promise<GenerateResult> {
  const user = await requireSuperAdmin();

  try {
    const credential = await createTypebotCredential({
      tenantId,
      name,
    });

    await createAuditLog({
      tenantId,
      actorType: "SUPER_ADMIN",
      actorId: user.id,
      eventType: "TYPEBOT_CREDENTIAL_CREATED",
      description: `Credencial Typebot "${name}" criada para o prestador ${tenantName}.`,
      metadata: {
        tenantId,
        credentialId: credential.id,
        tokenPrefix: credential.tokenPrefix,
      },
      ipAddress: await getRequestIpAddress(),
    });

    revalidatePath(`/admin/tenants/${tenantId}/typebot-credentials`);

    return { ok: true, credential };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Erro ao gerar credencial.",
    };
  }
}

// ---------------------------------------------------------------------------
// Revoke credential
// ---------------------------------------------------------------------------

export type RevokeResult = {
  ok: boolean;
  credential?: { id: string; name: string; tokenPrefix: string };
  error?: string;
};

export async function revokeTypebotCredentialAction(
  tenantId: string,
  tenantName: string,
  credentialId: string,
): Promise<RevokeResult> {
  const user = await requireSuperAdmin();

  try {
    const credential = await revokeTypebotCredential(credentialId, tenantId);

    if (!credential) {
      return { ok: false, error: "Credencial não encontrada ou já revogada." };
    }

    await createAuditLog({
      tenantId,
      actorType: "SUPER_ADMIN",
      actorId: user.id,
      eventType: "TYPEBOT_CREDENTIAL_REVOKED",
      description: `Credencial Typebot "${credential.name}" revogada para o prestador ${tenantName}.`,
      metadata: {
        tenantId,
        credentialId: credential.id,
        tokenPrefix: credential.tokenPrefix,
      },
      ipAddress: await getRequestIpAddress(),
    });

    revalidatePath(`/admin/tenants/${tenantId}/typebot-credentials`);

    return { ok: true, credential };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Erro ao revogar credencial.",
    };
  }
}

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------

export async function loadTypebotHealthStatus(
  tenantId: string,
): Promise<TypebotHealth> {
  await requireSuperAdmin();
  return getTypebotHealth(tenantId);
}
