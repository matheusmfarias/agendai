import { AdminDashboardHero } from "@/features/admin-dashboard/admin-dashboard-hero";
import { AdminMetricCard } from "@/features/admin-dashboard/admin-metric-card";
import { AdminAttentionList } from "@/features/admin-dashboard/admin-attention-list";
import { AdminRecentActivity } from "@/features/admin-dashboard/admin-recent-activity";
import { formatDate } from "@/lib/formatters";
import { getAdminDashboardMetrics } from "@/server/repositories/admin-dashboard-repository";

export const metadata = {
  title: "Operação da plataforma",
};

export default async function AdminDashboardPage() {
  const metrics = await getAdminDashboardMetrics();

  // Format dates on the server side
  const attentionTenants = metrics.tenantsNeedingAttention.map((t) => ({
    id: t.id,
    name: t.name,
    slug: t.slug,
    status: t.status,
    subscription: t.subscription
      ? {
          id: t.subscription.id,
          status: t.subscription.status,
          expiresAt: formatDate(t.subscription.expiresAt),
          plan: t.subscription.plan,
        }
      : null,
  }));

  const recentLogs = metrics.recentAuditLogs.map((log) => ({
    id: log.id,
    eventType: log.eventType,
    actorType: log.actorType,
    description: log.description,
    createdAt: log.createdAt.toISOString(),
    tenant: log.tenant,
  }));

  return (
    <div className="space-y-6">
      {/* Hero */}
      <AdminDashboardHero
        tenantCount={metrics.tenantCount}
        activePlansCount={metrics.activePlansCount}
        platformHealth={metrics.platformHealth}
      />

      {/* Platform health row */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <AdminMetricCard
          icon="users-round"
          label="Prestadores ativos"
          value={metrics.activeTenantCount}
          tone="success"
        />
        <AdminMetricCard
          icon="alert-triangle"
          label="Assinaturas vencidas"
          value={metrics.pastDueSubscriptionCount}
          tone={metrics.pastDueSubscriptionCount > 0 ? "destructive" : "default"}
        />
        <AdminMetricCard
          icon="ban"
          label="Tenants suspensos"
          value={metrics.suspendedTenantCount}
          tone={
            metrics.suspendedTenantCount > 0 ? "destructive" : "default"
          }
        />
        <AdminMetricCard
          icon="clock"
          label="Vencimentos próximos"
          value={metrics.upcomingExpirationsCount}
          tone={metrics.upcomingExpirationsCount > 0 ? "warning" : "default"}
        />
      </div>

      {/* Secondary metrics */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <AdminMetricCard
          icon="building-2"
          label="Total de prestadores"
          value={metrics.tenantCount}
        />
        <AdminMetricCard
          icon="credit-card"
          label="Receita mensal prevista"
          value={metrics.monthlyRevenue.toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL",
          })}
        />
        <AdminMetricCard
          icon="calendar-days"
          label="Assinaturas ativas"
          value={metrics.activeSubscriptionCount}
        />
        <AdminMetricCard
          icon="activity"
          label="Trials ativos"
          value={metrics.trialSubscriptionCount}
        />
      </div>

      {/* Main area: attention + activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        <AdminAttentionList tenants={attentionTenants} />
        <AdminRecentActivity logs={recentLogs} />
      </div>
    </div>
  );
}
