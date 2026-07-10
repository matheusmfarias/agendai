import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export type AuditLogFilters = {
  tenantId?: string;
  eventType?: string;
  actorType?: "SUPER_ADMIN" | "TENANT_USER" | "CUSTOMER" | "SYSTEM" | "TYPEBOT";
  startDate?: Date;
  endDate?: Date;
};

export function createAuditLogRecord(
  data: Prisma.AuditLogUncheckedCreateInput,
) {
  return prisma.auditLog.create({ data });
}

export function findAuditLogs(filters: AuditLogFilters, limit = 100) {
  return prisma.auditLog.findMany({
    where: {
      tenantId: filters.tenantId,
      actorType: filters.actorType,
      eventType: filters.eventType
        ? { contains: filters.eventType, mode: "insensitive" }
        : undefined,
      createdAt:
        filters.startDate || filters.endDate
          ? {
              gte: filters.startDate,
              lte: filters.endDate,
            }
          : undefined,
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      tenant: {
        select: { name: true },
      },
    },
  });
}

export function findAuditLogById(id: string) {
  return prisma.auditLog.findUnique({
    where: { id },
    include: {
      tenant: {
        select: { id: true, name: true },
      },
    },
  });
}
