import { createHmac } from "node:crypto";

import type { Prisma } from "@/generated/prisma/client";
import { AUDIT_EVENTS } from "@/features/audit/audit-events";
import type { WhatsAppProvider } from "@/features/whatsapp/contracts/whatsapp-provider";
import { WHATSAPP_ERROR_CODES, WhatsAppError } from "@/features/whatsapp/whatsapp-errors";
import { getWhatsAppConfig } from "@/features/whatsapp/whatsapp-config";
import { createWhatsAppProvider } from "@/features/whatsapp/whatsapp-provider-factory";
import type { WhatsAppConnectionState, WhatsAppConnectionView } from "@/features/whatsapp/whatsapp-types";
import { prisma } from "@/lib/prisma";

type Actor = { tenantId: string; userId: string };

function toView(connection: {
  id: string;
  status: WhatsAppConnectionState;
  phoneNumber: string | null;
  enabled: boolean;
  sendAppointmentConfirmation: boolean;
  sendAppointmentRequested: boolean;
  connectedAt: Date | null;
  lastHealthyAt: Date | null;
  lastErrorCode: string | null;
}): WhatsAppConnectionView {
  return {
    ...connection,
    phoneNumber: connection.phoneNumber
      ? `••••${connection.phoneNumber.slice(-4)}`
      : null,
    connectedAt: connection.connectedAt?.toISOString() ?? null,
    lastHealthyAt: connection.lastHealthyAt?.toISOString() ?? null,
  };
}

function audit(actor: Actor, eventType: string, description: string, metadata?: Prisma.InputJsonValue) {
  return {
    actorType: "TENANT_USER" as const,
    actorId: actor.userId,
    tenantId: actor.tenantId,
    eventType,
    description,
    metadata,
  };
}

export async function getWhatsAppConnection(tenantId: string) {
  const connection = await prisma.whatsAppConnection.findUnique({
    where: { tenantId },
  });
  return connection ? toView(connection) : null;
}

export async function createWhatsAppConnection(
  actor: Actor,
  provider: WhatsAppProvider = createWhatsAppProvider(),
) {
  const existing = await prisma.whatsAppConnection.findUnique({
    where: { tenantId: actor.tenantId },
  });
  if (existing) return toView(existing);

  const config = getWhatsAppConfig();
  if (!config.publicUrl || !config.webhookSecret) {
    throw new WhatsAppError(
      WHATSAPP_ERROR_CODES.PROVIDER_UNAVAILABLE,
      "Configuração do webhook ausente.",
    );
  }
  const instanceName = `agendai_${createHmac("sha256", config.webhookSecret)
    .update(actor.tenantId)
    .digest("hex")
    .slice(0, 36)}`;
  let createdRemote = true;
  const remote = await provider
    .createInstance({
      instanceName,
      webhookUrl: new URL(
        "/api/integrations/whatsapp/evolution/webhook",
        config.publicUrl,
      ).toString(),
      webhookSecret: config.webhookSecret,
    })
    .catch(async (error: unknown) => {
      if (
        error instanceof WhatsAppError &&
        error.code === WHATSAPP_ERROR_CODES.PROVIDER_CONFLICT
      ) {
        createdRemote = false;
        return provider.fetchInstanceInfo(instanceName);
      }
      throw error;
    });
  try {
    const connection = await prisma.$transaction(async (tx) => {
      const created = await tx.whatsAppConnection.create({
        data: {
          tenantId: actor.tenantId,
          provider: "EVOLUTION",
          externalId: remote.externalId,
          instanceName: remote.instanceName,
          phoneNumber: remote.phoneNumber,
          status: "CONNECTING",
        },
      });
      await tx.auditLog.create({
        data: audit(actor, AUDIT_EVENTS.WHATSAPP_CONNECTION_CREATED, "Conexão WhatsApp criada."),
      });
      return created;
    });
    return toView(connection);
  } catch (error) {
    if (createdRemote) {
      await provider.deleteInstance(remote.instanceName).catch(() => undefined);
    }
    throw error;
  }
}

export async function refreshWhatsAppConnection(
  actor: Actor,
  provider: WhatsAppProvider = createWhatsAppProvider(),
) {
  const current = await prisma.whatsAppConnection.findUnique({
    where: { tenantId: actor.tenantId },
  });
  if (!current) return null;
  let remote;
  try {
    remote = await provider.getConnectionStatus(current.instanceName);
  } catch (error) {
    const code = error instanceof WhatsAppError ? error.code : "WHATSAPP_PROVIDER_UNAVAILABLE";
    await prisma.whatsAppConnection.update({
      where: { tenantId: actor.tenantId },
      data: { status: "DEGRADED", lastErrorCode: code, lastErrorAt: new Date() },
    });
    throw error;
  }
  const now = new Date();
  const connection = await prisma.whatsAppConnection.update({
    where: { tenantId: actor.tenantId },
    data: {
      status: remote.status,
      externalId: remote.externalId ?? current.externalId,
      phoneNumber: remote.phoneNumber ?? current.phoneNumber,
      ...(remote.status === "CONNECTED"
        ? { connectedAt: current.connectedAt ?? now, lastHealthyAt: now, lastErrorCode: null }
        : {}),
    },
  });
  return toView(connection);
}

export async function getWhatsAppQrCode(
  actor: Actor,
  provider: WhatsAppProvider = createWhatsAppProvider(),
) {
  const connection = await prisma.whatsAppConnection.findUnique({
    where: { tenantId: actor.tenantId },
  });
  if (!connection) {
    throw new WhatsAppError(WHATSAPP_ERROR_CODES.INSTANCE_NOT_FOUND, "Conexão não encontrada.", false, 404);
  }
  const qr = await provider.getQrCode(connection.instanceName);
  if (!qr.base64.startsWith("data:image/") || qr.base64.length > 1_000_000) {
    throw new WhatsAppError(WHATSAPP_ERROR_CODES.INVALID_PROVIDER_RESPONSE, "QR Code inválido.");
  }
  await prisma.whatsAppConnection.update({
    where: { tenantId: actor.tenantId },
    data: { status: "AWAITING_QR" },
  });
  return qr;
}

export async function updateWhatsAppPreferences(
  actor: Actor,
  values: {
    enabled?: boolean;
    sendAppointmentConfirmation?: boolean;
    sendAppointmentRequested?: boolean;
  },
) {
  return prisma.$transaction(async (tx) => {
    const connection = await tx.whatsAppConnection.update({
      where: { tenantId: actor.tenantId },
      data: values,
    });
    await tx.auditLog.create({
      data: audit(actor, AUDIT_EVENTS.WHATSAPP_PREFERENCES_UPDATED, "Preferências do WhatsApp atualizadas."),
    });
    return toView(connection);
  });
}

export async function disconnectWhatsApp(
  actor: Actor,
  provider: WhatsAppProvider = createWhatsAppProvider(),
) {
  const connection = await prisma.whatsAppConnection.findUnique({ where: { tenantId: actor.tenantId } });
  if (!connection) return null;
  await provider.disconnect(connection.instanceName);
  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.whatsAppConnection.update({
      where: { tenantId: actor.tenantId },
      data: { status: "DISCONNECTED", enabled: false, disconnectedAt: new Date(), phoneNumber: null },
    });
    await tx.auditLog.create({
      data: audit(actor, AUDIT_EVENTS.WHATSAPP_CONNECTION_DISCONNECTED, "Conexão WhatsApp desconectada."),
    });
    return result;
  });
  return toView(updated);
}
