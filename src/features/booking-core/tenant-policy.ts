/**
 * Tenant booking policy — convenience adapters.
 *
 * All policy logic is centralized in:
 *   src/features/subscriptions/subscription-policy.ts
 *
 * These wrappers preserve backward compatibility with existing callers
 * while delegating to the centralized policy module.
 */

import {
  canUsePublicLink,
  canCreatePublicAppointment,
  canUseTypebot,
  canCreateTypebotAppointment,
  type SubscriptionPolicyInput,
} from "@/features/subscriptions/subscription-policy";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type BookableTenant = {
  status: string;
  publicLinkActive?: boolean;
  subscription: {
    status: string;
    expiresAt: Date;
    plan: {
      publicLinkEnabled: boolean;
      whatsappEnabled?: boolean;
    };
  } | null;
};

// ---------------------------------------------------------------------------
// Low-level checks (kept for backward compat)
// ---------------------------------------------------------------------------

export function isTenantActive(tenant: { status: string }) {
  return tenant.status === "ACTIVE";
}

/**
 * @deprecated Use canCreatePublicAppointment or canUsePublicLink from
 * subscription-policy.ts for granular control.
 */
export function isSubscriptionActive(subscription: {
  status: string;
  expiresAt: Date;
}) {
  const input = toPolicyInput({ status: "ACTIVE", subscription: {
    status: subscription.status,
    expiresAt: subscription.expiresAt,
    plan: { publicLinkEnabled: true, whatsappEnabled: true },
  }});
  return canCreatePublicAppointment(input);
}

/**
 * Tenant can show the public booking page.
 * Allows viewing at 8–15 days overdue (creation blocked separately).
 * Blocks entirely at >15 days overdue or inactive tenant/subscription.
 */
export function isTenantBookableForPublicLink(tenant: BookableTenant) {
  if (tenant.publicLinkActive === false) return false;
  const input = toPolicyInput(tenant);
  return canUsePublicLink(input);
}

/**
 * Tenant can receive Typebot/WhatsApp requests.
 * Allows read endpoints at 8–15 days overdue (appointment creation blocked separately).
 * Blocks entirely at >15 days overdue or inactive tenant/subscription.
 */
export function isTenantBookableForWhatsApp(tenant: BookableTenant) {
  const input = toPolicyInput(tenant);
  return canUseTypebot(input);
}

// ---------------------------------------------------------------------------
// New granular checks
// ---------------------------------------------------------------------------

/**
 * Tenant can create appointments via public link.
 * Blocked at 8+ days overdue.
 */
export function canCreatePublicAppointmentForTenant(tenant: BookableTenant) {
  if (tenant.publicLinkActive === false) return false;
  const input = toPolicyInput(tenant);
  return canCreatePublicAppointment(input);
}

/**
 * Tenant can create appointments via Typebot/WhatsApp.
 * Blocked at 8+ days overdue.
 */
export function canCreateTypebotAppointmentForTenant(tenant: BookableTenant) {
  const input = toPolicyInput(tenant);
  return canCreateTypebotAppointment(input);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toPolicyInput(tenant: BookableTenant): SubscriptionPolicyInput {
  return {
    tenantStatus: tenant.status,
    subscription: tenant.subscription
      ? {
          status: tenant.subscription.status,
          expiresAt: tenant.subscription.expiresAt,
          plan: {
            publicLinkEnabled: tenant.subscription.plan.publicLinkEnabled,
            whatsappEnabled: tenant.subscription.plan.whatsappEnabled ?? false,
          },
        }
      : null,
  };
}
