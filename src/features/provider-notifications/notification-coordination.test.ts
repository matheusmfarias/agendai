import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  createProviderNotificationCoordinator,
  isProviderNotificationCoordinationMessage,
} from "@/features/provider-notifications/notification-coordination";

class MemoryStorage {
  private readonly values = new Map<string, string>();

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }

  removeItem(key: string) {
    this.values.delete(key);
  }

  clear() {
    this.values.clear();
  }
}

describe("provider notification multi-tab coordination", () => {
  const windowListeners = new Map<string, Set<(event: StorageEvent) => void>>();
  const documentListeners = new Map<string, Set<() => void>>();
  const storage = new MemoryStorage();
  let visibilityState: DocumentVisibilityState = "visible";
  const windowMock = {
    localStorage: storage,
    setInterval: vi.fn(() => 7),
    clearInterval: vi.fn(),
    addEventListener: vi.fn(
      (type: string, listener: (event: StorageEvent) => void) => {
        const listeners = windowListeners.get(type) ?? new Set();
        listeners.add(listener);
        windowListeners.set(type, listeners);
      },
    ),
    removeEventListener: vi.fn(
      (type: string, listener: (event: StorageEvent) => void) => {
        windowListeners.get(type)?.delete(listener);
      },
    ),
  };
  const documentMock = {
    get visibilityState() {
      return visibilityState;
    },
    addEventListener: vi.fn((type: string, listener: () => void) => {
      const listeners = documentListeners.get(type) ?? new Set();
      listeners.add(listener);
      documentListeners.set(type, listeners);
    }),
    removeEventListener: vi.fn((type: string, listener: () => void) => {
      documentListeners.get(type)?.delete(listener);
    }),
  };

  function dispatchVisibility() {
    for (const listener of documentListeners.get("visibilitychange") ?? []) {
      listener();
    }
  }

  function dispatchStorage(key: string) {
    const newValue = storage.getItem(key);
    for (const listener of windowListeners.get("storage") ?? []) {
      listener({ key, newValue } as StorageEvent);
    }
  }

  beforeEach(() => {
    storage.clear();
    visibilityState = "visible";
    windowListeners.clear();
    documentListeners.clear();
    vi.clearAllMocks();
    vi.stubGlobal("window", windowMock);
    vi.stubGlobal("document", documentMock);
    vi.stubGlobal("BroadcastChannel", undefined);
  });

  afterEach(() => vi.unstubAllGlobals());

  it("keeps a hidden tab polling until a visible tab takes leadership", () => {
    const first = createProviderNotificationCoordinator(
      { tenantId: "tenant-a", userId: "user-a" },
      vi.fn(),
    );
    expect(first.isLeader()).toBe(true);

    visibilityState = "hidden";
    dispatchVisibility();
    expect(first.isLeader()).toBe(true);

    visibilityState = "visible";
    const replacement = createProviderNotificationCoordinator(
      { tenantId: "tenant-a", userId: "user-a" },
      vi.fn(),
    );
    dispatchVisibility();
    expect(replacement.isLeader()).toBe(true);
    expect(first.isLeader()).toBe(false);

    first.close();
    replacement.close();
  });

  it("stores only a validated PII-free invalidation and removes its own fallback", () => {
    const onMessage = vi.fn();
    const coordinator = createProviderNotificationCoordinator(
      { tenantId: "tenant-a", userId: "user-a" },
      onMessage,
    );
    const message = { type: "invalidate", reason: "notifications" } as const;

    coordinator.publish(message);

    const messageKey = "agendai:notifications:message:tenant-a:user-a";
    const persisted = storage.getItem(messageKey);
    expect(persisted).not.toBeNull();
    expect(persisted).not.toMatch(/title|description|metadata|actionUrl|Maria/);
    dispatchStorage(messageKey);
    expect(onMessage).toHaveBeenCalledWith(message);

    coordinator.close();
    expect(storage.getItem(messageKey)).toBeNull();
  });

  it("rejects forged or data-bearing channel messages at runtime", () => {
    expect(
      isProviderNotificationCoordinationMessage({
        type: "invalidate",
        reason: "notifications",
      }),
    ).toBe(true);
    expect(
      isProviderNotificationCoordinationMessage({
        type: "alert-delivered",
        notificationId: "notification-a",
      }),
    ).toBe(true);
    expect(
      isProviderNotificationCoordinationMessage({
        type: "invalidate",
        reason: "notifications",
        payload: { actionUrl: "/app/admin" },
      }),
    ).toBe(false);
    expect(
      isProviderNotificationCoordinationMessage({
        type: "snapshot",
        payload: { title: "segredo" },
      }),
    ).toBe(false);
  });

  it("keeps scoped fallback messages isolated", () => {
    const onA = vi.fn();
    const onB = vi.fn();
    const a = createProviderNotificationCoordinator(
      { tenantId: "tenant-a", userId: "user-a" },
      onA,
    );
    const b = createProviderNotificationCoordinator(
      { tenantId: "tenant-b", userId: "user-a" },
      onB,
    );

    a.publish({ type: "invalidate", reason: "notifications" });
    dispatchStorage("agendai:notifications:message:tenant-a:user-a");

    expect(onA).toHaveBeenCalledTimes(1);
    expect(onB).not.toHaveBeenCalled();

    a.close();
    b.close();
  });
});
