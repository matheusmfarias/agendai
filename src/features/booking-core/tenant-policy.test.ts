import { describe, expect, it } from "vitest";

import {
  canCreatePublicAppointmentForTenant,
  isTenantBookableForPublicLink,
  type BookableTenant,
} from "@/features/booking-core/tenant-policy";

function activeTenant(overrides: Partial<BookableTenant> = {}): BookableTenant {
  return {
    status: "ACTIVE",
    publicLinkActive: true,
    subscription: {
      status: "ACTIVE",
      expiresAt: new Date("2026-08-09T12:00:00.000Z"),
      plan: {
        publicLinkEnabled: true,
        whatsappEnabled: true,
      },
    },
    ...overrides,
  };
}

describe("tenant public link policy", () => {
  it("allows public booking when tenant and plan are enabled", () => {
    const tenant = activeTenant();

    expect(isTenantBookableForPublicLink(tenant)).toBe(true);
    expect(canCreatePublicAppointmentForTenant(tenant)).toBe(true);
  });

  it("blocks public booking when tenant disabled the public link", () => {
    const tenant = activeTenant({ publicLinkActive: false });

    expect(isTenantBookableForPublicLink(tenant)).toBe(false);
    expect(canCreatePublicAppointmentForTenant(tenant)).toBe(false);
  });
});
