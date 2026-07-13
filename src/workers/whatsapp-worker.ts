import { Worker } from "bullmq";

import { createWhatsAppProvider } from "@/features/whatsapp/whatsapp-provider-factory";
import { appointmentConfirmedPayloadSchema } from "@/features/whatsapp/whatsapp-schemas";
import { renderAppointmentConfirmedMessage } from "@/features/whatsapp/whatsapp-template";
import { normalizeBrazilianWhatsAppPhone } from "@/features/whatsapp/whatsapp-phone";
import { WHATSAPP_ERROR_CODES, WhatsAppError } from "@/features/whatsapp/whatsapp-errors";
import { getWhatsAppConfig } from "@/features/whatsapp/whatsapp-config";
import { prisma } from "@/lib/prisma";
import { createQueueRedisConnection, WHATSAPP_QUEUE_NAME, type WhatsAppJob } from "@/workers/whatsapp-queue";

const MAX_ATTEMPTS = 5;

export async function processWhatsAppOutbox(outboxId: string) {
  const claimed = await prisma.whatsAppMessageOutbox.updateMany({
    where: { id: outboxId, status: { in: ["QUEUED", "RETRYING"] } },
    data: { status: "PROCESSING", processingAt: new Date(), attempts: { increment: 1 } },
  });
  if (!claimed.count) return;
  const message = await prisma.whatsAppMessageOutbox.findUnique({
    where: { id: outboxId },
    include: { connection: true },
  });
  if (!message) return;
  try {
    if (
      message.connection.tenantId !== message.tenantId ||
      !message.connection.enabled ||
      message.connection.status !== "CONNECTED"
    ) {
      throw new WhatsAppError(WHATSAPP_ERROR_CODES.NOT_CONNECTED, "Conexão indisponível.", true);
    }
    if (normalizeBrazilianWhatsAppPhone(message.recipientPhone) !== message.recipientPhone) {
      throw new WhatsAppError(WHATSAPP_ERROR_CODES.INVALID_PHONE, "Telefone persistido inválido.", false);
    }
    const payload = appointmentConfirmedPayloadSchema.safeParse(message.payload);
    if (!payload.success) {
      throw new WhatsAppError(WHATSAPP_ERROR_CODES.SEND_FAILED, "Payload inválido.", false);
    }
    const result = await createWhatsAppProvider().sendText({
      instanceName: message.connection.instanceName,
      recipientPhone: message.recipientPhone,
      text: renderAppointmentConfirmedMessage(payload.data),
    });
    await prisma.whatsAppMessageOutbox.update({
      where: { id: message.id },
      data: {
        status: "SENT",
        externalMessageId: result.externalMessageId,
        sentAt: new Date(),
        lastErrorCode: null,
        nextAttemptAt: null,
      },
    });
  } catch (error) {
    const retryable = error instanceof WhatsAppError && error.retryable;
    const shouldRetry = retryable && message.attempts < MAX_ATTEMPTS;
    await prisma.whatsAppMessageOutbox.update({
      where: { id: message.id },
      data: {
        status: shouldRetry ? "RETRYING" : "FAILED",
        nextAttemptAt: shouldRetry
          ? new Date(Date.now() + 30_000 * 2 ** Math.max(0, message.attempts - 1))
          : null,
        failedAt: shouldRetry ? null : new Date(),
        lastErrorCode: error instanceof WhatsAppError ? error.code : WHATSAPP_ERROR_CODES.SEND_FAILED,
        lastErrorAt: new Date(),
      },
    });
    if (shouldRetry) throw error;
  }
}

export function createWhatsAppWorker() {
  const config = getWhatsAppConfig();
  return new Worker<WhatsAppJob, void, "send">(
    WHATSAPP_QUEUE_NAME,
    async (job) => processWhatsAppOutbox(job.data.outboxId),
    { connection: createQueueRedisConnection(), concurrency: config.workerConcurrency },
  );
}
