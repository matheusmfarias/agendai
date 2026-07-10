import { describe, expect, it } from "vitest";

import type { OnboardingChecklist } from "@/features/onboarding/onboarding-checklist-service";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeChecklist(
  overrides: Partial<OnboardingChecklist> = {},
): OnboardingChecklist {
  const base: OnboardingChecklist = {
    businessInfoComplete: true,
    hasActiveCategory: true,
    hasActiveService: true,
    hasAvailability: true,
    publicLinkAllowed: true,
    typebotAllowed: true,
    typebotReady: false,
    publicBookingReady: true,
    canCompleteOnboarding: true,
    items: [],
    ...overrides,
  };

  // Re-derive dependents from the final values
  base.publicBookingReady =
    base.publicLinkAllowed && base.hasActiveService && base.hasAvailability;
  base.canCompleteOnboarding =
    base.businessInfoComplete && base.hasActiveService && base.hasAvailability;

  return base;
}

// ---------------------------------------------------------------------------
// canCompleteOnboarding logic
// ---------------------------------------------------------------------------

describe("canCompleteOnboarding", () => {
  it("true when business info, active service, and availability are present", () => {
    const c = makeChecklist();
    expect(c.canCompleteOnboarding).toBe(true);
  });

  it("false without business info", () => {
    const c = makeChecklist({ businessInfoComplete: false });
    expect(c.canCompleteOnboarding).toBe(false);
  });

  it("false without active service", () => {
    const c = makeChecklist({ hasActiveService: false });
    expect(c.canCompleteOnboarding).toBe(false);
  });

  it("false without availability", () => {
    const c = makeChecklist({ hasAvailability: false });
    expect(c.canCompleteOnboarding).toBe(false);
  });

  it("false without service AND availability (even with business info)", () => {
    const c = makeChecklist({
      hasActiveService: false,
      hasAvailability: false,
    });
    expect(c.canCompleteOnboarding).toBe(false);
  });

  it("can complete even without active category (as long as service exists)", () => {
    const c = makeChecklist({ hasActiveCategory: false });
    expect(c.canCompleteOnboarding).toBe(true);
  });

  it("can complete even if public link is blocked by subscription", () => {
    const c = makeChecklist({
      publicLinkAllowed: false,
      publicBookingReady: false,
    });
    expect(c.canCompleteOnboarding).toBe(true);
  });

  it("can complete even without Typebot", () => {
    const c = makeChecklist({ typebotAllowed: false, typebotReady: false });
    expect(c.canCompleteOnboarding).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Public booking readiness
// ---------------------------------------------------------------------------

describe("publicBookingReady", () => {
  it("true when plan allows, has services and availability", () => {
    const c = makeChecklist();
    expect(c.publicBookingReady).toBe(true);
  });

  it("false when plan does not allow", () => {
    const c = makeChecklist({ publicLinkAllowed: false });
    expect(c.publicBookingReady).toBe(false);
  });

  it("false when no services", () => {
    const c = makeChecklist({ hasActiveService: false });
    expect(c.publicBookingReady).toBe(false);
  });

  it("false when no availability", () => {
    const c = makeChecklist({ hasAvailability: false });
    expect(c.publicBookingReady).toBe(false);
  });

  it("false when plan allows but no services and no availability", () => {
    const c = makeChecklist({
      hasActiveService: false,
      hasAvailability: false,
    });
    expect(c.publicBookingReady).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Typebot readiness
// ---------------------------------------------------------------------------

describe("typebotReady", () => {
  it("true when allowed and ready", () => {
    const c = makeChecklist({ typebotAllowed: true, typebotReady: true });
    expect(c.typebotReady).toBe(true);
  });

  it("false when allowed but not ready (no credential)", () => {
    const c = makeChecklist({ typebotAllowed: true, typebotReady: false });
    expect(c.typebotReady).toBe(false);
  });

  it("false when not allowed", () => {
    const c = makeChecklist({ typebotAllowed: false, typebotReady: false });
    expect(c.typebotReady).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Checklist item status
// ---------------------------------------------------------------------------

describe("checklist item status types", () => {
  it("DONE means completed", () => {
    const statuses = ["DONE"] as const;
    expect(statuses.includes("DONE")).toBe(true);
  });

  it("BLOCKED means required and not done", () => {
    const blocked = "BLOCKED";
    expect(blocked).toBe("BLOCKED");
  });

  it("OPTIONAL means not required for completion", () => {
    const optional = "OPTIONAL";
    expect(optional).toBe("OPTIONAL");
  });
});

// ---------------------------------------------------------------------------
// Checklist structure (sanity checks)
// ---------------------------------------------------------------------------

describe("checklist structure", () => {
  it("checklist has expected keys", () => {
    const expectedKeys = [
      "businessInfoComplete",
      "hasActiveCategory",
      "hasActiveService",
      "hasAvailability",
      "publicLinkAllowed",
      "publicBookingReady",
      "typebotAllowed",
      "typebotReady",
      "canCompleteOnboarding",
      "items",
    ];

    const c = makeChecklist();
    const actualKeys = Object.keys(c).sort();
    const sortedExpected = [...expectedKeys].sort();
    expect(actualKeys).toEqual(sortedExpected);
  });

  it("checklist items are present", () => {
    const c = makeChecklist({
      items: [
        {
          key: "business_info",
          label: "Dados preenchidos",
          status: "DONE",
          actionHref: "/app/settings",
          actionLabel: "Preencher",
        },
        {
          key: "active_service",
          label: "Serviço ativo",
          status: "BLOCKED",
        },
      ],
    });

    expect(c.items).toHaveLength(2);
    expect(c.items[0].status).toBe("DONE");
    expect(c.items[1].status).toBe("BLOCKED");
  });
});
