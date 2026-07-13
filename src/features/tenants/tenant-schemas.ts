import { z } from "zod";

import { dateInputSchema } from "@/lib/validation";

const RESERVED_SLUGS = new Set([
  "admin",
  "app",
  "api",
  "login",
  "access-denied",
  "cliente",
]);

const slugSchema = z
  .string()
  .trim()
  .min(3, "Informe um slug com ao menos 3 caracteres.")
  .max(80)
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Use apenas letras minúsculas, números e hífens.",
  )
  .refine((slug) => !RESERVED_SLUGS.has(slug), {
    message: "Este slug é reservado e não pode ser usado.",
  });

const documentNumberSchema = z
  .string()
  .trim()
  .max(20, "Informe um documento com no máximo 20 caracteres.")
  .optional()
  .refine((value) => {
    if (!value) return true;
    const digits = value.replace(/\D/g, "");
    return digits.length === 11 || digits.length === 14;
  }, "Informe um CPF ou CNPJ válido.");

const tenantBaseSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome do negócio."),
  slug: slugSchema,
  documentType: z.enum(["CPF", "CNPJ"]).optional(),
  documentNumber: documentNumberSchema,
  publicDisplayName: z.string().trim().max(120).optional(),
  responsibleName: z
    .string()
    .trim()
    .min(2, "Informe o nome do responsável."),
  email: z.string().trim().email("Informe um e-mail válido."),
  whatsapp: z.string().trim().min(8, "Informe o WhatsApp."),
  segment: z.string().trim().min(2, "Informe o segmento."),
  city: z.string().trim().min(2, "Informe a cidade."),
  state: z
    .string()
    .trim()
    .length(2, "Informe a UF com 2 caracteres.")
    .transform((value) => value.toUpperCase()),
  postalCode: z.string().trim().max(20).optional(),
  neighborhood: z.string().trim().max(100).optional(),
  address: z.string().trim().max(250).optional(),
  addressComplement: z.string().trim().max(120).optional(),
  googleMapsUrl: z
    .union([z.literal(""), z.string().trim().url("Informe uma URL válida.")])
    .optional(),
  serviceLocation: z.enum(["BUSINESS_ADDRESS", "CUSTOMER_ADDRESS", "BOTH"]),
  timezone: z.enum([
    "America/Sao_Paulo",
    "America/Manaus",
    "America/Cuiaba",
    "America/Rio_Branco",
  ]),
  defaultAppointmentDuration: z.coerce.number().int().min(5).max(720),
  defaultSlotInterval: z.coerce.number().int().min(5).max(240),
  minBookingNoticeMinutes: z.coerce.number().int().min(0).max(43200),
  maxBookingAdvanceDays: z.coerce.number().int().min(1).max(365),
  description: z.string().trim().max(2000).optional(),
  status: z.enum(["ACTIVE", "SUSPENDED", "CANCELED"]),
});

const ownerCredentialsSchema = z
  .object({
    ownerName: z
      .string()
      .trim()
      .min(2, "Informe o nome do usuário responsável."),
    ownerEmail: z
      .string()
      .trim()
      .email("Informe um e-mail de login válido.")
      .transform((value) => value.toLowerCase()),
    initialPassword: z
      .string()
      .min(8, "A senha deve ter ao menos 8 caracteres."),
    confirmInitialPassword: z
      .string()
      .min(1, "Confirme a senha inicial."),
  })
  .refine(
    (data) => data.initialPassword === data.confirmInitialPassword,
    {
      message: "A confirmação deve ser igual à senha inicial.",
      path: ["confirmInitialPassword"],
    },
  );

export const createTenantSchema = tenantBaseSchema
  .extend({
    planId: z.string().uuid("Selecione um plano válido."),
    billingCycle: z.enum(["MONTHLY", "ANNUAL"]),
    expiresAt: dateInputSchema,
  })
  .and(ownerCredentialsSchema);

export const updateTenantSchema = tenantBaseSchema.extend({
  id: z.string().uuid(),
});

export const changeTenantStatusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["ACTIVE", "SUSPENDED", "CANCELED"]),
});

export const provisionTenantOwnerSchema = ownerCredentialsSchema.and(
  z.object({
    tenantId: z.string().uuid(),
  }),
);

export const resetTenantOwnerPasswordSchema = z
  .object({
    tenantId: z.string().uuid(),
    userId: z.string().uuid(),
    newPassword: z
      .string()
      .min(8, "A nova senha deve ter ao menos 8 caracteres."),
    confirmNewPassword: z.string().min(1, "Confirme a nova senha."),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: "A confirmação deve ser igual à nova senha.",
    path: ["confirmNewPassword"],
  });

export type CreateTenantInput = z.infer<typeof createTenantSchema>;
export type UpdateTenantInput = z.infer<typeof updateTenantSchema>;
export type ProvisionTenantOwnerInput = z.infer<
  typeof provisionTenantOwnerSchema
>;
export type ResetTenantOwnerPasswordInput = z.infer<
  typeof resetTenantOwnerPasswordSchema
>;
