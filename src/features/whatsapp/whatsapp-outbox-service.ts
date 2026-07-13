import type { Prisma } from "@/generated/prisma/client";
import { getWhatsAppConfig } from "@/features/whatsapp/whatsapp-config";
import { normalizeBrazilianWhatsAppPhone } from "@/features/whatsapp/whatsapp-phone";
import type { AppointmentConfirmedPayload } from "@/features/whatsapp/whatsapp-types";

export type AppointmentConfirmationOutboxInput = {
  tenantId: string;
  appointmentId: string;
  customerName: string;
  customerPhone: string | null;
  serviceName: string;
  professionalName?: string;
  startsAt: Date;
  timezone: string;
  businessName: string;
  businessAddress?: string;
};

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

export async function enqueueAppointmentConfirmation(
  tx: Prisma.TransactionClient,
  input: AppointmentConfirmationOutboxInput,
) {
  if (!getWhatsAppConfig().enabled) return { created: false, reason: "gateway_disabled" } as const;
  const recipientPhone = input.customerPhone
    ? normalizeBrazilianWhatsAppPhone(input.customerPhone)
    : null;
  if (!recipientPhone) return { created: false, reason: "invalid_phone" } as const;
  const connection = await tx.whatsAppConnection.findFirst({
    where: { tenantId: input.tenantId, enabled: true, sendAppointmentConfirmation: true },
    select: { id: true },
  });
  if (!connection) return { created: false, reason: "preference_disabled" } as const;
  const payload: AppointmentConfirmedPayload = {
    businessName: input.businessName,
    customerName: input.customerName,
    serviceName: input.serviceName,
    professionalName: input.professionalName,
    ...dateParts(input.startsAt, input.timezone),
    businessAddress: input.businessAddress,
    appointmentId: input.appointmentId,
  };
  const idempotencyKey = `appointment:${input.appointmentId}:confirmed:v1`;
  const message = await tx.whatsAppMessageOutbox.upsert({
    where: { tenantId_idempotencyKey: { tenantId: input.tenantId, idempotencyKey } },
    create: {
      tenantId: input.tenantId,
      appointmentId: input.appointmentId,
      connectionId: connection.id,
      type: "APPOINTMENT_CONFIRMED",
      recipientPhone,
      payload,
      templateVersion: 1,
      idempotencyKey,
    },
    update: {},
    select: { id: true, status: true },
  });
  return { created: true, message } as const;
}
