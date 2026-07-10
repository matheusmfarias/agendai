import { z } from "zod";

export const dateInputSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Informe uma data válida.")
  .transform((value, context) => {
    const date = new Date(`${value}T12:00:00-03:00`);

    if (Number.isNaN(date.getTime())) {
      context.addIssue({
        code: "custom",
        message: "Informe uma data válida.",
      });
      return z.NEVER;
    }

    return date;
  });
