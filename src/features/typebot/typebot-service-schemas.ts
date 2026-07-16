import { z } from "zod";

export const typebotServicesQuerySchema = z.object({
  categoryId: z.preprocess(
    (value) => (value === "" || value === null ? undefined : value),
    z.string().uuid().optional(),
  ),
});
