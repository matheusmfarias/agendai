import type { ProviderNotification } from "@/features/provider-notifications/types";

export type NativeNotificationCreationResult =
  | "created"
  | "unsupported"
  | "permission_not_granted"
  | "constructor_failed";

type NativeNotificationConstructor = {
  permission: NotificationPermission;
  new (title: string, options?: NotificationOptions): Notification;
};

export function createProviderNativeNotification({
  notification,
  NotificationApi,
  focusWindow,
  navigate,
}: {
  notification: ProviderNotification;
  NotificationApi: NativeNotificationConstructor | null;
  focusWindow: () => void;
  navigate: (url: string) => void;
}): NativeNotificationCreationResult {
  if (!NotificationApi) return "unsupported";
  if (NotificationApi.permission !== "granted") {
    return "permission_not_granted";
  }
  try {
    const nativeNotification = new NotificationApi(notification.title, {
      body: notification.description,
      tag: `agendai-provider-notification:${notification.id}`,
    });
    nativeNotification.onclick = () => {
      focusWindow();
      nativeNotification.close();
      if (notification.actionUrl) navigate(notification.actionUrl);
    };
    return "created";
  } catch {
    return "constructor_failed";
  }
}

export type AudioPlaybackResult = "played" | "unavailable" | "blocked";

export async function playProviderNotificationAudio(
  audio: Pick<HTMLAudioElement, "currentTime" | "play"> | null,
): Promise<AudioPlaybackResult> {
  if (!audio) return "unavailable";
  try {
    audio.currentTime = 0;
    await audio.play();
    return "played";
  } catch {
    return "blocked";
  }
}
