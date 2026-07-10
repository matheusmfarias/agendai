// ---------------------------------------------------------------------------
// Human-readable labels for provider-facing enums — bookingMode, priceType,
// appointment origin, and appointment status.
//
// These replace raw enum keys in the UI.  The values here are the
// *display* text; the corresponding Prisma-generated enum types remain the
// source of truth for the database column.
// ---------------------------------------------------------------------------

import type {
  AppointmentOrigin,
  AppointmentStatus,
} from "@/generated/prisma/client";

// Value objects so they can be iterated or indexed without an explicit cast.
// Every entry maps a Prisma enum value to its human-readable label.

// ---- bookingMode -----------------------------------------------------------

export const BOOKING_MODE_LABELS: Record<string, string> = {
  DIRECT: "Confirmação imediata",
  REQUIRES_CONFIRMATION: "Precisa de confirmação",
  INFORMATIONAL: "Apenas informativo",
} as const;

export const BOOKING_MODE_HELP: Record<string, string> = {
  DIRECT:
    "O cliente escolhe um horário disponível e o agendamento já entra na agenda.",
  REQUIRES_CONFIRMATION:
    "O cliente solicita um horário e você confirma antes de considerar o atendimento definitivo.",
  INFORMATIONAL:
    "O serviço aparece para consulta, mas não permite agendamento direto.",
} as const;

// ---- priceType -------------------------------------------------------------

export const PRICE_TYPE_LABELS: Record<string, string> = {
  FIXED: "Preço fixo",
  STARTING_AT: "A partir de",
  ON_REQUEST: "Sob consulta",
  HIDDEN: "Não mostrar preço",
} as const;

export const PRICE_TYPE_HELP: Record<string, string> = {
  FIXED: "Use quando o valor do serviço não muda.",
  STARTING_AT: "Use quando o valor pode variar conforme o caso.",
  ON_REQUEST: "Use quando prefere combinar o valor com o cliente.",
  HIDDEN: "Use quando não deseja exibir valor no link público.",
} as const;

// ---- appointment origin ----------------------------------------------------

export const PROVIDER_ORIGIN_LABELS: Record<AppointmentOrigin, string> = {
  PUBLIC_LINK: "Link público",
  WHATSAPP: "WhatsApp",
  MANUAL_PANEL: "Painel manual",
  ADMIN: "Admin",
} as const;

// ---- appointment status ----------------------------------------------------

export const PROVIDER_STATUS_LABELS: Record<AppointmentStatus, string> = {
  REQUESTED: "Solicitado",
  CONFIRMED: "Confirmado",
  WAITING_INFO: "Aguardando informações",
  RESCHEDULED: "Reagendado",
  CANCELED_BY_CUSTOMER: "Cancelado pelo cliente",
  CANCELED_BY_PROVIDER: "Cancelado pelo prestador",
  NO_SHOW: "Não compareceu",
  IN_PROGRESS: "Em atendimento",
  FINISHED: "Finalizado",
} as const;
