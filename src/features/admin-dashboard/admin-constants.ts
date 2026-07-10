// ---------------------------------------------------------------------------
// Admin metric icon names — serializable across Server→Client boundary.
// ---------------------------------------------------------------------------

export const ADMIN_METRIC_ICON_NAMES = [
  "activity",
  "alert-triangle",
  "ban",
  "building-2",
  "calendar-days",
  "clock",
  "credit-card",
  "scroll-text",
  "users-round",
] as const;

export type AdminMetricIconName = (typeof ADMIN_METRIC_ICON_NAMES)[number];

// ---------------------------------------------------------------------------
// Platform health labels
// ---------------------------------------------------------------------------

export const PLATFORM_HEALTH_LABELS: Record<
  "healthy" | "warning" | "critical",
  { label: string; description: string }
> = {
  healthy: {
    label: "Tudo em ordem",
    description: "A plataforma opera sem pendências críticas.",
  },
  warning: {
    label: "Atenção necessária",
    description: "Há vencimentos próximos que exigem acompanhamento.",
  },
  critical: {
    label: "Ação necessária",
    description:
      "Há assinaturas vencidas, suspensas ou prestadores bloqueados que exigem atenção imediata.",
  },
};

// ---------------------------------------------------------------------------
// Health badge variant
// ---------------------------------------------------------------------------

export const PLATFORM_HEALTH_VARIANT: Record<
  "healthy" | "warning" | "critical",
  "success" | "warning" | "destructive"
> = {
  healthy: "success",
  warning: "warning",
  critical: "destructive",
};

// ---------------------------------------------------------------------------
// Subscription attention severity ordering (for sort)
// ---------------------------------------------------------------------------

type SubscriptionStatus = "TRIAL" | "ACTIVE" | "PAST_DUE" | "SUSPENDED" | "CANCELED";

const SEVERITY_ORDER: Record<SubscriptionStatus, number> = {
  PAST_DUE: 0,
  SUSPENDED: 1,
  CANCELED: 2,
  TRIAL: 3,
  ACTIVE: 3,
};

export function sortTenantsBySeverity<T extends {
  subscription?: { status: SubscriptionStatus } | null;
}>(tenants: T[]): T[] {
  return [...tenants].sort((a, b) => {
    const aSev = a.subscription
      ? (SEVERITY_ORDER[a.subscription.status] ?? 3)
      : 3;
    const bSev = b.subscription
      ? (SEVERITY_ORDER[b.subscription.status] ?? 3)
      : 3;
    return aSev - bSev;
  });
}
