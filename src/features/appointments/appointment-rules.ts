import type { AppointmentStatus } from "@/generated/prisma/client";
import { getPartsInTimezone } from "@/features/booking-core/timezone";

export const BLOCKING_APPOINTMENT_STATUSES: AppointmentStatus[] = [
  "REQUESTED",
  "CONFIRMED",
  "WAITING_INFO",
  "RESCHEDULED",
  "IN_PROGRESS",
];

export const TERMINAL_APPOINTMENT_STATUSES: AppointmentStatus[] = [
  "CANCELED_BY_CUSTOMER",
  "CANCELED_BY_PROVIDER",
  "NO_SHOW",
  "FINISHED",
];

export const APPOINTMENT_STATUS_TRANSITIONS: Record<
  AppointmentStatus,
  AppointmentStatus[]
> = {
  REQUESTED: ["CONFIRMED", "CANCELED_BY_PROVIDER"],
  CONFIRMED: ["IN_PROGRESS", "CANCELED_BY_PROVIDER", "NO_SHOW"],
  WAITING_INFO: ["CONFIRMED", "CANCELED_BY_PROVIDER"],
  RESCHEDULED: ["IN_PROGRESS", "CANCELED_BY_PROVIDER", "NO_SHOW"],
  CANCELED_BY_CUSTOMER: [],
  CANCELED_BY_PROVIDER: [],
  NO_SHOW: [],
  IN_PROGRESS: ["FINISHED"],
  FINISHED: [],
};

export function intervalsOverlap(
  startsAt: Date,
  endsAt: Date,
  existingStartsAt: Date,
  existingEndsAt: Date,
) {
  return startsAt < existingEndsAt && endsAt > existingStartsAt;
}

export function canTransitionAppointmentStatus(
  current: AppointmentStatus,
  next: AppointmentStatus,
) {
  return APPOINTMENT_STATUS_TRANSITIONS[current].includes(next);
}

export function calculateAppointmentEnd(
  startsAt: Date,
  durationMinutes: number,
) {
  return new Date(startsAt.getTime() + durationMinutes * 60_000);
}

type AvailabilityRuleInterval = {
  weekday: number;
  startMinutes: number;
  endMinutes: number;
};

export function isWithinRecurringAvailability(
  startsAt: Date,
  endsAt: Date,
  rules: AvailabilityRuleInterval[],
  timezone = "America/Sao_Paulo",
) {
  const start = getPartsInTimezone(startsAt, timezone);
  const end = getPartsInTimezone(endsAt, timezone);

  if (start.weekday !== end.weekday) return false;

  return rules.some(
    (rule) =>
      rule.weekday === start.weekday &&
      start.minutes >= rule.startMinutes &&
      end.minutes <= rule.endMinutes,
  );
}

export function timeDateToMinutes(value: Date) {
  return value.getUTCHours() * 60 + value.getUTCMinutes();
}
