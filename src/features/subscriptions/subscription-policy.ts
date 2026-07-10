/**
 * Centralized subscription enforcement policy.
 *
 * Pure, deterministic functions that determine what a tenant can do based on
 * their subscription status and days overdue. All date-dependent functions
 * accept an optional `now` parameter for testability.
 *
 * Policy stages (based on days overdue):
 *   ≤ 0 days           → ACTIVE (everything works)
 *   1–3 days           → EXPIRING_SOON (warning on dashboard, everything works)
 *   4–7 days           → OVERDUE_WARNING (critical warning, everything works)
 *   8–15 days          → OVERDUE_CRITICAL (external booking blocked)
 *   > 15 days          → EXTERNAL_BOOKING_BLOCKED (everything blocked)
 *
 * Tenant status overrides:
 *   !ACTIVE             → SUSPENDED / CANCELED (everything blocked)
 *   No subscription     → NO_SUBSCRIPTION (everything blocked)
 *   SUSPENDED/CANCELED  → everything blocked
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SubscriptionPolicyStatus =
  | "ACTIVE"
  | "EXPIRING_SOON"
  | "OVERDUE_WARNING"
  | "OVERDUE_CRITICAL"
  | "EXTERNAL_BOOKING_BLOCKED"
  | "SUSPENDED"
  | "CANCELED"
  | "NO_SUBSCRIPTION";

export type WarningLevel = "NONE" | "WARNING" | "CRITICAL" | "BLOCKED";

export type SubscriptionPolicyInput = {
  tenantStatus: string;
  subscription: {
    status: string;
    expiresAt: Date;
    plan: {
      publicLinkEnabled: boolean;
      whatsappEnabled: boolean;
    };
  } | null;
  /** Override for testing. Defaults to new Date(). */
  now?: Date;
};

export type SubscriptionPolicy = {
  status: SubscriptionPolicyStatus;
  warningLevel: WarningLevel;
  daysOverdue: number;

  canAccessProviderPanel: boolean;
  canCreateManualAppointment: boolean;
  canUsePublicLink: boolean;
  canCreatePublicAppointment: boolean;
  canUseTypebot: boolean;
  canCreateTypebotAppointment: boolean;
};

export type ProviderSubscriptionWarning = {
  level: WarningLevel;
  message: string;
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BLOCKED_SUBSCRIPTION_STATUSES = new Set(["SUSPENDED", "CANCELED"]);

const PUBLIC_UNAVAILABLE_MESSAGE =
  "Este serviço de agendamento está temporariamente indisponível. Entre em contato diretamente com o estabelecimento.";

// ---------------------------------------------------------------------------
// Days overdue calculation
// ---------------------------------------------------------------------------

export function calculateDaysOverdue(
  expiresAt: Date,
  now: Date = new Date(),
): number {
  const startOfToday = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
    ),
  );
  const startOfExpiresDay = new Date(
    Date.UTC(
      expiresAt.getUTCFullYear(),
      expiresAt.getUTCMonth(),
      expiresAt.getUTCDate(),
    ),
  );

  const diffMs = startOfToday.getTime() - startOfExpiresDay.getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return Math.max(0, days);
}

// ---------------------------------------------------------------------------
// Policy status
// ---------------------------------------------------------------------------

export function getSubscriptionPolicyStatus(
  input: SubscriptionPolicyInput,
): SubscriptionPolicyStatus {
  // Tenant not active
  if (input.tenantStatus !== "ACTIVE") {
    if (input.tenantStatus === "SUSPENDED") return "SUSPENDED";
    if (input.tenantStatus === "CANCELED") return "CANCELED";
    return "SUSPENDED"; // fallback for any non-ACTIVE status
  }

  // No subscription
  if (!input.subscription) {
    return "NO_SUBSCRIPTION";
  }

  // Subscription status blocked
  if (BLOCKED_SUBSCRIPTION_STATUSES.has(input.subscription.status)) {
    return input.subscription.status as SubscriptionPolicyStatus;
  }

  // Calculate days overdue
  const now = input.now ?? new Date();
  const daysOverdue = calculateDaysOverdue(input.subscription.expiresAt, now);

  if (daysOverdue <= 0) return "ACTIVE";
  if (daysOverdue <= 3) return "EXPIRING_SOON";
  if (daysOverdue <= 7) return "OVERDUE_WARNING";
  if (daysOverdue <= 15) return "OVERDUE_CRITICAL";
  return "EXTERNAL_BOOKING_BLOCKED";
}

// ---------------------------------------------------------------------------
// Days overdue convenience
// ---------------------------------------------------------------------------

export function getDaysOverdue(input: SubscriptionPolicyInput): number {
  if (!input.subscription) return 0;
  const now = input.now ?? new Date();
  return Math.max(0, calculateDaysOverdue(input.subscription.expiresAt, now));
}

// ---------------------------------------------------------------------------
// Capability checks
// ---------------------------------------------------------------------------

export function canAccessProviderPanel(input: SubscriptionPolicyInput): boolean {
  // Provider panel is accessible as long as the tenant is active,
  // regardless of subscription status
  return input.tenantStatus === "ACTIVE";
}

export function canCreateManualAppointment(input: SubscriptionPolicyInput): boolean {
  const status = getSubscriptionPolicyStatus(input);
  // Blocked only when >15 days overdue
  if (status === "EXTERNAL_BOOKING_BLOCKED") return false;
  return input.tenantStatus === "ACTIVE"
    && input.subscription !== null
    && !BLOCKED_SUBSCRIPTION_STATUSES.has(input.subscription.status);
}

export function canUsePublicLink(input: SubscriptionPolicyInput): boolean {
  const status = getSubscriptionPolicyStatus(input);

  // Blocked: tenant not active, suspended, canceled, no subscription, >15 days
  if (status === "SUSPENDED" || status === "CANCELED" || status === "NO_SUBSCRIPTION") {
    return false;
  }
  if (status === "EXTERNAL_BOOKING_BLOCKED") return false;

  // Plan check
  if (!input.subscription?.plan.publicLinkEnabled) return false;

  return true;
}

export function canCreatePublicAppointment(input: SubscriptionPolicyInput): boolean {
  const status = getSubscriptionPolicyStatus(input);

  // Blocked: same as public link + blocked at 8+ days
  if (status === "SUSPENDED" || status === "CANCELED" || status === "NO_SUBSCRIPTION") {
    return false;
  }
  // Blocked at 8+ days overdue
  if (status === "OVERDUE_CRITICAL" || status === "EXTERNAL_BOOKING_BLOCKED") {
    return false;
  }

  // Plan check
  if (!input.subscription?.plan.publicLinkEnabled) return false;

  return true;
}

export function canUseTypebot(input: SubscriptionPolicyInput): boolean {
  const status = getSubscriptionPolicyStatus(input);

  // Blocked: tenant not active, suspended, canceled, no subscription, >15 days
  if (status === "SUSPENDED" || status === "CANCELED" || status === "NO_SUBSCRIPTION") {
    return false;
  }
  if (status === "EXTERNAL_BOOKING_BLOCKED") return false;

  // Plan check
  if (!input.subscription?.plan.whatsappEnabled) return false;

  return true;
}

export function canCreateTypebotAppointment(input: SubscriptionPolicyInput): boolean {
  const status = getSubscriptionPolicyStatus(input);

  // Blocked: same as Typebot use + blocked at 8+ days
  if (status === "SUSPENDED" || status === "CANCELED" || status === "NO_SUBSCRIPTION") {
    return false;
  }
  // Blocked at 8+ days overdue
  if (status === "OVERDUE_CRITICAL" || status === "EXTERNAL_BOOKING_BLOCKED") {
    return false;
  }

  // Plan check
  if (!input.subscription?.plan.whatsappEnabled) return false;

  return true;
}

// ---------------------------------------------------------------------------
// Warning level
// ---------------------------------------------------------------------------

export function getWarningLevel(input: SubscriptionPolicyInput): WarningLevel {
  const status = getSubscriptionPolicyStatus(input);

  switch (status) {
    case "ACTIVE":
      return "NONE";
    case "EXPIRING_SOON":
      return "WARNING";
    case "OVERDUE_WARNING":
      return "CRITICAL";
    case "OVERDUE_CRITICAL":
      return "BLOCKED";
    case "EXTERNAL_BOOKING_BLOCKED":
    case "SUSPENDED":
    case "CANCELED":
    case "NO_SUBSCRIPTION":
      return "BLOCKED";
  }
}

// ---------------------------------------------------------------------------
// Provider dashboard warnings
// ---------------------------------------------------------------------------

export function getProviderSubscriptionWarning(
  input: SubscriptionPolicyInput,
): ProviderSubscriptionWarning | null {
  const status = getSubscriptionPolicyStatus(input);
  const warningLevel = getWarningLevel(input);

  if (warningLevel === "NONE") return null;

  switch (status) {
    case "EXPIRING_SOON":
      return {
        level: "WARNING",
        message:
          "Sua assinatura está vencida. Regularize para evitar bloqueios nos canais de agendamento.",
      };

    case "OVERDUE_WARNING":
      return {
        level: "CRITICAL",
        message:
          "Sua assinatura está vencida há alguns dias. Regularize o quanto antes para evitar bloqueio de novos agendamentos externos.",
      };

    case "OVERDUE_CRITICAL":
      return {
        level: "BLOCKED",
        message:
          "Novos agendamentos pelo link público e WhatsApp/Typebot estão temporariamente bloqueados. Regularize sua assinatura para reativar esses canais.",
      };

    case "EXTERNAL_BOOKING_BLOCKED":
      return {
        level: "BLOCKED",
        message:
          "Sua operação de agendamentos está suspensa por assinatura vencida. Regularize sua assinatura para reativar os canais.",
      };

    case "SUSPENDED":
    case "CANCELED":
      return {
        level: "BLOCKED",
        message:
          "Este prestador está com a operação suspensa. Entre em contato com o administrador.",
      };

    case "NO_SUBSCRIPTION":
      return {
        level: "BLOCKED",
        message:
          "Nenhuma assinatura ativa encontrada. Entre em contato com o administrador.",
      };

    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Public message (never reveals billing details)
// ---------------------------------------------------------------------------

export function getPublicUnavailableMessage(): string {
  return PUBLIC_UNAVAILABLE_MESSAGE;
}

// ---------------------------------------------------------------------------
// Convenience: full policy object
// ---------------------------------------------------------------------------

export function getSubscriptionPolicy(
  input: SubscriptionPolicyInput,
): SubscriptionPolicy {
  const status = getSubscriptionPolicyStatus(input);

  return {
    status,
    warningLevel: getWarningLevel(input),
    daysOverdue: getDaysOverdue(input),

    canAccessProviderPanel: canAccessProviderPanel(input),
    canCreateManualAppointment: canCreateManualAppointment(input),
    canUsePublicLink: canUsePublicLink(input),
    canCreatePublicAppointment: canCreatePublicAppointment(input),
    canUseTypebot: canUseTypebot(input),
    canCreateTypebotAppointment: canCreateTypebotAppointment(input),
  };
}
