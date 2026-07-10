import { prisma } from "@/lib/prisma";

export function findUserForAuthentication(email: string) {
  return prisma.user.findUnique({
    where: { email },
    include: {
      tenantUsers: {
        where: {
          isActive: true,
          tenant: { status: "ACTIVE" },
        },
        orderBy: { createdAt: "asc" },
        take: 1,
        select: { tenantId: true },
      },
    },
  });
}

export function findActiveUserBySession(userId: string, email: string) {
  return prisma.user.findFirst({
    where: {
      id: userId,
      email,
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      email: true,
      globalRole: true,
      avatarUrl: true,
    },
  });
}

export function updateUserLastLogin(userId: string) {
  return prisma.user.update({
    where: { id: userId },
    data: { lastLoginAt: new Date() },
  });
}
