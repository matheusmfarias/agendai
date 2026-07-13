import { z } from "zod";

import { parseBrazilianDecimal } from "@/lib/input-formatters";
import { dateInputSchema } from "@/lib/validation";

const moneySchema = z.preprocess(
  parseBrazilianDecimal,
  z.number().min(0, "O valor não pode ser negativo.").max(99999999),
);

export const updateSubscriptionSchema = z
  .object({
    id: z.string().uuid(),
    planId: z.string().uuid("Selecione um plano valido."),
    status: z.enum(["TRIAL", "ACTIVE", "PAST_DUE", "SUSPENDED", "CANCELED"]),
    billingCycle: z.enum(["MONTHLY", "ANNUAL"]),
    price: moneySchema,
    startsAt: dateInputSchema,
    expiresAt: dateInputSchema,
    lastPaymentAt: z
      .union([z.literal(""), dateInputSchema])
      .optional()
      .transform((value) => (value === "" ? undefined : value)),
    paymentMethod: z.string().trim().max(100).optional(),
    internalNotes: z.string().trim().max(3000).optional(),
  })
  .refine((data) => data.expiresAt >= data.startsAt, {
    message: "O vencimento deve ser posterior ao inicio.",
    path: ["expiresAt"],
  });

export const registerPaymentSchema = z.object({
  id: z.string().uuid(),
  paymentDate: dateInputSchema,
  paymentMethod: z.string().trim().min(2, "Informe a forma de pagamento."),
  amountPaid: moneySchema,
  newExpiresAt: dateInputSchema,
  internalNotes: z.string().trim().max(3000).optional(),
});

export const changeExpirationSchema = z.object({
  id: z.string().uuid(),
  expiresAt: dateInputSchema,
  reason: z.string().trim().min(3, "Informe o motivo do ajuste.").max(1000),
});

export const changeSubscriptionStatusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["ACTIVE", "SUSPENDED", "CANCELED"]),
});

export type UpdateSubscriptionInput = z.infer<
  typeof updateSubscriptionSchema
>;
export type RegisterPaymentInput = z.infer<typeof registerPaymentSchema>;
export type ChangeExpirationInput = z.infer<typeof changeExpirationSchema>;
