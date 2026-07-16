"use client";

import {
  createContext,
  Fragment,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Bell,
  CalendarCheck2,
  CheckCheck,
  ChevronRight,
  CircleDollarSign,
  LoaderCircle,
  Settings2,
  Volume2,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import type {
  ProviderNotification,
  ProviderNotificationPreferences,
  ProviderNotificationsResponse,
} from "@/features/provider-notifications/types";
import { DEFAULT_PROVIDER_NOTIFICATION_PREFERENCES } from "@/features/provider-notifications/types";
import {
  providerNotificationAlertDecision,
  providerNotificationDeliveryDecision,
} from "@/features/provider-notifications/notification-alert-policy";
import { createProviderNotificationPreferenceQueue } from "@/features/provider-notifications/notification-preference-queue";
import {
  createProviderNativeNotification,
  playProviderNotificationAudio,
} from "@/features/provider-notifications/notification-browser-alerts";
import { lockPageScroll } from "@/features/provider-notifications/page-scroll-lock";
import {
  consumeUnreadTransition,
  mergeProviderNotificationPages,
  mergePendingProviderNotificationPoll,
  observeProviderNotificationPoll,
  pendingProviderNotificationForVisibleTab,
  providerNotificationListUrl,
  recordProviderNotificationAlertDelivery,
  unreadNotificationIds,
} from "@/features/provider-notifications/notification-client-state";
import {
  createProviderNotificationCoordinator,
  type ProviderNotificationCoordinationMessage,
} from "@/features/provider-notifications/notification-coordination";
import { cn } from "@/lib/utils";

const POLLING_INTERVAL_MS = 30_000;
const TOAST_DURATION_MS = 8_000;
const SOUND_PROMPT_DISMISSED_KEY = "agendai:sound-permission-dismissed";

type NotificationCenterContextValue = {
  unreadCount: number;
  open: (trigger: HTMLButtonElement) => void;
  preferences: ProviderNotificationPreferences;
  preferencesLoaded: boolean;
  soundFeedback: string | null;
  soundRuntimeFeedback: string | null;
  nativePermission: NotificationPermission | "unsupported";
  nativeFeedback: string | null;
  nativeTestFeedback: string | null;
  updatePreference: (
    key: keyof ProviderNotificationPreferences,
    value: boolean,
  ) => Promise<boolean>;
  testSound: () => Promise<boolean>;
  requestNativePermission: () => Promise<NotificationPermission | "unsupported">;
  testNativeNotification: () => Promise<void>;
};

const NotificationCenterContext =
  createContext<NotificationCenterContextValue | null>(null);

function relativeTime(value: string) {
  const seconds = Math.max(
    0,
    Math.floor((Date.now() - new Date(value).getTime()) / 1000),
  );
  if (seconds < 60) return "Agora";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `Há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Há ${hours} h`;
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
  }).format(new Date(value));
}

function notificationDateGroup(value: string) {
  const date = new Date(value);
  const today = new Date();
  const startToday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  const startDate = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  );
  const days = Math.round(
    (startToday.getTime() - startDate.getTime()) / 86_400_000,
  );
  if (days === 0) return "Hoje";
  if (days === 1) return "Ontem";
  return "Anteriores";
}

function isBookingNotification(notification: ProviderNotification) {
  return (
    notification.type === "public_booking_created" ||
    notification.type === "booking_confirmation_required"
  );
}

function notificationGroup(notification: ProviderNotification) {
  if (
    notification.type === "payment_pending" ||
    notification.type === "payment_received"
  )
    return "financial";
  if (
    notification.type === "business_setup_incomplete" ||
    notification.type === "system"
  )
    return "system";
  return "bookings";
}

function NotificationTypeIcon({
  notification,
}: {
  notification: ProviderNotification;
}) {
  if (notificationGroup(notification) === "financial") {
    return <CircleDollarSign className="size-4" aria-hidden="true" />;
  }
  if (notificationGroup(notification) === "bookings") {
    return <CalendarCheck2 className="size-4" aria-hidden="true" />;
  }
  return <Bell className="size-4" aria-hidden="true" />;
}

function notificationActionLabel(notification: ProviderNotification) {
  if (notificationGroup(notification) === "financial") return "Ver financeiro";
  if (notification.entityType === "appointment") return "Ver agendamento";
  return "Abrir no painel";
}

function getBaseTitle(value: string) {
  return value
    .replace(/^\(\d+\)\s*/, "")
    .replace(/^Novo agendamento!\s*\|\s*/, "");
}

export function ProviderNotificationCenter({
  tenantId,
  userId,
  children,
}: {
  tenantId: string;
  userId: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentDate = searchParams.get("startDate");
  const [notifications, setNotifications] = useState<ProviderNotification[]>(
    [],
  );
  const [unreadCount, setUnreadCount] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"all" | "unread">("all");
  const [categoryFilter, setCategoryFilter] = useState<
    "all" | "bookings" | "financial" | "system"
  >("all");
  const [toast, setToast] = useState<ProviderNotification | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [showSoundPrompt, setShowSoundPrompt] = useState(false);
  const [agendaHighlightVisible, setAgendaHighlightVisible] = useState(false);
  const [soundFeedback, setSoundFeedback] = useState<string | null>(null);
  const [soundRuntimeFeedback, setSoundRuntimeFeedback] = useState<
    string | null
  >(null);
  const [nativePermission, setNativePermission] = useState<
    NotificationPermission | "unsupported"
  >("unsupported");
  const [nativeFeedback, setNativeFeedback] = useState<string | null>(null);
  const [nativeTestFeedback, setNativeTestFeedback] = useState<string | null>(
    null,
  );
  const [preferences, setPreferences] =
    useState<ProviderNotificationPreferences>(
      DEFAULT_PROVIDER_NOTIFICATION_PREFERENCES,
    );
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);
  const observedIds = useRef(new Set<string>());
  const deliveredAlertIds = useRef(new Set<string>());
  const pendingAlerts = useRef(new Map<string, ProviderNotification>());
  const soundPlayedIds = useRef(new Set<string>());
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const initialLoadComplete = useRef(false);
  const preferencesRef = useRef<ProviderNotificationPreferences>(
    DEFAULT_PROVIDER_NOTIFICATION_PREFERENCES,
  );
  const requestInFlight = useRef(false);
  const loadNotificationsRef = useRef<
    ((allowAlerts: boolean) => Promise<void>) | null
  >(null);
  const pendingPollRef = useRef(false);
  const pendingPollAllowAlertsRef = useRef(false);
  const listRequestIdRef = useRef(0);
  const loadedAdditionalPagesRef = useRef(false);
  const loadedPageCountRef = useRef(1);
  const filterInitializedRef = useRef(false);
  const statusFilterRef = useRef<"all" | "unread">("all");
  const categoryFilterRef = useRef<"all" | "bookings" | "financial" | "system">(
    "all",
  );
  const preferencePatchQueueRef = useRef<ReturnType<
    typeof createProviderNotificationPreferenceQueue
  > | null>(null);
  const unreadCountRef = useRef(0);
  const unreadIdsRef = useRef(new Set<string>());
  const pathnameRef = useRef(pathname);
  const currentDateRef = useRef(currentDate);
  const baseTitle = useRef("");
  const temporaryTitleActive = useRef(false);
  const titleTimer = useRef<number | null>(null);
  const agendaHighlightTimer = useRef<number | null>(null);
  const coordinatorRef = useRef<ReturnType<
    typeof createProviderNotificationCoordinator
  > | null>(null);
  const drawerRef = useRef<HTMLElement | null>(null);
  const openerRef = useRef<HTMLButtonElement | null>(null);
  const soundPromptDismissedKey = `${SOUND_PROMPT_DISMISSED_KEY}:${tenantId}:${userId}`;

  const openNotifications = useCallback((trigger: HTMLButtonElement) => {
    openerRef.current = trigger;
    setDrawerOpen(true);
  }, []);

  const applyCountTitle = useCallback(() => {
    if (!baseTitle.current || temporaryTitleActive.current) return;
    document.title =
      unreadCountRef.current > 0
        ? `(${unreadCountRef.current}) ${baseTitle.current}`
        : baseTitle.current;
  }, []);

  const getAudio = useCallback(() => {
    try {
      if (!audioRef.current) {
        audioRef.current = new Audio("/sounds/new-booking.mp3");
      }
      return audioRef.current;
    } catch {
      return null;
    }
  }, []);

  const playSound = useCallback(async () => {
    if (!preferencesRef.current.soundEnabled) return false;
    const audio = getAudio();
    if (audio) audio.volume = 0.35;
    const result = await playProviderNotificationAudio(audio);
    if (result === "played") {
      setSoundRuntimeFeedback("O último alerta sonoro foi reproduzido.");
      return true;
    }
    setSoundRuntimeFeedback(
      result === "blocked"
        ? "O último alerta sonoro foi bloqueado pelo navegador."
        : "O navegador não disponibilizou o recurso de áudio.",
    );
    return false;
  }, [getAudio]);

  const testSound = useCallback(async () => {
    const audio = getAudio();
    if (audio) audio.volume = 0.2;
    const result = await playProviderNotificationAudio(audio);
    if (result === "played") {
      setSoundFeedback("Som de teste reproduzido com sucesso.");
      return true;
    }
    setSoundFeedback(
      result === "blocked"
        ? "O navegador bloqueou o teste de som. Interaja com a página e tente novamente."
        : "O navegador não disponibilizou o recurso de áudio.",
    );
    return false;
  }, [getAudio]);

  const requestNativePermission = useCallback(async () => {
    if (!("Notification" in window)) {
      setNativePermission("unsupported");
      setNativeFeedback(
        "Este navegador não oferece notificações nativas nesta página.",
      );
      return "unsupported";
    }
    try {
      const permission = await window.Notification.requestPermission();
      setNativePermission(permission);
      setNativeFeedback(
        permission === "granted"
          ? "Notificações do navegador ativadas."
          : permission === "denied"
            ? "A permissão foi bloqueada. Altere-a nas configurações do navegador."
            : "A permissão não foi concedida.",
      );
      return permission;
    } catch {
      setNativeFeedback("Não foi possível solicitar a permissão do navegador.");
      return window.Notification.permission;
    }
  }, []);

  const showNativeNotification = useCallback(
    (notification: ProviderNotification) =>
      createProviderNativeNotification({
        notification,
        NotificationApi:
          "Notification" in window ? window.Notification : null,
        focusWindow: () => window.focus(),
        navigate: (url) => router.push(url),
      }),
    [router],
  );

  const testNativeNotification = useCallback(async () => {
    let permission: NotificationPermission | "unsupported" =
      "Notification" in window
        ? window.Notification.permission
        : "unsupported";
    if (permission === "default") {
      permission = await requestNativePermission();
    }
    if (permission !== "granted") {
      setNativeTestFeedback(
        permission === "denied"
          ? "Teste não executado: permissão bloqueada."
          : permission === "unsupported"
            ? "Teste não executado: API indisponível."
            : "Teste não executado: permissão não ativada.",
      );
      return;
    }
    const result = showNativeNotification({
      id: `test-${Date.now()}`,
      tenantId,
      recipientUserId: userId,
      audience: "USER",
      type: "system",
      priority: "medium",
      title: "Teste de notificação do Agendaí",
      description: "As notificações deste navegador estão funcionando.",
      entityType: null,
      entityId: null,
      actionUrl: "/app",
      readAt: null,
      archivedAt: null,
      createdAt: new Date().toISOString(),
      metadata: null,
    });
    setNativeTestFeedback(
      result === "created"
        ? "Notificação de teste criada com sucesso."
        : "O navegador não conseguiu criar a notificação de teste.",
    );
  }, [requestNativePermission, showNativeNotification, tenantId, userId]);

  const applyPreferences = useCallback(
    (next: ProviderNotificationPreferences) => {
      preferencesRef.current = next;
      setPreferences(next);
    },
    [],
  );

  const refreshPreferences = useCallback(async () => {
    try {
      const response = await fetch("/api/provider/notifications/preferences", {
        cache: "no-store",
      });
      if (!response.ok) return null;
      const payload = (await response.json()) as {
        preferences: ProviderNotificationPreferences;
      };
      applyPreferences(payload.preferences);
      return payload.preferences;
    } catch {
      return null;
    }
  }, [applyPreferences]);

  const updatePreference = useCallback(
    (key: keyof ProviderNotificationPreferences, value: boolean) => {
      preferencePatchQueueRef.current ??=
        createProviderNotificationPreferenceQueue({
          getCurrent: () => preferencesRef.current,
          apply: applyPreferences,
          patch: async (patchKey, patchValue) => {
            const response = await fetch(
              "/api/provider/notifications/preferences",
              {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ [patchKey]: patchValue }),
              },
            );
            if (!response.ok) return null;
            const payload = (await response.json()) as {
              preferences: ProviderNotificationPreferences;
            };
            return payload.preferences;
          },
          refresh: refreshPreferences,
          invalidate: () =>
            coordinatorRef.current?.publish({
              type: "invalidate",
              reason: "preferences",
            }),
        });
      return preferencePatchQueueRef.current.enqueue(key, value);
    },
    [applyPreferences, refreshPreferences],
  );

  const showTemporaryBookingTitle = useCallback(() => {
    if (!baseTitle.current) return;
    temporaryTitleActive.current = true;
    document.title = `Novo agendamento! | ${baseTitle.current}`;
    if (titleTimer.current) window.clearTimeout(titleTimer.current);
    titleTimer.current = window.setTimeout(() => {
      temporaryTitleActive.current = false;
      applyCountTitle();
    }, 5000);
  }, [applyCountTitle]);

  const recordAlertDelivery = useCallback(
    (notification: ProviderNotification, delivered: boolean) => {
      const newlyDelivered = recordProviderNotificationAlertDelivery({
        notification,
        delivered,
        pending: pendingAlerts.current,
        deliveredAlertIds: deliveredAlertIds.current,
      });
      if (newlyDelivered) {
        coordinatorRef.current?.publish({
          type: "alert-delivered",
          notificationId: notification.id,
        });
      }
      return newlyDelivered;
    },
    [],
  );

  const deliverAlert = useCallback(
    async (notification: ProviderNotification) => {
      if (deliveredAlertIds.current.has(notification.id)) return false;
      const decision = providerNotificationDeliveryDecision({
        notification,
        preferences: preferencesRef.current,
        initialLoad: false,
        visibility: document.visibilityState,
      });
      if (!decision.alert) return false;

      let delivered = false;
      if (decision.toast) {
        setToast(notification);
        delivered = true;
      } else if (decision.native) {
        delivered = showNativeNotification(notification) === "created";
      }

      if (delivered) {
        recordAlertDelivery(notification, true);
        if (isBookingNotification(notification)) {
          showTemporaryBookingTitle();
          if (pathnameRef.current.startsWith("/app/appointments")) {
            router.refresh();
            if (notification.metadata?.bookingDate === currentDateRef.current) {
              setAgendaHighlightVisible(true);
              if (agendaHighlightTimer.current) {
                window.clearTimeout(agendaHighlightTimer.current);
              }
              agendaHighlightTimer.current = window.setTimeout(
                () => setAgendaHighlightVisible(false),
                6000,
              );
            }
          }
        }
      } else {
        recordAlertDelivery(notification, false);
      }

      if (
        decision.sound &&
        !soundPlayedIds.current.has(notification.id) &&
        (await playSound())
      ) {
        soundPlayedIds.current.add(notification.id);
      }
      return delivered;
    },
    [
      playSound,
      recordAlertDelivery,
      router,
      showNativeNotification,
      showTemporaryBookingTitle,
    ],
  );

  const deliverPendingVisibleAlert = useCallback(async () => {
    if (document.visibilityState !== "visible") return false;
    const pending = pendingProviderNotificationForVisibleTab(
      pendingAlerts.current,
      deliveredAlertIds.current,
    );
    return pending ? deliverAlert(pending) : false;
  }, [deliverAlert]);

  const loadNotifications = useCallback(
    async (allowAlerts: boolean) => {
      if (requestInFlight.current) {
        const pending = mergePendingProviderNotificationPoll(
          {
            pending: pendingPollRef.current,
            allowAlerts: pendingPollAllowAlertsRef.current,
          },
          allowAlerts,
        );
        pendingPollRef.current = pending.pending;
        pendingPollAllowAlertsRef.current = pending.allowAlerts;
        return;
      }
      requestInFlight.current = true;

      try {
        const response = await fetch("/api/provider/notifications?limit=20", {
          cache: "no-store",
        });
        if (!response.ok) {
          setLoadError(true);
          setLoaded(true);
          return;
        }

        const payload =
          (await response.json()) as ProviderNotificationsResponse;
        const observation = observeProviderNotificationPoll({
          ids: payload.notifications.map(({ id }) => id),
          observedIds: observedIds.current,
          deliveredAlertIds: deliveredAlertIds.current,
          baselineEstablished: initialLoadComplete.current,
          allowAlerts,
        });
        initialLoadComplete.current = observation.baselineEstablished;
        const freshIds = new Set(observation.alertCandidateIds);
        const fresh = payload.notifications.filter(({ id }) =>
          freshIds.has(id),
        );

        if (allowAlerts && initialLoadComplete.current && fresh.length) {
          const newest = fresh.find(
            (notification) =>
              providerNotificationAlertDecision(
                notification,
                preferencesRef.current,
                false,
              ).alert,
          );
          if (newest) {
            await deliverAlert(newest);
          }
        }

        unreadCountRef.current = payload.unreadCount;
        setUnreadCount(payload.unreadCount);
        if (
          statusFilterRef.current === "all" &&
          categoryFilterRef.current === "all"
        ) {
          setLoadError(false);
          setNotifications((current) => {
            const merged = mergeProviderNotificationPages(
              payload.notifications,
              current,
            );
            unreadIdsRef.current = unreadNotificationIds(merged);
            return merged;
          });
          if (!loadedAdditionalPagesRef.current) {
            setNextCursor(payload.nextCursor);
          }
        }
        if (allowAlerts && fresh.length) {
          coordinatorRef.current?.publish({
            type: "invalidate",
            reason: "notifications",
          });
        }
        setLoaded(true);
      } catch {
        setLoadError(true);
        setLoaded(true);
        // A próxima execução do polling refaz a tentativa sem interromper o painel.
      } finally {
        requestInFlight.current = false;
        if (pendingPollRef.current) {
          const pendingAllowAlerts = pendingPollAllowAlertsRef.current;
          pendingPollRef.current = false;
          pendingPollAllowAlertsRef.current = false;
          window.setTimeout(
            () => void loadNotificationsRef.current?.(pendingAllowAlerts),
            0,
          );
        }
      }
    },
    [deliverAlert],
  );
  useEffect(() => {
    loadNotificationsRef.current = loadNotifications;
    return () => {
      loadNotificationsRef.current = null;
    };
  }, [loadNotifications]);

  const loadNotificationPage = useCallback(
    async ({
      append,
      cursor,
      status,
      category,
    }: {
      append: boolean;
      cursor?: string | null;
      status: "all" | "unread";
      category: "all" | "bookings" | "financial" | "system";
    }) => {
      const requestId = ++listRequestIdRef.current;
      if (!append) {
        setLoaded(false);
        setLoadError(false);
        setNotifications([]);
        unreadIdsRef.current.clear();
        setNextCursor(null);
        loadedAdditionalPagesRef.current = false;
        loadedPageCountRef.current = 1;
      } else {
        setLoadingMore(true);
      }
      try {
        const response = await fetch(
          providerNotificationListUrl({ status, category, cursor }),
          { cache: "no-store" },
        );
        if (!response.ok) throw new Error("notification_page_failed");
        const payload =
          (await response.json()) as ProviderNotificationsResponse;
        if (requestId !== listRequestIdRef.current) return;
        setNotifications((current) => {
          if (!append) {
            unreadIdsRef.current = unreadNotificationIds(payload.notifications);
            return payload.notifications;
          }
          const currentIds = new Set(current.map(({ id }) => id));
          const merged = [
            ...current,
            ...payload.notifications.filter(({ id }) => !currentIds.has(id)),
          ];
          unreadIdsRef.current = unreadNotificationIds(merged);
          return merged;
        });
        unreadCountRef.current = payload.unreadCount;
        setUnreadCount(payload.unreadCount);
        setNextCursor(payload.nextCursor);
        loadedAdditionalPagesRef.current =
          append || loadedAdditionalPagesRef.current;
        if (append) loadedPageCountRef.current += 1;
        setLoadError(false);
      } catch {
        if (requestId === listRequestIdRef.current) setLoadError(true);
      } finally {
        if (requestId === listRequestIdRef.current) {
          setLoaded(true);
          setLoadingMore(false);
        }
      }
    },
    [],
  );

  const loadMore = useCallback(async () => {
    if (!nextCursor || loadingMore) return;
    await loadNotificationPage({
      append: true,
      cursor: nextCursor,
      status: statusFilterRef.current,
      category: categoryFilterRef.current,
    });
  }, [loadNotificationPage, loadingMore, nextCursor]);

  const refreshLoadedNotificationPages = useCallback(
    async ({
      status,
      category,
    }: {
      status: "all" | "unread";
      category: "all" | "bookings" | "financial" | "system";
    }) => {
      const requestId = ++listRequestIdRef.current;
      const pageCount = loadedPageCountRef.current;
      const refreshed: ProviderNotification[] = [];
      let cursor: string | null = null;
      let unreadCount = unreadCountRef.current;
      try {
        for (let page = 0; page < pageCount; page += 1) {
          const response = await fetch(
            providerNotificationListUrl({ status, category, cursor }),
            { cache: "no-store" },
          );
          if (!response.ok) throw new Error("notification_refresh_failed");
          const payload =
            (await response.json()) as ProviderNotificationsResponse;
          if (requestId !== listRequestIdRef.current) return;
          refreshed.push(...payload.notifications);
          unreadCount = payload.unreadCount;
          cursor = payload.nextCursor;
          if (!cursor) break;
        }
        const deduped = Array.from(
          new Map(refreshed.map((item) => [item.id, item])).values(),
        );
        unreadIdsRef.current = unreadNotificationIds(deduped);
        setNotifications(deduped);
        unreadCountRef.current = unreadCount;
        setUnreadCount(unreadCount);
        setNextCursor(cursor);
        setLoadError(false);
      } catch {
        if (requestId === listRequestIdRef.current) setLoadError(true);
      }
    },
    [],
  );

  const pollAsLeader = useCallback(async () => {
    await loadNotifications(true);
    if (
      statusFilterRef.current !== "all" ||
      categoryFilterRef.current !== "all"
    ) {
      await refreshLoadedNotificationPages({
        status: statusFilterRef.current,
        category: categoryFilterRef.current,
      });
    }
  }, [loadNotifications, refreshLoadedNotificationPages]);

  useEffect(() => {
    function synchronize(message: ProviderNotificationCoordinationMessage) {
      if (message.type === "alert-delivered") {
        deliveredAlertIds.current.add(message.notificationId);
        pendingAlerts.current.delete(message.notificationId);
        return;
      }
      if (message.reason === "preferences") {
        void refreshPreferences();
        return;
      }
      void loadNotifications(false);
      if (
        loadedPageCountRef.current > 1 ||
        statusFilterRef.current !== "all" ||
        categoryFilterRef.current !== "all"
      ) {
        void refreshLoadedNotificationPages({
          status: statusFilterRef.current,
          category: categoryFilterRef.current,
        });
      }
    }
    const coordinator = createProviderNotificationCoordinator(
      { tenantId, userId },
      synchronize,
    );
    coordinatorRef.current = coordinator;
    return () => {
      coordinator.close();
      coordinatorRef.current = null;
    };
  }, [
    loadNotifications,
    refreshLoadedNotificationPages,
    refreshPreferences,
    tenantId,
    userId,
  ]);

  useEffect(() => {
    baseTitle.current = getBaseTitle(document.title);

    // Every tab hydrates once without alerts. Only the elected leader polls and
    // is therefore allowed to emit subsequent alerts, even while hidden.
    const initializationId = window.setTimeout(() => {
      setNativePermission(
        "Notification" in window
          ? window.Notification.permission
          : "unsupported",
      );
      void refreshPreferences()
        .then((nextPreferences) => {
          if (!nextPreferences) return;
          setShowSoundPrompt(
            !nextPreferences.soundEnabled &&
              window.localStorage.getItem(soundPromptDismissedKey) !== "true",
          );
        })
        .finally(() => setPreferencesLoaded(true));
      void loadNotifications(false);
    }, 0);
    const intervalId = window.setInterval(() => {
      if (coordinatorRef.current?.isLeader() ?? true) void pollAsLeader();
    }, POLLING_INTERVAL_MS);
    const synchronizeVisibleTab = () => {
      setNativePermission(
        "Notification" in window
          ? window.Notification.permission
          : "unsupported",
      );
      if (coordinatorRef.current?.isLeader() ?? true) {
        void deliverPendingVisibleAlert().finally(() => {
          void pollAsLeader();
        });
        if (
          statusFilterRef.current !== "all" ||
          categoryFilterRef.current !== "all"
        ) {
          void refreshLoadedNotificationPages({
            status: statusFilterRef.current,
            category: categoryFilterRef.current,
          });
        }
      }
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") synchronizeVisibleTab();
    };
    window.addEventListener("focus", synchronizeVisibleTab);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      window.clearTimeout(initializationId);
      window.removeEventListener("focus", synchronizeVisibleTab);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      if (titleTimer.current) window.clearTimeout(titleTimer.current);
      if (agendaHighlightTimer.current) {
        window.clearTimeout(agendaHighlightTimer.current);
      }
      temporaryTitleActive.current = false;
      if (baseTitle.current) document.title = baseTitle.current;
    };
  }, [
    loadNotifications,
    deliverPendingVisibleAlert,
    pollAsLeader,
    refreshLoadedNotificationPages,
    refreshPreferences,
    soundPromptDismissedKey,
  ]);

  useEffect(() => {
    unreadCountRef.current = unreadCount;
    applyCountTitle();
  }, [applyCountTitle, unreadCount]);

  useEffect(() => {
    pathnameRef.current = pathname;
    currentDateRef.current = currentDate;
  }, [currentDate, pathname]);

  useEffect(() => {
    statusFilterRef.current = statusFilter;
    categoryFilterRef.current = categoryFilter;
    if (!filterInitializedRef.current) {
      filterInitializedRef.current = true;
      return;
    }
    const filterLoadId = window.setTimeout(() => {
      void loadNotificationPage({
        append: false,
        status: statusFilter,
        category: categoryFilter,
      });
    }, 0);
    return () => window.clearTimeout(filterLoadId);
  }, [categoryFilter, loadNotificationPage, statusFilter]);

  useEffect(() => {
    const titleSyncId = window.setTimeout(() => {
      const nextBaseTitle = getBaseTitle(document.title);
      if (nextBaseTitle) baseTitle.current = nextBaseTitle;
      applyCountTitle();
    }, 0);
    return () => window.clearTimeout(titleSyncId);
  }, [applyCountTitle, pathname]);

  useEffect(() => {
    if (!drawerOpen) return;
    return lockPageScroll();
  }, [drawerOpen]);

  useEffect(() => {
    if (!drawerOpen) return;
    const dialog = drawerRef.current;
    const focusable = () =>
      dialog
        ? Array.from(
            dialog.querySelectorAll<HTMLElement>(
              'button:not([disabled]), [href], input:not([disabled]):not([type="hidden"]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
            ),
          )
        : [];
    focusable()[0]?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setDrawerOpen(false);
        openerRef.current?.focus();
      }
      if (event.key === "Tab") {
        const items = focusable();
        if (!items.length) return;
        const first = items[0];
        const last = items.at(-1);
        if (!dialog?.contains(document.activeElement)) {
          event.preventDefault();
          (event.shiftKey ? last : first)?.focus();
          return;
        }
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      openerRef.current?.focus();
    };
  }, [drawerOpen]);

  useEffect(() => {
    if (!toast) return;
    const timeoutId = window.setTimeout(
      () => setToast(null),
      TOAST_DURATION_MS,
    );
    return () => window.clearTimeout(timeoutId);
  }, [toast]);

  const markRead = useCallback(
    async (notificationId: string) => {
      const response = await fetch(
        `/api/provider/notifications/${notificationId}/read`,
        { method: "PATCH" },
      ).catch(() => null);
      if (!response?.ok) {
        void loadNotifications(false);
        return false;
      }

      const readAt = new Date().toISOString();
      setNotifications((current) =>
        current.map((notification) =>
          notification.id === notificationId && !notification.readAt
            ? { ...notification, readAt }
            : notification,
        ),
      );
      if (consumeUnreadTransition(unreadIdsRef.current, notificationId)) {
        const next = Math.max(0, unreadCountRef.current - 1);
        unreadCountRef.current = next;
        setUnreadCount(next);
      }
      coordinatorRef.current?.publish({
        type: "invalidate",
        reason: "notifications",
      });
      void loadNotifications(false);
      if (
        statusFilterRef.current !== "all" ||
        categoryFilterRef.current !== "all"
      ) {
        void refreshLoadedNotificationPages({
          status: statusFilterRef.current,
          category: categoryFilterRef.current,
        });
      }
      return true;
    },
    [loadNotifications, refreshLoadedNotificationPages],
  );

  const markAllRead = useCallback(async () => {
    const response = await fetch("/api/provider/notifications/read-all", {
      method: "PATCH",
    }).catch(() => null);
    if (!response?.ok) {
      void loadNotifications(false);
      return;
    }

    const readAt = new Date().toISOString();
    setNotifications((current) =>
      current.map((notification) => ({
        ...notification,
        readAt: notification.readAt ?? readAt,
      })),
    );
    unreadIdsRef.current.clear();
    coordinatorRef.current?.publish({
      type: "invalidate",
      reason: "notifications",
    });
    await loadNotifications(false);
    if (
      statusFilterRef.current !== "all" ||
      categoryFilterRef.current !== "all"
    ) {
      await refreshLoadedNotificationPages({
        status: statusFilterRef.current,
        category: categoryFilterRef.current,
      });
    }
  }, [loadNotifications, refreshLoadedNotificationPages]);

  const openNotification = useCallback(
    async (notification: ProviderNotification) => {
      if (!notification.readAt) await markRead(notification.id);
      if (!notification.actionUrl) return;
      setDrawerOpen(false);
      router.push(notification.actionUrl);
    },
    [markRead, router],
  );

  const visibleNotifications = notifications.filter((notification) => {
    if (statusFilter === "unread" && notification.readAt) return false;
    return (
      categoryFilter === "all" ||
      notificationGroup(notification) === categoryFilter
    );
  });

  return (
    <NotificationCenterContext.Provider
      value={{
        unreadCount,
        open: openNotifications,
        preferences,
        preferencesLoaded,
        soundFeedback,
        soundRuntimeFeedback,
        nativePermission,
        nativeFeedback,
        nativeTestFeedback,
        updatePreference,
        testSound,
        requestNativePermission,
        testNativeNotification,
      }}
    >
      {children}
      <p className="sr-only" aria-live="polite">
        {soundRuntimeFeedback ?? soundFeedback ?? nativeTestFeedback ?? nativeFeedback}
      </p>

      {agendaHighlightVisible && pathname.startsWith("/app/appointments") ? (
        <div className="fixed bottom-5 left-1/2 z-40 -translate-x-1/2 rounded-xl border border-primary/25 bg-primary-soft px-4 py-2 text-sm font-medium text-primary shadow-card">
          A agenda foi atualizada com um novo agendamento.
        </div>
      ) : null}

      {toast ? (
        <div
          className="fixed bottom-5 right-4 z-[70] w-[calc(100%-2rem)] max-w-sm overflow-hidden rounded-2xl border border-border bg-card shadow-elevated sm:right-6"
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          <div
            className={cn(
              "absolute inset-y-0 left-0 w-1",
              toast.priority === "high" || toast.priority === "critical"
                ? "bg-warning"
                : "bg-primary",
            )}
          />
          <div className="flex gap-3 p-4 pl-5">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
              <NotificationTypeIcon notification={toast} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">{toast.title}</p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {toast.description}
              </p>
              {toast.actionUrl ? (
                <button
                  type="button"
                  onClick={() => void openNotification(toast)}
                  className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:text-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                >
                  {notificationActionLabel(toast)}{" "}
                  <ChevronRight className="size-4" />
                </button>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => setToast(null)}
              className="grid size-10 shrink-0 place-items-center rounded-xl text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
              aria-label="Fechar aviso"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>
      ) : null}

      {showSoundPrompt ? (
        <div className="fixed left-4 top-20 z-[65] w-[calc(100%-2rem)] max-w-sm rounded-2xl border border-border bg-card p-4 shadow-elevated sm:bottom-5 sm:left-6 sm:top-auto">
          <div className="flex gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
              <Volume2 className="size-4" />
            </span>
            <div>
              <p className="font-semibold">Ativar alertas sonoros?</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Receba um aviso quando um novo agendamento chegar pelo link
                público.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  type="button"
                  onClick={() => {
                    window.localStorage.setItem(
                      soundPromptDismissedKey,
                      "true",
                    );
                    void testSound();
                    void updatePreference("soundEnabled", true);
                    setShowSoundPrompt(false);
                  }}
                >
                  Ativar som
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  type="button"
                  onClick={() => {
                    window.localStorage.setItem(
                      soundPromptDismissedKey,
                      "true",
                    );
                    setShowSoundPrompt(false);
                  }}
                >
                  Agora não
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {drawerOpen ? (
        <div className="fixed inset-0 z-[80]">
          <button
            type="button"
            className="absolute inset-0 bg-foreground/20 backdrop-blur-[1px]"
            onClick={() => setDrawerOpen(false)}
            aria-label="Fechar notificações"
          />
          <aside
            ref={drawerRef}
            className="absolute inset-y-0 right-0 flex h-[100dvh] max-h-[100dvh] w-full max-w-md flex-col overflow-hidden border-l border-border bg-card shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-label="Central de notificações"
          >
            <div className="shrink-0 border-b border-border px-4 py-3 min-[360px]:px-5">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold">Notificações</h2>
                  <p className="text-xs text-muted-foreground">
                    {unreadCount === 0
                      ? "Nenhuma não lida"
                      : `${unreadCount} ${unreadCount === 1 ? "não lida" : "não lidas"}`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  className="grid size-10 shrink-0 place-items-center rounded-xl text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                  aria-label="Fechar"
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>
            <div className="shrink-0 space-y-2 border-b border-border px-4 py-3 min-[360px]:px-5">
              <div className="flex min-h-10 items-center justify-between gap-2">
                <div className="flex shrink-0 gap-1 rounded-xl bg-muted p-1">
                  {(
                    [
                      ["all", "Todas"],
                      ["unread", "Não lidas"],
                    ] as const
                  ).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={statusFilter === value}
                      onClick={() => setStatusFilter(value)}
                      className={cn(
                        "rounded-lg px-3 py-1.5 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
                        statusFilter === value
                          ? "bg-card text-foreground shadow-sm"
                          : "text-muted-foreground",
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                {unreadCount > 0 ? (
                  <button
                    type="button"
                    onClick={() => void markAllRead()}
                    className="inline-flex min-h-10 items-center gap-1 text-sm font-semibold text-primary hover:text-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                  >
                    <CheckCheck className="size-4" /> Ler todas
                  </button>
                ) : (
                  <span aria-hidden="true" />
                )}
              </div>
              <div className="flex min-w-0 items-center gap-2">
                <div className="min-w-0 flex-1">
                  <Select
                    value={categoryFilter}
                    clearable={false}
                    onChange={(event) =>
                      setCategoryFilter(
                        event.target.value as typeof categoryFilter,
                      )
                    }
                    aria-label="Filtrar por categoria"
                  >
                    <option value="all">Todas as categorias</option>
                    <option value="bookings">Agendamentos</option>
                    <option value="financial">Financeiro</option>
                    <option value="system">Sistema</option>
                  </Select>
                </div>
                <button
                  type="button"
                  onClick={() => setPreferencesOpen((current) => !current)}
                  aria-expanded={preferencesOpen}
                  aria-controls="notification-inline-preferences"
                  aria-label={
                    preferencesOpen
                      ? "Fechar preferências de notificação"
                      : "Abrir preferências de notificação"
                  }
                  title={
                    preferencesOpen
                      ? "Fechar preferências de notificação"
                      : "Abrir preferências de notificação"
                  }
                  className={cn(
                    "grid size-11 shrink-0 place-items-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
                    preferencesOpen && "bg-muted text-foreground",
                  )}
                >
                  <Settings2 className="size-4" aria-hidden="true" />
                </button>
              </div>
            </div>
            {preferencesOpen ? (
              <div
                id="notification-inline-preferences"
                className="max-h-[45dvh] shrink-0 overflow-y-auto overscroll-contain border-b border-border bg-muted/20 p-4"
              >
                <NotificationPreferenceControls compact />
              </div>
            ) : null}
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              {!loaded && !loadError ? (
                <div className="grid place-items-center py-12 text-sm text-muted-foreground">
                  <LoaderCircle className="mb-2 size-5 animate-spin" />
                  Carregando notificações...
                </div>
              ) : null}
              {loaded && !loadError && !visibleNotifications.length ? (
                <div className="px-8 py-16 text-center">
                  <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-primary-soft text-primary">
                    <Bell className="size-5" />
                  </span>
                  <p className="mt-4 font-semibold">
                    {statusFilter !== "all" || categoryFilter !== "all"
                      ? "Nenhuma notificação neste filtro"
                      : "Nenhuma notificação por enquanto"}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {statusFilter !== "all" || categoryFilter !== "all"
                      ? "Altere os filtros para consultar outros avisos."
                      : "Quando novos agendamentos e avisos importantes chegarem, eles aparecerão aqui."}
                  </p>
                </div>
              ) : null}
              {loadError && !notifications.length ? (
                <div className="px-8 py-12 text-center" role="alert">
                  <p className="font-semibold">Não foi possível carregar</p>
                  <Button
                    className="mt-3"
                    size="sm"
                    variant="outline"
                    onClick={() => void loadNotifications(false)}
                  >
                    Tentar novamente
                  </Button>
                </div>
              ) : null}
              {visibleNotifications.map((notification, index) => (
                <Fragment key={notification.id}>
                  {index === 0 ||
                  notificationDateGroup(notification.createdAt) !==
                    notificationDateGroup(
                      visibleNotifications[index - 1]?.createdAt ?? "",
                    ) ? (
                    <p className="border-b border-border bg-muted/30 px-5 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {notificationDateGroup(notification.createdAt)}
                    </p>
                  ) : null}
                  <div
                    onClick={() => {
                      if (notification.actionUrl) {
                        void openNotification(notification);
                      } else if (!notification.readAt) {
                        void markRead(notification.id);
                      }
                    }}
                    onKeyDown={(event) => {
                      if (
                        (notification.actionUrl || !notification.readAt) &&
                        (event.key === "Enter" || event.key === " ")
                      ) {
                        event.preventDefault();
                        if (notification.actionUrl) {
                          void openNotification(notification);
                        } else {
                          void markRead(notification.id);
                        }
                      }
                    }}
                    role={
                      notification.actionUrl || !notification.readAt
                        ? "button"
                        : undefined
                    }
                    tabIndex={
                      notification.actionUrl || !notification.readAt
                        ? 0
                        : undefined
                    }
                    className={cn(
                      "border-b border-border px-5 py-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/30",
                      !notification.readAt && "bg-primary/[0.035]",
                      (notification.actionUrl || !notification.readAt) &&
                        "cursor-pointer hover:bg-muted/60",
                    )}
                  >
                    <div className="flex gap-3">
                      <span
                        className={cn(
                          "mt-1.5 size-2 shrink-0 rounded-full",
                          !notification.readAt
                            ? "bg-primary"
                            : "bg-transparent",
                        )}
                      />
                      <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-xl bg-muted text-muted-foreground">
                        <NotificationTypeIcon notification={notification} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold">{notification.title}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {notification.description}
                        </p>
                        <p className="mt-2 text-xs text-muted-foreground">
                          {relativeTime(notification.createdAt)}
                          {notification.metadata?.source === "public_link"
                            ? " · Link público"
                            : ""}
                        </p>
                      </div>
                      {notification.actionUrl ? (
                        <ChevronRight
                          className="mt-2 size-4 shrink-0 text-muted-foreground"
                          aria-hidden="true"
                        />
                      ) : null}
                    </div>
                  </div>
                </Fragment>
              ))}
              {nextCursor ? (
                <div className="p-4 text-center">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={loadingMore}
                    onClick={() => void loadMore()}
                  >
                    {loadingMore ? (
                      <LoaderCircle className="mr-2 size-4 animate-spin" />
                    ) : null}
                    Carregar mais
                  </Button>
                </div>
              ) : loaded && notifications.length ? (
                <p className="px-5 py-4 text-center text-xs text-muted-foreground">
                  Fim das notificações.
                </p>
              ) : null}
            </div>
          </aside>
        </div>
      ) : null}
    </NotificationCenterContext.Provider>
  );
}

export function ProviderNotificationTrigger({
  compact = false,
}: {
  compact?: boolean;
}) {
  const center = useContext(NotificationCenterContext);

  if (!center) return null;

  const hasUnread = center.unreadCount > 0;
  const unreadLabel = center.unreadCount > 99 ? "99+" : center.unreadCount;

  return (
    <button
      type="button"
      onClick={(event) => center.open(event.currentTarget)}
      className={cn(
        "group relative text-sm transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
        compact
          ? "flex size-10 items-center justify-center rounded-xl border border-border bg-card shadow-sm hover:bg-muted"
          : [
              "flex w-full items-center gap-3 rounded-2xl border border-border",
              "bg-card px-3 py-3 text-left shadow-sm",
              "hover:border-primary/20 hover:bg-primary/[0.025]",
            ],
      )}
      aria-label={`Abrir notificações${
        hasUnread
          ? `, ${center.unreadCount} ${
              center.unreadCount === 1 ? "não lida" : "não lidas"
            }`
          : ""
      }`}
      title={compact ? "Notificações" : undefined}
    >
      <span
        className={cn(
          "relative grid shrink-0 place-items-center rounded-xl",
          compact ? "size-8" : "size-10",
          hasUnread
            ? "bg-primary-soft text-primary"
            : "bg-muted text-muted-foreground",
        )}
      >
        <Bell className="size-4" aria-hidden="true" />

        {hasUnread ? (
          <span
            className={cn(
              "absolute grid min-w-5 place-items-center rounded-full",
              "bg-primary px-1 py-0.5 text-[10px] font-bold leading-none",
              "text-primary-foreground ring-2 ring-background",
              compact ? "-right-1.5 -top-1.5" : "-right-2 -top-2",
            )}
            aria-hidden="true"
          >
            {unreadLabel}
          </span>
        ) : null}
      </span>

      {!compact ? (
        <>
          <span className="min-w-0 flex-1">
            <span className="block font-semibold text-foreground">
              Notificações
            </span>

            <span className="mt-0.5 block truncate text-xs text-muted-foreground">
              {hasUnread
                ? `${center.unreadCount} ${
                    center.unreadCount === 1
                      ? "aviso não lido"
                      : "avisos não lidos"
                  }`
                : "Nenhum aviso novo"}
            </span>
          </span>

          <ChevronRight
            className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
            aria-hidden="true"
          />
        </>
      ) : null}
    </button>
  );
}

function NotificationPreferenceControls({
  compact = false,
}: {
  compact?: boolean;
}) {
  const center = useContext(NotificationCenterContext);
  if (!center) return null;
  const {
    preferences,
    preferencesLoaded,
    soundFeedback,
    soundRuntimeFeedback,
    nativePermission,
    nativeFeedback,
    nativeTestFeedback,
    testSound,
    requestNativePermission,
    testNativeNotification,
    updatePreference,
  } = center;

  const items: {
    key: keyof ProviderNotificationPreferences;
    label: string;
    description: string;
  }[] = [
    {
      key: "panelNotificationsEnabled",
      label: "Receber notificações no painel",
      description:
        "Exibe avisos operacionais enquanto o painel estiver aberto.",
    },
    {
      key: "publicBookingNotificationsEnabled",
      label: "Novos agendamentos pelo link público",
      description:
        "Mostra alertas para novos agendamentos e solicitações de confirmação.",
    },
    {
      key: "cancellationNotificationsEnabled",
      label: "Cancelamentos de agendamento",
      description:
        "Reserva a preferência para avisos de cancelamento pelo cliente.",
    },
    {
      key: "rescheduleNotificationsEnabled",
      label: "Reagendamentos",
      description:
        "Reserva a preferência para alterações de horário pelo cliente.",
    },
    {
      key: "paymentNotificationsEnabled",
      label: "Pagamentos pendentes",
      description:
        "Mostra alertas de atendimentos concluídos sem pagamento registrado.",
    },
    {
      key: "soundEnabled",
      label: "Tocar som para novos agendamentos",
      description:
        "O som toca apenas para novos agendamentos pelo link público.",
    },
  ];

  return (
    <section
      className={cn(
        !compact && "rounded-2xl border border-border bg-card p-5 shadow-card",
      )}
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h2 className={cn("font-semibold", compact && "text-lg")}>
            Notificações
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Defina como o painel deve avisar sobre novos agendamentos e
            pendências importantes.
          </p>
          <div className="mt-4 rounded-xl border border-border bg-background p-3">
            <p className="text-sm font-semibold">
              Notificações com a aba em segundo plano
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Autorize o navegador para receber avisos enquanto o Agendaí
              permanecer aberto em outra aba.
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Permissão do navegador: {nativePermission === "granted"
                ? "permitida"
                : nativePermission === "denied"
                  ? "bloqueada"
                  : nativePermission === "default"
                    ? "não ativada"
                    : "indisponível"}.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
            {nativePermission === "default" ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="mt-3"
                onClick={() => void requestNativePermission()}
              >
                <Bell className="mr-2 size-4" /> Ativar no navegador
              </Button>
            ) : null}
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => void testNativeNotification()}
              >
                <Bell className="mr-2 size-4" /> Testar notificação
              </Button>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Último teste de notificação: {nativeTestFeedback ?? "ainda não executado"}
            </p>
            {nativeFeedback ? (
              <p className="mt-2 text-xs text-muted-foreground" role="status">
                {nativeFeedback}
              </p>
            ) : null}
          </div>
          <div className="mt-4 space-y-2">
            {items.map((item) => {
              const disabled =
                item.key !== "panelNotificationsEnabled" &&
                !preferences.panelNotificationsEnabled;
              return (
                <label
                  key={item.key}
                  className={cn(
                    "flex items-center justify-between gap-4 rounded-xl border border-border bg-background px-3 py-3",
                    disabled && "cursor-not-allowed opacity-55",
                  )}
                >
                  <span>
                    <span className="block text-sm font-semibold">
                      {item.label}
                    </span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {item.description}
                    </span>
                  </span>
                  <input
                    type="checkbox"
                    checked={preferences[item.key]}
                    disabled={disabled || !preferencesLoaded}
                    onChange={(event) =>
                      void updatePreference(item.key, event.target.checked)
                    }
                    className="size-4 shrink-0 accent-primary"
                    aria-label={item.label}
                  />
                </label>
              );
            })}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => void testSound()}
            >
              <Volume2 className="mr-2 size-4" /> Testar som
            </Button>
            {soundFeedback ? (
              <p className="text-sm text-muted-foreground" role="status">
                Último teste de som: {soundFeedback}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Último teste de som: ainda não executado.
              </p>
            )}
            {soundRuntimeFeedback ? (
              <p className="text-sm text-muted-foreground" role="status">
                {soundRuntimeFeedback}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

export function NotificationSoundSettings({
  integrated = false,
}: {
  integrated?: boolean;
}) {
  return <NotificationPreferenceControls compact={integrated} />;
}
