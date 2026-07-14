import { Worker } from "bullmq";

import { createWhatsAppProvider } from "@/features/whatsapp/whatsapp-provider-factory";
import {
  appointmentConfirmedPayloadSchema,
  appointmentRequestedPayloadSchema,
} from "@/features/whatsapp/whatsapp-schemas";
import {
  renderAppointmentConfirmedMessage,
  renderAppointmentRequestedMessage,
} from "@/features/whatsapp/whatsapp-template";
import { normalizeBrazilianWhatsAppPhone } from "@/features/whatsapp/whatsapp-phone";
import {
  isRetryableWhatsAppError,
  WHATSAPP_ERROR_CODES,
  WhatsAppError,
} from "@/features/whatsapp/whatsapp-errors";
import { getWhatsAppConfig } from "@/features/whatsapp/whatsapp-config";
import { prisma } from "@/lib/prisma";
import { createQueueRedisConnection, WHATSAPP_QUEUE_NAME, type WhatsAppJob } from "@/workers/whatsapp-queue";

const MAX_QUICK_ATTEMPTS = 5;
const PERSISTED_RETRY_BASE_MS = 5 * 60_000;
const PERSISTED_RETRY_MAX_MS = 30 * 60_000;
export const WHATSAPP_DELIVERY_WINDOW_MS = 24 * 60 * 60_000;

type ProcessingContext = {
  now?: Date;
  quickAttempt?: number;
  maxQuickAttempts?: number;
};

function renderOutboxMessage(
  type: "APPOINTMENT_CONFIRMED" | "APPOINTMENT_REQUESTED",
  payload: unknown,
) {
  if (type === "APPOINTMENT_REQUESTED") {
    const parsed = appointmentRequestedPayloadSchema.safeParse(payload);
    if (!parsed.success) {
      throw new WhatsAppError(
        WHATSAPP_ERROR_CODES.SEND_FAILED,
        "Payload inválido.",
        false,
      );
    }
    return renderAppointmentRequestedMessage(parsed.data);
  }
  const parsed = appointmentConfirmedPayloadSchema.safeParse(payload);
  if (!parsed.success) {
    throw new WhatsAppError(
      WHATSAPP_ERROR_CODES.SEND_FAILED,
      "Payload inválido.",
      false,
    );
  }
  return renderAppointmentConfirmedMessage(parsed.data);
}

function nextPersistentRetryAt(
  now: Date,
  createdAt: Date,
  attempts: number,
  attemptsPerRecoveryCycle = MAX_QUICK_ATTEMPTS,
) {
  const recoveryCycle = Math.floor(
    Math.max(0, attempts - 1) / attemptsPerRecoveryCycle,
  );
  const delay = Math.min(
    PERSISTED_RETRY_BASE_MS * 2 ** recoveryCycle,
    PERSISTED_RETRY_MAX_MS,
  );
  const deliveryDeadline = createdAt.getTime() + WHATSAPP_DELIVERY_WINDOW_MS;
  return new Date(Math.min(now.getTime() + delay, deliveryDeadline));
}

export async function processWhatsAppOutbox(
  outboxId: string,
  context: ProcessingContext = {},
) {
  const now = context.now ?? new Date();
  const quickAttempt = context.quickAttempt ?? 1;
  const maxQuickAttempts = context.maxQuickAttempts ?? MAX_QUICK_ATTEMPTS;
  const claimed = await prisma.whatsAppMessageOutbox.updateMany({
    where: { id: outboxId, status: { in: ["QUEUED", "RETRYING"] } },
    data: { status: "PROCESSING", processingAt: now, attempts: { increment: 1 } },
  });
  if (!claimed.count) return;
  const message = await prisma.whatsAppMessageOutbox.findUnique({
    where: { id: outboxId },
    include: { connection: true },
  });
  if (!message) return;
  const connection = message.connection;
  const deliveryExpired =
    now.getTime() - message.createdAt.getTime() >= WHATSAPP_DELIVERY_WINDOW_MS;
  if (deliveryExpired) {
    await prisma.whatsAppMessageOutbox.update({
      where: { id: message.id },
      data: {
        status: "FAILED",
        nextAttemptAt: null,
        failedAt: now,
        lastErrorCode: WHATSAPP_ERROR_CODES.DELIVERY_WINDOW_EXPIRED,
        lastErrorAt: now,
      },
    });
    return;
  }
  try {
    if (!connection || connection.tenantId !== message.tenantId) {
      throw new WhatsAppError(
        WHATSAPP_ERROR_CODES.DELIVERY_DISABLED,
        "Conexão não pertence ao tenant da mensagem.",
        false,
      );
    }
    if (!connection.enabled) {
      throw new WhatsAppError(
        WHATSAPP_ERROR_CODES.DELIVERY_DISABLED,
        "Entrega desativada pelo tenant.",
        false,
      );
    }
    if (!connection.instanceName.trim()) {
      throw new WhatsAppError(
        WHATSAPP_ERROR_CODES.DELIVERY_DISABLED,
        "Conexão sem instância configurada.",
        false,
      );
    }
    if (connection.status !== "CONNECTED") {
      throw new WhatsAppError(WHATSAPP_ERROR_CODES.NOT_CONNECTED, "Conexão indisponível.", true);
    }
    if (normalizeBrazilianWhatsAppPhone(message.recipientPhone) !== message.recipientPhone) {
      throw new WhatsAppError(WHATSAPP_ERROR_CODES.INVALID_PHONE, "Telefone persistido inválido.", false);
    }
    const result = await createWhatsAppProvider().sendText({
      instanceName: connection.instanceName,
      recipientPhone: message.recipientPhone,
      text: renderOutboxMessage(message.type, message.payload),
    });
    await prisma.whatsAppMessageOutbox.update({
      where: { id: message.id },
      data: {
        status: "SENT",
        externalMessageId: result.externalMessageId,
        sentAt: now,
        lastErrorCode: null,
        lastErrorAt: null,
        nextAttemptAt: null,
      },
    });
  } catch (error) {
    const recoverableMissingInstance =
      error instanceof WhatsAppError &&
      error.code === WHATSAPP_ERROR_CODES.INSTANCE_NOT_FOUND &&
      connection?.tenantId === message.tenantId &&
      connection.enabled &&
      Boolean(connection.instanceName.trim()) &&
      Boolean(connection.connectedAt);
    const retryable =
      isRetryableWhatsAppError(error) || recoverableMissingInstance;
    const shouldRetryQuickly =
      retryable && !recoverableMissingInstance && quickAttempt < maxQuickAttempts;
    await prisma.whatsAppMessageOutbox.update({
      where: { id: message.id },
      data: {
        status: retryable ? "RETRYING" : "FAILED",
        nextAttemptAt: retryable
          ? nextPersistentRetryAt(
              now,
              message.createdAt,
              message.attempts,
              recoverableMissingInstance ? 1 : MAX_QUICK_ATTEMPTS,
            )
          : null,
        failedAt: retryable ? null : now,
        lastErrorCode: error instanceof WhatsAppError ? error.code : WHATSAPP_ERROR_CODES.SEND_FAILED,
        lastErrorAt: now,
      },
    });
    if (shouldRetryQuickly) throw error;
  }
}

export function createWhatsAppWorker() {
  const config = getWhatsAppConfig();
  return new Worker<WhatsAppJob, void, "send">(
    WHATSAPP_QUEUE_NAME,
    async (job) =>
      processWhatsAppOutbox(job.data.outboxId, {
        quickAttempt: job.attemptsMade + 1,
        maxQuickAttempts: Number(job.opts.attempts ?? MAX_QUICK_ATTEMPTS),
      }),
    { connection: createQueueRedisConnection(), concurrency: config.workerConcurrency },
  );
}
