import type {
  AppointmentConfirmedPayload,
  AppointmentRequestedPayload,
} from "@/features/whatsapp/whatsapp-types";
import {
  appointmentConfirmedPayloadSchema,
  appointmentRequestedPayloadSchema,
} from "@/features/whatsapp/whatsapp-schemas";

const MAX_MESSAGE_LENGTH = 1_200;

export function renderAppointmentConfirmedMessage(
  input: AppointmentConfirmedPayload,
) {
  const payload = appointmentConfirmedPayloadSchema.parse(input);
  const lines = [
    `Olá, ${payload.customerName}! Seu agendamento foi confirmado.`,
    "",
    `Serviço: ${payload.serviceName}`,
    `Data: ${payload.bookingDate}`,
    `Horário: ${payload.bookingTime}`,
    payload.professionalName
      ? `Profissional: ${payload.professionalName}`
      : null,
    payload.businessAddress ? `Local: ${payload.businessAddress}` : null,
    "",
    payload.businessName,
  ].filter((line): line is string => line !== null);
  const message = lines.join("\n");
  if (message.length > MAX_MESSAGE_LENGTH) {
    throw new Error("Template de confirmação excede o limite permitido.");
  }
  return message;
}

export function renderAppointmentRequestedMessage(
  input: AppointmentRequestedPayload,
) {
  const payload = appointmentRequestedPayloadSchema.parse(input);
  const lines = [
    `Olá, ${payload.customerName}! Recebemos sua solicitação de agendamento.`,
    "",
    `Serviço: ${payload.serviceName}`,
    `Data: ${payload.bookingDate}`,
    `Horário: ${payload.bookingTime}`,
    payload.professionalName
      ? `Profissional: ${payload.professionalName}`
      : null,
    "",
    "O estabelecimento ainda precisa confirmar esse horário. Você receberá uma nova mensagem assim que o agendamento for confirmado.",
    "",
    payload.businessName,
  ].filter((line): line is string => line !== null);
  const message = lines.join("\n");
  if (message.length > MAX_MESSAGE_LENGTH) {
    throw new Error("Template de solicitação excede o limite permitido.");
  }
  return message;
}
