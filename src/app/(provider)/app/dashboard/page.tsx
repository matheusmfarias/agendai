import { Alert } from "@/components/ui/alert";
import { requireTenantAccess } from "@/features/auth/permissions";
import { ProviderDashboardAutoRefresh } from "@/features/provider-dashboard/provider-dashboard-auto-refresh";
import { ProviderDashboardOverview } from "@/features/provider-dashboard/provider-dashboard-overview";
import { ProviderSubscriptionNotice } from "@/features/provider-dashboard/provider-subscription-notice";
import {
  getProviderSubscriptionWarning,
  getSubscriptionPolicy,
  type SubscriptionPolicyInput,
} from "@/features/subscriptions/subscription-policy";
import { getAppointmentDashboardMetrics } from "@/server/repositories/appointment-repository";
import { getProviderDashboard } from "@/server/repositories/provider-repository";

export const metadata = { title: "Dashboard do prestador" };
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ProviderDashboardPage() {
  const context = await requireTenantAccess();
  const [dashboard, appointmentMetrics] = await Promise.all([
    getProviderDashboard(context.tenantId),
    getAppointmentDashboardMetrics(context.tenantId),
  ]);

  if (!dashboard) return null;

  const policyInput: SubscriptionPolicyInput =
    dashboard.status === "ACTIVE" && dashboard.subscription
      ? {
          tenantStatus: dashboard.status,
          subscription: {
            status: dashboard.subscription.status,
            expiresAt: dashboard.subscription.expiresAt,
            plan: {
              publicLinkEnabled: dashboard.subscription.plan.publicLinkEnabled,
              whatsappEnabled: dashboard.subscription.plan.whatsappEnabled,
            },
          },
        }
      : {
          tenantStatus: dashboard.status,
          subscription: null,
        };

  const policy = getSubscriptionPolicy(policyInput);
  const warning = getProviderSubscriptionWarning(policyInput);

  const whatsappReady =
    policy.canUseTypebot &&
    dashboard.whatsappConnections[0]?.status === "CONNECTED" &&
    dashboard.whatsappConnections[0]?.enabled === true;

  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const todayEnd = new Date(`${today}T23:59:59.999-03:00`);

  const todayAppointments = appointmentMetrics.todayAppointments;
  const futureAppointments = appointmentMetrics.upcoming.filter(
    (appointment) => new Date(appointment.startsAt) > todayEnd,
  );
  const nextAppointment = appointmentMetrics.upcoming[0] ?? null;

  return (
    <div className="space-y-4">
      <ProviderDashboardAutoRefresh />

      {dashboard.status !== "ACTIVE" ? (
        <Alert variant="destructive">
          Este prestador está{" "}
          {dashboard.status === "SUSPENDED" ? "suspenso" : "cancelado"}. As
          funções operacionais estão bloqueadas.
        </Alert>
      ) : null}

      {warning ? <ProviderSubscriptionNotice warning={warning} /> : null}

      <ProviderDashboardOverview
        tenant={{
          name: dashboard.name,
          publicDisplayName: dashboard.publicDisplayName,
          logoUrl: dashboard.logoUrl,
          slug: dashboard.slug,
          publicLinkActive: dashboard.publicLinkActive,
          status: dashboard.status,
          onboardingStatus: dashboard.onboardingStatus,
        }}
        todayAppointments={todayAppointments}
        overdueCompletion={appointmentMetrics.overdueCompletion}
        futureAppointments={futureAppointments}
        nextAppointment={nextAppointment}
        todayCount={appointmentMetrics.todayCount}
        activeCustomers={appointmentMetrics.activeCustomers}
        servicesCount={dashboard._count.services}
        categoriesCount={dashboard._count.serviceCategories}
        scheduleBlocksCount={dashboard._count.scheduleBlocks}
        whatsappReady={whatsappReady}
        whatsappAllowed={policy.canUseTypebot}
        whatsappStatus={dashboard.whatsappConnections[0]?.status ?? null}
      />
    </div>
  );
}
