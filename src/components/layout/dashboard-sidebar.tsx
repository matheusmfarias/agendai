"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  Bot,
  Building2,
  CalendarCheck2,
  CalendarDays,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  CreditCard,
  FileClock,
  LayoutDashboard,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  ReceiptText,
  ScrollText,
  Settings,
  Shapes,
  ShoppingBag,
  UsersRound,
  X,
  type LucideIcon,
} from "lucide-react";

import { logoutAction } from "@/features/auth/auth-actions";
import { getProviderLogoFallbackText } from "@/lib/provider-brand";
import { cn } from "@/lib/utils";
import {
  startRouteTransition,
  useRouteTransitionState,
} from "@/components/layout/route-transition-state";
import type {
  NavigationIconName,
  NavigationItem,
} from "@/types/navigation";

const NAVIGATION_ICONS: Record<NavigationIconName, LucideIcon> = {
  "layout-dashboard": LayoutDashboard,
  "building-2": Building2,
  shapes: Shapes,
  "credit-card": CreditCard,
  "scroll-text": ScrollText,
  "calendar-days": CalendarDays,
  "users-round": UsersRound,
  "file-clock": FileClock,
  settings: Settings,
  "shopping-bag": ShoppingBag,
  "clock-3": Clock3,
  "receipt-text": ReceiptText,
  "circle-dollar-sign": CircleDollarSign,
  bot: Bot,
};

type DashboardSidebarProps = {
  label: string;
  logoUrl?: string | null;
  navigation: NavigationItem[];
  subtitle?: string;
  user?: {
    name: string;
    email: string;
  };
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
};

function getUserInitials(value: string) {
  return value
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function flattenNavigation(items: NavigationItem[]) {
  return items.flatMap((item) => [item, ...(item.children ?? [])]);
}

function findActiveHref(pathname: string, navigation: NavigationItem[]) {
  return flattenNavigation(navigation)
    .filter(
      (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
    )
    .sort((first, second) => second.href.length - first.href.length)[0]?.href;
}

function pathnameFromHref(href: string) {
  return href.split("?")[0] || href;
}

function NavigationIcon({
  icon,
  active,
}: {
  icon: NavigationIconName;
  active: boolean;
}) {
  const Icon = NAVIGATION_ICONS[icon];

  return (
    <span
      className={cn(
        "grid size-9 shrink-0 place-items-center rounded-xl transition-colors",
        active
          ? "bg-primary text-primary-foreground shadow-sm"
          : "bg-muted/70 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary",
      )}
    >
      <Icon className="size-4" />
    </span>
  );
}

export function DashboardSidebar({
  label,
  logoUrl,
  navigation,
  user,
  collapsed = false,
  onToggleCollapsed,
  mobileOpen = false,
  onCloseMobile,
}: DashboardSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const routeTransition = useRouteTransitionState();
  const activeHref =
    routeTransition.href ? pathnameFromHref(routeTransition.href) : findActiveHref(pathname, navigation);
  const tenantInitials = getProviderLogoFallbackText(label) || "AZ";
  const userInitials = getUserInitials(user?.name ?? "") || tenantInitials;

  function handleRouteClick(href: string) {
    const nextPathname = pathnameFromHref(href);
    if (pathname === nextPathname) return;
    router.prefetch(href);
    startRouteTransition(href);
  }

  function prefetchRoute(href: string) {
    router.prefetch(href);
  }

  useEffect(() => {
    const hrefs = Array.from(
      new Set(flattenNavigation(navigation).map((item) => item.href)),
    );

    const timeoutId = window.setTimeout(() => {
      hrefs.forEach((href) => router.prefetch(href));
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [navigation, router]);

  return (
    <>
      <button
        type="button"
        aria-label="Fechar menu"
        onClick={onCloseMobile}
        className={cn(
          "fixed inset-0 z-40 bg-foreground/20 backdrop-blur-[2px] transition-opacity duration-300 ease-out lg:hidden",
          mobileOpen ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-full flex-col border-border bg-card text-card-foreground shadow-2xl transition-[transform,width,opacity] duration-300 ease-out will-change-transform lg:inset-y-0 lg:z-40 lg:border-r lg:opacity-100 lg:shadow-sm",
          mobileOpen
            ? "translate-x-0 opacity-100"
            : "-translate-x-full opacity-95 lg:translate-x-0",
          collapsed ? "lg:w-[5.5rem]" : "lg:w-[17rem]",
        )}
      >
      <div
        className={cn(
          "relative flex min-h-16 items-center gap-3 border-b border-border px-4 py-3 transition-[padding] duration-300",
          collapsed &&
            "lg:min-h-[5.5rem] lg:flex-col lg:items-center lg:justify-center lg:gap-2 lg:px-0",
        )}
      >
        <Link
          href="/app/dashboard"
          onClick={() => handleRouteClick("/app/dashboard")}
          onPointerEnter={() => prefetchRoute("/app/dashboard")}
          onFocus={() => prefetchRoute("/app/dashboard")}
          className={cn(
            "group flex min-w-0 flex-1 items-center gap-3 rounded-2xl outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary/30",
            collapsed && "lg:mx-auto lg:flex-none lg:justify-center",
          )}
          title="AgendaZap"
        >
          <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-sm transition-transform group-hover:-translate-y-0.5">
            <CalendarCheck2 className="size-5" />
          </span>
          <div
            className={cn(
              "min-w-0 transition-all duration-200",
              collapsed &&
                "lg:pointer-events-none lg:w-0 lg:translate-x-2 lg:overflow-hidden lg:opacity-0",
            )}
          >
            <p className="font-display text-base font-semibold leading-tight tracking-tight">
              AgendaZap
            </p>
          </div>
        </Link>

        {onToggleCollapsed ? (
          <button
            type="button"
            onClick={onToggleCollapsed}
            className={cn(
              "hidden size-8 place-items-center rounded-xl border border-border bg-background text-muted-foreground shadow-sm transition-colors hover:border-primary/30 hover:text-primary lg:grid cursor-pointer",
              collapsed
                ? "lg:absolute lg:-right-4 lg:top-5"
                : "lg:absolute lg:-right-4 lg:top-5",
            )}
            aria-label={
              collapsed ? "Expandir menu lateral" : "Recolher menu lateral"
            }
            title={collapsed ? "Expandir menu" : "Recolher menu"}
          >
            {collapsed ? (
              <PanelLeftOpen className="size-4" />
            ) : (
              <PanelLeftClose className="size-4" />
            )}
          </button>
        ) : null}
        {onCloseMobile ? (
          <button
            type="button"
            onClick={onCloseMobile}
            className="grid size-10 place-items-center rounded-2xl border border-border bg-background text-muted-foreground shadow-sm lg:hidden"
            aria-label="Fechar menu"
          >
            <X className="size-5" />
          </button>
        ) : null}
      </div>

      <nav
        className={cn(
          "block flex-1 space-y-1 overflow-y-auto px-3 py-4 lg:overflow-visible",
          collapsed && "lg:flex lg:flex-col lg:items-center lg:px-0",
        )}
        aria-label="Navegação principal"
      >
        {!collapsed ? (
          <p className="mb-2 hidden px-3 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground/70 lg:block">
            Menu
          </p>
        ) : null}

        {navigation.map((item, index) => {
          const itemActive = activeHref === item.href;
          const childActive = item.children?.some(
            (child) => child.href === activeHref,
          );
          const isActive = itemActive || Boolean(childActive);

          return (
            <div
              key={item.href}
              className={cn(
                "group/nav relative shrink-0 transition-all duration-300 ease-out lg:translate-y-0 lg:opacity-100",
                collapsed && "lg:flex lg:w-full lg:justify-center",
                mobileOpen
                  ? "translate-y-0 opacity-100"
                  : "-translate-y-1 opacity-0 lg:opacity-100",
              )}
              style={{
                transitionDelay: mobileOpen ? `${80 + index * 28}ms` : "0ms",
              }}
            >
              <Link
                href={item.href}
                onClick={() => {
                  handleRouteClick(item.href);
                  onCloseMobile?.();
                }}
                onPointerEnter={() => prefetchRoute(item.href)}
                onFocus={() => prefetchRoute(item.href)}
                title={collapsed ? item.label : undefined}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "group flex items-center gap-3 rounded-2xl px-2.5 py-2 text-sm transition-all duration-200",
                  collapsed &&
                    "lg:mx-auto lg:size-12 lg:justify-center lg:gap-0 lg:px-0 lg:py-0",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
                )}
              >
                <NavigationIcon icon={item.icon} active={isActive} />
                <span
                  className={cn(
                    "min-w-0 flex-1 transition-all duration-200",
                    collapsed &&
                      "lg:pointer-events-none lg:w-0 lg:overflow-hidden lg:opacity-0",
                  )}
                >
                  <span className="block truncate font-semibold">
                    {item.label}
                  </span>
                </span>
                {item.children?.length && !collapsed ? (
                  <ChevronRight
                    className={cn(
                      "size-4 shrink-0 text-muted-foreground transition-transform",
                      isActive && "rotate-90 text-primary",
                    )}
                  />
                ) : null}
              </Link>

              {item.children?.length && !collapsed ? (
                <div className="ml-[1.35rem] mt-1 border-l border-border pl-4">
                  {item.children.map((child) => {
                    const childIsActive = child.href === activeHref;

                    return (
                      <Link
                        key={child.href}
                        href={child.href}
                        onClick={() => {
                          handleRouteClick(child.href);
                          onCloseMobile?.();
                        }}
                        onPointerEnter={() => prefetchRoute(child.href)}
                        onFocus={() => prefetchRoute(child.href)}
                        aria-current={childIsActive ? "page" : undefined}
                        className={cn(
                          "flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition-colors",
                          childIsActive
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground",
                        )}
                      >
                        <span className="size-1.5 rounded-full bg-current opacity-60" />
                        <span className="truncate font-medium">
                          {child.label}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              ) : null}

              {collapsed ? (
                <div className="pointer-events-none absolute left-[calc(100%+0.75rem)] top-1/2 z-50 hidden min-w-48 -translate-y-1/2 rounded-2xl border border-border bg-popover p-2 text-popover-foreground opacity-0 shadow-xl transition-opacity group-hover/nav:pointer-events-auto group-hover/nav:opacity-100 lg:block">
                  {item.children?.length ? (
                    <>
                      <p className="px-3 py-2 text-xs font-semibold text-muted-foreground">
                        {item.label}
                      </p>
                      <div className="space-y-1">
                        {item.children.map((child) => {
                          const ChildIcon = NAVIGATION_ICONS[child.icon];
                          const childIsActive = child.href === activeHref;

                          return (
                            <Link
                              key={child.href}
                              href={child.href}
                              onClick={() => {
                                handleRouteClick(child.href);
                                onCloseMobile?.();
                              }}
                              onPointerEnter={() => prefetchRoute(child.href)}
                              onFocus={() => prefetchRoute(child.href)}
                              className={cn(
                                "flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition-colors",
                                childIsActive
                                  ? "bg-primary text-primary-foreground"
                                  : "hover:bg-muted",
                              )}
                            >
                              <ChildIcon className="size-4" />
                              {child.label}
                            </Link>
                          );
                        })}
                      </div>
                    </>
                  ) : (
                    <p className="px-3 py-2 text-sm font-semibold">
                      {item.label}
                    </p>
                  )}
                </div>
              ) : null}
            </div>
          );
        })}
      </nav>

      {user ? (
        <div
          className={cn(
            "border-t border-border p-3 transition-[padding] duration-300",
            collapsed && "lg:flex lg:justify-center lg:p-2",
          )}
        >
          <div
            className={cn(
              "rounded-3xl border border-border bg-background p-3 shadow-sm transition-all duration-300",
              collapsed && "lg:w-16 lg:rounded-2xl lg:p-2",
            )}
          >
            <div
              className={cn(
                "flex items-center gap-3",
                collapsed && "lg:justify-center",
              )}
            >
              {logoUrl ? (
                <span className="relative block size-10 shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={logoUrl}
                    alt=""
                    className="size-10 rounded-2xl border border-border object-cover"
                  />
                  <span className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full border-2 border-background bg-emerald-300" />
                </span>
              ) : (
                <span className="relative grid size-10 shrink-0 place-items-center rounded-2xl bg-primary/10 text-xs font-bold text-primary">
                  {tenantInitials}
                  <span className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full border-2 border-background bg-emerald-300" />
                </span>
              )}
              <div
                className={cn(
                  "min-w-0 transition-all duration-200",
                  collapsed &&
                    "lg:pointer-events-none lg:w-0 lg:overflow-hidden lg:opacity-0",
                )}
              >
                <p className="truncate text-sm font-semibold leading-tight">
                  {label}
                </p>
              </div>
            </div>

            <div
              className={cn(
                "mt-3 flex items-center justify-between gap-2 rounded-2xl bg-muted/70 px-2.5 py-2 transition-all duration-300",
                collapsed && "lg:justify-center lg:px-0",
              )}
            >
              <div
                className={cn(
                  "flex min-w-0 items-center gap-2 transition-all duration-200",
                  collapsed &&
                    "lg:pointer-events-none lg:w-0 lg:overflow-hidden lg:opacity-0",
                )}
              >
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                  {userInitials}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold">
                    {user.name || userInitials || "Usuário"}
                  </p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {user.email}
                  </p>
                </div>
              </div>
              <form action={logoutAction} className="shrink-0">
                <button
                  type="submit"
                  className="grid size-8 place-items-center rounded-xl text-muted-foreground transition-colors hover:bg-background hover:text-primary"
                  title="Sair"
                >
                  <LogOut className="size-4" />
                  <span className="sr-only">Sair</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      ) : null}
      </aside>
    </>
  );
}
