/**
 * Shared timezone helpers used by public booking and Typebot API flows.
 */

export const DEFAULT_TIMEZONE = "America/Sao_Paulo";

export type BookingTimezone =
  | "America/Sao_Paulo"
  | "America/Manaus"
  | "America/Cuiaba"
  | "America/Rio_Branco";

export function normalizeBookingTimezone(timezone?: string | null): BookingTimezone {
  if (
    timezone === "America/Manaus" ||
    timezone === "America/Cuiaba" ||
    timezone === "America/Rio_Branco"
  ) {
    return timezone;
  }

  return DEFAULT_TIMEZONE;
}

export function getDateStringInTimezone(
  date: Date,
  timezone: string = DEFAULT_TIMEZONE,
) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: normalizeBookingTimezone(timezone),
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function getDateTimeValueInTimezone(
  date: Date,
  timezone: string = DEFAULT_TIMEZONE,
) {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: normalizeBookingTimezone(timezone),
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  })
    .format(date)
    .replace(" ", "T");
}

export function getPartsInTimezone(
  date: Date,
  timezone: string = DEFAULT_TIMEZONE,
) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: normalizeBookingTimezone(timezone),
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );
  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };

  return {
    weekday: weekdayMap[values.weekday],
    minutes: Number(values.hour) * 60 + Number(values.minute),
  };
}

function zonedOffsetMs(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: normalizeBookingTimezone(timezone),
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );
  const localAsUtc = Date.UTC(
    Number(values.year),
    Number(values.month) - 1,
    Number(values.day),
    Number(values.hour),
    Number(values.minute),
    Number(values.second),
  );

  return localAsUtc - date.getTime();
}

export function dateAtMinutesInTimezone(
  date: string,
  minutes: number,
  timezone: string = DEFAULT_TIMEZONE,
) {
  const [year, month, day] = date.split("-").map(Number);
  const hours = String(Math.floor(minutes / 60)).padStart(2, "0");
  const mins = String(minutes % 60).padStart(2, "0");
  const localAsUtc = Date.UTC(
    year,
    month - 1,
    day,
    Number(hours),
    Number(mins),
    0,
  );
  const firstGuess = new Date(localAsUtc);
  const firstOffset = zonedOffsetMs(firstGuess, timezone);
  let utcMs = localAsUtc - firstOffset;
  const secondOffset = zonedOffsetMs(new Date(utcMs), timezone);

  if (secondOffset !== firstOffset) {
    utcMs = localAsUtc - secondOffset;
  }

  return new Date(utcMs);
}

export function parseLocalDateTimeInTimezone(
  value: string,
  timezone: string = DEFAULT_TIMEZONE,
) {
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;

  const hours = Number(match[2]);
  const minutes = Number(match[3]);
  if (hours > 23 || minutes > 59) return null;

  return dateAtMinutesInTimezone(
    match[1],
    hours * 60 + minutes,
    timezone,
  );
}

export function addDaysToDateString(date: string, days: number) {
  const [year, month, day] = date.split("-").map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + days, 12, 0, 0));
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(
    2,
    "0",
  )}-${String(next.getUTCDate()).padStart(2, "0")}`;
}

export function formatDateTimeLabel(
  date: Date,
  timezone: string = DEFAULT_TIMEZONE,
) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: normalizeBookingTimezone(timezone),
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(date);
}

export const getSaoPauloDateString = getDateStringInTimezone;
export const getSaoPauloDateTimeValue = getDateTimeValueInTimezone;
export const getSaoPauloParts = getPartsInTimezone;
export const dateAtMinutes = dateAtMinutesInTimezone;
