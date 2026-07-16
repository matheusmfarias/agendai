import type {
  ProviderNotification,
  ProviderNotificationPreferences,
} from "@/features/provider-notifications/types";

export type ProviderNotificationAlertDecision = {
  alert: boolean;
  sound: boolean;
};

export type ProviderNotificationDeliveryDecision =
  ProviderNotificationAlertDecision & {
    toast: boolean;
    native: boolean;
  };

export function providerNotificationAlertDecision(
  notification: ProviderNotification,
  preferences: ProviderNotificationPreferences,
  initialLoad: boolean,
): ProviderNotificationAlertDecision {
  if (initialLoad || !preferences.panelNotificationsEnabled) {
    return { alert: false, sound: false };
  }
  if (
    notification.type === "public_booking_created" ||
    notification.type === "booking_confirmation_required"
  ) {
    const enabled = preferences.publicBookingNotificationsEnabled;
    return { alert: enabled, sound: enabled && preferences.soundEnabled };
  }
  if (notification.type === "payment_pending") {
    return {
      alert: preferences.paymentNotificationsEnabled,
      sound: false,
    };
  }
  if (notification.type === "booking_canceled") {
    return { alert: preferences.cancellationNotificationsEnabled, sound: false };
  }
  if (notification.type === "booking_rescheduled") {
    return { alert: preferences.rescheduleNotificationsEnabled, sound: false };
  }
  return {
    alert:
      notification.priority === "high" || notification.priority === "critical",
    sound: false,
  };
}

export function providerNotificationDeliveryDecision({
  notification,
  preferences,
  initialLoad,
  visibility,
}: {
  notification: ProviderNotification;
  preferences: ProviderNotificationPreferences;
  initialLoad: boolean;
  visibility: DocumentVisibilityState;
}): ProviderNotificationDeliveryDecision {
  const alert = providerNotificationAlertDecision(
    notification,
    preferences,
    initialLoad,
  );
  const visible = visibility === "visible";
  return {
    alert: alert.alert,
    toast: alert.alert && visible,
    native: alert.alert && !visible,
    sound: alert.sound,
  };
}
