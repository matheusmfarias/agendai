"use client";

import { useState } from "react";
import Link from "next/link";
import {
  CalendarClock,
  CalendarDays,
  ChevronRight,
  Copy,
  Globe,
  MessageCircle,
  Monitor,
  MoreHorizontal,
  Plus,
  Toolbox,
  UserPlus,
  UsersRound,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { AppointmentStatus } from "@/generated/prisma/client";
import {
  getProviderDisplayName,
  getProviderLogoFallbackText,
} from "@/lib/provider-brand";
import { STATUS_BADGE_VARIANT, STATUS_SHORT_LABELS } from "./provider-constants";

type DashboardAppointment = {
  id: string;
  startsAt: Date;
  endsAt: Date;
  status: string;
  origin: string;
  customer: { name: string };
  service: { name: string };
};

type ProviderDashboardOverviewProps = {
  tenant: {
    name: string;
    publicDisplayName: string | null;
    logoUrl: string | null;
    slug: string;
    status: string;
    onboardingStatus: string;
  };
  todayAppointments: DashboardAppointment[];
  futureAppointments: DashboardAppointment[];
  nextAppointment: DashboardAppointment | null;
  todayCount: number;
  activeCustomers: number;
  servicesCount: number;
  categoriesCount: number;
  scheduleBlocksCount: number;
  publicBookingReady: boolean;
  publicLinkAllowed: boolean;
  typebotReady: boolean;
  typebotAllowed: boolean;
};

const PENDING_STATUSES = new Set(["REQUESTED", "WAITING_INFO"]);

function formatTodayLabel() {
  const formatted = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());

  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

function formatTime(value: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatDateKey(value: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

function formatNextAppointmentDateLabel(value: Date) {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const appointmentDateKey = formatDateKey(value);
  if (appointmentDateKey === formatDateKey(today)) return "Hoje";
  if (appointmentDateKey === formatDateKey(tomorrow)) return "Amanhã";

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  }).format(new Date(value));
}

function formatTimeRange(appointment: DashboardAppointment) {
  return `${formatTime(appointment.startsAt)}-${formatTime(appointment.endsAt)}`;
}

function formatShortDay(value: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  })
    .format(new Date(value))
    .replace(".", "");
}

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Bom dia,";
  if (hour < 18) return "Boa tarde,";
  return "Boa noite,";
}

function statusLabel(status: string) {
  return (
    STATUS_SHORT_LABELS[status as AppointmentStatus] ??
    (status === "FINISHED" ? "Concluido" : status)
  );
}

function statusVariant(status: string) {
  return STATUS_BADGE_VARIANT[status as AppointmentStatus] ?? "default";
}

function serviceMeta(appointment: DashboardAppointment) {
  const originLabel =
    appointment.origin === "PUBLIC_LINK"
      ? "Link publico"
      : appointment.origin === "WHATSAPP"
        ? "WhatsApp"
        : "Painel";

  return `${appointment.service.name} · ${originLabel}`;
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function uniqueRecentCustomers(appointments: DashboardAppointment[]) {
  const seen = new Set<string>();
  return appointments
    .filter((appointment) => {
      const key = appointment.customer.name.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 4);
}

function MetricTile({
  title,
  value,
  caption,
  icon,
}: {
  title: string;
  value: React.ReactNode;
  caption: string;
  icon: React.ReactNode;
}) {
  return (
    <Card className="rounded-2xl border-border/80 bg-card shadow-sm">
      <CardContent className="flex min-h-22 flex-col justify-between">
        <div className="flex items-start justify-between">
          <p className="text-sm text-muted-foreground">{title}</p>
          <span className="text-muted-foreground">{icon}</span>
        </div>
        <div>
          <p className="text-3xl font-semibold leading-none tabular-nums">
            {value}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">{caption}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function QuickActions() {
  const actions = [
    {
      label: "Novo agendamento",
      href: "/app/appointments?panel=new",
      icon: <Plus className="size-4" />,
      primary: true,
    },
    {
      label: "Novo cliente",
      href: "/app/customers?panel=new",
      icon: <UserPlus className="size-4" />,
    },
    {
      label: "Bloquear horario",
      href: "/app/availability?tab=blocks&panel=block-new",
      icon: <CalendarClock className="size-4" />,
    },
    {
      label: "Novo serviço",
      href: "/app/services?panel=new",
      icon: <Toolbox className="size-4" />,
    },
  ];

  return (
    <Card className="rounded-2xl border-border/80 bg-card shadow-sm">
      <CardContent className="space-y-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Ações rápidas
        </p>
        <div className="space-y-2">
          {actions.map((action) => (
            <Button
              key={action.label}
              asChild
              className={`h-11 w-full justify-start rounded-full ${
                action.primary ? "" : "bg-muted text-foreground hover:bg-muted/80"
              }`}
              variant={action.primary ? "default" : "secondary"}
            >
              <Link href={action.href}>
                {action.icon}
                {action.label}
              </Link>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function DashboardMobileFab() {
  const [open, setOpen] = useState(false);
  const actions = [
    {
      label: "Novo agendamento",
      href: "/app/appointments?panel=new",
      icon: <Plus className="size-4" />,
    },
    {
      label: "Novo cliente",
      href: "/app/customers?panel=new",
      icon: <UserPlus className="size-4" />,
    },
    {
      label: "Novo serviço",
      href: "/app/services?panel=new",
      icon: <Toolbox className="size-4" />,
    },
    {
      label: "Bloquear horário",
      href: "/app/availability?tab=blocks&panel=block-new",
      icon: <CalendarClock className="size-4" />,
    },
  ];

  return (
    <div className="fixed bottom-5 right-5 z-[70] xl:hidden">
      <button
        type="button"
        aria-label="Fechar ações rápidas"
        onClick={() => setOpen(false)}
        className={`fixed inset-0 z-[60] bg-foreground/25 backdrop-blur-[1px] transition-opacity duration-200 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
      <div
        className={`relative z-[70] mb-3 w-64 origin-bottom-right overflow-hidden rounded-3xl border border-border bg-card p-2 shadow-2xl transition-all duration-200 ease-out ${
          open
            ? "translate-y-0 scale-100 opacity-100"
            : "pointer-events-none translate-y-3 scale-95 opacity-0"
        }`}
      >
          {actions.map((action, index) => (
            <Link
              key={action.href}
              href={action.href}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-semibold transition-all duration-200 hover:bg-muted ${
                open ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
              }`}
              style={{
                transitionDelay: open ? `${60 + index * 35}ms` : "0ms",
              }}
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                {action.icon}
              </span>
              {action.label}
            </Link>
          ))}
      </div>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={`relative z-[70] ml-auto grid size-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-xl shadow-primary/25 transition-all duration-200 active:scale-95 ${
          open ? "rotate-45 scale-105" : "rotate-0 scale-100"
        }`}
        aria-label={open ? "Fechar ações rápidas" : "Abrir ações rápidas"}
      >
        <Plus className="size-6" />
      </button>
    </div>
  );
}

function ChannelStatusDot({ ready }: { ready: boolean }) {
  return (
    <span
      className={`size-2 rounded-full ${ready ? "bg-emerald-500" : "bg-amber-500"}`}
    />
  );
}

function ChannelsCard({
  tenantSlug,
  publicBookingReady,
  publicLinkAllowed,
  typebotReady,
  typebotAllowed,
}: {
  tenantSlug: string;
  publicBookingReady: boolean;
  publicLinkAllowed: boolean;
  typebotReady: boolean;
  typebotAllowed: boolean;
}) {
  const publicUrl = `/${tenantSlug}`;

  async function copyPublicLink() {
    if (typeof window === "undefined") return;
    await navigator.clipboard?.writeText(`${window.location.origin}${publicUrl}`);
  }

  const rows = [
    {
      label: "Link público",
      detail: publicUrl,
      ready: publicBookingReady && publicLinkAllowed,
      icon: <Globe className="size-4" />,
    },
    {
      label: "WhatsApp / Typebot",
      detail: typebotReady
        ? "Configurado"
        : typebotAllowed
          ? "Não configurado"
          : "Indisponível",
      ready: typebotReady,
      icon: <MessageCircle className="size-4" />,
    },
    {
      label: "Painel manual",
      detail: "Pronto",
      ready: true,
      icon: <Monitor className="size-4" />,
    },
  ];

  return (
    <Card className="rounded-2xl border-border/80 bg-card shadow-sm">
      <CardContent className="space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Canais de agendamento
          </p>
        <div className="divide-y divide-border">
          {rows.map((row) => (
            <div key={row.label} className="flex items-center gap-3 py-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground">
                {row.icon}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{row.label}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {row.detail}
                </p>
              </div>
              <ChannelStatusDot ready={row.ready} />
            </div>
          ))}
        </div>
        <div className="p-0">
          <Button
            type="button"
            variant="outline"
            className="h-10 w-full rounded-full cursor-pointer"
            onClick={copyPublicLink}
          >
            <Copy className="size-4" />
            Copiar link público
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function AppointmentRow({
  appointment,
  compactDate = false,
  highlighted = false,
}: {
  appointment: DashboardAppointment;
  compactDate?: boolean;
  highlighted?: boolean;
}) {
  return (
    <Link
      href={`/app/appointments/${appointment.id}`}
      className={`grid grid-cols-[6rem_1fr_auto_auto] items-center gap-3 border-t border-border px-5 py-3 transition-colors hover:bg-muted/50 max-sm:grid-cols-[5.25rem_1fr_auto] ${
        highlighted ? "bg-emerald-50/70" : ""
      }`}
    >
      <div className="text-sm font-semibold tabular-nums text-foreground">
        {compactDate ? (
          <span className="space-y-0.5 leading-tight">
            <span className="block">{formatShortDay(appointment.startsAt)}</span>
            <span className="block text-xs text-muted-foreground">
              {formatTimeRange(appointment)}
            </span>
          </span>
        ) : (
          formatTimeRange(appointment)
        )}
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold">{appointment.customer.name}</p>
        <p className="truncate text-xs text-muted-foreground">
          {serviceMeta(appointment)}
        </p>
      </div>
      <Badge
        variant={statusVariant(appointment.status)}
        className="hidden rounded-full px-2.5 sm:inline-flex"
      >
        {statusLabel(appointment.status)}
      </Badge>
      <MoreHorizontal className="size-4 text-muted-foreground" />
    </Link>
  );
}

function AppointmentsPanel({
  title,
  subtitle,
  appointments,
  emptyTitle,
  emptyDescription,
  showCreate,
  compactDate,
}: {
  title: string;
  subtitle: string;
  appointments: DashboardAppointment[];
  emptyTitle: string;
  emptyDescription: string;
  showCreate?: boolean;
  compactDate?: boolean;
}) {
  const firstUpcomingId = appointments[0]?.id;

  return (
    <Card className="overflow-hidden rounded-2xl border-border/80 bg-card shadow-sm">
      <div className="flex items-start justify-between gap-4 pl-4">
        <div>
          <h2 className="text-base font-semibold">{title}</h2>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
        <Button asChild variant="quiet" size="sm" className="h-auto">
          <Link href="/app/appointments">
            {title === "Agenda de hoje" ? "Abrir agenda completa" : "Ver todos"}
            <ChevronRight className="size-4" />
          </Link>
        </Button>
      </div>

      {appointments.length ? (
        <div>
          {appointments.map((appointment) => (
            <AppointmentRow
              key={appointment.id}
              appointment={appointment}
              compactDate={compactDate}
              highlighted={appointment.id === firstUpcomingId && !compactDate}
            />
          ))}
        </div>
      ) : (
        <div className="border-t border-border px-5 py-8">
          <div className="flex items-start gap-4">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground">
              <CalendarDays className="size-5" />
            </span>
            <div>
              <p className="font-semibold">{emptyTitle}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {emptyDescription}
              </p>
              {showCreate ? (
                <Button asChild variant="quiet" className="mt-3 h-auto p-0">
                  <Link href="/app/appointments?panel=new">
                    <Plus className="size-4" />
                    Criar manualmente
                  </Link>
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

function RecentCustomersCard({
  appointments,
}: {
  appointments: DashboardAppointment[];
}) {
  const customers = uniqueRecentCustomers(appointments);
  if (!customers.length) return null;

  return (
    <Card className="rounded-2xl border-border/80 bg-card shadow-sm">
      <CardContent className="space-y-3">
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Clientes recentes
          </p>
          <Link href="/app/customers" className="text-xs font-semibold text-primary">
            Ver todos
          </Link>
        </div>
        <div className="space-y-3">
          {customers.map((appointment) => (
            <Link
              key={appointment.customer.name}
              href={`/app/appointments/${appointment.id}`}
              className="flex items-center gap-3 rounded-xl transition-colors hover:bg-muted/50"
            >
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-emerald-100 text-xs font-semibold text-primary">
                {initials(appointment.customer.name)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">
                  {appointment.customer.name}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {appointment.service.name}
                </p>
              </div>
              <span className="text-xs text-muted-foreground">
                {formatShortDay(appointment.startsAt)}
              </span>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function ProviderDashboardOverview({
  tenant,
  todayAppointments,
  futureAppointments,
  nextAppointment,
  todayCount,
  activeCustomers,
  publicBookingReady,
  publicLinkAllowed,
  typebotReady,
  typebotAllowed,
}: ProviderDashboardOverviewProps) {
  const allUpcoming = [...todayAppointments, ...futureAppointments];
  const pendingCount = allUpcoming.filter((appointment) =>
    PENDING_STATUSES.has(appointment.status),
  ).length;
  const todayLabel = formatTodayLabel();
  const tenantName = getProviderDisplayName(tenant);
  const tenantInitials = getProviderLogoFallbackText(tenantName);

  return (
    <div className="mx-auto max-w-[1480px] space-y-4">
      <header className="flex flex-col gap-3 border-b border-border/80 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-end gap-3">
          {tenant.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={tenant.logoUrl}
              alt=""
              className="size-12 rounded-2xl border border-border object-cover"
            />
          ) : (
            <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary/10 text-sm font-bold text-primary">
              {tenantInitials}
            </div>
          )}
          <div>
            <p className="text-sm text-muted-foreground">{greeting()}</p>
            <h1 className="text-xl font-semibold leading-tight">{tenantName}</h1>
          </div>
        </div>
        <span className="w-fit rounded-full bg-muted px-4 py-2 text-xs font-medium text-muted-foreground">
          {todayLabel}
        </span>
      </header>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_260px] 2xl:grid-cols-[minmax(0,1fr)_280px]">
        <main className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <MetricTile
              title="Agendamentos hoje"
              value={todayCount}
              caption="marcados"
              icon={<CalendarDays className="size-4" />}
            />
            <MetricTile
              title="Próximo horário"
              value={
                nextAppointment ? (
                  <span className="flex items-baseline gap-2">
                    <span className="text-sm">
                      {formatNextAppointmentDateLabel(nextAppointment.startsAt)},
                    </span>
                    <span>{formatTime(nextAppointment.startsAt)}</span>
                  </span>
                ) : (
                  "—"
                )
              }
              caption={
                nextAppointment
                  ? `${nextAppointment.service.name} · ${nextAppointment.customer.name}`
                  : "Nenhum"
              }
              icon={<CalendarClock className="size-4" />}
            />
            <MetricTile
              title="Pendentes"
              value={pendingCount}
              caption="aguardam confirmação"
              icon={<CalendarClock className="size-4 text-amber-500" />}
            />
            <MetricTile
              title="Clientes ativos"
              value={activeCustomers}
              caption="cadastrados"
              icon={<UsersRound className="size-4" />}
            />
          </div>

          {pendingCount > 0 ? (
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              <p className="font-semibold">
                {pendingCount} agendamento{pendingCount > 1 ? "s" : ""} aguardando confirmação
              </p>
              <Link href="/app/appointments" className="font-semibold">
                Confirmar agora →
              </Link>
            </div>
          ) : null}

          <AppointmentsPanel
            title="Agenda de hoje"
            subtitle={todayLabel}
            appointments={todayAppointments}
            emptyTitle="Nenhum agendamento hoje"
            emptyDescription="Quando houver horários marcados, eles aparecem aqui em ordem de atendimento."
          />

          <AppointmentsPanel
            title="Próximos agendamentos"
            subtitle="Os próximos horários confirmados ou solicitados"
            appointments={futureAppointments}
            emptyTitle="Nenhum agendamento próximo"
            emptyDescription="Agendamentos feitos pelo link público, Typebot ou painel aparecerão aqui."
            showCreate
            compactDate
          />
        </main>

        <aside className="space-y-4">
          <div className="hidden xl:block">
            <QuickActions />
          </div>
          <ChannelsCard
            tenantSlug={tenant.slug}
            publicBookingReady={publicBookingReady}
            publicLinkAllowed={publicLinkAllowed}
            typebotReady={typebotReady}
            typebotAllowed={typebotAllowed}
          />
          <RecentCustomersCard appointments={allUpcoming} />
        </aside>
      </div>
      <DashboardMobileFab />
    </div>
  );
}
