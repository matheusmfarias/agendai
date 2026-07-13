"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { Menu, UserRound } from "lucide-react";

import { AgendaiLogo } from "@/components/brand/agendai-logo";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { DashboardSidebar } from "@/components/layout/dashboard-sidebar";
import {
  ProviderNotificationCenter,
  ProviderNotificationTrigger,
} from "@/features/provider-notifications/components/provider-notification-center";
import {
  ProviderAgendaSkeleton,
  ProviderAvailabilitySkeleton,
  ProviderDashboardSkeleton,
  ProviderFinancialSkeleton,
  ProviderListPageSkeleton,
} from "@/components/layout/provider-loading-states";
import {
  finishRouteTransition,
  useRouteTransitionState,
} from "@/components/layout/route-transition-state";
import type { NavigationItem } from "@/types/navigation";

type DashboardShellProps = {
  children: React.ReactNode;
  label: string;
  navigation: NavigationItem[];
  user: {
    name: string;
    email: string;
  };
  /** Optional subtitle shown in the header beneath the label. */
  subtitle?: string;
  logoUrl?: string | null;
  showHeader?: boolean;
  sidebarSubtitle?: string;
  sidebarUser?: {
    name: string;
    email: string;
  };
  initialSidebarCollapsed?: boolean;
  providerNotificationContext?: { tenantId: string; userId: string };
};

const SIDEBAR_STORAGE_KEY = "agenda-zap-sidebar-collapsed";
const SIDEBAR_STORAGE_EVENT = "agenda-zap-sidebar-collapsed-change";
const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

function getSidebarCollapsedSnapshot(defaultCollapsed: boolean) {
  if (typeof window === "undefined") return defaultCollapsed;

  const storedValue = window.localStorage.getItem(SIDEBAR_STORAGE_KEY);

  if (storedValue === null) return defaultCollapsed;

  return storedValue === "true";
}

function subscribeToSidebarCollapsed(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(SIDEBAR_STORAGE_EVENT, callback);

  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(SIDEBAR_STORAGE_EVENT, callback);
  };
}

function persistSidebarCollapsed(collapsed: boolean) {
  window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(collapsed));
  document.cookie = `${SIDEBAR_STORAGE_KEY}=${String(
    collapsed,
  )}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}; samesite=lax`;
  window.dispatchEvent(new Event(SIDEBAR_STORAGE_EVENT));
}

function hasSidebarCollapsedCookie() {
  return document.cookie
    .split(";")
    .some((cookie) => cookie.trim().startsWith(`${SIDEBAR_STORAGE_KEY}=`));
}

function pathnameFromHref(href: string | null) {
  return href?.split("?")[0] ?? null;
}

function PendingRouteSkeleton({ href }: { href: string | null }) {
  const target = href ?? "";

  if (target.includes("/appointments")) return <ProviderAgendaSkeleton />;
  if (target.includes("/dashboard")) return <ProviderDashboardSkeleton />;
  if (target.includes("/financial")) return <ProviderFinancialSkeleton />;
  if (target.includes("/availability")) return <ProviderAvailabilitySkeleton />;

  return <ProviderListPageSkeleton />;
}

export function DashboardShell({
  children,
  label,
  navigation,
  user,
  subtitle,
  logoUrl,
  showHeader = true,
  sidebarSubtitle,
  sidebarUser,
  initialSidebarCollapsed = true,
  providerNotificationContext,
}: DashboardShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const routeTransition = useRouteTransitionState();
  const pendingPathname = pathnameFromHref(routeTransition.href);
  const showPendingRoute =
    routeTransition.pending && pendingPathname !== null && pendingPathname !== pathname;
  const sidebarCollapsed = useSyncExternalStore(
    subscribeToSidebarCollapsed,
    () => getSidebarCollapsedSnapshot(initialSidebarCollapsed),
    () => initialSidebarCollapsed,
  );

  function toggleSidebar() {
    persistSidebarCollapsed(!sidebarCollapsed);
  }

  useEffect(() => {
    const storedValue = window.localStorage.getItem(SIDEBAR_STORAGE_KEY);

    if (storedValue === null) {
      persistSidebarCollapsed(initialSidebarCollapsed);
      return;
    }

    if (!hasSidebarCollapsedCookie()) {
      persistSidebarCollapsed(storedValue === "true");
    }
  }, [initialSidebarCollapsed]);

  useEffect(() => {
    finishRouteTransition();
  }, [pathname]);

  const content = (
    <div className="min-h-screen bg-background">
      <div
        className={`fixed inset-x-0 top-0 z-[90] h-0.5 origin-left bg-primary transition-transform duration-200 ${
          routeTransition.pending ? "scale-x-100" : "scale-x-0"
        }`}
      />
      <DashboardSidebar
        label={label}
        logoUrl={logoUrl}
        navigation={navigation}
        subtitle={sidebarSubtitle}
        user={sidebarUser}
        collapsed={sidebarCollapsed}
        onToggleCollapsed={toggleSidebar}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
        notificationTrigger={
          providerNotificationContext ? (
            <ProviderNotificationTrigger compact={sidebarCollapsed} />
          ) : null
        }
      />
      <div
        className={`transition-[padding] duration-300 ease-out ${
          sidebarCollapsed ? "lg:pl-[5.5rem]" : "lg:pl-[17rem]"
        }`}
      >
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/95 px-4 backdrop-blur lg:hidden">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="grid size-10 place-items-center rounded-2xl border border-border bg-card text-foreground shadow-sm"
            aria-label="Abrir menu"
          >
            <Menu className="size-5" />
          </button>
          <LinkLogo />
          {providerNotificationContext ? <ProviderNotificationTrigger compact /> : (
            <div
              className="grid size-10 place-items-center rounded-2xl border border-border bg-card text-primary shadow-sm"
              title={user.name}
            >
              <UserRound className="size-5" />
            </div>
          )}
        </header>
        {showHeader ? (
          <div className="hidden lg:block">
            <DashboardHeader
              userName={user.name}
              userEmail={user.email}
              contextLabel={label}
              subtitle={subtitle}
            />
          </div>
        ) : null}
        <main
          key={pathname}
          className="p-4 pb-24 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-200 motion-safe:ease-out sm:p-6 sm:pb-24 lg:p-8"
        >
          {showPendingRoute ? <PendingRouteSkeleton href={routeTransition.href} /> : children}
        </main>
      </div>
    </div>
  );

  return providerNotificationContext ? (
    <ProviderNotificationCenter
      tenantId={providerNotificationContext.tenantId}
      userId={providerNotificationContext.userId}
    >
      {content}
    </ProviderNotificationCenter>
  ) : content;
}

function LinkLogo() {
  return (
    <AgendaiLogo size="sm" />
  );
}
