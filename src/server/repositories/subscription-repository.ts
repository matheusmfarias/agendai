import { prisma } from "@/lib/prisma";

export function findAllSubscriptions() {
  return prisma.subscription.findMany({
    orderBy: { expiresAt: "asc" },
    include: {
      tenant: {
        select: { id: true, name: true, status: true },
      },
      plan: {
        select: { id: true, name: true, isActive: true },
      },
    },
  });
}

export function findSubscriptionById(id: string) {
  return prisma.subscription.findUnique({
    where: { id },
    include: {
      tenant: {
        select: {
          id: true,
          name: true,
          slug: true,
          status: true,
        },
      },
      plan: true,
    },
  });
}
