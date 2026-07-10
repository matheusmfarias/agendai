import type {
  SubscriptionStatus,
  TenantStatus,
} from "@/generated/prisma/client";

export const TENANT_STATUS_LABELS: Record<TenantStatus, string> = {
  ACTIVE: "Ativo",
  SUSPENDED: "Suspenso",
  CANCELED: "Cancelado",
};

export const SUBSCRIPTION_STATUS_LABELS: Record<SubscriptionStatus, string> = {
  TRIAL: "Trial",
  ACTIVE: "Ativa",
  PAST_DUE: "Vencida",
  SUSPENDED: "Suspensa",
  CANCELED: "Cancelada",
};

export function getStatusBadgeVariant(
  status: TenantStatus | SubscriptionStatus,
) {
  if (status === "ACTIVE") {
    return "success" as const;
  }

  if (status === "TRIAL") {
    return "secondary" as const;
  }

  if (status === "PAST_DUE") {
    return "warning" as const;
  }

  if (status === "SUSPENDED" || status === "CANCELED") {
    return "destructive" as const;
  }

  return "outline" as const;
}
