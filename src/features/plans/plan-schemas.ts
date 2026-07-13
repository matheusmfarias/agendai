import { z } from "zod";

import { parseBrazilianDecimal } from "@/lib/input-formatters";

const moneySchema = z.preprocess(
  parseBrazilianDecimal,
  z.number().min(0, "O valor não pode ser negativo.").max(99999999),
);

const planBaseSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome do plano."),
  description: z.string().trim().max(1000).optional(),
  monthlyPrice: moneySchema,
  annualPrice: moneySchema,
  whatsappEnabled: z.coerce.boolean(),
  publicLinkEnabled: z.coerce.boolean(),
  isActive: z.coerce.boolean(),
});

export const createPlanSchema = planBaseSchema;
export const updatePlanSchema = planBaseSchema.extend({
  id: z.string().uuid(),
});

export type CreatePlanInput = z.infer<typeof createPlanSchema>;
export type UpdatePlanInput = z.infer<typeof updatePlanSchema>;
