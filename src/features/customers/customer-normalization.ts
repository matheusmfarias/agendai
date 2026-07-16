import {
  formatBrazilianPhone,
} from "@/lib/input-formatters";
import { normalizeBrazilianCustomerPhone } from "@/features/booking-core/phone";

export function normalizeCustomerPhone(value: string | null | undefined) {
  return normalizeBrazilianCustomerPhone(value) ?? "";
}

export function formatCustomerPhone(value: string | null | undefined) {
  return formatBrazilianPhone(value);
}

export function normalizeCustomerEmail(value: string | null | undefined) {
  const email = String(value ?? "").trim().toLowerCase();
  return email || null;
}

export function normalizeCustomerText(value: string | null | undefined) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

export function customerWhatsappHref(phone: string | null | undefined) {
  const digits = normalizeCustomerPhone(phone);
  if (digits.length < 10) return null;
  return `https://wa.me/55${digits}`;
}
