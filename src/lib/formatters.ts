import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export function formatCurrency(value: number | string) {
  return Number(value).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function formatDate(value: Date | string | null | undefined) {
  if (!value) {
    return "—";
  }

  return format(new Date(value), "dd/MM/yyyy", { locale: ptBR });
}

export function formatDateTime(value: Date | string) {
  return format(new Date(value), "dd/MM/yyyy HH:mm", { locale: ptBR });
}

export function toDateInputValue(value: Date | string) {
  return format(new Date(value), "yyyy-MM-dd");
}

export function toDateTimeInputValue(value: Date | string) {
  return format(new Date(value), "yyyy-MM-dd'T'HH:mm");
}

export function toSaoPauloDateTimeInputValue(value: Date | string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(value));
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}`;
}

export function formatTime(value: Date | string) {
  const date = new Date(value);
  return `${String(date.getUTCHours()).padStart(2, "0")}:${String(date.getUTCMinutes()).padStart(2, "0")}`;
}
