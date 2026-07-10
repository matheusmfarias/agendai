import { prisma } from "@/lib/prisma";

export function findAllPlans() {
  return prisma.plan.findMany({
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
    include: {
      _count: {
        select: { subscriptions: true },
      },
    },
  });
}

export function findActivePlans() {
  return prisma.plan.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      monthlyPrice: true,
      annualPrice: true,
    },
  });
}

export function findPlanById(id: string) {
  return prisma.plan.findUnique({
    where: { id },
    include: {
      _count: {
        select: { subscriptions: true },
      },
    },
  });
}
