function yearInTimezone(date: Date, timezone: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    year: "numeric",
    timeZone: timezone,
  }).format(date);
}

function capitalizeFirst(value: string) {
  return value.charAt(0).toLocaleUpperCase("pt-BR") + value.slice(1);
}

export function formatPublicBookingDate(
  date: Date,
  timezone: string,
  now = new Date(),
) {
  const includeYear =
    yearInTimezone(date, timezone) !== yearInTimezone(now, timezone);
  const formatted = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    ...(includeYear ? { year: "numeric" as const } : {}),
    timeZone: timezone,
  }).format(date);

  return capitalizeFirst(formatted);
}

export function formatPublicBookingTime(date: Date, timezone: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: timezone,
  }).format(date);
}
