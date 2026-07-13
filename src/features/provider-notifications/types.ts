export const PROVIDER_NOTIFICATION_TYPES = [
  "public_booking_created",
  "booking_confirmation_required",
  "booking_confirmed",
  "booking_canceled",
  "booking_rescheduled",
  "booking_starting_soon",
  "payment_pending",
  "payment_received",
  "business_setup_incomplete",
  "system",
] as const;

export type ProviderNotificationType =
  (typeof PROVIDER_NOTIFICATION_TYPES)[number];

export function isProviderNotificationType(
  value: string | null | undefined,
): value is ProviderNotificationType {
  return PROVIDER_NOTIFICATION_TYPES.includes(value as ProviderNotificationType);
}

export const PROVIDER_NOTIFICATION_PRIORITIES = [
  "low",
  "medium",
  "high",
  "critical",
] as const;

export type ProviderNotificationPriority =
  (typeof PROVIDER_NOTIFICATION_PRIORITIES)[number];

export type ProviderNotificationMetadata = {
  customerName?: string;
  serviceName?: string;
  professionalName?: string;
  bookingDate?: string;
  bookingTime?: string;
  oldBookingDate?: string;
  oldBookingTime?: string;
  source?: "public_link" | "manual" | "whatsapp" | "typebot";
  requiresConfirmation?: boolean;
};

export type ProviderNotificationPreferences = {
  panelNotificationsEnabled: boolean;
  soundEnabled: boolean;
  publicBookingNotificationsEnabled: boolean;
  cancellationNotificationsEnabled: boolean;
  rescheduleNotificationsEnabled: boolean;
  paymentNotificationsEnabled: boolean;
};

export const DEFAULT_PROVIDER_NOTIFICATION_PREFERENCES: ProviderNotificationPreferences = {
  panelNotificationsEnabled: true,
  soundEnabled: false,
  publicBookingNotificationsEnabled: true,
  cancellationNotificationsEnabled: true,
  rescheduleNotificationsEnabled: true,
  paymentNotificationsEnabled: true,
};

export type ProviderNotification = {
  id: string;
  tenantId: string;
  recipientUserId: string | null;
  type: ProviderNotificationType;
  priority: ProviderNotificationPriority;
  title: string;
  description: string;
  entityType: "appointment" | "customer" | "payment" | "service" | "business" | null;
  entityId: string | null;
  actionUrl: string | null;
  readAt: string | null;
  archivedAt: string | null;
  createdAt: string;
  metadata: ProviderNotificationMetadata | null;
};

export type ProviderNotificationsResponse = {
  notifications: ProviderNotification[];
  unreadCount: number;
  nextCursor: string | null;
};
