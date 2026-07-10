import { prisma } from "@/lib/prisma";

export function listCustomers(tenantId: string) {
  return prisma.customer.findMany({
    where: { tenantId },
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
    include: {
      user: { select: { avatarUrl: true, avatarFileKey: true } },
      _count: { select: { appointments: true } },
      appointments: {
        where: {
          startsAt: { lte: new Date() },
          status: { in: ["FINISHED", "CONFIRMED"] },
        },
        orderBy: { startsAt: "desc" },
        take: 1,
        select: { startsAt: true },
      },
    },
  });
}

export function getCustomer(tenantId: string, id: string) {
  return prisma.customer.findFirst({
    where: { id, tenantId },
    include: {
      user: { select: { avatarUrl: true, avatarFileKey: true } },
      appointments: {
        orderBy: { startsAt: "desc" },
        take: 20,
        include: {
          service: { select: { name: true } },
        },
      },
    },
  });
}

export function listActiveCustomerOptions(tenantId: string) {
  return prisma.customer.findMany({
    where: { tenantId, isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, phone: true },
  });
}
