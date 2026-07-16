export type ProviderNotificationCoordinationMessage =
  | {
      type: "invalidate";
      reason: "notifications" | "preferences";
    }
  | {
      type: "alert-delivered";
      notificationId: string;
    };

type LeaderLease = {
  owner: string;
  expiresAt: number;
  visible: boolean;
};
type StoredMessage = {
  owner: string;
  nonce: string;
  message: ProviderNotificationCoordinationMessage;
};

export function isProviderNotificationCoordinationMessage(
  value: unknown,
): value is ProviderNotificationCoordinationMessage {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  if (Object.keys(record).length !== 2) return false;
  if (record.type === "invalidate") {
    return record.reason === "notifications" || record.reason === "preferences";
  }
  return (
    record.type === "alert-delivered" &&
    typeof record.notificationId === "string" &&
    record.notificationId.length > 0 &&
    record.notificationId.length <= 100
  );
}

export function createProviderNotificationCoordinator(
  scope: { tenantId: string; userId: string },
  onMessage: (message: ProviderNotificationCoordinationMessage) => void,
) {
  const suffix = `${scope.tenantId}:${scope.userId}`;
  const leaderKey = `agendai:notifications:leader:${suffix}`;
  const messageKey = `agendai:notifications:message:${suffix}`;
  const channelName = `agendai:notifications:${suffix}`;
  const owner =
    globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
  const channel =
    typeof BroadcastChannel === "undefined"
      ? null
      : new BroadcastChannel(channelName);

  function isVisible() {
    return typeof document === "undefined" || document.visibilityState === "visible";
  }

  function readLease(): LeaderLease | null {
    try {
      const value = window.localStorage.getItem(leaderKey);
      if (!value) return null;
      const parsed = JSON.parse(value) as LeaderLease;
      return typeof parsed.owner === "string" &&
        typeof parsed.expiresAt === "number"
        ? { ...parsed, visible: parsed.visible === true }
        : null;
    } catch {
      return null;
    }
  }

  let leader = false;

  function release() {
    try {
      if (readLease()?.owner === owner) {
        window.localStorage.removeItem(leaderKey);
      }
    } finally {
      leader = false;
    }
  }

  function acquire() {
    const visible = isVisible();
    const current = readLease();
    if (
      current &&
      current.owner !== owner &&
      current.expiresAt > Date.now() &&
      !(visible && !current.visible)
    ) {
      leader = false;
      return false;
    }
    try {
      window.localStorage.setItem(
        leaderKey,
        JSON.stringify({ owner, expiresAt: Date.now() + 12_000, visible }),
      );
      leader = readLease()?.owner === owner;
    } catch {
      leader = true;
    }
    return leader;
  }

  acquire();
  const heartbeat = window.setInterval(() => {
    acquire();
  }, 4_000);

  const receive = (value: unknown) => {
    if (isProviderNotificationCoordinationMessage(value)) onMessage(value);
  };
  if (channel) channel.onmessage = (event) => receive(event.data);
  const onStorage = (event: StorageEvent) => {
    if (event.key !== messageKey || !event.newValue) return;
    try {
      const stored = JSON.parse(event.newValue) as { message?: unknown };
      receive(stored.message);
    } catch {
      // Ignore malformed or concurrently replaced fallback values.
    }
  };
  const onVisibilityChange = () => {
    acquire();
  };
  window.addEventListener("storage", onStorage);
  document.addEventListener("visibilitychange", onVisibilityChange);

  return {
    isLeader: () => {
      const lease = readLease();
      return leader && (!lease || lease.owner === owner);
    },
    publish(message: ProviderNotificationCoordinationMessage) {
      if (!isProviderNotificationCoordinationMessage(message)) return;
      channel?.postMessage(message);
      if (!channel) {
        try {
          const stored: StoredMessage = {
            owner,
            nonce: `${Date.now()}-${Math.random()}`,
            message,
          };
          window.localStorage.setItem(messageKey, JSON.stringify(stored));
        } catch {
          // The active tab keeps working when storage is unavailable.
        }
      }
    },
    close() {
      window.clearInterval(heartbeat);
      window.removeEventListener("storage", onStorage);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      channel?.close();
      release();
      try {
        const raw = window.localStorage.getItem(messageKey);
        const stored = raw ? (JSON.parse(raw) as { owner?: unknown }) : null;
        if (stored?.owner === owner) window.localStorage.removeItem(messageKey);
      } catch {
        // A malformed fallback value is not owned by this coordinator.
      }
    },
  };
}
