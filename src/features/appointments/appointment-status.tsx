import { Badge } from "@/components/ui/badge";
import {
  APPOINTMENT_ORIGIN_LABELS,
  APPOINTMENT_STATUS_LABELS,
} from "@/features/appointments/appointment-constants";
import { APPOINTMENT_STATUS_TRANSITIONS } from "@/features/appointments/appointment-rules";
import type { AppointmentOrigin, AppointmentStatus } from "@/generated/prisma/client";
import { cn } from "@/lib/utils";

const HISTORY_STATUSES = new Set<AppointmentStatus>(["FINISHED"]);
const CANCELED_STATUSES = new Set<AppointmentStatus>([
  "CANCELED_BY_CUSTOMER",
  "CANCELED_BY_PROVIDER",
  "NO_SHOW",
]);

export function deriveTemporalAppointmentStatus({
  status,
}: {
  status: AppointmentStatus;
  endsAt: Date | string;
  now?: Date;
}) {
  return status;
}

const MANUALLY_COMPLETABLE_STATUSES = new Set<AppointmentStatus>([
  "CONFIRMED",
  "RESCHEDULED",
  "IN_PROGRESS",
]);

export function getAppointmentCompletionState({
  status,
  endsAt,
  now = new Date(),
}: {
  status: AppointmentStatus;
  endsAt: Date | string;
  now?: Date;
}) {
  const overtimeMinutes = Math.max(
    0,
    Math.floor((now.getTime() - new Date(endsAt).getTime()) / 60_000),
  );
  const overdue =
    overtimeMinutes > 0 && MANUALLY_COMPLETABLE_STATUSES.has(status);

  if (!overdue) {
    return { overdue: false, overtimeMinutes: 0, overtimeLabel: null } as const;
  }

  const hours = Math.floor(overtimeMinutes / 60);
  const minutes = overtimeMinutes % 60;
  const overtimeLabel = hours
    ? `${hours}h${minutes ? ` ${minutes}min` : ""} excedido${hours > 1 ? "s" : ""}`
    : `${minutes} min excedidos`;

  return { overdue: true, overtimeMinutes, overtimeLabel } as const;
}

export function isAppointmentCanceledStatus(status: AppointmentStatus) {
  return CANCELED_STATUSES.has(status);
}

export function isAppointmentHistoryStatus(status: AppointmentStatus) {
  return HISTORY_STATUSES.has(status);
}

type AppointmentStatusPresentation = {
  label: string;
  description: string;
  variant:
    | "warning"
    | "success"
    | "info"
    | "secondary"
    | "destructive"
    | "outline";
  cardTone: string;
  allowedTransitions: readonly AppointmentStatus[];
};

export const APPOINTMENT_STATUS_PRESENTATION: Record<
  AppointmentStatus,
  AppointmentStatusPresentation
> = {
  REQUESTED: {
    label: APPOINTMENT_STATUS_LABELS.REQUESTED,
    description: "Aguardando confirmação do prestador.",
    variant: "warning",
    cardTone:
      "border-l-amber-600 bg-amber-100 text-amber-950 ring-1 ring-amber-200/90",
    allowedTransitions: APPOINTMENT_STATUS_TRANSITIONS.REQUESTED,
  },
  WAITING_INFO: {
    label: APPOINTMENT_STATUS_LABELS.WAITING_INFO,
    description: "Aguardando informações para confirmar o horário.",
    variant: "warning",
    cardTone:
      "border-l-amber-600 bg-amber-100 text-amber-950 ring-1 ring-amber-200/90",
    allowedTransitions: APPOINTMENT_STATUS_TRANSITIONS.WAITING_INFO,
  },
  CONFIRMED: {
    label: APPOINTMENT_STATUS_LABELS.CONFIRMED,
    description: "Horário confirmado.",
    variant: "success",
    cardTone:
      "border-l-emerald-600 bg-emerald-100 text-emerald-950 ring-1 ring-emerald-200/90",
    allowedTransitions: APPOINTMENT_STATUS_TRANSITIONS.CONFIRMED,
  },
  RESCHEDULED: {
    label: APPOINTMENT_STATUS_LABELS.RESCHEDULED,
    description: "Horário alterado e confirmado novamente.",
    variant: "info",
    cardTone:
      "border-l-blue-600 bg-blue-100 text-blue-950 ring-1 ring-blue-200/90",
    allowedTransitions: APPOINTMENT_STATUS_TRANSITIONS.RESCHEDULED,
  },
  IN_PROGRESS: {
    label: APPOINTMENT_STATUS_LABELS.IN_PROGRESS,
    description: "Atendimento em andamento.",
    variant: "info",
    cardTone:
      "border-l-blue-600 bg-blue-100 text-blue-950 ring-1 ring-blue-200/90",
    allowedTransitions: APPOINTMENT_STATUS_TRANSITIONS.IN_PROGRESS,
  },
  FINISHED: {
    label: APPOINTMENT_STATUS_LABELS.FINISHED,
    description: "Atendimento concluído.",
    variant: "secondary",
    cardTone:
      "border-l-stone-500 bg-stone-100 text-stone-900 ring-1 ring-stone-200/90",
    allowedTransitions: APPOINTMENT_STATUS_TRANSITIONS.FINISHED,
  },
  CANCELED_BY_CUSTOMER: {
    label: APPOINTMENT_STATUS_LABELS.CANCELED_BY_CUSTOMER,
    description: "Cancelado pelo cliente.",
    variant: "destructive",
    cardTone:
      "border-l-red-600 bg-red-100 text-red-950 ring-1 ring-red-200/90",
    allowedTransitions: APPOINTMENT_STATUS_TRANSITIONS.CANCELED_BY_CUSTOMER,
  },
  CANCELED_BY_PROVIDER: {
    label: APPOINTMENT_STATUS_LABELS.CANCELED_BY_PROVIDER,
    description: "Cancelado pelo prestador.",
    variant: "destructive",
    cardTone:
      "border-l-red-600 bg-red-100 text-red-950 ring-1 ring-red-200/90",
    allowedTransitions: APPOINTMENT_STATUS_TRANSITIONS.CANCELED_BY_PROVIDER,
  },
  NO_SHOW: {
    label: APPOINTMENT_STATUS_LABELS.NO_SHOW,
    description: "Cliente não compareceu.",
    variant: "outline",
    cardTone:
      "border-l-slate-400 bg-slate-100 text-slate-700 ring-1 ring-slate-200/90",
    allowedTransitions: APPOINTMENT_STATUS_TRANSITIONS.NO_SHOW,
  },
};

export function AppointmentStatusBadge({
  status,
  origin,
  className,
  badgeClassName,
}: {
  status: AppointmentStatus;
  origin?: AppointmentOrigin | null;
  className?: string;
  badgeClassName?: string;
}) {
  return (
    <span className={cn("inline-flex flex-wrap items-center gap-1.5", className)}>
      <Badge
        variant={APPOINTMENT_STATUS_PRESENTATION[status].variant}
        className={badgeClassName}
      >
        {APPOINTMENT_STATUS_PRESENTATION[status].label}
      </Badge>
      {origin ? (
        <span className="text-xs text-muted-foreground">
          {APPOINTMENT_ORIGIN_LABELS[origin]}
        </span>
      ) : null}
    </span>
  );
}
