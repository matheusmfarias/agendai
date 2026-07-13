import type { ProviderNotificationPreferences } from "@/features/provider-notifications/types";

type PreferenceKey = keyof ProviderNotificationPreferences;

export function createProviderNotificationPreferenceQueue({
  getCurrent,
  apply,
  patch,
  refresh,
  invalidate,
}: {
  getCurrent: () => ProviderNotificationPreferences;
  apply: (preferences: ProviderNotificationPreferences) => void;
  patch: (
    key: PreferenceKey,
    value: boolean,
  ) => Promise<ProviderNotificationPreferences | null>;
  refresh: () => Promise<ProviderNotificationPreferences | null>;
  invalidate: () => void;
}) {
  let queue: Promise<void> = Promise.resolve();

  return {
    enqueue(key: PreferenceKey, value: boolean) {
      apply({ ...getCurrent(), [key]: value });
      const operation = queue.then(async () => {
        const canonical = await patch(key, value).catch(() => null);
        if (canonical) {
          apply(canonical);
          invalidate();
          return true;
        }
        const refreshed = await refresh().catch(() => null);
        if (refreshed) apply(refreshed);
        return false;
      });
      queue = operation.then(
        () => undefined,
        () => undefined,
      );
      return operation;
    },
  };
}
