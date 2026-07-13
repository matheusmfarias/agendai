import { z } from "zod";

const dateTimeInputSchema = z.string().regex(
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/,
  "Selecione um horário válido.",
);

export const publicBookingSchema = z.object({
  tenantSlug: z.string().trim().min(1),
  serviceId: z.string().uuid("Selecione um serviço válido."),
  startsAt: dateTimeInputSchema,
  customerNotes: z.string().trim().max(2000).optional(),
  customFields: z.record(z.string(), z.string()).default({}),
});

export type PublicBookingInput = z.infer<typeof publicBookingSchema>;

export const publicBookingConfirmationSchema = z.object({
  tenantSlug: z.string().trim().min(1),
  appointmentId: z.string().uuid(),
});
