import { prisma } from "@/lib/prisma";

const subscriptionInclude = {
  plan: {
    select: {
      id: true,
      name: true,
    },
  },
} as const;

export function findAllTenants() {
  return prisma.tenant.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      subscription: {
        include: subscriptionInclude,
      },
      tenantUsers: {
        where: { isActive: true },
        orderBy: { createdAt: "asc" },
        take: 1,
        select: {
          user: {
            select: { lastLoginAt: true },
          },
        },
      },
    },
  });
}

export function findTenantById(id: string) {
  return prisma.tenant.findUnique({
    where: { id },
    include: {
      subscription: {
        include: subscriptionInclude,
      },
      tenantUsers: {
        where: { role: "OWNER" },
        orderBy: { createdAt: "asc" },
        take: 1,
        select: {
          role: true,
          isActive: true,
          createdAt: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              globalRole: true,
              isActive: true,
              lastLoginAt: true,
              createdAt: true,
            },
          },
        },
      },
      auditLogs: {
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  });
}

export function findTenantOptions() {
  return prisma.tenant.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
}
