import { describe, expect, it } from "vitest";

import { providerNotificationAlertDecision } from "@/features/provider-notifications/notification-alert-policy";
import { DEFAULT_PROVIDER_NOTIFICATION_PREFERENCES } from "@/features/provider-notifications/types";
import type { ProviderNotification } from "@/features/provider-notifications/types";

function notification(type: ProviderNotification["type"]): ProviderNotification {
  return {
    id: crypto.randomUUID(),
    tenantId: crypto.randomUUID(),
    audience: "TENANT",
    recipientUserId: null,
    type,
    priority: "medium",
    title: "Aviso",
    description: "Descrição",
    entityType: "appointment",
    entityId: crypto.randomUUID(),
    actionUrl: "/app/appointments",
    readAt: null,
    archivedAt: null,
    createdAt: new Date().toISOString(),
    metadata: null,
  };
}

describe("provider notification alert policy", () => {
  it("keeps initial hydration silent", () => {
    expect(
      providerNotificationAlertDecision(
        notification("public_booking_created"),
        { ...DEFAULT_PROVIDER_NOTIFICATION_PREFERENCES, soundEnabled: true },
        true,
      ),
    ).toEqual({ toast: false, sound: false });
  });

  it("allows booking toast and sound according to preferences", () => {
    expect(
      providerNotificationAlertDecision(
        notification("booking_confirmation_required"),
        { ...DEFAULT_PROVIDER_NOTIFICATION_PREFERENCES, soundEnabled: true },
        false,
      ),
    ).toEqual({ toast: true, sound: true });
  });

  it("shows payment pending without sound", () => {
    expect(
      providerNotificationAlertDecision(
        notification("payment_pending"),
        { ...DEFAULT_PROVIDER_NOTIFICATION_PREFERENCES, soundEnabled: true },
        false,
      ),
    ).toEqual({ toast: true, sound: false });
  });
});
