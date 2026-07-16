import { describe, expect, it } from "vitest";

import {
  consumeUnreadTransition,
  mergeProviderNotificationPages,
  mergePendingProviderNotificationPoll,
  markProviderNotificationAlertDelivered,
  observeProviderNotificationPoll,
  pendingProviderNotificationForVisibleTab,
  providerNotificationListUrl,
  recordProviderNotificationAlertDelivery,
} from "@/features/provider-notifications/notification-client-state";
import type { ProviderNotification } from "@/features/provider-notifications/types";

describe("provider notification client read state", () => {
  it("consumes an unread transition exactly once across concurrent acknowledgements", () => {
    const unreadIds = new Set(["notification-a"]);

    expect(consumeUnreadTransition(unreadIds, "notification-a")).toBe(true);
    expect(consumeUnreadTransition(unreadIds, "notification-a")).toBe(false);
    expect(consumeUnreadTransition(unreadIds, "notification-b")).toBe(false);
  });

  it("keeps all 35 loaded items when polling refreshes the newest page", () => {
    const item = (id: string) => ({ id }) as ProviderNotification;
    const current = Array.from({ length: 35 }, (_, index) =>
      item(`notification-${index + 1}`),
    );
    const latest = [item("notification-new"), ...current.slice(0, 19)];

    const merged = mergeProviderNotificationPages(latest, current);

    expect(merged).toHaveLength(36);
    expect(new Set(merged.map(({ id }) => id)).size).toBe(36);
    expect(merged.at(-1)?.id).toBe("notification-35");
  });

  it("encodes status, category and cursor in server-side pagination URLs", () => {
    expect(
      providerNotificationListUrl({
        status: "unread",
        category: "financial",
        cursor: "cursor-a",
      }),
    ).toBe(
      "/api/provider/notifications?status=unread&limit=20&category=financial&cursor=cursor-a",
    );
  });

  it("observes silently without marking the alert as delivered", () => {
    const observedIds = new Set<string>();
    const deliveredAlertIds = new Set<string>();
    const baseline = observeProviderNotificationPoll({
      ids: ["notification-old"],
      observedIds,
      deliveredAlertIds,
      baselineEstablished: false,
      allowAlerts: false,
    });
    const silent = observeProviderNotificationPoll({
      ids: ["notification-new", "notification-old"],
      observedIds,
      deliveredAlertIds,
      baselineEstablished: baseline.baselineEstablished,
      allowAlerts: false,
    });
    const alertable = observeProviderNotificationPoll({
      ids: ["notification-new", "notification-old"],
      observedIds,
      deliveredAlertIds,
      baselineEstablished: silent.baselineEstablished,
      allowAlerts: true,
    });

    expect(observedIds).toContain("notification-new");
    expect(deliveredAlertIds).not.toContain("notification-new");
    expect(alertable.alertCandidateIds).toEqual(["notification-new"]);
  });

  it("delivers a pending alert once when visibility is recovered", () => {
    const item = { id: "notification-new" } as ProviderNotification;
    const pending = new Map([[item.id, item]]);
    const deliveredAlertIds = new Set<string>();

    expect(
      pendingProviderNotificationForVisibleTab(pending, deliveredAlertIds),
    ).toBe(item);
    expect(
      markProviderNotificationAlertDelivered(deliveredAlertIds, item.id),
    ).toBe(true);
    expect(
      pendingProviderNotificationForVisibleTab(pending, deliveredAlertIds),
    ).toBeNull();
    expect(
      markProviderNotificationAlertDelivered(deliveredAlertIds, item.id),
    ).toBe(false);
  });

  it("keeps a failed native delivery pending and resolves it only after success", () => {
    const item = { id: "notification-native" } as ProviderNotification;
    const pending = new Map<string, ProviderNotification>();
    const deliveredAlertIds = new Set<string>();

    expect(
      recordProviderNotificationAlertDelivery({
        notification: item,
        delivered: false,
        pending,
        deliveredAlertIds,
      }),
    ).toBe(false);
    expect(pending.get(item.id)).toBe(item);
    expect(deliveredAlertIds).not.toContain(item.id);

    expect(
      recordProviderNotificationAlertDelivery({
        notification: item,
        delivered: true,
        pending,
        deliveredAlertIds,
      }),
    ).toBe(true);
    expect(pending.has(item.id)).toBe(false);
    expect(deliveredAlertIds).toContain(item.id);
    expect(
      recordProviderNotificationAlertDelivery({
        notification: item,
        delivered: true,
        pending,
        deliveredAlertIds,
      }),
    ).toBe(false);
  });

  it("preserves an alertable pending request through silent invalidations", () => {
    const alertable = mergePendingProviderNotificationPoll(
      { pending: false, allowAlerts: false },
      true,
    );
    const afterSilent = mergePendingProviderNotificationPoll(alertable, false);

    expect(afterSilent).toEqual({ pending: true, allowAlerts: true });
  });
});
