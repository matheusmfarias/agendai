import {
  BLOCKING_APPOINTMENT_STATUSES,
  calculateAppointmentEnd,
  isWithinRecurringAvailability,
  timeDateToMinutes,
} from "@/features/appointments/appointment-rules";
import {
  addDaysToDateString,
  dateAtMinutesInTimezone,
  formatDateTimeLabel,
  getDateStringInTimezone,
  getDateTimeValueInTimezone,
  getPartsInTimezone,
  normalizeBookingTimezone,
} from "@/features/booking-core/timezone";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

function publicStatusForBookingMode(
  bookingMode: "DIRECT" | "REQUIRES_CONFIRMATION" | "INFORMATIONAL",
) {
  if (bookingMode === "DIRECT") return "CONFIRMED";
  if (bookingMode === "REQUIRES_CONFIRMATION") return "REQUESTED";
  return "WAITING_INFO";
}

export { publicStatusForBookingMode };

export async function getAvailableSlots(tenantId: string, serviceId: string) {
  const [tenant, service] = await Promise.all([
    prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        timezone: true,
        defaultAppointmentDuration: true,
        defaultSlotInterval: true,
        minBookingNoticeMinutes: true,
        maxBookingAdvanceDays: true,
      },
    }),
    prisma.service.findFirst({
      where: {
        id: serviceId,
        tenantId,
        isActive: true,
        category: { isActive: true },
      },
      select: { durationMinutes: true },
    }),
  ]);
  if (!tenant || !service) return [];

  const timezone = normalizeBookingTimezone(tenant.timezone);
  const durationMinutes =
    service.durationMinutes || tenant.defaultAppointmentDuration;
  const slotFallback = Math.max(1, tenant.defaultSlotInterval);
  const windowDays = Math.max(1, tenant.maxBookingAdvanceDays);
  const earliestStart = new Date(
    Date.now() + tenant.minBookingNoticeMinutes * 60_000,
  );
  const today = getDateStringInTimezone(new Date(), timezone);
  const dates = Array.from({ length: windowDays }, (_, index) =>
    addDaysToDateString(today, index),
  );
  const weekdays = dates.map((date) => {
    const parts = getPartsInTimezone(
      dateAtMinutesInTimezone(date, 12 * 60, timezone),
      timezone,
    );
    return { date, weekday: parts.weekday };
  });
  const rules = await prisma.availabilityRule.findMany({
    where: {
      tenantId,
      isActive: true,
      weekday: { in: weekdays.map((item) => item.weekday) },
    },
    orderBy: [{ weekday: "asc" }, { startTime: "asc" }],
  });
  const windowStart = dateAtMinutesInTimezone(dates[0], 0, timezone);
  const windowEnd = dateAtMinutesInTimezone(
    addDaysToDateString(dates[dates.length - 1], 1),
    0,
    timezone,
  );
  const [appointments, blocks] = await Promise.all([
    prisma.appointment.findMany({
      where: {
        tenantId,
        status: { in: BLOCKING_APPOINTMENT_STATUSES },
        startsAt: { lt: windowEnd },
        endsAt: { gt: windowStart },
      },
      select: { startsAt: true, endsAt: true },
    }),
    prisma.scheduleBlock.findMany({
      where: {
        tenantId,
        startsAt: { lt: windowEnd },
        endsAt: { gt: windowStart },
      },
      select: { startsAt: true, endsAt: true },
    }),
  ]);

  return weekdays.flatMap(({ date, weekday }) =>
    rules
      .filter((rule) => rule.weekday === weekday)
      .flatMap((rule) => {
        const start = timeDateToMinutes(rule.startTime);
        const end = timeDateToMinutes(rule.endTime);
        const interval = rule.slotIntervalMinutes || slotFallback;
        const values: {
          value: string;
          label: string;
          date: string;
          startsAt: Date;
          endsAt: Date;
        }[] = [];

        for (
          let minutes = start;
          minutes + durationMinutes <= end;
          minutes += interval
        ) {
          const startsAt = dateAtMinutesInTimezone(date, minutes, timezone);
          const endsAt = calculateAppointmentEnd(startsAt, durationMinutes);
          const unavailable =
            startsAt < earliestStart ||
            appointments.some(
              (appointment) =>
                startsAt < appointment.endsAt &&
                endsAt > appointment.startsAt,
            ) ||
            blocks.some(
              (block) =>
                startsAt < block.endsAt && endsAt > block.startsAt,
            );

          if (!unavailable) {
            values.push({
              value: getDateTimeValueInTimezone(startsAt, timezone),
              label: formatDateTimeLabel(startsAt, timezone),
              date,
              startsAt,
              endsAt,
            });
          }
        }

        return values;
      }),
  );
}

export async function assertNoSlotConflict(
  tx: Prisma.TransactionClient,
  tenantId: string,
  startsAt: Date,
  endsAt: Date,
) {
  const [conflict, block] = await Promise.all([
    tx.appointment.findFirst({
      where: {
        tenantId,
        status: { in: BLOCKING_APPOINTMENT_STATUSES },
        startsAt: { lt: endsAt },
        endsAt: { gt: startsAt },
      },
      select: { id: true },
    }),
    tx.scheduleBlock.findFirst({
      where: {
        tenantId,
        startsAt: { lt: endsAt },
        endsAt: { gt: startsAt },
      },
      select: { id: true },
    }),
  ]);

  if (conflict) {
    throw new Error(
      "Este horário acabou de ser ocupado. Escolha outro horário.",
    );
  }

  if (block) {
    throw new Error("Este horário está bloqueado. Escolha outro horário.");
  }
}

export async function assertAvailability(
  tx: Prisma.TransactionClient,
  tenantId: string,
  startsAt: Date,
  endsAt: Date,
) {
  const tenant = await tx.tenant.findUnique({
    where: { id: tenantId },
    select: {
      timezone: true,
      minBookingNoticeMinutes: true,
      maxBookingAdvanceDays: true,
    },
  });
  if (!tenant) {
    throw new Error("Prestador não encontrado.");
  }

  const timezone = normalizeBookingTimezone(tenant.timezone);
  const earliestStart = new Date(
    Date.now() + tenant.minBookingNoticeMinutes * 60_000,
  );
  if (startsAt < earliestStart) {
    throw new Error(
      "Este horário não respeita a antecedência mínima para agendamento.",
    );
  }

  const today = getDateStringInTimezone(new Date(), timezone);
  const maxDate = addDaysToDateString(today, tenant.maxBookingAdvanceDays);
  const latestStartExclusive = dateAtMinutesInTimezone(maxDate, 0, timezone);
  if (startsAt >= latestStartExclusive) {
    throw new Error("Este horário está fora do período liberado da agenda.");
  }

  const rules = await tx.availabilityRule.findMany({
    where: { tenantId, isActive: true },
    select: {
      weekday: true,
      startTime: true,
      endTime: true,
      slotIntervalMinutes: true,
    },
  });
  const intervals = rules.map((rule) => ({
    weekday: rule.weekday,
    startMinutes: timeDateToMinutes(rule.startTime),
    endMinutes: timeDateToMinutes(rule.endTime),
    slotIntervalMinutes: rule.slotIntervalMinutes,
  }));

  if (!isWithinRecurringAvailability(startsAt, endsAt, intervals, timezone)) {
    throw new Error("Selecione um horário disponível.");
  }

  const start = getPartsInTimezone(startsAt, timezone);
  const aligned = intervals.some(
    (rule) =>
      rule.weekday === start.weekday &&
      start.minutes >= rule.startMinutes &&
      (start.minutes - rule.startMinutes) % rule.slotIntervalMinutes === 0,
  );

  if (!aligned) {
    throw new Error("Selecione um horário disponível.");
  }
}
