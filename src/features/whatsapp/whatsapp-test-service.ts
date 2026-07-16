import { AUDIT_EVENTS } from "@/features/audit/audit-events";
import type { WhatsAppProvider } from "@/features/whatsapp/contracts/whatsapp-provider";
import { WHATSAPP_ERROR_CODES, WhatsAppError } from "@/features/whatsapp/whatsapp-errors";
import { normalizeBrazilianWhatsAppPhone } from "@/features/whatsapp/whatsapp-phone";
import { createWhatsAppProvider } from "@/features/whatsapp/whatsapp-provider-factory";
import { recordWhatsAppSentMessage } from "@/features/whatsapp/whatsapp-sent-message-receipt";
import { prisma } from "@/lib/prisma";

const WINDOW_MS = 10 * 60 * 1_000;
const MAX_ATTEMPTS = 3;
const attempts = new Map<string, number[]>();

function consumeTestQuota(key: string, now = Date.now()) {
  const valid = (attempts.get(key) ?? []).filter((value) => now - value < WINDOW_MS);
  if (valid.length >= MAX_ATTEMPTS) {
    throw new WhatsAppError(WHATSAPP_ERROR_CODES.RATE_LIMITED, "Limite de testes atingido.", false, 429);
  }
  valid.push(now);
  attempts.set(key, valid);
}

export async function sendWhatsAppTestMessage(
  input: { tenantId: string; userId: string; phone: string },
  provider: WhatsAppProvider = createWhatsAppProvider(),
) {
  consumeTestQuota(`${input.tenantId}:${input.userId}`);
  const phone = normalizeBrazilianWhatsAppPhone(input.phone);
  if (!phone) {
    throw new WhatsAppError(WHATSAPP_ERROR_CODES.INVALID_PHONE, "Telefone inválido.", false, 400);
  }
  const connection = await prisma.whatsAppConnection.findFirst({
    where: { tenantId: input.tenantId, status: "CONNECTED", enabled: true },
  });
  if (!connection) {
    throw new WhatsAppError(WHATSAPP_ERROR_CODES.NOT_CONNECTED, "WhatsApp não conectado.", false, 409);
  }
  const result = await provider.sendText({
    instanceName: connection.instanceName,
    recipientPhone: phone,
    text: "Mensagem de teste do Agendaí. Sua integração com o WhatsApp está funcionando.",
  });
  await prisma.$transaction(async (tx) => {
    await recordWhatsAppSentMessage(tx, {
      tenantId: input.tenantId,
      connectionId: connection.id,
      externalMessageId: result.externalMessageId,
      source: "TEST",
    });
    await tx.auditLog.create({
      data: {
        actorType: "TENANT_USER",
        actorId: input.userId,
        tenantId: input.tenantId,
        eventType: AUDIT_EVENTS.WHATSAPP_TEST_MESSAGE_SENT,
        description: "Mensagem de teste do WhatsApp enviada.",
        metadata: { externalMessageId: result.externalMessageId },
      },
    });
  });
  return result;
}
