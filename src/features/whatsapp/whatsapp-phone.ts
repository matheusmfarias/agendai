import { z } from "zod";

const BRAZIL_COUNTRY_CODE = "55";

export const brazilianWhatsAppPhoneSchema = z
  .string()
  .trim()
  .transform((value) => value.replace(/\D/g, ""))
  .transform((digits) =>
    digits.startsWith(BRAZIL_COUNTRY_CODE) ? digits.slice(2) : digits,
  )
  .refine((digits) => digits.length === 10 || digits.length === 11, {
    message: "Telefone deve conter DDD e 8 ou 9 dígitos.",
  })
  .refine((digits) => {
    const ddd = Number(digits.slice(0, 2));
    return ddd >= 11 && ddd <= 99 && digits[0] !== "0" && digits[1] !== "0";
  }, "DDD inválido.")
  .refine((digits) => {
    const subscriber = digits.slice(2);
    return !/^(\d)\1+$/.test(subscriber) && subscriber[0] !== "0";
  }, "Telefone inválido.")
  .refine((digits) => {
    const subscriber = digits.slice(2);
    return subscriber.length === 9
      ? subscriber.startsWith("9")
      : /^[2-5]/.test(subscriber);
  }, "Formato de celular ou telefone fixo inválido.")
  .transform((digits) => `${BRAZIL_COUNTRY_CODE}${digits}`);

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
