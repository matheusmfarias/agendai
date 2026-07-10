import { prisma } from "@/lib/prisma";

const ATTENTION_SUBSCRIPTION_STATUSES = [
  "PAST_DUE",
  "SUSPENDED",
  "CANCELED",
] as const;

const ATTENTION_TENANT_STATUSES = ["SUSPENDED"] as const;

export async function getAdminDashboardMetrics() {
  const [
    tenantCount,
    activeTenantCount,
    suspendedTenantCount,
    canceledTenantCount,
    trialSubscriptionCount,
    activeSubscriptionCount,
    pastDueSubscriptionCount,
    suspendedSubscriptionCount,
    activePlansCount,
    monthlySubscriptions,
    annualSubscriptions,
    upcomingExpirationsCount,
    tenantsNeedingAttention,
    recentAuditLogs,
  ] = await Promise.all([
    prisma.tenant.count(),
    prisma.tenant.count({ where: { status: "ACTIVE" } }),
    prisma.tenant.count({ where: { status: "SUSPENDED" } }),
    prisma.tenant.count({ where: { status: "CANCELED" } }),
    prisma.subscription.count({ where: { status: "TRIAL" } }),
    prisma.subscription.count({ where: { status: "ACTIVE" } }),
    prisma.subscription.count({ where: { status: "PAST_DUE" } }),
    prisma.subscription.count({ where: { status: "SUSPENDED" } }),
    prisma.plan.count({ where: { isActive: true } }),
    prisma.subscription.aggregate({
      where: { status: "ACTIVE", billingCycle: "MONTHLY" },
      _sum: { price: true },
    }),
    prisma.subscription.aggregate({
      where: { status: "ACTIVE", billingCycle: "ANNUAL" },
      _sum: { price: true },
    }),
    // Subscriptions expiring within the next 7 days (exclude already past_due)
    prisma.subscription.count({
      where: {
        status: { in: ["ACTIVE", "TRIAL"] },
        expiresAt: {
          gte: new Date(),
          lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      },
    }),
    // Tenants that need operational attention
    prisma.tenant.findMany({
      where: {
        OR: [
          { status: { in: [...ATTENTION_TENANT_STATUSES] } },
          {
            subscription: {
              status: { in: [...ATTENTION_SUBSCRIPTION_STATUSES] },
            },
          },
        ],
      },
      orderBy: { updatedAt: "desc" },
      take: 10,
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        subscription: {
          select: {
            id: true,
            status: true,
            expiresAt: true,
            plan: { select: { name: true } },
          },
        },
      },
    }),
    // Recent audit logs for activity feed
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        id: true,
        eventType: true,
        actorType: true,
        description: true,
        createdAt: true,
        tenant: {
          select: { id: true, name: true },
        },
      },
    }),
  ]);

  const monthlyRevenue =
    Number(monthlySubscriptions._sum.price ?? 0) +
    Number(annualSubscriptions._sum.price ?? 0) / 12;

  // Derive platform health status from the data
  const hasCritical =
    pastDueSubscriptionCount > 0 ||
    suspendedTenantCount > 0 ||
    suspendedSubscriptionCount > 0;

  const platformHealth: "healthy" | "warning" | "critical" = hasCritical
    ? "critical"
    : upcomingExpirationsCount > 0
      ? "warning"
      : "healthy";

  return {
    tenantCount,
    activeTenantCount,
    suspendedTenantCount,
    canceledTenantCount,
    trialSubscriptionCount,
    activeSubscriptionCount,
    pastDueSubscriptionCount,
    suspendedSubscriptionCount,
    monthlyRevenue,
    activePlansCount,
    upcomingExpirationsCount,
    platformHealth,
    tenantsNeedingAttention,
    recentAuditLogs,
  };
}
