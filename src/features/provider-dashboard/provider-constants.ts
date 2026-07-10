import type {
  AppointmentOrigin,
  AppointmentStatus,
} from "@/generated/prisma/client";

export const ORIGIN_BADGE_VARIANT: Record<
  AppointmentOrigin,
  "info" | "success" | "secondary"
> = {
  PUBLIC_LINK: "info",
  WHATSAPP: "success",
  MANUAL_PANEL: "secondary",
  ADMIN: "secondary",
};

export const ORIGIN_LABELS: Record<AppointmentOrigin, string> = {
  PUBLIC_LINK: "Link público",
  WHATSAPP: "WhatsApp",
  MANUAL_PANEL: "Painel",
  ADMIN: "Admin",
};

export const STATUS_BADGE_VARIANT: Record<
  AppointmentStatus,
  "success" | "info" | "warning" | "default"
> = {
  REQUESTED: "info",
  CONFIRMED: "success",
  WAITING_INFO: "warning",
  RESCHEDULED: "info",
  CANCELED_BY_CUSTOMER: "default",
  CANCELED_BY_PROVIDER: "default",
  NO_SHOW: "default",
  IN_PROGRESS: "warning",
  FINISHED: "success",
};

export const STATUS_SHORT_LABELS: Record<AppointmentStatus, string> = {
  REQUESTED: "Solicitado",
  CONFIRMED: "Confirmado",
  WAITING_INFO: "Aguardando",
  RESCHEDULED: "Reagendado",
  CANCELED_BY_CUSTOMER: "Cancel. cliente",
  CANCELED_BY_PROVIDER: "Cancel. prestador",
  NO_SHOW: "Não compareceu",
  IN_PROGRESS: "Em andamento",
  FINISHED: "Finalizado",
};

export const METRIC_ICON_NAMES = [
  "boxes",
  "calendar-clock",
  "folder-open",
  "users-round",
] as const;

export type MetricIconName = (typeof METRIC_ICON_NAMES)[number];
