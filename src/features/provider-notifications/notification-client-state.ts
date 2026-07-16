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
  observedIds,
  deliveredAlertIds,
  baselineEstablished,
  allowAlerts,
}: {
  ids: readonly string[];
  observedIds: Set<string>;
  deliveredAlertIds: Set<string>;
  baselineEstablished: boolean;
  allowAlerts: boolean;
}) {
  if (!baselineEstablished) {
    for (const id of ids) {
      observedIds.add(id);
      deliveredAlertIds.add(id);
    }
    return { baselineEstablished: true, alertCandidateIds: [] as string[] };
  }
  for (const id of ids) observedIds.add(id);
  if (!allowAlerts) {
    return { baselineEstablished: true, alertCandidateIds: [] as string[] };
  }
  return {
    baselineEstablished: true,
    alertCandidateIds: ids.filter((id) => !deliveredAlertIds.has(id)),
  };
}

export function markProviderNotificationAlertDelivered(
  deliveredAlertIds: Set<string>,
  notificationId: string,
) {
  if (deliveredAlertIds.has(notificationId)) return false;
  deliveredAlertIds.add(notificationId);
  return true;
}

export function recordProviderNotificationAlertDelivery({
  notification,
  delivered,
  pending,
  deliveredAlertIds,
}: {
  notification: ProviderNotification;
  delivered: boolean;
  pending: Map<string, ProviderNotification>;
  deliveredAlertIds: Set<string>;
}) {
  if (!delivered) {
    if (!deliveredAlertIds.has(notification.id)) {
      pending.set(notification.id, notification);
    }
    return false;
  }
  pending.delete(notification.id);
  return markProviderNotificationAlertDelivered(
    deliveredAlertIds,
    notification.id,
  );
}

export function pendingProviderNotificationForVisibleTab(
  pending: ReadonlyMap<string, ProviderNotification>,
  deliveredAlertIds: ReadonlySet<string>,
) {
  for (const notification of pending.values()) {
    if (!deliveredAlertIds.has(notification.id)) return notification;
  }
  return null;
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
