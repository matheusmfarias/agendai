import { describe, expect, it, vi } from "vitest";

import { createProviderNotificationPreferenceQueue } from "@/features/provider-notifications/notification-preference-queue";
import { DEFAULT_PROVIDER_NOTIFICATION_PREFERENCES } from "@/features/provider-notifications/types";

describe("provider notification preference queue", () => {
  it("serializes concurrent changes and re-fetches after the first failure", async () => {
    let current = DEFAULT_PROVIDER_NOTIFICATION_PREFERENCES;
    const apply = vi.fn((next: typeof current) => {
      current = next;
    });
    const patch = vi
      .fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        ...DEFAULT_PROVIDER_NOTIFICATION_PREFERENCES,
        paymentNotificationsEnabled: false,
      });
    const refresh = vi.fn().mockResolvedValue(DEFAULT_PROVIDER_NOTIFICATION_PREFERENCES);
    const invalidate = vi.fn();
    const queue = createProviderNotificationPreferenceQueue({
      getCurrent: () => current,
      apply,
      patch,
      refresh,
      invalidate,
    });

    const first = queue.enqueue("soundEnabled", true);
    const second = queue.enqueue("paymentNotificationsEnabled", false);

    expect(current).toMatchObject({
      soundEnabled: true,
      paymentNotificationsEnabled: false,
    });
    await expect(first).resolves.toBe(false);
    await expect(second).resolves.toBe(true);
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(patch.mock.invocationCallOrder[0]).toBeLessThan(
      patch.mock.invocationCallOrder[1] ?? Infinity,
    );
    expect(current).toMatchObject({
      soundEnabled: false,
      paymentNotificationsEnabled: false,
    });
    expect(invalidate).toHaveBeenCalledTimes(1);
  });
});
