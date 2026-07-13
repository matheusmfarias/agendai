import type {
  ProviderNotification,
  ProviderNotificationPreferences,
} from "@/features/provider-notifications/types";

export type ProviderNotificationAlertDecision = {
  toast: boolean;
  sound: boolean;
};

export function providerNotificationAlertDecision(
  notification: ProviderNotification,
  preferences: ProviderNotificationPreferences,
  initialLoad: boolean,
): ProviderNotificationAlertDecision {
  if (initialLoad || !preferences.panelNotificationsEnabled) {
    return { toast: false, sound: false };
  }
  if (
    notification.type === "public_booking_created" ||
    notification.type === "booking_confirmation_required"
  ) {
    const enabled = preferences.publicBookingNotificationsEnabled;
    return { toast: enabled, sound: enabled && preferences.soundEnabled };
  }
  if (notification.type === "payment_pending") {
    return {
      toast: preferences.paymentNotificationsEnabled,
      sound: false,
    };
  }
  if (notification.type === "booking_canceled") {
    return { toast: preferences.cancellationNotificationsEnabled, sound: false };
  }
  if (notification.type === "booking_rescheduled") {
    return { toast: preferences.rescheduleNotificationsEnabled, sound: false };
  }
  return {
    toast:
      notification.priority === "high" || notification.priority === "critical",
    sound: false,
  };
}
