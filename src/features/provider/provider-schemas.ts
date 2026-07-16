import { z } from "zod";

import { parseBrazilianDecimal } from "@/lib/input-formatters";

const formBoolean = z.preprocess(
  (value) => value === true || value === "true" || value === "on",
  z.boolean(),
);

const positionSchema = z.coerce
  .number()
  .int("A ordem deve ser um número inteiro.")
  .min(0, "A ordem não pode ser negativa.");

const timeSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Informe um horário válido.");

const dateTimeSchema = z
  .string()
  .min(1, "Informe a data e hora.")
  .transform((value, context) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      context.addIssue({ code: "custom", message: "Informe uma data válida." });
      return z.NEVER;
    }
    return date;
  });

export const providerSettingsSchema = z
  .object({
    name: z.string().trim().min(2, "Informe o nome do negócio.").max(120),
    publicLinkActive: formBoolean,
    publicDisplayName: z.string().trim().max(120).optional(),
    logoUrl: z.string().trim().max(500).optional(),
    responsibleName: z
      .string()
      .trim()
      .min(2, "Informe o nome do responsável.")
      .max(120),
    email: z
      .string()
      .trim()
      .email("Informe um e-mail válido.")
      .transform((value) => value.toLowerCase()),
    whatsapp: z.string().trim().min(8, "Informe o WhatsApp.").max(30),
    segment: z.string().trim().min(2, "Informe o segmento.").max(100),
    city: z.string().trim().min(2, "Informe a cidade.").max(100),
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
    locale: z.enum(["pt-BR"]),
    currency: z.enum(["BRL"]),
    weekStartsOn: z.coerce.number().int().min(0).max(1),
    timeFormat: z.enum(["24H", "12H"]),
    defaultAppointmentDuration: z.coerce.number().int().min(5).max(720),
    defaultSlotInterval: z.coerce.number().int().min(5).max(240),
    minBookingNoticeMinutes: z.coerce.number().int().min(0).max(43200),
    maxBookingAdvanceDays: z.coerce.number().int().min(1).max(365),
    allowCustomerCancellation: formBoolean,
    allowCustomerRescheduling: formBoolean,
    cancellationNoticeHours: z.coerce.number().int().min(0).max(720),
    description: z.string().trim().max(2000).optional(),
  })
  .transform((data) => ({
    ...data,
    publicDisplayName: data.publicDisplayName || null,
    logoUrl: data.logoUrl || null,
    postalCode: data.postalCode || null,
    neighborhood: data.neighborhood || null,
    address: data.address || null,
    addressComplement: data.addressComplement || null,
    googleMapsUrl: data.googleMapsUrl || null,
    description: data.description || null,
  }));

const categoryBaseSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome da categoria.").max(120),
  description: z.string().trim().max(1000).optional(),
  position: positionSchema,
  isActive: formBoolean,
});

export const createServiceCategorySchema = categoryBaseSchema;
export const updateServiceCategorySchema = categoryBaseSchema.extend({
  id: z.string().uuid("Categoria inválida."),
});
export const changeServiceCategoryStatusSchema = z.object({
  id: z.string().uuid("Categoria inválida."),
  isActive: formBoolean,
});

const serviceBaseSchema = z
  .object({
    categoryId: z.string().uuid("Selecione uma categoria válida."),
    name: z.string().trim().min(2, "Informe o nome do serviço.").max(160),
    description: z.string().trim().max(2000).optional(),
    durationMinutes: z.coerce
      .number()
      .int("A duração deve ser um número inteiro.")
      .positive("A duração deve ser maior que zero."),
    priceType: z.enum(["FIXED", "STARTING_AT", "ON_REQUEST", "HIDDEN"]),
    priceValue: z
      .union([
        z.literal(""),
        z.preprocess(parseBrazilianDecimal, z.number().min(0)),
      ])
      .optional(),
    bookingMode: z.enum([
      "DIRECT",
      "REQUIRES_CONFIRMATION",
      "INFORMATIONAL",
    ]),
    requiresManualConfirmation: formBoolean,
    internalNotes: z.string().trim().max(2000).optional(),
    position: positionSchema,
    isActive: formBoolean,
  })
  .superRefine((data, context) => {
    if (
      (data.priceType === "FIXED" || data.priceType === "STARTING_AT") &&
      (data.priceValue === "" || data.priceValue === undefined)
    ) {
      context.addIssue({
        code: "custom",
        path: ["priceValue"],
        message: "Informe o valor do serviço.",
      });
    }
  })
  .transform((data) => ({
    ...data,
    priceValue:
      data.priceType === "ON_REQUEST" || data.priceType === "HIDDEN"
        ? null
        : Number(data.priceValue),
  }));

export const createServiceSchema = serviceBaseSchema;
export const updateServiceSchema = z
  .object({ id: z.string().uuid("Serviço inválido.") })
  .and(serviceBaseSchema);
export const changeServiceStatusSchema = z.object({
  id: z.string().uuid("Serviço inválido."),
  isActive: formBoolean,
});

const customFieldBaseSchema = z
  .object({
    serviceId: z.string().uuid("Serviço inválido."),
    label: z.string().trim().min(2, "Informe o rótulo.").max(120),
    key: z
      .string()
      .trim()
      .min(2, "Informe a chave.")
      .max(80)
      .regex(
        /^[a-z][a-z0-9_]*$/,
        "Use letras minúsculas, números e underscore, começando por letra.",
      ),
    fieldType: z.enum([
      "TEXT",
      "TEXTAREA",
      "NUMBER",
      "DATE",
      "BOOLEAN",
      "SELECT",
    ]),
    options: z.string().trim().max(2000).optional(),
    isRequired: formBoolean,
    position: positionSchema,
    isActive: formBoolean,
  })
  .superRefine((data, context) => {
    if (
      data.fieldType === "SELECT" &&
      (!data.options ||
        data.options
          .split(/\r?\n/)
          .map((option) => option.trim())
          .filter(Boolean).length === 0)
    ) {
      context.addIssue({
        code: "custom",
        path: ["options"],
        message: "Informe ao menos uma opção para o campo de seleção.",
      });
    }
  })
  .transform((data) => ({
    ...data,
    options:
      data.fieldType === "SELECT"
        ? data.options
            ?.split(/\r?\n/)
            .map((option) => option.trim())
            .filter(Boolean) ?? []
        : null,
  }));

export const createCustomFieldSchema = customFieldBaseSchema;
export const updateCustomFieldSchema = z
  .object({ id: z.string().uuid("Campo inválido.") })
  .and(customFieldBaseSchema);
export const changeCustomFieldStatusSchema = z.object({
  id: z.string().uuid("Campo inválido."),
  serviceId: z.string().uuid("Serviço inválido."),
  isActive: formBoolean,
});

const availabilityRuleBaseSchema = z
  .object({
    weekday: z.coerce.number().int().min(0).max(6),
    startTime: timeSchema,
    endTime: timeSchema,
    slotIntervalMinutes: z.coerce
      .number()
      .int("O intervalo deve ser um número inteiro.")
      .positive("O intervalo deve ser maior que zero."),
    isActive: formBoolean,
  })
  .refine((data) => data.endTime > data.startTime, {
    path: ["endTime"],
    message: "A hora final deve ser maior que a inicial.",
  });

export const createAvailabilityRuleSchema = availabilityRuleBaseSchema;
export const updateAvailabilityRuleSchema = z
  .object({ id: z.string().uuid("Horário inválido.") })
  .and(availabilityRuleBaseSchema);
export const changeAvailabilityRuleStatusSchema = z.object({
  id: z.string().uuid("Horário inválido."),
  isActive: formBoolean,
});

export const createScheduleBlockSchema = z
  .object({
    startsAt: dateTimeSchema,
    endsAt: dateTimeSchema,
    reason: z.string().trim().min(2, "Informe o motivo.").max(500),
  })
  .refine((data) => data.endsAt > data.startsAt, {
    path: ["endsAt"],
    message: "O fim deve ser posterior ao início.",
  });

export const updateScheduleBlockSchema = z
  .object({ id: z.string().uuid("Bloqueio inválido.") })
  .and(createScheduleBlockSchema);

export const deleteScheduleBlockSchema = z.object({
  id: z.string().uuid("Bloqueio inválido."),
});

export type ProviderSettingsInput = z.infer<typeof providerSettingsSchema>;
export type CreateServiceCategoryInput = z.infer<
  typeof createServiceCategorySchema
>;
export type UpdateServiceCategoryInput = z.infer<
  typeof updateServiceCategorySchema
>;
export type CreateServiceInput = z.infer<typeof createServiceSchema>;
export type UpdateServiceInput = z.infer<typeof updateServiceSchema>;
export type CreateCustomFieldInput = z.infer<typeof createCustomFieldSchema>;
export type UpdateCustomFieldInput = z.infer<typeof updateCustomFieldSchema>;
export type CreateAvailabilityRuleInput = z.infer<
  typeof createAvailabilityRuleSchema
>;
export type UpdateAvailabilityRuleInput = z.infer<
  typeof updateAvailabilityRuleSchema
>;
export type CreateScheduleBlockInput = z.infer<
  typeof createScheduleBlockSchema
>;
export type UpdateScheduleBlockInput = z.infer<
  typeof updateScheduleBlockSchema
>;
