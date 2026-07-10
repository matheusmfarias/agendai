import { addDays, subDays } from "date-fns";
import { describe, expect, it } from "vitest";

import {
  calculateDaysOverdue,
  getSubscriptionPolicyStatus,
  getDaysOverdue,
  getWarningLevel,
  canAccessProviderPanel,
  canCreateManualAppointment,
  canUsePublicLink,
  canCreatePublicAppointment,
  canUseTypebot,
  canCreateTypebotAppointment,
  getProviderSubscriptionWarning,
  getPublicUnavailableMessage,
  getSubscriptionPolicy,
  type SubscriptionPolicyInput,
} from "@/features/subscriptions/subscription-policy";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeInput(overrides: Partial<SubscriptionPolicyInput> = {}): SubscriptionPolicyInput {
  const now = new Date("2026-06-26T12:00:00Z");
  return {
    tenantStatus: "ACTIVE",
    subscription: {
      status: "ACTIVE",
      expiresAt: addDays(now, 30), // expires in 30 days
      plan: {
        publicLinkEnabled: true,
        whatsappEnabled: true,
      },
    },
    now,
    ...overrides,
  };
}

function withExpiresAt(daysFromNow: number): SubscriptionPolicyInput {
  const now = new Date("2026-06-26T12:00:00Z");
  // negative = past (overdue), positive = future
  const expiresAt = addDays(now, daysFromNow);
  return makeInput({
    subscription: {
      status: "ACTIVE",
      expiresAt,
      plan: { publicLinkEnabled: true, whatsappEnabled: true },
    },
  });
}

function overdueBy(days: number): SubscriptionPolicyInput {
  const now = new Date("2026-06-26T12:00:00Z");
  const expiresAt = subDays(now, days);
  return makeInput({
    subscription: {
      status: "ACTIVE",
      expiresAt,
      plan: { publicLinkEnabled: true, whatsappEnabled: true },
    },
  });
}

// ---------------------------------------------------------------------------
// calculateDaysOverdue
// ---------------------------------------------------------------------------

describe("calculateDaysOverdue", () => {
  it("returns 0 for future expiration", () => {
    const expiresAt = addDays(new Date("2026-06-26T12:00:00Z"), 30);
    expect(calculateDaysOverdue(expiresAt, new Date("2026-06-26T12:00:00Z"))).toBe(0);
  });

  it("returns 0 for today", () => {
    expect(
      calculateDaysOverdue(
        new Date("2026-06-26T12:00:00Z"),
        new Date("2026-06-26T12:00:00Z"),
      ),
    ).toBe(0);
  });

  it("returns 1 for yesterday expiration", () => {
    const expiresAt = new Date("2026-06-25T12:00:00Z");
    expect(calculateDaysOverdue(expiresAt, new Date("2026-06-26T12:00:00Z"))).toBe(1);
  });

  it("returns 7 for one week ago", () => {
    const expiresAt = new Date("2026-06-19T12:00:00Z");
    expect(calculateDaysOverdue(expiresAt, new Date("2026-06-26T12:00:00Z"))).toBe(7);
  });
});

// ---------------------------------------------------------------------------
// getSubscriptionPolicyStatus
// ---------------------------------------------------------------------------

describe("getSubscriptionPolicyStatus", () => {
  // Active
  it("active not overdue → ACTIVE", () => {
    expect(getSubscriptionPolicyStatus(withExpiresAt(30))).toBe("ACTIVE");
  });

  it("expires today → ACTIVE", () => {
    expect(getSubscriptionPolicyStatus(withExpiresAt(0))).toBe("ACTIVE");
  });

  // Expiring soon (1-3 days)
  it("1 day overdue → EXPIRING_SOON", () => {
    expect(getSubscriptionPolicyStatus(overdueBy(1))).toBe("EXPIRING_SOON");
  });

  it("3 days overdue → EXPIRING_SOON", () => {
    expect(getSubscriptionPolicyStatus(overdueBy(3))).toBe("EXPIRING_SOON");
  });

  // Overdue warning (4-7 days)
  it("4 days overdue → OVERDUE_WARNING", () => {
    expect(getSubscriptionPolicyStatus(overdueBy(4))).toBe("OVERDUE_WARNING");
  });

  it("7 days overdue → OVERDUE_WARNING", () => {
    expect(getSubscriptionPolicyStatus(overdueBy(7))).toBe("OVERDUE_WARNING");
  });

  // Overdue critical (8-15 days)
  it("8 days overdue → OVERDUE_CRITICAL", () => {
    expect(getSubscriptionPolicyStatus(overdueBy(8))).toBe("OVERDUE_CRITICAL");
  });

  it("15 days overdue → OVERDUE_CRITICAL", () => {
    expect(getSubscriptionPolicyStatus(overdueBy(15))).toBe("OVERDUE_CRITICAL");
  });

  // External booking blocked (>15 days)
  it("16 days overdue → EXTERNAL_BOOKING_BLOCKED", () => {
    expect(getSubscriptionPolicyStatus(overdueBy(16))).toBe("EXTERNAL_BOOKING_BLOCKED");
  });

  // Tenant status overrides
  it("tenant SUSPENDED → SUSPENDED", () => {
    expect(
      getSubscriptionPolicyStatus(
        makeInput({ tenantStatus: "SUSPENDED" }),
      ),
    ).toBe("SUSPENDED");
  });

  it("tenant CANCELED → CANCELED", () => {
    expect(
      getSubscriptionPolicyStatus(
        makeInput({ tenantStatus: "CANCELED" }),
      ),
    ).toBe("CANCELED");
  });

  it("no subscription → NO_SUBSCRIPTION", () => {
    expect(
      getSubscriptionPolicyStatus(
        makeInput({ subscription: null }),
      ),
    ).toBe("NO_SUBSCRIPTION");
  });

  it("subscription SUSPENDED → SUSPENDED", () => {
    const input = makeInput();
    input.subscription!.status = "SUSPENDED";
    expect(getSubscriptionPolicyStatus(input)).toBe("SUSPENDED");
  });

  it("subscription CANCELED → CANCELED", () => {
    const input = makeInput();
    input.subscription!.status = "CANCELED";
    expect(getSubscriptionPolicyStatus(input)).toBe("CANCELED");
  });
});

// ---------------------------------------------------------------------------
// getDaysOverdue
// ---------------------------------------------------------------------------

describe("getDaysOverdue", () => {
  it("returns 0 for active subscription", () => {
    expect(getDaysOverdue(withExpiresAt(30))).toBe(0);
  });

  it("returns 5 for 5 days overdue", () => {
    expect(getDaysOverdue(overdueBy(5))).toBe(5);
  });

  it("returns 0 when no subscription", () => {
    expect(getDaysOverdue(makeInput({ subscription: null }))).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Capability checks
// ---------------------------------------------------------------------------

describe("canAccessProviderPanel", () => {
  it("active tenant → true", () => {
    expect(canAccessProviderPanel(makeInput())).toBe(true);
  });

  it("suspended tenant → false", () => {
    expect(
      canAccessProviderPanel(makeInput({ tenantStatus: "SUSPENDED" })),
    ).toBe(false);
  });

  it(">15 days overdue → true (panel still accessible)", () => {
    expect(canAccessProviderPanel(overdueBy(16))).toBe(true);
  });
});

describe("canCreateManualAppointment", () => {
  it("active → true", () => {
    expect(canCreateManualAppointment(withExpiresAt(30))).toBe(true);
  });

  it("8 days overdue → true (manual still works)", () => {
    expect(canCreateManualAppointment(overdueBy(8))).toBe(true);
  });

  it("15 days overdue → true", () => {
    expect(canCreateManualAppointment(overdueBy(15))).toBe(true);
  });

  it("16 days overdue → false", () => {
    expect(canCreateManualAppointment(overdueBy(16))).toBe(false);
  });

  it("suspended tenant → false", () => {
    expect(
      canCreateManualAppointment(makeInput({ tenantStatus: "SUSPENDED" })),
    ).toBe(false);
  });

  it("no subscription → false", () => {
    expect(
      canCreateManualAppointment(makeInput({ subscription: null })),
    ).toBe(false);
  });
});

describe("canUsePublicLink", () => {
  it("active with publicLinkEnabled → true", () => {
    expect(canUsePublicLink(withExpiresAt(30))).toBe(true);
  });

  it("active without publicLinkEnabled → false", () => {
    const input = withExpiresAt(30);
    input.subscription!.plan.publicLinkEnabled = false;
    expect(canUsePublicLink(input)).toBe(false);
  });

  it("8 days overdue → true (link still visible)", () => {
    expect(canUsePublicLink(overdueBy(8))).toBe(true);
  });

  it("15 days overdue → true (link still visible)", () => {
    expect(canUsePublicLink(overdueBy(15))).toBe(true);
  });

  it("16 days overdue → false (link unavailable)", () => {
    expect(canUsePublicLink(overdueBy(16))).toBe(false);
  });

  it("suspended → false", () => {
    expect(
      canUsePublicLink(makeInput({ tenantStatus: "SUSPENDED" })),
    ).toBe(false);
  });
});

describe("canCreatePublicAppointment", () => {
  it("active → true", () => {
    expect(canCreatePublicAppointment(withExpiresAt(30))).toBe(true);
  });

  it("3 days overdue → true", () => {
    expect(canCreatePublicAppointment(overdueBy(3))).toBe(true);
  });

  it("7 days overdue → true", () => {
    expect(canCreatePublicAppointment(overdueBy(7))).toBe(true);
  });

  it("8 days overdue → false (creation blocked)", () => {
    expect(canCreatePublicAppointment(overdueBy(8))).toBe(false);
  });

  it("15 days overdue → false", () => {
    expect(canCreatePublicAppointment(overdueBy(15))).toBe(false);
  });

  it("16 days overdue → false", () => {
    expect(canCreatePublicAppointment(overdueBy(16))).toBe(false);
  });

  it("plan without publicLinkEnabled → false", () => {
    const input = withExpiresAt(30);
    input.subscription!.plan.publicLinkEnabled = false;
    expect(canCreatePublicAppointment(input)).toBe(false);
  });
});

describe("canUseTypebot", () => {
  it("active with whatsappEnabled → true", () => {
    expect(canUseTypebot(withExpiresAt(30))).toBe(true);
  });

  it("active without whatsappEnabled → false", () => {
    const input = withExpiresAt(30);
    input.subscription!.plan.whatsappEnabled = false;
    expect(canUseTypebot(input)).toBe(false);
  });

  it("8 days overdue → true (consultation endpoints work)", () => {
    expect(canUseTypebot(overdueBy(8))).toBe(true);
  });

  it("15 days overdue → true", () => {
    expect(canUseTypebot(overdueBy(15))).toBe(true);
  });

  it("16 days overdue → false (all endpoints blocked)", () => {
    expect(canUseTypebot(overdueBy(16))).toBe(false);
  });
});

describe("canCreateTypebotAppointment", () => {
  it("active → true", () => {
    expect(canCreateTypebotAppointment(withExpiresAt(30))).toBe(true);
  });

  it("3 days overdue → true", () => {
    expect(canCreateTypebotAppointment(overdueBy(3))).toBe(true);
  });

  it("7 days overdue → true", () => {
    expect(canCreateTypebotAppointment(overdueBy(7))).toBe(true);
  });

  it("8 days overdue → false (creation blocked)", () => {
    expect(canCreateTypebotAppointment(overdueBy(8))).toBe(false);
  });

  it("15 days overdue → false", () => {
    expect(canCreateTypebotAppointment(overdueBy(15))).toBe(false);
  });

  it("16 days overdue → false", () => {
    expect(canCreateTypebotAppointment(overdueBy(16))).toBe(false);
  });

  it("plan without whatsappEnabled → false", () => {
    const input = withExpiresAt(30);
    input.subscription!.plan.whatsappEnabled = false;
    expect(canCreateTypebotAppointment(input)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Warning level
// ---------------------------------------------------------------------------

describe("getWarningLevel", () => {
  it("ACTIVE → NONE", () => {
    expect(getWarningLevel(withExpiresAt(30))).toBe("NONE");
  });

  it("EXPIRING_SOON → WARNING", () => {
    expect(getWarningLevel(overdueBy(1))).toBe("WARNING");
  });

  it("OVERDUE_WARNING → CRITICAL", () => {
    expect(getWarningLevel(overdueBy(5))).toBe("CRITICAL");
  });

  it("OVERDUE_CRITICAL → BLOCKED", () => {
    expect(getWarningLevel(overdueBy(10))).toBe("BLOCKED");
  });

  it("EXTERNAL_BOOKING_BLOCKED → BLOCKED", () => {
    expect(getWarningLevel(overdueBy(20))).toBe("BLOCKED");
  });

  it("SUSPENDED → BLOCKED", () => {
    expect(
      getWarningLevel(makeInput({ tenantStatus: "SUSPENDED" })),
    ).toBe("BLOCKED");
  });
});

// ---------------------------------------------------------------------------
// Provider warning
// ---------------------------------------------------------------------------

describe("getProviderSubscriptionWarning", () => {
  it("ACTIVE → null", () => {
    expect(getProviderSubscriptionWarning(withExpiresAt(30))).toBeNull();
  });

  it("EXPIRING_SOON → WARNING message", () => {
    const warning = getProviderSubscriptionWarning(overdueBy(1));
    expect(warning).not.toBeNull();
    expect(warning!.level).toBe("WARNING");
    expect(warning!.message).toContain("Regularize");
  });

  it("OVERDUE_WARNING → CRITICAL message", () => {
    const warning = getProviderSubscriptionWarning(overdueBy(5));
    expect(warning).not.toBeNull();
    expect(warning!.level).toBe("CRITICAL");
    expect(warning!.message).toContain("Regularize");
  });

  it("OVERDUE_CRITICAL → BLOCKED message about external channels", () => {
    const warning = getProviderSubscriptionWarning(overdueBy(10));
    expect(warning).not.toBeNull();
    expect(warning!.level).toBe("BLOCKED");
    expect(warning!.message).toContain("WhatsApp");
  });

  it("EXTERNAL_BOOKING_BLOCKED → BLOCKED message about suspension", () => {
    const warning = getProviderSubscriptionWarning(overdueBy(20));
    expect(warning).not.toBeNull();
    expect(warning!.level).toBe("BLOCKED");
    expect(warning!.message).toContain("suspensa");
  });

  it("SUSPENDED → BLOCKED message", () => {
    const warning = getProviderSubscriptionWarning(
      makeInput({ tenantStatus: "SUSPENDED" }),
    );
    expect(warning).not.toBeNull();
    expect(warning!.level).toBe("BLOCKED");
  });

  it("NO_SUBSCRIPTION → BLOCKED message", () => {
    const warning = getProviderSubscriptionWarning(
      makeInput({ subscription: null }),
    );
    expect(warning).not.toBeNull();
    expect(warning!.level).toBe("BLOCKED");
  });
});

// ---------------------------------------------------------------------------
// Public message
// ---------------------------------------------------------------------------

describe("getPublicUnavailableMessage", () => {
  it("never reveals billing details", () => {
    const msg = getPublicUnavailableMessage();
    expect(msg).not.toContain("vencida");
    expect(msg).not.toContain("inadimplência");
    expect(msg).not.toContain("atraso");
    expect(msg).not.toContain("pagamento");
  });
});

// ---------------------------------------------------------------------------
// Full policy object
// ---------------------------------------------------------------------------

describe("getSubscriptionPolicy", () => {
  it("returns complete policy for active tenant", () => {
    const policy = getSubscriptionPolicy(withExpiresAt(30));
    expect(policy.status).toBe("ACTIVE");
    expect(policy.warningLevel).toBe("NONE");
    expect(policy.daysOverdue).toBe(0);
    expect(policy.canAccessProviderPanel).toBe(true);
    expect(policy.canCreateManualAppointment).toBe(true);
    expect(policy.canUsePublicLink).toBe(true);
    expect(policy.canCreatePublicAppointment).toBe(true);
    expect(policy.canUseTypebot).toBe(true);
    expect(policy.canCreateTypebotAppointment).toBe(true);
  });

  it("returns complete policy for 10 days overdue", () => {
    const policy = getSubscriptionPolicy(overdueBy(10));
    expect(policy.status).toBe("OVERDUE_CRITICAL");
    expect(policy.warningLevel).toBe("BLOCKED");
    expect(policy.daysOverdue).toBe(10);
    expect(policy.canAccessProviderPanel).toBe(true);
    expect(policy.canCreateManualAppointment).toBe(true);
    expect(policy.canUsePublicLink).toBe(true);
    expect(policy.canCreatePublicAppointment).toBe(false);
    expect(policy.canUseTypebot).toBe(true);
    expect(policy.canCreateTypebotAppointment).toBe(false);
  });

  it("returns complete policy for 20 days overdue", () => {
    const policy = getSubscriptionPolicy(overdueBy(20));
    expect(policy.status).toBe("EXTERNAL_BOOKING_BLOCKED");
    expect(policy.warningLevel).toBe("BLOCKED");
    expect(policy.daysOverdue).toBe(20);
    expect(policy.canAccessProviderPanel).toBe(true);
    expect(policy.canCreateManualAppointment).toBe(false);
    expect(policy.canUsePublicLink).toBe(false);
    expect(policy.canCreatePublicAppointment).toBe(false);
    expect(policy.canUseTypebot).toBe(false);
    expect(policy.canCreateTypebotAppointment).toBe(false);
  });
});
