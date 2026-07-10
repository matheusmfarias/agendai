import { cookies } from "next/headers";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { requireSuperAdmin } from "@/features/auth/permissions";
import type { NavigationItem } from "@/types/navigation";

const SIDEBAR_STORAGE_KEY = "agenda-zap-sidebar-collapsed";

const ADMIN_NAVIGATION: NavigationItem[] = [
  { label: "Dashboard", href: "/admin/dashboard", icon: "layout-dashboard" },
  { label: "Prestadores", href: "/admin/tenants", icon: "building-2" },
  { label: "Planos", href: "/admin/plans", icon: "shapes" },
  {
    label: "Assinaturas",
    href: "/admin/subscriptions",
    icon: "credit-card",
  },
  { label: "Templates", href: "/admin/templates", icon: "scroll-text" },
  {
    label: "Agendamentos",
    href: "/admin/appointments",
    icon: "calendar-days",
  },
  { label: "Clientes", href: "/admin/customers", icon: "users-round" },
  { label: "Logs", href: "/admin/audit-logs", icon: "file-clock" },
  {
    label: "Simulador Typebot",
    href: "/admin/typebot-simulator",
    icon: "bot",
  },
  { label: "Configurações", href: "/admin/settings", icon: "settings" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireSuperAdmin();
  const cookieStore = await cookies();
  const initialSidebarCollapsed =
    cookieStore.get(SIDEBAR_STORAGE_KEY)?.value !== "false";

  return (
    <DashboardShell
      label="Admin da plataforma"
      navigation={ADMIN_NAVIGATION}
      user={user}
      initialSidebarCollapsed={initialSidebarCollapsed}
      subtitle="Administração da plataforma"
    >
      {children}
    </DashboardShell>
  );
}
