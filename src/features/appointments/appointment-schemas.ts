import { z } from "zod";

import { parseBrazilianDecimal } from "@/lib/input-formatters";

const formBoolean = z.preprocess(
  (value) => value === true || value === "true" || value === "on",
  z.boolean(),
);

const dateTimeInputSchema = z
  .string()
  .regex(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/,
    "Informe uma data e hora válidas.",
  )
  .transform((value, context) => {
    const date = new Date(`${value}:00-03:00`);
    if (Number.isNaN(date.getTime())) {
      context.addIssue({
        code: "custom",
        message: "Informe uma data e hora válidas.",
      });
      return z.NEVER;
    }
    return date;
  });

const optionalMoneySchema = z.preprocess(
  (value) => (value === "" || value === null ? undefined : value),
  z.preprocess(
    parseBrazilianDecimal,
    z.number().min(0, "O valor não pode ser negativo."),
  ).optional(),
);

const optionalPositiveIntegerSchema = z.preprocess(
  (value) => (value === "" || value === null ? undefined : value),
  z.coerce.number().int().positive().optional(),
);

const extraServiceIdsSchema = z
  .preprocess(
    (value) =>
      typeof value === "string"
        ? value
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean)
        : value,
    z.array(z.string().uuid()).default([]),
  )
  .default([]);

const appointmentBaseSchema = z.object({
  customerId: z.string().uuid("Selecione um cliente válido."),
  serviceId: z.string().uuid("Selecione um serviço válido."),
  startsAt: dateTimeInputSchema,
  customerNotes: z.string().trim().max(2000).optional(),
  internalNotes: z.string().trim().max(2000).optional(),
  estimatedPrice: optionalMoneySchema,
  durationMinutesOverride: optionalPositiveIntegerSchema,
  extraServiceIds: extraServiceIdsSchema,
  allowOutsideAvailability: formBoolean,
  allowConcurrentAppointment: formBoolean,
  customFields: z.record(z.string(), z.string()).default({}),
});

export const createAppointmentSchema = appointmentBaseSchema.extend({
  status: z.enum(["REQUESTED", "CONFIRMED", "WAITING_INFO"]).default("CONFIRMED"),
});

export const updateAppointmentSchema = appointmentBaseSchema.extend({
  id: z.string().uuid("Agendamento inválido."),
  status: z
    .enum([
      "REQUESTED",
      "CONFIRMED",
      "WAITING_INFO",
      "RESCHEDULED",
      "CANCELED_BY_CUSTOMER",
      "CANCELED_BY_PROVIDER",
      "NO_SHOW",
      "IN_PROGRESS",
      "FINISHED",
    ])
    .optional(),
  finalPrice: optionalMoneySchema,
});

export const changeAppointmentStatusSchema = z.object({
  id: z.string().uuid("Agendamento inválido."),
  status: z.enum([
    "REQUESTED",
    "CONFIRMED",
    "WAITING_INFO",
    "RESCHEDULED",
    "CANCELED_BY_CUSTOMER",
    "CANCELED_BY_PROVIDER",
    "NO_SHOW",
    "IN_PROGRESS",
    "FINISHED",
  ]),
  finalPrice: optionalMoneySchema,
});

export const checkoutAppointmentSchema = z.object({
  id: z.string().uuid("Agendamento inválido."),
  paymentMethod: z
    .enum(["CASH", "PIX", "CREDIT_CARD", "DEBIT_CARD", "BANK_TRANSFER", "OTHER"])
    .default("CASH"),
  amount: z.preprocess(
    parseBrazilianDecimal,
    z.number().min(0, "Informe um valor valido."),
  ),
  tip: z.preprocess(
    parseBrazilianDecimal,
    z.number().min(0, "A gorjeta não pode ser negativa."),
  ).default(0),
  discount: z.preprocess(
    parseBrazilianDecimal,
    z.number().min(0, "O desconto não pode ser negativo."),
  ).default(0),
});

const optionalDateFilter = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
);

const optionalUuidFilter = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().uuid().optional(),
);

export const appointmentFilterSchema = z.object({
  startDate: optionalDateFilter,
  endDate: optionalDateFilter,
  status: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z
      .enum([
        "REQUESTED",
        "CONFIRMED",
        "WAITING_INFO",
        "RESCHEDULED",
        "CANCELED_BY_CUSTOMER",
        "CANCELED_BY_PROVIDER",
        "NO_SHOW",
        "IN_PROGRESS",
        "FINISHED",
      ])
      .optional(),
  ),
  serviceId: optionalUuidFilter,
  customerId: optionalUuidFilter,
  origin: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z
      .enum(["PUBLIC_LINK", "WHATSAPP", "MANUAL_PANEL", "ADMIN"])
      .optional(),
  ),
});

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;
export type UpdateAppointmentInput = z.infer<typeof updateAppointmentSchema>;
export type CheckoutAppointmentInput = z.infer<typeof checkoutAppointmentSchema>;
export type AppointmentFilterInput = z.infer<typeof appointmentFilterSchema>;
