import { z } from "zod";

export const typebotAppointmentBodySchema = z.object({
  sessionId: z.string().uuid("Sessão inválida."),
  customerId: z.string().uuid("Cliente inválido."),
  serviceId: z.string().uuid("Serviço inválido."),
  startsAt: z.string().refine(
    (value) => !Number.isNaN(new Date(value).getTime()),
    { message: "Horário inválido." },
  ),
  customValues: z
    .array(
      z.object({
        customFieldId: z.string().uuid(),
        value: z.string(),
      }),
    )
    .optional()
    .default([]),
  customerNotes: z.string().trim().max(2000).optional(),
});

export type TypebotAppointmentBody = z.infer<
  typeof typebotAppointmentBodySchema
>;
