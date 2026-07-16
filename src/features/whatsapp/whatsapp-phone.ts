import { z } from "zod";

import { normalizeBrazilianCustomerPhone } from "@/features/booking-core/phone";

const BRAZIL_COUNTRY_CODE = "55";

export const brazilianWhatsAppPhoneSchema = z
  .string()
  .trim()
  .transform((value, context) => {
    const national = normalizeBrazilianCustomerPhone(value);
    if (!national) {
      context.addIssue({
        code: "custom",
        message: "Telefone deve conter DDD e 8 ou 9 dígitos.",
      });
      return z.NEVER;
    }

    const subscriber = national.slice(2);
    if (subscriber[0] === "0" || /^(\d)\1+$/.test(subscriber)) {
      context.addIssue({ code: "custom", message: "Telefone inválido." });
      return z.NEVER;
    }
    return `${BRAZIL_COUNTRY_CODE}${national}`;
  });

export function normalizeBrazilianWhatsAppPhone(value: string) {
  const parsed = brazilianWhatsAppPhoneSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export function maskWhatsAppPhone(value: string | null) {
  if (!value) return null;
  const digits = value.replace(/\D/g, "");
  if (digits.length < 6) return "••••";
  return `+${digits.slice(0, 2)} •• •••••-${digits.slice(-4)}`;
}
