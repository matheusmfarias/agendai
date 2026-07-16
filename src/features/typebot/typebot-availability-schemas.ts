import { z } from "zod";

export const typebotAvailabilityPeriodSchema = z.enum([
  "MORNING",
  "AFTERNOON",
  "EVENING",
]);

function isCalendarDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const date = new Date(
    Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12),
  );
  return (
    date.getUTCFullYear() === Number(match[1]) &&
    date.getUTCMonth() === Number(match[2]) - 1 &&
    date.getUTCDate() === Number(match[3])
  );
}

const optionalLocalDateSchema = z.preprocess(
  (value) => (value === "" || value === null ? undefined : value),
  z.string().refine(isCalendarDate, "Data inválida.").optional(),
);

export const typebotAvailableDatesQuerySchema = z.object({
  startDate: optionalLocalDateSchema,
  days: z.preprocess(
    (value) => (value === "" || value === null ? undefined : value),
    z.coerce.number().int().min(1).max(14).default(14),
  ),
});

export const typebotSlotsQuerySchema = z.object({
  date: optionalLocalDateSchema,
  period: z.preprocess(
    (value) => (value === "" || value === null ? undefined : value),
    typebotAvailabilityPeriodSchema.optional(),
  ),
  days: z.preprocess(
    (value) => (value === "" || value === null ? undefined : value),
    z.coerce.number().int().min(1).max(14).optional(),
  ),
});

export const typebotAvailablePeriodsQuerySchema = z.object({
  date: z.string().refine(isCalendarDate, "Data inválida."),
});
