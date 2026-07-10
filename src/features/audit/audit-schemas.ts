import { z } from "zod";

export const auditLogFiltersSchema = z.object({
  tenantId: z.string().uuid().optional().or(z.literal("")),
  eventType: z.string().trim().max(100).optional(),
  actorType: z
    .enum(["SUPER_ADMIN", "TENANT_USER", "CUSTOMER", "SYSTEM", "TYPEBOT"])
    .optional()
    .or(z.literal("")),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});
