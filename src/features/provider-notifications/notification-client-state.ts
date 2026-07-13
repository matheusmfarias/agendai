import type { ProviderNotification } from "@/features/provider-notifications/types";

export function unreadNotificationIds(
  notifications: readonly ProviderNotification[],
) {
  return new Set(
    notifications
      .filter((notification) => !notification.readAt)
      .map((notification) => notification.id),
  );
}

export function consumeUnreadTransition(
  unreadIds: Set<string>,
  notificationId: string,
) {
  if (!unreadIds.has(notificationId)) return false;
  unreadIds.delete(notificationId);
  return true;
}

export function mergeProviderNotificationPages(
  latest: readonly ProviderNotification[],
  current: readonly ProviderNotification[],
) {
  const latestIds = new Set(latest.map(({ id }) => id));
  return [...latest, ...current.filter(({ id }) => !latestIds.has(id))];
}

export function providerNotificationListUrl({
  status,
  category,
  cursor,
  limit = 20,
}: {
  status: "all" | "unread";
  category: "all" | "bookings" | "financial" | "system";
  cursor?: string | null;
  limit?: number;
}) {
  const query = new URLSearchParams({ status, limit: String(limit) });
  if (category !== "all") query.set("category", category);
  if (cursor) query.set("cursor", cursor);
  return `/api/provider/notifications?${query.toString()}`;
}

export function observeProviderNotificationPoll({
  ids,
  seenIds,
  baselineEstablished,
  allowAlerts,
}: {
  ids: readonly string[];
  seenIds: Set<string>;
  baselineEstablished: boolean;
  allowAlerts: boolean;
}) {
  if (!baselineEstablished) {
    for (const id of ids) seenIds.add(id);
    return { baselineEstablished: true, freshIds: [] as string[] };
  }
  if (!allowAlerts) {
    return { baselineEstablished: true, freshIds: [] as string[] };
  }
  const freshIds = ids.filter((id) => !seenIds.has(id));
  for (const id of ids) seenIds.add(id);
  return { baselineEstablished: true, freshIds };
}

export function mergePendingProviderNotificationPoll(
  current: { pending: boolean; allowAlerts: boolean },
  allowAlerts: boolean,
) {
  return {
    pending: true,
    allowAlerts: current.allowAlerts || allowAlerts,
  };
}
