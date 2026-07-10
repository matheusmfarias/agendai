import { formatCurrency } from "@/lib/formatters";

type ServicePriceLike = {
  priceType: "FIXED" | "STARTING_AT" | "ON_REQUEST" | "HIDDEN";
  priceValue: string | null;
};

export const TIME_OPTIONS = Array.from({ length: 24 * 12 }, (_, index) => {
  const totalMinutes = index * 5;
  const hour = Math.floor(totalMinutes / 60);
  const minute = totalMinutes % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
});

export function toDateInputValue(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function selectedDateToLocalDate(value: string) {
  return new Date(`${value}T12:00:00-03:00`);
}

export function splitDateTimeLocal(value: string) {
  const [date = "", time = ""] = value.split("T");
  return {
    date,
    time: time.slice(0, 5),
  };
}

export function joinDateTimeLocal(date: string, time: string) {
  if (!date || !time) return "";
  return `${date}T${time}`;
}

export function servicePriceAmount(service?: ServicePriceLike | null) {
  if (!service?.priceValue) return 0;
  const amount = Number(service.priceValue);
  return Number.isFinite(amount) ? amount : 0;
}

export function formatServicePrice(service: ServicePriceLike) {
  if (!service.priceValue) return "Sob consulta";

  const value = formatCurrency(service.priceValue);
  if (service.priceType === "STARTING_AT") return `A partir de ${value}`;
  if (service.priceType === "ON_REQUEST") return `Sob consulta - ${value}`;
  if (service.priceType === "HIDDEN") return "Preco oculto";
  return value;
}

export function formatMonthTitle(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
  }).format(selectedDateToLocalDate(value));
}

export function formatDayLabel(value: string) {
  if (!value) return "Escolha uma data";

  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(selectedDateToLocalDate(value));
}

export function addMonths(value: string, amount: number) {
  const date = selectedDateToLocalDate(value || toDateInputValue(new Date()));
  return toDateInputValue(
    new Date(date.getFullYear(), date.getMonth() + amount, 1),
  );
}

export function getMonthDays(value: string) {
  const base = selectedDateToLocalDate(value || toDateInputValue(new Date()));
  const year = base.getFullYear();
  const month = base.getMonth();
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const leading = first.getDay();
  const days: { label: string; value: string; muted: boolean }[] = [];

  for (let i = leading - 1; i >= 0; i -= 1) {
    const date = new Date(year, month, -i);
    days.push({
      label: String(date.getDate()),
      value: toDateInputValue(date),
      muted: true,
    });
  }

  for (let day = 1; day <= last.getDate(); day += 1) {
    const date = new Date(year, month, day);
    days.push({
      label: String(day),
      value: toDateInputValue(date),
      muted: false,
    });
  }

  while (days.length % 7 !== 0) {
    const date = new Date(year, month + 1, days.length % 7);
    days.push({
      label: String(date.getDate()),
      value: toDateInputValue(date),
      muted: true,
    });
  }

  return days;
}
