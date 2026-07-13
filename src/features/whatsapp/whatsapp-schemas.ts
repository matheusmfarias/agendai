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
  })
  .strict();

export const whatsappPreferenceSchema = z
  .object({
    enabled: z.boolean().optional(),
    sendAppointmentConfirmation: z.boolean().optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0);

export const whatsappTestMessageSchema = z
  .object({ phone: z.string().trim().min(8).max(30) })
  .strict();

export const evolutionWebhookSchema = z
  .object({
    event: z.string().min(1).max(80),
    instance: z.string().min(1).max(180).optional(),
    instanceName: z.string().min(1).max(180).optional(),
    data: z.record(z.string(), z.unknown()).optional(),
  })
  .passthrough();
