import { z } from "zod";

const dateTimeInputSchema = z.string().regex(
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/,
  "Selecione um horario valido.",
);

export const publicBookingSchema = z.object({
  tenantSlug: z.string().trim().min(1),
  serviceId: z.string().uuid("Selecione um servico valido."),
  startsAt: dateTimeInputSchema,
  customerNotes: z.string().trim().max(2000).optional(),
  customFields: z.record(z.string(), z.string()).default({}),
});

export type PublicBookingInput = z.infer<typeof publicBookingSchema>;
