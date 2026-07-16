import { Worker } from "bullmq";

import { canUseTypebot } from "@/features/subscriptions/subscription-policy";
import {
  createTypebotChatClient,
  TypebotChatError,
  type TypebotChatClient,
  type TypebotChatReply,
} from "@/features/typebot/typebot-chat-client";
import { decryptTypebotCredential } from "@/features/typebot/typebot-credential-crypto";
import type { WhatsAppProvider } from "@/features/whatsapp/contracts/whatsapp-provider";
import {
  activateWhatsAppConversationHandoff,
  getWhatsAppHandoffUntil,
} from "@/features/whatsapp/whatsapp-conversation-handoff";
import {
  isRetryableWhatsAppError,
  WhatsAppError,
} from "@/features/whatsapp/whatsapp-errors";
import { getWhatsAppConfig } from "@/features/whatsapp/whatsapp-config";
import { createWhatsAppProvider } from "@/features/whatsapp/whatsapp-provider-factory";
import { recordWhatsAppSentMessage } from "@/features/whatsapp/whatsapp-sent-message-receipt";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
  WHATSAPP_CONVERSATION_QUEUE_NAME,
  type WhatsAppConversationJob,
} from "@/workers/whatsapp-conversation-queue";
import { createQueueRedisConnection } from "@/workers/whatsapp-queue";

const DELIVERY_WINDOW_MS = 24 * 60 * 60_000;
const SESSION_INACTIVITY_MS = 30 * 60_000;
const MAX_NUMBERED_OPTIONS = 10;
const PHONE_CONTEXT_METADATA_KEY = "channelPhoneInjected";
const CONVERSATION_CHANNEL = "WHATSAPP" as const;
const INACTIVITY_NOTICE =
  "Como passou algum tempo, vamos começar novamente para consultar horários atualizados.";
const HANDOFF_RESUMED_NOTICE =
  "Olá! Vou retomar o atendimento automático para ajudar você.";
const TYPED_NAVIGATION_VALUES = {
  NUMBER: { voltar: "-9007199254740991", pular: "-9007199254740990" },
  DATE: { voltar: "1000-01-01", pular: "1000-01-02" },
} as const;
const FALLBACK_MESSAGE =
  "Desculpe, nosso atendimento automático está temporariamente indisponível. Sua mensagem foi preservada e tentaremos novamente.";

type ProcessingContext = {
  now?: Date;
  quickAttempt?: number;
  maxQuickAttempts?: number;
  typebot?: TypebotChatClient;
  provider?: WhatsAppProvider;
};

type ConversationScope = {
  tenantId: string;
  channel: typeof CONVERSATION_CHANNEL;
  conversationId: string;
};

type StoredTypebotReply = Pick<
  TypebotChatReply,
  "text" | "interaction" | "expectedInput"
> & { suppressedByTransactionalOutbox?: boolean };

type ConversationAction = "HANDOFF" | "END";

const EXPECTED_INPUT_TYPES = ["TEXT", "TEXTAREA", "NUMBER", "DATE", "CHOICE"] as const;

function parseExpectedInput(value: unknown): StoredTypebotReply["expectedInput"] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const record = value as Record<string, unknown>;
  if (!EXPECTED_INPUT_TYPES.some((type) => type === record.type)) return undefined;
  return {
    type: record.type as NonNullable<StoredTypebotReply["expectedInput"]>["type"],
    ...(typeof record.format === "string" ? { format: record.format } : {}),
  };
}

function parseStoredReply(value: unknown, fallbackText: string | null): StoredTypebotReply {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const record = value as Record<string, unknown>;
    const interaction = record.interaction;
    const parsed: StoredTypebotReply = {
      text: typeof record.text === "string" ? record.text : fallbackText ?? "",
      ...(record.suppressedByTransactionalOutbox === true
        ? { suppressedByTransactionalOutbox: true }
        : {}),
    };
    if (interaction && typeof interaction === "object" && !Array.isArray(interaction)) {
      const interactionRecord = interaction as Record<string, unknown>;
      const choices = Array.isArray(interactionRecord.choices)
        ? interactionRecord.choices.flatMap((choice) => {
            if (!choice || typeof choice !== "object" || Array.isArray(choice)) return [];
            const item = choice as Record<string, unknown>;
            return typeof item.id === "string" &&
              typeof item.value === "string" &&
              typeof item.label === "string"
              ? [{ id: item.id, value: item.value, label: item.label }]
              : [];
          })
        : [];
      if (typeof interactionRecord.type === "string" && choices.length) {
        parsed.interaction = { type: interactionRecord.type, choices };
      }
    }
    const inputExpectation = parseExpectedInput(record.expectedInput);
    if (inputExpectation) parsed.expectedInput = inputExpectation;
    return parsed;
  }
  return { text: fallbackText ?? "" };
}

function freeInputInstruction(expectedInput: StoredTypebotReply["expectedInput"]) {
  switch (expectedInput?.type) {
    case "TEXT":
    case "TEXTAREA":
      return "Digite sua resposta.";
    case "NUMBER":
      return "Digite um número válido.";
    case "DATE":
      return expectedInput.format === "yyyy-MM-dd"
        ? "Digite a data no formato AAAA-MM-DD."
        : "Digite a data no formato informado.";
    default:
      return "";
  }
}

function numberedReply(reply: StoredTypebotReply) {
  const options = (reply.interaction?.choices ?? []).slice(0, MAX_NUMBERED_OPTIONS);
  if (!options.length) {
    const text = reply.text || freeInputInstruction(reply.expectedInput);
    return reply.expectedInput && reply.expectedInput.type !== "CHOICE"
      ? text.replace(/^([^\n]+)\n(?!\n)/, "$1\n\n")
      : text;
  }
  return [
    reply.text,
    options.map((choice, index) => `${index + 1}. ${choice.label}`).join("\n"),
    options.length ? "Responda com o número da opção." : "",
  ].filter(Boolean).join("\n\n");
}

function isValidNumberInput(value: string) {
  return /^[+-]?\d+(?:[.,]\d+)?$/.test(value);
}

function isValidDateInput(value: string, format: string | undefined) {
  if (format && format !== "yyyy-MM-dd") return false;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day;
}

async function sendTypebotReply(
  provider: WhatsAppProvider,
  input: { instanceName: string; recipientPhone: string; reply: StoredTypebotReply },
) {
  return provider.sendText({
    instanceName: input.instanceName,
    recipientPhone: input.recipientPhone,
    text: numberedReply(input.reply),
  });
}

function normalizeCommand(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function actionFromStructuredChoice(choice: {
  id: string;
  value: string;
  label: string;
}): ConversationAction | undefined {
  if (choice.id === "i_intent_handoff") return "HANDOFF";
  if (choice.id === "i_intent_end") return "END";
  return undefined;
}

function localizeTypebotSystemMessage(text: string) {
  const normalized = text.trim().toLowerCase();
  if (
    normalized === "invalid message. please, try again." ||
    normalized === "invalid message. please try again."
  ) {
    return "Opção inválida. Escolha uma das opções disponíveis.";
  }
  if (normalized === "this field is required.") {
    return "Este campo é obrigatório.";
  }
  if (normalized === "please enter a valid value.") {
    return "Informe um valor válido.";
  }
  return text;
}

function pendingHandoffInboundMessageId(metadata: unknown) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  const value = (metadata as Record<string, unknown>).pendingHandoffInboundMessageId;
  return typeof value === "string" ? value : null;
}

function nextRetryAt(now: Date, attempts: number) {
  const delay = Math.min(60_000 * 2 ** Math.max(0, attempts - 1), 15 * 60_000);
  return new Date(now.getTime() + delay);
}

function withSessionMetadata(
  metadata: unknown,
  values: Prisma.InputJsonObject,
): Prisma.InputJsonObject {
  const current = metadata && typeof metadata === "object" && !Array.isArray(metadata)
    ? metadata as Prisma.InputJsonObject
    : {};
  return { ...current, ...values };
}

function typebotStartConfiguration(input: {
  tenantSlug: string;
  tokenEncrypted: string | null | undefined;
}) {
  const publicUrl = process.env.AGENDAI_PUBLIC_URL;
  if (!publicUrl || !input.tokenEncrypted) {
    throw new TypebotChatError("UNAVAILABLE", false);
  }
  try {
    return {
      apiBaseUrl: new URL(publicUrl).origin,
      tenantSlug: input.tenantSlug,
      typebotApiKey: decryptTypebotCredential(input.tokenEncrypted),
    };
  } catch {
    throw new TypebotChatError("UNAVAILABLE", false);
  }
}

async function endActiveSession(scope: ConversationScope, now: Date) {
  await prisma.typebotSession.updateMany({
    where: {
      tenantId: scope.tenantId,
      activePhone: scope.conversationId,
      endedAt: null,
    },
    data: {
      activePhone: null,
      endedAt: now,
      handoffUntil: null,
      status: "ABANDONED",
    },
  });
}

async function createActiveSession(scope: ConversationScope, now: Date) {
  return prisma.typebotSession.create({
    data: {
      tenantId: scope.tenantId,
      phone: scope.conversationId,
      activePhone: scope.conversationId,
      status: "STARTED",
      metadata: {
        [PHONE_CONTEXT_METADATA_KEY]: true,
        channel: scope.channel,
        conversationId: scope.conversationId,
      },
      lastInteractionAt: now,
    },
  });
}

function hasInjectedPhoneContext(metadata: unknown) {
  return Boolean(
    metadata &&
      typeof metadata === "object" &&
      !Array.isArray(metadata) &&
      (metadata as Record<string, unknown>)[PHONE_CONTEXT_METADATA_KEY] === true,
  );
}

async function getActiveSession(scope: ConversationScope) {
  return prisma.typebotSession.findFirst({
    where: {
      tenantId: scope.tenantId,
      activePhone: scope.conversationId,
      endedAt: null,
    },
    orderBy: { lastInteractionAt: "desc" },
  });
}

async function markConversationReplySent(input: {
  messageId: string;
  tenantId: string;
  connectionId: string;
  externalMessageId: string;
  now: Date;
}) {
  await prisma.$transaction(async (tx) => {
    await recordWhatsAppSentMessage(tx, {
      tenantId: input.tenantId,
      connectionId: input.connectionId,
      externalMessageId: input.externalMessageId,
      source: "CONVERSATIONAL",
    });
    await tx.whatsAppInboundMessage.update({
      where: { id: input.messageId },
      data: {
        status: "PROCESSED",
        processedAt: input.now,
        nextAttemptAt: null,
        lastErrorCode: null,
      },
    });
  });
}

async function markConversationReplySuppressed(input: {
  messageId: string;
  tenantId: string;
  now: Date;
}) {
  await prisma.whatsAppInboundMessage.updateMany({
    where: {
      id: input.messageId,
      tenantId: input.tenantId,
      status: "PROCESSING",
    },
    data: {
      status: "PROCESSED",
      processedAt: input.now,
      nextAttemptAt: null,
      lastErrorCode: null,
    },
  });
}

async function resolveTypebotInput(
  tenantId: string,
  typebotSessionId: string,
  messageText: string,
) {
  const normalizedInput = messageText.trim();
  const previousMessages = await prisma.whatsAppInboundMessage.findMany({
    where: {
      tenantId,
      typebotSessionId,
      status: "PROCESSED",
    },
    orderBy: { processedAt: "desc" },
    take: 10,
    select: { responseText: true, responsePayload: true },
  });
  const previousReply = previousMessages
    .map((previous) => parseStoredReply(previous.responsePayload, previous.responseText))
    .find((reply) => reply.interaction?.choices.length || reply.expectedInput);
  const expectedInput = previousReply?.expectedInput;
  const command = normalizeCommand(normalizedInput);
  if (expectedInput && expectedInput.type !== "CHOICE") {
    if (command === "voltar" || command === "pular") {
      const typedNavigation = expectedInput.type === "NUMBER" || expectedInput.type === "DATE"
        ? TYPED_NAVIGATION_VALUES[expectedInput.type][command]
        : command === "voltar" ? "Voltar" : "Pular";
      return { type: "value", value: typedNavigation } as const;
    }
    if (expectedInput.type === "NUMBER" && !isValidNumberInput(normalizedInput)) {
      return {
        type: "invalid",
        message: "Número inválido. Digite um número válido.",
      } as const;
    }
    if (
      expectedInput.type === "DATE" &&
      !isValidDateInput(normalizedInput, expectedInput.format)
    ) {
      return {
        type: "invalid",
        message: "Data inválida. Use o formato AAAA-MM-DD.",
      } as const;
    }
    return { type: "value", value: messageText } as const;
  }
  const choices = previousReply?.interaction?.choices ?? [];
  if (!choices.length) return { type: "value", value: messageText } as const;
  const optionNumber = /^\d+$/.test(normalizedInput) ? Number(normalizedInput) : null;
  const selected = optionNumber !== null && Number.isSafeInteger(optionNumber)
    ? choices[optionNumber - 1]
    : choices.find((choice) => {
        const normalizedChoiceValues = [choice.value, choice.label].map(normalizeCommand);
        return normalizedChoiceValues.includes(command);
      });
  if (selected) {
    return {
      type: "value",
      value: selected.value,
      action: actionFromStructuredChoice(selected),
    } as const;
  }
  return {
    type: "invalid",
    message: `Opção inválida. Responda com um número entre 1 e ${choices.length}.`,
  } as const;
}

export async function processWhatsAppConversationMessage(
  inboundMessageId: string,
  context: ProcessingContext = {},
) {
  const now = context.now ?? new Date();
  const quickAttempt = context.quickAttempt ?? 1;
  const maxQuickAttempts = context.maxQuickAttempts ?? 4;
  const claimed = await prisma.whatsAppInboundMessage.updateMany({
    where: { id: inboundMessageId, status: { in: ["QUEUED", "RETRYING"] } },
    data: { status: "PROCESSING", processingAt: now, attempts: { increment: 1 } },
  });
  if (!claimed.count) return;

  const message = await prisma.whatsAppInboundMessage.findUnique({
    where: { id: inboundMessageId },
    include: {
      connection: {
        include: {
          tenant: {
            select: {
              typebotPublicId: true,
              slug: true,
              status: true,
              typebotCredentials: {
                where: {
                  isActive: true,
                  revokedAt: null,
                  tokenEncrypted: { not: null },
                },
                orderBy: { createdAt: "desc" },
                take: 1,
                select: { tokenEncrypted: true },
              },
              subscription: {
                select: {
                  status: true,
                  expiresAt: true,
                  plan: { select: { publicLinkEnabled: true, whatsappEnabled: true } },
                },
              },
            },
          },
        },
      },
    },
  });
  if (!message) return;
  const connection = message.connection;
  const provider = context.provider ?? createWhatsAppProvider();
  const typebot = context.typebot ?? createTypebotChatClient();

  try {
    if (
      connection.tenantId !== message.tenantId ||
      !connection.enabled ||
      connection.status !== "CONNECTED" ||
      !connection.tenant.typebotPublicId ||
      !canUseTypebot({
        tenantStatus: connection.tenant.status,
        subscription: connection.tenant.subscription,
        now,
      })
    ) {
      throw new TypebotChatError("UNAVAILABLE", false);
    }
    const scope: ConversationScope = {
      tenantId: message.tenantId,
      channel: CONVERSATION_CHANNEL,
      conversationId: message.senderPhone,
    };

    // A resposta estruturada persistida Ã© a marca de que o Typebot jÃ¡ foi
    // executado. Em retries, apenas a entrega Ã Evolution pode se repetir.
    if (message.responsePayload !== null) {
      const storedReply = parseStoredReply(
        message.responsePayload,
        message.responseText,
      );
      if (storedReply.suppressedByTransactionalOutbox) {
        await markConversationReplySuppressed({
          messageId: message.id,
          tenantId: message.tenantId,
          now,
        });
        return;
      }
      const result = await sendTypebotReply(provider, {
        instanceName: connection.instanceName,
        recipientPhone: message.senderPhone,
        reply: storedReply,
      });
      await markConversationReplySent({
        messageId: message.id,
        tenantId: message.tenantId,
        connectionId: connection.id,
        externalMessageId: result.externalMessageId,
        now,
      });
      return;
    }

    let session = await getActiveSession(scope);
    const command = normalizeCommand(message.messageText);
    const shouldRestart = command === "reiniciar" || command === "menu";
    if (shouldRestart && session) {
      await endActiveSession(scope, now);
      session = null;
    }
    const handoffInactive = Boolean(
      session?.handoffUntil &&
      now.getTime() - session.lastInteractionAt.getTime() >= SESSION_INACTIVITY_MS,
    );
    if (
      session?.handoffUntil &&
      session.handoffUntil.getTime() > now.getTime() &&
      !handoffInactive &&
      !shouldRestart &&
      pendingHandoffInboundMessageId(session.metadata) !== message.id
    ) {
      await prisma.$transaction([
        prisma.typebotSession.update({
          where: { id: session.id },
          data: {
            lastInteractionAt: now,
          },
        }),
        prisma.whatsAppInboundMessage.update({
          where: { id: message.id },
          data: { status: "IGNORED", processedAt: now, typebotSessionId: session.id },
        }),
      ]);
      return;
    }
    if (
      session?.handoffUntil &&
      (session.handoffUntil.getTime() <= now.getTime() || handoffInactive)
    ) {
      await endActiveSession(scope, now);
      session = null;
    }

    let restartedAfterInactivity = false;
    const restartedAfterHandoffInactivity = handoffInactive && !shouldRestart;
    if (
      session &&
      now.getTime() - session.lastInteractionAt.getTime() >= SESSION_INACTIVITY_MS
    ) {
      await endActiveSession(scope, now);
      session = null;
      restartedAfterInactivity = true;
    }
    if (
      session?.externalSessionId &&
      !hasInjectedPhoneContext(session.metadata)
    ) {
      await endActiveSession(scope, now);
      session = null;
    }

    if (message.responsePayload === null) {
      if (!session) session = await createActiveSession(scope, now);
      const typebotPublicId = connection.tenant.typebotPublicId;
      const startTypebot = () => {
        const startConfiguration = typebotStartConfiguration({
          tenantSlug: connection.tenant.slug,
          tokenEncrypted: connection.tenant.typebotCredentials[0]?.tokenEncrypted,
        });
        return typebot.start({
          publicId: typebotPublicId,
          phone: message.senderPhone,
          ...startConfiguration,
        });
      };
      let reply;
      let typebotInput = message.messageText;
      let selectedAction: ConversationAction | undefined;
      if (session.externalSessionId && !shouldRestart) {
        const resolvedInput = await resolveTypebotInput(
          message.tenantId,
          session.id,
          message.messageText,
        );
        if (resolvedInput.type === "invalid") {
          reply = { text: resolvedInput.message };
        } else {
          typebotInput = resolvedInput.value;
          selectedAction = resolvedInput.action;
          if (selectedAction === "HANDOFF") {
            await activateWhatsAppConversationHandoff(prisma, {
              tenantId: scope.tenantId,
              conversationId: scope.conversationId,
              now,
              origin: "CUSTOMER_REQUESTED",
              pendingInboundMessageId: message.id,
              session,
            });
          }
          try {
            reply = await typebot.continue({
              sessionId: session.externalSessionId,
              message: typebotInput,
            });
          } catch (error) {
            if (!(error instanceof TypebotChatError) || error.code !== "SESSION_NOT_FOUND") throw error;
            if (selectedAction === "HANDOFF") throw error;
            await endActiveSession(scope, now);
            session = await createActiveSession(scope, now);
            reply = await startTypebot();
          }
        }
      } else {
        reply = await startTypebot();
      }
      if (
        !reply.text &&
        !reply.interaction?.choices.length &&
        !reply.expectedInput
      ) {
        throw new TypebotChatError("INVALID_RESPONSE", false);
      }
      reply = {
        ...reply,
        text: localizeTypebotSystemMessage(reply.text),
      };
      if (restartedAfterInactivity) {
        reply = {
          ...reply,
          text: [INACTIVITY_NOTICE, reply.text].filter(Boolean).join("\n\n"),
        };
      }
      if (restartedAfterHandoffInactivity) {
        reply = {
          ...reply,
          text: [HANDOFF_RESUMED_NOTICE, reply.text].filter(Boolean).join("\n\n"),
        };
      }
      const isHandoff = selectedAction === "HANDOFF";
      const isConversationEnd = selectedAction === "END";
      const persistedSession = await prisma.typebotSession.findUnique({
        where: { id: session.id },
        select: { status: true, lastAppointmentId: true, metadata: true },
      });
      const isAppointmentCreated =
        persistedSession?.status === "APPOINTMENT_CREATED";
      const transactionalOutbox =
        isAppointmentCreated && persistedSession.lastAppointmentId
          ? await prisma.whatsAppMessageOutbox.findFirst({
              where: {
                tenantId: message.tenantId,
                appointmentId: persistedSession.lastAppointmentId,
                type: {
                  in: ["APPOINTMENT_REQUESTED", "APPOINTMENT_CONFIRMED"],
                },
                status: {
                  in: ["PENDING", "QUEUED", "PROCESSING", "RETRYING", "SENT"],
                },
              },
              select: { id: true, type: true },
            })
          : null;
      const suppressFinalReply = Boolean(transactionalOutbox);
      const shouldEndSession = isConversationEnd || isAppointmentCreated;
      const responsePayload: StoredTypebotReply = {
        text: reply.text,
        ...(suppressFinalReply
          ? { suppressedByTransactionalOutbox: true }
          : {}),
        ...(reply.interaction
          ? {
              interaction: {
                ...reply.interaction,
                choices: reply.interaction.choices.slice(0, MAX_NUMBERED_OPTIONS),
              },
            }
          : {}),
        ...(reply.expectedInput ? { expectedInput: reply.expectedInput } : {}),
      };
      await prisma.$transaction([
        prisma.typebotSession.update({
          where: { id: session.id },
          data: {
            externalSessionId: reply.sessionId ?? session.externalSessionId,
            activePhone: shouldEndSession ? null : scope.conversationId,
            ...(isConversationEnd ? { status: "ABANDONED" as const } : {}),
            endedAt: shouldEndSession ? now : null,
            handoffUntil: isHandoff ? getWhatsAppHandoffUntil(now) : null,
            metadata: withSessionMetadata(
              persistedSession?.metadata ?? session.metadata,
              {
                channel: scope.channel,
                conversationId: scope.conversationId,
                handoffRequested: isHandoff,
                ...(isHandoff ? { handoffOrigin: "CUSTOMER_REQUESTED" } : {}),
                pendingHandoffInboundMessageId: null,
                ...(isConversationEnd ? { endReason: "CUSTOMER_ENDED" } : {}),
                ...(isAppointmentCreated
                  ? { endReason: "APPOINTMENT_CREATED" }
                  : {}),
              },
            ),
            lastInteractionAt: now,
          },
        }),
        prisma.whatsAppInboundMessage.update({
          where: { id: message.id },
          data: {
            responseText: reply.text,
            responsePayload,
            typebotSessionId: session.id,
          },
        }),
      ]);
      message.responseText = reply.text;
      message.responsePayload = responsePayload;
    }

    const storedReply = parseStoredReply(
      message.responsePayload,
      message.responseText,
    );
    if (storedReply.suppressedByTransactionalOutbox) {
      await markConversationReplySuppressed({
        messageId: message.id,
        tenantId: message.tenantId,
        now,
      });
      return;
    }
    const result = await sendTypebotReply(provider, {
      instanceName: connection.instanceName,
      recipientPhone: message.senderPhone,
      reply: storedReply,
    });
    await markConversationReplySent({
      messageId: message.id,
      tenantId: message.tenantId,
      connectionId: connection.id,
      externalMessageId: result.externalMessageId,
      now,
    });
  } catch (error) {
    const retryable =
      (error instanceof TypebotChatError && error.retryable) ||
      (error instanceof WhatsAppError && isRetryableWhatsAppError(error));
    if (
      error instanceof TypebotChatError &&
      !message.fallbackSentAt
    ) {
      try {
        const fallbackResult = await provider.sendText({
          instanceName: connection.instanceName,
          recipientPhone: message.senderPhone,
          text: FALLBACK_MESSAGE,
        });
        await recordWhatsAppSentMessage(prisma, {
          tenantId: message.tenantId,
          connectionId: connection.id,
          externalMessageId: fallbackResult.externalMessageId,
          source: "FALLBACK",
        });
        message.fallbackSentAt = now;
      } catch {
        // A mensagem permanece no inbox para nova tentativa controlada.
      }
    }
    const expired = now.getTime() - message.receivedAt.getTime() >= DELIVERY_WINDOW_MS;
    await prisma.whatsAppInboundMessage.update({
      where: { id: message.id },
      data: {
        status: retryable && !expired ? "RETRYING" : "FAILED",
        nextAttemptAt: retryable && !expired ? nextRetryAt(now, message.attempts) : null,
        fallbackSentAt: message.fallbackSentAt,
        lastErrorCode:
          error instanceof TypebotChatError
            ? `TYPEBOT_${error.code}`
            : error instanceof WhatsAppError
              ? error.code
              : "CONVERSATION_FAILED",
      },
    });
    if (retryable && !expired && quickAttempt < maxQuickAttempts) throw error;
  }
}

export function createWhatsAppConversationWorker() {
  getWhatsAppConfig();
  return new Worker<WhatsAppConversationJob, void, "process">(
    WHATSAPP_CONVERSATION_QUEUE_NAME,
    async (job) =>
      processWhatsAppConversationMessage(job.data.inboundMessageId, {
        quickAttempt: job.attemptsMade + 1,
        maxQuickAttempts: Number(job.opts.attempts ?? 4),
      }),
    { connection: createQueueRedisConnection(), concurrency: 1 },
  );
}
