import type { AuditActorType, Prisma } from "@/generated/prisma/client";
import { createAuditLogRecord } from "@/server/repositories/audit-log-repository";

export type CreateAuditLogInput = {
  actorType: AuditActorType;
  actorId?: string | null;
  tenantId?: string | null;
  eventType: string;
  description: string;
  metadata?: Prisma.InputJsonValue;
  ipAddress?: string | null;
};

export async function createAuditLog(input: CreateAuditLogInput) {
  return createAuditLogRecord({
    actorType: input.actorType,
    actorId: input.actorId,
    tenantId: input.tenantId,
    eventType: input.eventType,
    description: input.description,
    metadata: input.metadata,
    ipAddress: input.ipAddress,
  });
}
