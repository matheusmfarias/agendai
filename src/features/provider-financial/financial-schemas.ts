import { z } from "zod";

import { parseBrazilianDecimal } from "@/lib/input-formatters";

const optionalString = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().trim().optional(),
);

const optionalUuid = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().uuid().optional(),
);

const dateString = z
  .string({ error: "Informe uma data." })
  .min(1, "Informe uma data.")
  .transform((value) => new Date(`${value}T12:00:00-03:00`));

const optionalDateString = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z
    .string()
    .transform((value) => new Date(`${value}T12:00:00-03:00`))
    .optional(),
);

const optionalDateFilter = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
);

const formBoolean = z.preprocess(
  (value) => value === true || value === "true" || value === "on",
  z.boolean(),
);

const csvStringList = z.preprocess((value) => {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string") return [];

  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}, z.array(z.string().trim().min(2)).default([]));

const methodList = z.preprocess((value) => {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string") return [];
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}, z.array(z.enum(["pix", "cash", "credit-card", "debit-card", "transfer", "other"])).min(1, "Selecione ao menos um método."));

export function parseMoneyToCents(value: unknown) {
  const amount = parseBrazilianDecimal(value);

  return Number.isFinite(amount) ? Math.round(amount * 100) : Number.NaN;
}

export const createFinancialEntrySchema = z.object({
  type: z.enum(["REVENUE", "EXPENSE", "REFUND", "ADJUSTMENT"]),
  status: z.enum(["PAID", "PENDING", "OVERDUE", "CANCELED", "REFUNDED"]),
  description: z.string().trim().min(3, "Descreva o lançamento."),
  amount: z
    .unknown()
    .transform(parseMoneyToCents)
    .pipe(z.number().int().positive("Informe um valor maior que zero.")),
  entryDate: dateString,
  dueDate: optionalDateString,
  paymentMethod: z
    .enum(["PIX", "CASH", "CREDIT_CARD", "DEBIT_CARD", "BANK_TRANSFER", "OTHER"])
    .optional(),
  category: optionalString,
  notes: optionalString,
  customerId: optionalUuid,
  serviceId: optionalUuid,
  appointmentId: optionalUuid,
});

export const updateFinancialEntrySchema = createFinancialEntrySchema.extend({
  id: z.string().uuid("Lançamento inválido."),
});

export const markFinancialEntryAsPaidSchema = z.object({
  id: z.string().uuid(),
  paidAt: optionalDateString,
  paymentMethod: z
    .enum(["PIX", "CASH", "CREDIT_CARD", "DEBIT_CARD", "BANK_TRANSFER", "OTHER"])
    .optional(),
});

export const registerFinancialPaymentSchema = z.object({
  id: z.string().uuid("Lançamento inválido."),
  amount: z
    .unknown()
    .transform(parseMoneyToCents)
    .pipe(z.number().int().positive("Informe um valor maior que zero.")),
  paidAt: dateString,
  paymentMethod: z.enum([
    "PIX",
    "CASH",
    "CREDIT_CARD",
    "DEBIT_CARD",
    "BANK_TRANSFER",
    "OTHER",
  ]),
  notes: optionalString,
});

export const refundFinancialEntrySchema = z.object({
  id: z.string().uuid("Lançamento inválido."),
  amount: z
    .unknown()
    .transform(parseMoneyToCents)
    .pipe(z.number().int().positive("Informe um valor maior que zero.")),
  reason: z.string().trim().min(5, "Informe o motivo do estorno."),
});

export const cancelFinancialEntrySchema = z.object({
  id: z.string().uuid("Lançamento inválido."),
  reason: z.string().trim().min(5, "Informe o motivo do cancelamento."),
});

export const financialFiltersSchema = z.object({
  period: z
    .enum(["today", "7d", "30d", "this-month", "last-month", "custom"])
    .catch("this-month"),
  startDate: optionalDateFilter.catch(undefined),
  endDate: optionalDateFilter.catch(undefined),
  q: z.string().trim().optional().catch(undefined),
  status: z
    .enum(["paid", "pending", "overdue", "canceled", "refunded"])
    .optional()
    .catch(undefined),
  method: z
    .enum(["pix", "cash", "credit-card", "debit-card", "transfer", "other"])
    .optional()
    .catch(undefined),
  type: z
    .enum(["revenue", "expense", "refund", "adjustment"])
    .optional()
    .catch(undefined),
  service: z.string().trim().optional().catch(undefined),
  category: z.string().trim().optional().catch(undefined),
});

export const updateFinancialSettingsSchema = z.object({
  currency: z.literal("BRL").default("BRL"),
  acceptedMethods: methodList,
  revenueCategories: csvStringList,
  expenseCategories: csvStringList,
  manualControl: formBoolean,
  payAtLocation: formBoolean,
  requireCheckout: formBoolean,
  allowPartialPayments: formBoolean,
  defaultDueDays: z.coerce
    .number()
    .int()
    .min(0, "Informe um prazo maior ou igual a zero.")
    .max(90, "O prazo máximo é 90 dias."),
  reminderTemplate: z
    .string()
    .trim()
    .min(10, "Informe uma mensagem padrão.")
    .max(500, "Use no máximo 500 caracteres."),
});

export type CreateFinancialEntryInput = z.infer<typeof createFinancialEntrySchema>;
export type UpdateFinancialEntryInput = z.infer<typeof updateFinancialEntrySchema>;
export type RegisterFinancialPaymentInput = z.infer<
  typeof registerFinancialPaymentSchema
>;
export type RefundFinancialEntryInput = z.infer<typeof refundFinancialEntrySchema>;
export type FinancialFilterInput = z.infer<typeof financialFiltersSchema>;
export type UpdateFinancialSettingsInput = z.infer<
  typeof updateFinancialSettingsSchema
>;
