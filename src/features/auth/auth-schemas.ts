import { z } from "zod";

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .email("Informe um e-mail válido.")
    .transform((value) => value.toLowerCase()),
  password: z.string().min(8, "A senha deve ter ao menos 8 caracteres."),
});
