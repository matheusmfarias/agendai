"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Bell,
  CalendarCheck2,
  CheckCheck,
  ChevronRight,
  LoaderCircle,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import type {
  ProviderNotification,
  ProviderNotificationPreferences,
  ProviderNotificationsResponse,
} from "@/features/provider-notifications/types";
import { DEFAULT_PROVIDER_NOTIFICATION_PREFERENCES } from "@/features/provider-notifications/types";
import { cn } from "@/lib/utils";

const POLLING_INTERVAL_MS = 30_000;
const TOAST_DURATION_MS = 8_000;
const SOUND_ENABLED_KEY = "agendai:sound-enabled";
const SOUND_PROMPT_DISMISSED_KEY = "agendai:sound-permission-dismissed";

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

function isBookingNotification(notification: ProviderNotification) {
  return (
    notification.type === "public_booking_created" ||
    notification.type === "booking_confirmation_required"
  );
}

function isImportantNotification(notification: ProviderNotification) {
  return (
    isBookingNotification(notification) ||
    notification.priority === "high" ||
    notification.priority === "critical"
  );
}

function notificationGroup(notification: ProviderNotification) {
  if (
    notification.type === "payment_pending" ||
    notification.type === "payment_received"
  ) return "financial";
  if (
    notification.type === "business_setup_incomplete" ||
    notification.type === "system"
  ) return "system";
  return "bookings";
}

function shouldShowNotificationAlert(
  notification: ProviderNotification,
  preferences: ProviderNotificationPreferences,
) {
  if (!preferences.panelNotificationsEnabled) return false;
  if (
    notification.type === "public_booking_created" ||
    notification.type === "booking_confirmation_required"
  ) return preferences.publicBookingNotificationsEnabled;
  if (notification.type === "booking_canceled") {
    return preferences.cancellationNotificationsEnabled;
  }
  if (notification.type === "booking_rescheduled") {
    return preferences.rescheduleNotificationsEnabled;
  }
  if (notification.type === "payment_pending") {
    return preferences.paymentNotificationsEnabled;
  }
  return true;
}

function getBaseTitle(value: string) {
  return value
    .replace(/^\(\d+\)\s*/, "")
    .replace(/^Novo agendamento!\s*\|\s*/, "");
}

export function ProviderNotificationCenter() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentDate = searchParams.get("startDate");
  const [notifications, setNotifications] = useState<ProviderNotification[]>(
    [],
  );
  const [unreadCount, setUnreadCount] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [filter, setFilter] = useState<
    "all" | "unread" | "bookings" | "financial" | "system"
  >("all");
  const [toast, setToast] = useState<ProviderNotification | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [showSoundPrompt, setShowSoundPrompt] = useState(false);
  const [agendaHighlightVisible, setAgendaHighlightVisible] = useState(false);
  const seenIds = useRef(new Set<string>());
  const initialLoadComplete = useRef(false);
  const preferencesRef = useRef<ProviderNotificationPreferences>(
    DEFAULT_PROVIDER_NOTIFICATION_PREFERENCES,
  );
  const requestInFlight = useRef(false);
  const unreadCountRef = useRef(0);
  const pathnameRef = useRef(pathname);
  const currentDateRef = useRef(currentDate);
  const baseTitle = useRef("");
  const temporaryTitleActive = useRef(false);
  const titleTimer = useRef<number | null>(null);
  const agendaHighlightTimer = useRef<number | null>(null);

  const applyCountTitle = useCallback(() => {
    if (!baseTitle.current || temporaryTitleActive.current) return;
    document.title =
      unreadCountRef.current > 0
        ? `(${unreadCountRef.current}) ${baseTitle.current}`
        : baseTitle.current;
  }, []);

  const playSound = useCallback(() => {
    if (!preferencesRef.current.soundEnabled) return;
    const audio = new Audio("/sounds/new-booking.mp3");
    audio.volume = 0.35;
    void audio.play().catch(() => undefined);
  }, []);

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

  const loadNotifications = useCallback(async () => {
    if (requestInFlight.current) return;
    requestInFlight.current = true;

    try {
      const response = await fetch("/api/provider/notifications?limit=20", {
        cache: "no-store",
      });
      if (!response.ok) return;

      const payload = (await response.json()) as ProviderNotificationsResponse;
      const fresh = payload.notifications.filter(
        (notification) => !seenIds.current.has(notification.id),
      );

      if (initialLoadComplete.current && fresh.length) {
        const newest = fresh
          .filter((notification) =>
            shouldShowNotificationAlert(notification, preferencesRef.current),
          )
          .find(isImportantNotification);
        if (newest) {
          setToast(newest);
          if (isBookingNotification(newest)) {
            playSound();
            showTemporaryBookingTitle();
            if (pathnameRef.current.startsWith("/app/appointments")) {
              router.refresh();
              if (newest.metadata?.bookingDate === currentDateRef.current) {
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
        }
      }

      payload.notifications.forEach((notification) =>
        seenIds.current.add(notification.id),
      );
      unreadCountRef.current = payload.unreadCount;
      setNotifications(payload.notifications);
      setUnreadCount(payload.unreadCount);
      initialLoadComplete.current = true;
      setLoaded(true);
    } catch {
      // A próxima execução do polling refaz a tentativa sem interromper o painel.
    } finally {
      requestInFlight.current = false;
    }
  }, [playSound, router, showTemporaryBookingTitle]);

  useEffect(() => {
    baseTitle.current = getBaseTitle(document.title);
    const soundIsEnabled = window.localStorage.getItem(SOUND_ENABLED_KEY) === "true";
    const initializationId = window.setTimeout(() => {
      setShowSoundPrompt(
        !soundIsEnabled &&
          window.localStorage.getItem(SOUND_PROMPT_DISMISSED_KEY) !== "true",
      );
    }, 0);

    void fetch("/api/provider/notifications/preferences", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return;
        const payload = (await response.json()) as {
          preferences: ProviderNotificationPreferences;
          hasStoredPreferences?: boolean;
        };
        const nextPreferences =
          !payload.hasStoredPreferences && soundIsEnabled
            ? { ...payload.preferences, soundEnabled: true }
            : payload.preferences;
        preferencesRef.current = nextPreferences;
        if (!payload.hasStoredPreferences && soundIsEnabled) {
          void fetch("/api/provider/notifications/preferences", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ soundEnabled: true }),
          });
        }
      })
      .catch(() => undefined);

    void loadNotifications();
    const intervalId = window.setInterval(() => {
      if (document.visibilityState === "visible") void loadNotifications();
    }, POLLING_INTERVAL_MS);
    const onFocus = () => void loadNotifications();
    window.addEventListener("focus", onFocus);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", onFocus);
      window.clearTimeout(initializationId);
      if (titleTimer.current) window.clearTimeout(titleTimer.current);
      if (agendaHighlightTimer.current) {
        window.clearTimeout(agendaHighlightTimer.current);
      }
      temporaryTitleActive.current = false;
      if (baseTitle.current) document.title = baseTitle.current;
    };
  }, [loadNotifications]);

  useEffect(() => {
    unreadCountRef.current = unreadCount;
    applyCountTitle();
  }, [applyCountTitle, unreadCount]);

  useEffect(() => {
    pathnameRef.current = pathname;
    currentDateRef.current = currentDate;
  }, [currentDate, pathname]);

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
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDrawerOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [drawerOpen]);

  useEffect(() => {
    if (!toast) return;
    const timeoutId = window.setTimeout(() => setToast(null), TOAST_DURATION_MS);
    return () => window.clearTimeout(timeoutId);
  }, [toast]);

  const markRead = useCallback(
    async (notificationId: string) => {
      const response = await fetch(
        `/api/provider/notifications/${notificationId}/read`,
        { method: "PATCH" },
      ).catch(() => null);
      if (!response?.ok) {
        void loadNotifications();
        return false;
      }

      setNotifications((current) =>
        current.map((notification) =>
          notification.id === notificationId && !notification.readAt
            ? { ...notification, readAt: new Date().toISOString() }
            : notification,
        ),
      );
      setUnreadCount((current) => {
        const next = Math.max(0, current - 1);
        unreadCountRef.current = next;
        return next;
      });
      return true;
    },
    [loadNotifications],
  );

  const markAllRead = useCallback(async () => {
    const response = await fetch("/api/provider/notifications/read-all", {
      method: "PATCH",
    }).catch(() => null);
    if (!response?.ok) {
      void loadNotifications();
      return;
    }

    const readAt = new Date().toISOString();
    setNotifications((current) =>
      current.map((notification) => ({
        ...notification,
        readAt: notification.readAt ?? readAt,
      })),
    );
    unreadCountRef.current = 0;
    setUnreadCount(0);
  }, [loadNotifications]);

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
    if (filter === "unread") return !notification.readAt;
    if (filter === "all") return true;
    return notificationGroup(notification) === filter;
  });

  return (
    <>
      <div className="fixed right-4 top-4 z-[55] sm:right-6 sm:top-5">
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="relative grid size-10 place-items-center rounded-xl border border-border bg-card text-muted-foreground shadow-card transition-colors hover:border-primary/30 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
          aria-label="Abrir notificações"
          title="Notificações"
        >
          <Bell className="size-4" />
          {unreadCount > 0 ? (
            <span className="absolute -right-1.5 -top-1.5 grid min-w-5 place-items-center rounded-full bg-primary px-1 py-0.5 text-[10px] font-bold leading-none text-primary-foreground ring-2 ring-background">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          ) : null}
        </button>
      </div>

      {agendaHighlightVisible && pathname.startsWith("/app/appointments") ? (
        <div className="fixed bottom-5 left-1/2 z-40 -translate-x-1/2 rounded-xl border border-primary/25 bg-primary-soft px-4 py-2 text-sm font-medium text-primary shadow-card">
          A agenda foi atualizada com um novo agendamento.
        </div>
      ) : null}

      {toast ? (
        <div className="fixed bottom-5 right-4 z-[70] w-[calc(100%-2rem)] max-w-sm overflow-hidden rounded-2xl border border-border bg-card shadow-elevated sm:right-6">
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
              <CalendarCheck2 className="size-4" />
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
                  Ver agendamento <ChevronRight className="size-4" />
                </button>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => setToast(null)}
              className="grid size-7 place-items-center rounded-lg text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
              aria-label="Fechar aviso"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>
      ) : null}

      {showSoundPrompt ? (
        <div className="fixed bottom-5 left-4 z-[65] w-[calc(100%-2rem)] max-w-sm rounded-2xl border border-border bg-card p-4 shadow-elevated sm:left-6">
          <div className="flex gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
              <Volume2 className="size-4" />
            </span>
            <div>
              <p className="font-semibold">Ativar alertas sonoros?</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Receba um aviso quando um novo agendamento chegar pelo link público.
              </p>
              <div className="mt-3 flex gap-2">
                <Button
                  size="sm"
                  type="button"
                  onClick={() => {
                    const audio = new Audio("/sounds/new-booking.mp3");
                    audio.volume = 0.1;
                    void audio.play().catch(() => undefined);
                    window.localStorage.setItem(SOUND_ENABLED_KEY, "true");
                    window.localStorage.setItem(
                      SOUND_PROMPT_DISMISSED_KEY,
                      "true",
                    );
                    const nextPreferences = {
                      ...preferencesRef.current,
                      soundEnabled: true,
                    };
                    preferencesRef.current = nextPreferences;
                    void fetch("/api/provider/notifications/preferences", {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ soundEnabled: true }),
                    });
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
                      SOUND_PROMPT_DISMISSED_KEY,
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
            className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col border-l border-border bg-card shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-label="Central de notificações"
          >
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div>
                <h2 className="text-lg font-semibold">Notificações</h2>
                <p className="text-xs text-muted-foreground">
                  Eventos importantes do seu negócio.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="grid size-9 place-items-center rounded-xl text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                aria-label="Fechar"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3">
              <div className="flex gap-1 rounded-xl bg-muted p-1">
                {([
                  ["all", "Todas"],
                  ["unread", "Não lidas"],
                  ["bookings", "Agendamentos"],
                  ["financial", "Financeiro"],
                  ["system", "Sistema"],
                ] as const).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setFilter(value)}
                    className={cn(
                      "rounded-lg px-3 py-1.5 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
                      filter === value
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
                  className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:text-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                >
                  <CheckCheck className="size-4" /> Ler todas
                </button>
              ) : null}
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              {!loaded ? (
                <div className="grid place-items-center py-12 text-sm text-muted-foreground">
                  <LoaderCircle className="mb-2 size-5 animate-spin" />
                  Carregando notificações...
                </div>
              ) : null}
              {loaded && !visibleNotifications.length ? (
                <div className="px-8 py-16 text-center">
                  <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-primary-soft text-primary">
                    <Bell className="size-5" />
                  </span>
                  <p className="mt-4 font-semibold">
                    Nenhuma notificação por enquanto
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Quando novos agendamentos e avisos importantes chegarem,
                    eles aparecerão aqui.
                  </p>
                </div>
              ) : null}
              {visibleNotifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => {
                    if (!notification.readAt) void markRead(notification.id);
                  }}
                  onKeyDown={(event) => {
                    if (
                      !notification.readAt &&
                      (event.key === "Enter" || event.key === " ")
                    ) {
                      event.preventDefault();
                      void markRead(notification.id);
                    }
                  }}
                  role={!notification.readAt ? "button" : undefined}
                  tabIndex={!notification.readAt ? 0 : undefined}
                  className={cn(
                    "border-b border-border px-5 py-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/30",
                    !notification.readAt && "bg-primary/[0.035]",
                  )}
                >
                  <div className="flex gap-3">
                    <span
                      className={cn(
                        "mt-1.5 size-2 shrink-0 rounded-full",
                        !notification.readAt ? "bg-primary" : "bg-transparent",
                      )}
                    />
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
                      {notification.actionUrl ? (
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            void openNotification(notification);
                          }}
                          className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:text-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                        >
                          Ver agendamento <ChevronRight className="size-4" />
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}

export function NotificationSoundSettings() {
  const [preferences, setPreferences] = useState<ProviderNotificationPreferences>(
    DEFAULT_PROVIDER_NOTIFICATION_PREFERENCES,
  );
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    void fetch("/api/provider/notifications/preferences", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return;
        const payload = (await response.json()) as {
          preferences: ProviderNotificationPreferences;
        };
        setPreferences(payload.preferences);
      })
      .catch(() => undefined)
      .finally(() => setLoaded(true));
  }, []);

  function update(
    key: keyof ProviderNotificationPreferences,
    value: boolean,
  ) {
    const previous = preferences;
    const next = { ...preferences, [key]: value };
    setPreferences(next);
    window.localStorage.setItem(SOUND_PROMPT_DISMISSED_KEY, "true");
    if (key === "soundEnabled") {
      window.localStorage.setItem(SOUND_ENABLED_KEY, String(value));
    }
    void fetch("/api/provider/notifications/preferences", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [key]: value }),
    }).then((response) => {
      if (!response.ok) setPreferences(previous);
    }).catch(() => setPreferences(previous));
  }

  const items: {
    key: keyof ProviderNotificationPreferences;
    label: string;
    description: string;
  }[] = [
    {
      key: "panelNotificationsEnabled",
      label: "Receber notificações no painel",
      description: "Exibe avisos operacionais enquanto o painel estiver aberto.",
    },
    {
      key: "publicBookingNotificationsEnabled",
      label: "Novos agendamentos pelo link público",
      description: "Mostra alertas para novos agendamentos e solicitações de confirmação.",
    },
    {
      key: "cancellationNotificationsEnabled",
      label: "Cancelamentos de agendamento",
      description: "Reserva a preferência para avisos de cancelamento pelo cliente.",
    },
    {
      key: "rescheduleNotificationsEnabled",
      label: "Reagendamentos",
      description: "Reserva a preferência para alterações de horário pelo cliente.",
    },
    {
      key: "paymentNotificationsEnabled",
      label: "Pagamentos pendentes",
      description: "Mostra alertas de atendimentos concluídos sem pagamento registrado.",
    },
    {
      key: "soundEnabled",
      label: "Tocar som para novos agendamentos",
      description: "O som toca apenas para novos agendamentos pelo link público.",
    },
  ];

  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-card">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
          {preferences.soundEnabled ? <Volume2 className="size-5" /> : <VolumeX className="size-5" />}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold">Notificações</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Defina como o painel deve avisar sobre novos agendamentos e pendências importantes.
          </p>
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
                    <span className="block text-sm font-semibold">{item.label}</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {item.description}
                    </span>
                  </span>
                  <input
                    type="checkbox"
                    checked={preferences[item.key]}
                    disabled={disabled || !loaded}
                    onChange={(event) => update(item.key, event.target.checked)}
                    className="size-4 shrink-0 accent-primary"
                    aria-label={item.label}
                  />
                </label>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
