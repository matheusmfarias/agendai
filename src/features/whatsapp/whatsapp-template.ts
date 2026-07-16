import type {
  AppointmentConfirmedPayload,
  AppointmentCanceledPayload,
  AppointmentCompletedPayload,
  AppointmentReminderPayload,
  AppointmentRequestedPayload,
} from "@/features/whatsapp/whatsapp-types";
import {
  appointmentConfirmedPayloadSchema,
  appointmentCanceledPayloadSchema,
  appointmentCompletedPayloadSchema,
  appointmentReminderPayloadSchema,
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
  return lines.join("\n");
}

export function renderAppointmentReminderMessage(
  input: AppointmentReminderPayload,
) {
  const payload = appointmentReminderPayloadSchema.parse(input);
  return `Olá, ${payload.customerName}! Passando para lembrar do seu agendamento de ${payload.serviceName} em ${payload.bookingDate} às ${payload.bookingTime}.`;
}

export function renderAppointmentCanceledMessage(
  input: AppointmentCanceledPayload,
) {
  const payload = appointmentCanceledPayloadSchema.parse(input);
  return `Olá, ${payload.customerName}. Seu agendamento de ${payload.serviceName} em ${payload.bookingDate} às ${payload.bookingTime} foi cancelado.`;
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

export function renderAppointmentCompletedMessage(
  input: AppointmentCompletedPayload,
) {
  const payload = appointmentCompletedPayloadSchema.parse(input);
  const lines = [
    `Olá, ${payload.customerName}! Seu atendimento foi concluído.`,
    "",
    `Serviço: ${payload.serviceName}`,
    `Data: ${payload.bookingDate}`,
    payload.professionalName
      ? `Profissional: ${payload.professionalName}`
      : null,
    "",
    "Se precisar de alguma informação adicional, entre em contato com o estabelecimento.",
    "",
    payload.businessName,
  ].filter((line): line is string => line !== null);
  const message = lines.join("\n");
  if (message.length > MAX_MESSAGE_LENGTH) {
    throw new Error("Template de conclusão excede o limite permitido.");
  }
  return message;
}
