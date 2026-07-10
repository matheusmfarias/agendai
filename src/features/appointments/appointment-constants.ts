import type {
  AppointmentOrigin,
  AppointmentStatus,
} from "@/generated/prisma/client";

export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = {
  REQUESTED: "Aguardando confirmação",
  CONFIRMED: "Confirmado",
  WAITING_INFO: "Aguardando informações",
  RESCHEDULED: "Reagendado",
  CANCELED_BY_CUSTOMER: "Cancelado",
  CANCELED_BY_PROVIDER: "Cancelado",
  NO_SHOW: "Não compareceu",
  IN_PROGRESS: "Em atendimento",
  FINISHED: "Finalizado",
};

export const APPOINTMENT_ORIGIN_LABELS: Record<AppointmentOrigin, string> = {
  PUBLIC_LINK: "Link público",
  WHATSAPP: "WhatsApp",
  MANUAL_PANEL: "Painel manual",
  ADMIN: "Admin",
};

export const APPOINTMENT_EVENT_LABELS: Record<string, string> = {
  CREATED: "Criado",
  STATUS_CHANGED: "Status alterado",
  CANCELED: "Cancelado",
  STARTED: "Atendimento iniciado",
  FINISHED: "Finalizado",
  NO_SHOW: "Não compareceu",
  NOTE_ADDED: "Dados atualizados",
  UPDATED: "Agendamento atualizado",
};
