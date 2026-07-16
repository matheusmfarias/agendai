import { z } from "zod";

export const appointmentConfirmedPayloadSchema = z
  .object({
    businessName: z.string().trim().min(1).max(120),
    customerName: z.string().trim().min(1).max(120),
    serviceName: z.string().trim().min(1).max(160),
    professionalName: z.string().trim().min(1).max(120).optional(),
    bookingDate: z.string().regex(/^\d{2}\/\d{2}\/\d{4}$/),
    bookingTime: z.string().regex(/^\d{2}:\d{2}$/),
    businessAddress: z.string().trim().min(1).max(240).optional(),
    appointmentId: z.string().uuid(),
    messageTemplate: z.string().trim().min(10).max(1000).optional(),
  })
  .strict();

export const appointmentRequestedPayloadSchema = z
  .object({
    businessName: z.string().trim().min(1).max(120),
    customerName: z.string().trim().min(1).max(120),
    serviceName: z.string().trim().min(1).max(160),
    professionalName: z.string().trim().min(1).max(120).optional(),
    bookingDate: z.string().regex(/^\d{2}\/\d{2}\/\d{4}$/),
    bookingTime: z.string().regex(/^\d{2}:\d{2}$/),
    appointmentId: z.string().uuid(),
  })
  .strict();

export const appointmentCompletedPayloadSchema = appointmentRequestedPayloadSchema;

export const appointmentReminderPayloadSchema =
  appointmentConfirmedPayloadSchema.extend({
    messageTemplate: z.string().trim().min(10).max(1000),
  });
export const appointmentCanceledPayloadSchema =
  appointmentConfirmedPayloadSchema.extend({
    messageTemplate: z.string().trim().min(10).max(1000),
  });

export const whatsappPreferenceSchema = z
  .object({
    enabled: z.boolean().optional(),
    sendAppointmentConfirmation: z.boolean().optional(),
    sendAppointmentRequested: z.boolean().optional(),
    sendAppointmentCompleted: z.boolean().optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0);

export const whatsappTestMessageSchema = z
  .object({ phone: z.string().trim().min(8).max(30) })
  .strict();

const evolutionWebhookEventSchema = z
  .string()
  .trim()
  .min(1)
  .max(80)
  .transform((event) => event.toLowerCase().replaceAll("_", "."))
  .pipe(z.enum(["connection.update", "qrcode.updated", "messages.upsert"]));

const evolutionWebhookDataSchema = z
  .object({
    instance: z.string().trim().min(1).max(180).optional(),
    state: z.string().trim().min(1).max(40).optional(),
    status: z.string().trim().min(1).max(40).optional(),
    key: z
      .object({
        id: z.string().trim().min(1).max(220),
        remoteJid: z.string().trim().max(220).optional(),
        remoteJidAlt: z.string().trim().max(220).optional(),
        fromMe: z.boolean().optional(),
      })
      .passthrough()
      .optional(),
    message: z.record(z.string(), z.unknown()).optional(),
    messageType: z.string().trim().max(80).optional(),
  })
  .passthrough();

export const evolutionWebhookSchema = z
  .object({
    event: evolutionWebhookEventSchema,
    instance: z.string().trim().min(1).max(180).optional(),
    instanceName: z.string().trim().min(1).max(180).optional(),
    sender: z.string().trim().max(220).optional(),
    data: evolutionWebhookDataSchema.optional(),
  })
  .passthrough();
