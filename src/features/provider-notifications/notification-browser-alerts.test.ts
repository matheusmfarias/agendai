import { describe, expect, it, vi } from "vitest";

import {
  createProviderNativeNotification,
  playProviderNotificationAudio,
} from "@/features/provider-notifications/notification-browser-alerts";
import type { ProviderNotification } from "@/features/provider-notifications/types";

const notification = {
  id: "notification-a",
  title: "Novo agendamento",
  description: "Ana solicitou um horário.",
  actionUrl: "/app/appointments",
} as ProviderNotification;

function notificationApi({
  permission = "granted",
  throws = false,
}: {
  permission?: NotificationPermission;
  throws?: boolean;
}) {
  const instances: Array<{ onclick: (() => void) | null; close: ReturnType<typeof vi.fn> }> = [];
  class NotificationMock {
    static permission = permission;
    onclick: (() => void) | null = null;
    close = vi.fn();

    constructor() {
      if (throws) throw new Error("constructor failed");
      instances.push(this);
    }
  }
  return {
    api: NotificationMock as unknown as typeof Notification,
    instances,
  };
}

describe("provider notification browser alerts", () => {
  it("creates a native notification and wires focus and navigation", () => {
    const { api, instances } = notificationApi({});
    const focusWindow = vi.fn();
    const navigate = vi.fn();

    expect(
      createProviderNativeNotification({
        notification,
        NotificationApi: api,
        focusWindow,
        navigate,
      }),
    ).toBe("created");

    instances[0]?.onclick?.();
    expect(focusWindow).toHaveBeenCalledOnce();
    expect(instances[0]?.close).toHaveBeenCalledOnce();
    expect(navigate).toHaveBeenCalledWith("/app/appointments");
  });

  it("preserves failure when the Notification constructor throws", () => {
    const { api } = notificationApi({ throws: true });
    expect(
      createProviderNativeNotification({
        notification,
        NotificationApi: api,
        focusWindow: vi.fn(),
        navigate: vi.fn(),
      }),
    ).toBe("constructor_failed");
  });

  it("preserves the alert when the Notification API is unavailable", () => {
    expect(
      createProviderNativeNotification({
        notification,
        NotificationApi: null,
        focusWindow: vi.fn(),
        navigate: vi.fn(),
      }),
    ).toBe("unsupported");
  });

  it.each(["default", "denied"] as const)(
    "does not create a native notification with %s permission",
    (permission) => {
      const { api, instances } = notificationApi({ permission });
      expect(
        createProviderNativeNotification({
          notification,
          NotificationApi: api,
          focusWindow: vi.fn(),
          navigate: vi.fn(),
        }),
      ).toBe("permission_not_granted");
      expect(instances).toHaveLength(0);
    },
  );

  it("reports a rejected audio.play without considering the sound played", async () => {
    const audio = { currentTime: 12, play: vi.fn().mockRejectedValue(new Error("blocked")) };
    await expect(playProviderNotificationAudio(audio)).resolves.toBe("blocked");
    expect(audio.currentTime).toBe(0);
  });
});
