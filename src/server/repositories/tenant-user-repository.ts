import { prisma } from "@/lib/prisma";

export function findActiveTenantContext(
  userId: string,
  activeTenantId: string | null,
) {
  return prisma.tenantUser.findFirst({
    where: {
      userId,
      isActive: true,
      ...(activeTenantId ? { tenantId: activeTenantId } : {}),
      tenant: { status: "ACTIVE" },
    },
    select: {
      tenantId: true,
      role: true,
      tenant: {
        select: {
          id: true,
          name: true,
          publicDisplayName: true,
          slug: true,
          logoUrl: true,
          status: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });
}
