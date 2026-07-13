import { describe, expect, it } from "vitest";

import {
  consumeUnreadTransition,
  mergeProviderNotificationPages,
  mergePendingProviderNotificationPoll,
  observeProviderNotificationPoll,
  providerNotificationListUrl,
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

  it("does not consume a new id during silent reconciliation after baseline", () => {
    const seenIds = new Set<string>();
    const baseline = observeProviderNotificationPoll({
      ids: ["notification-old"],
      seenIds,
      baselineEstablished: false,
      allowAlerts: false,
    });
    const silent = observeProviderNotificationPoll({
      ids: ["notification-new", "notification-old"],
      seenIds,
      baselineEstablished: baseline.baselineEstablished,
      allowAlerts: false,
    });
    const alertable = observeProviderNotificationPoll({
      ids: ["notification-new", "notification-old"],
      seenIds,
      baselineEstablished: silent.baselineEstablished,
      allowAlerts: true,
    });

    expect(seenIds).toContain("notification-new");
    expect(alertable.freshIds).toEqual(["notification-new"]);
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
