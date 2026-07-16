import type { Prisma } from "@/generated/prisma/client";
import { canUseTypebot } from "@/features/subscriptions/subscription-policy";
import { getWhatsAppConfig } from "@/features/whatsapp/whatsapp-config";
import { normalizeBrazilianWhatsAppPhone } from "@/features/whatsapp/whatsapp-phone";
import type {
  AppointmentCompletedPayload,
  AppointmentConfirmedPayload,
  AppointmentRequestedPayload,
} from "@/features/whatsapp/whatsapp-types";

export type AppointmentMessageOutboxInput = {
  tenantId: string;
  appointmentId: string;
  customerName: string;
  customerPhone: string | null;
  serviceName: string;
  professionalName?: string;
  startsAt: Date;
  now?: Date;
};

export type AppointmentConfirmationOutboxInput = AppointmentMessageOutboxInput;
export type AppointmentRequestedOutboxInput = AppointmentMessageOutboxInput;

const ACTIVE_REMINDER_STATUSES = [
  "PENDING",
  "QUEUED",
  "PROCESSING",
  "RETRYING",
] as const;

function dateParts(value: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("pt-BR", {
    timeZone,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(value);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((candidate) => candidate.type === type)?.value ?? "";
  return {
    bookingDate: `${part("day")}/${part("month")}/${part("year")}`,
    bookingTime: `${part("hour")}:${part("minute")}`,
  };
}

async function resolveDeliveryContext(
  tx: Prisma.TransactionClient,
  input: AppointmentMessageOutboxInput,
  preference:
    | "sendAppointmentConfirmation"
    | "sendAppointmentRequested"
    | "sendAppointmentCompleted"
    | null,
) {
  if (!getWhatsAppConfig().enabled) {
    return { ok: false, reason: "gateway_disabled" } as const;
  }

  const recipientPhone = input.customerPhone
    ? normalizeBrazilianWhatsAppPhone(input.customerPhone)
    : null;
  if (!recipientPhone) {
    return { ok: false, reason: "invalid_phone" } as const;
  }

  const connection = await tx.whatsAppConnection.findFirst({
    where: {
      tenantId: input.tenantId,
      enabled: true,
      ...(preference ? { [preference]: true } : {}),
    },
    select: {
      id: true,
      tenant: {
        select: {
          status: true,
          timezone: true,
          name: true,
          publicDisplayName: true,
          subscription: {
            select: {
              status: true,
              expiresAt: true,
              plan: {
                select: { publicLinkEnabled: true, whatsappEnabled: true },
              },
            },
          },
        },
      },
    },
  });
  if (!connection) {
    return { ok: false, reason: "preference_disabled" } as const;
  }

  if (
    !canUseTypebot({
      tenantStatus: connection.tenant.status,
      subscription: connection.tenant.subscription,
      now: input.now,
    })
  ) {
    return { ok: false, reason: "plan_unavailable" } as const;
  }

  return { ok: true, connection, recipientPhone } as const;
}

function commonPayload(
  input: AppointmentMessageOutboxInput,
  context: Awaited<ReturnType<typeof resolveDeliveryContext>> & { ok: true },
) {
  return {
    businessName:
      context.connection.tenant.publicDisplayName ?? context.connection.tenant.name,
    customerName: input.customerName,
    serviceName: input.serviceName,
    professionalName: input.professionalName,
    ...dateParts(input.startsAt, context.connection.tenant.timezone),
    appointmentId: input.appointmentId,
  };
}

export async function enqueueAppointmentConfirmation(
  tx: Prisma.TransactionClient,
  input: AppointmentConfirmationOutboxInput,
) {
  const context = await resolveDeliveryContext(
    tx,
    input,
    "sendAppointmentConfirmation",
  );
  if (!context.ok) return { created: false, reason: context.reason } as const;

  const payload: AppointmentConfirmedPayload = commonPayload(input, context);
  const idempotencyKey = `appointment:${input.appointmentId}:confirmed:v1`;
  const message = await tx.whatsAppMessageOutbox.upsert({
    where: { tenantId_idempotencyKey: { tenantId: input.tenantId, idempotencyKey } },
    create: {
      tenantId: input.tenantId,
      appointmentId: input.appointmentId,
      connectionId: context.connection.id,
      type: "APPOINTMENT_CONFIRMED",
      recipientPhone: context.recipientPhone,
      payload,
      templateVersion: 1,
      idempotencyKey,
    },
    update: {},
    select: { id: true, status: true },
  });
  return { created: true, message } as const;
}

export async function enqueueAppointmentRequested(
  tx: Prisma.TransactionClient,
  input: AppointmentRequestedOutboxInput,
) {
  const context = await resolveDeliveryContext(
    tx,
    input,
    "sendAppointmentRequested",
  );
  if (!context.ok) return { created: false, reason: context.reason } as const;

  const payload: AppointmentRequestedPayload = commonPayload(input, context);
  const idempotencyKey = `appointment:${input.appointmentId}:requested:v1`;
  const message = await tx.whatsAppMessageOutbox.upsert({
    where: { tenantId_idempotencyKey: { tenantId: input.tenantId, idempotencyKey } },
    create: {
      tenantId: input.tenantId,
      appointmentId: input.appointmentId,
      connectionId: context.connection.id,
      type: "APPOINTMENT_REQUESTED",
      recipientPhone: context.recipientPhone,
      payload,
      templateVersion: 1,
      idempotencyKey,
    },
    update: {},
    select: { id: true, status: true },
  });
  return { created: true, message } as const;
}

export async function enqueueAppointmentCompleted(
  tx: Prisma.TransactionClient,
  input: AppointmentMessageOutboxInput,
) {
  const context = await resolveDeliveryContext(
    tx,
    input,
    "sendAppointmentCompleted",
  );
  if (!context.ok) return { created: false, reason: context.reason } as const;

  const payload: AppointmentCompletedPayload = commonPayload(input, context);
  const idempotencyKey = `appointment:${input.appointmentId}:completed:v1`;
  const message = await tx.whatsAppMessageOutbox.upsert({
    where: {
      tenantId_idempotencyKey: { tenantId: input.tenantId, idempotencyKey },
    },
    create: {
      tenantId: input.tenantId,
      appointmentId: input.appointmentId,
      connectionId: context.connection.id,
      type: "APPOINTMENT_COMPLETED",
      recipientPhone: context.recipientPhone,
      payload,
      templateVersion: 1,
      idempotencyKey,
    },
    update: {},
    select: { id: true, status: true },
  });
  return { created: true, message } as const;
}

export async function cancelPendingAppointmentReminders(
  tx: Prisma.TransactionClient,
  tenantId: string,
  appointmentId: string,
) {
  return tx.whatsAppMessageOutbox.updateMany({
    where: {
      tenantId,
      appointmentId,
      type: "APPOINTMENT_REMINDER",
      status: { in: [...ACTIVE_REMINDER_STATUSES] },
    },
    data: {
      status: "CANCELED",
      scheduledFor: null,
      nextAttemptAt: null,
    },
  });
}
