import { z } from "zod";

const emailSchema = z
  .string()
  .trim()
  .email("E-mail inválido.")
  .optional()
  .or(z.literal(""));

export const typebotCustomerIdentificationSchema = z.discriminatedUnion(
  "action",
  [
    z.object({
      action: z.literal("LOOKUP"),
      phone: z.string().trim().min(8, "Informe o telefone."),
    }),
    z.object({
      action: z.literal("CONFIRM"),
      sessionId: z.string().uuid(),
    }),
    z.object({
      action: z.literal("CREATE"),
      sessionId: z.string().uuid(),
      name: z.string().trim().min(2, "Informe o nome.").max(200),
      email: emailSchema,
      rejectedExisting: z.boolean().optional().default(false),
    }),
  ],
);
