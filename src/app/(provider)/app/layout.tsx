import { cookies } from "next/headers";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { requireTenantAccess } from "@/features/auth/permissions";
import { getProviderDisplayName } from "@/lib/provider-brand";
import type { NavigationItem } from "@/types/navigation";

const SIDEBAR_STORAGE_KEY = "agenda-zap-sidebar-collapsed";

const PROVIDER_NAVIGATION: NavigationItem[] = [
  { label: "Dashboard", href: "/app/dashboard", icon: "layout-dashboard" },
  { label: "Agenda", href: "/app/appointments", icon: "calendar-days" },
  { label: "Financeiro", href: "/app/financial", icon: "circle-dollar-sign" },
  { label: "Serviços", href: "/app/services", icon: "shopping-bag" },
  { label: "Clientes", href: "/app/customers", icon: "users-round" },
  { label: "Horários", href: "/app/availability", icon: "clock-3" },
  { label: "Configurações", href: "/app/settings", icon: "settings" },
];

export default async function ProviderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const context = await requireTenantAccess();
  const cookieStore = await cookies();
  const initialSidebarCollapsed =
    cookieStore.get(SIDEBAR_STORAGE_KEY)?.value !== "false";

  return (
    <DashboardShell
      label={getProviderDisplayName(context.tenant)}
      navigation={PROVIDER_NAVIGATION}
      user={context.user}
      subtitle="Painel do prestador"
      logoUrl={context.tenant.logoUrl}
      showHeader={false}
      sidebarSubtitle="Painel do prestador"
      sidebarUser={context.user}
      initialSidebarCollapsed={initialSidebarCollapsed}
      providerNotificationContext={{
        tenantId: context.tenantId,
        userId: context.user.id,
      }}
    >
      {children}
    </DashboardShell>
  );
}
