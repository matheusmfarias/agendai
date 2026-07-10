import { z } from "zod";

import {
  normalizeCustomerEmail,
  normalizeCustomerPhone,
} from "@/features/customers/customer-normalization";

const formBoolean = z.preprocess(
  (value) => value === true || value === "true" || value === "on",
  z.boolean(),
);

const optionalEmail = z.preprocess(
  (value) => normalizeCustomerEmail(typeof value === "string" ? value : ""),
  z.string().email("Informe um e-mail válido.").optional().nullable(),
);

const phoneSchema = z.preprocess(
  (value) => normalizeCustomerPhone(typeof value === "string" ? value : ""),
  z
    .string()
    .min(10, "Informe um telefone com DDD.")
    .max(11, "Informe um telefone válido."),
);

const customerBaseSchema = z
  .object({
    name: z.string().trim().min(2, "Informe o nome do cliente.").max(160),
    phone: phoneSchema,
    email: optionalEmail,
    notes: z.string().trim().max(2000).optional(),
    isActive: formBoolean,
  })
  .superRefine((data, context) => {
    if (data.phone.length < 10) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["phone"],
        message: "Informe um telefone com DDD.",
      });
    }
  });

export const createCustomerSchema = customerBaseSchema;
export const updateCustomerSchema = customerBaseSchema.extend({
  id: z.string().uuid("Cliente inválido."),
});
export const changeCustomerStatusSchema = z.object({
  id: z.string().uuid("Cliente inválido."),
  isActive: formBoolean,
});

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
