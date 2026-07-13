import Link from "next/link";
import { ArrowDownUp, ArrowRight, CalendarDays, Clock, RotateCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { AppointmentStatusBadge } from "@/features/appointments/appointment-status";
import type { AppointmentStatus } from "@/generated/prisma/client";
import { requireCustomer } from "@/features/auth/permissions";
import {
  getCustomerDisplayStatus,
  isCustomerCanceledStatus,
  isCustomerHistoryStatus,
} from "@/features/customer-portal/customer-appointment-status";
import { CustomerAppointmentsAutoRefresh } from "@/features/customer-portal/customer-appointments-auto-refresh";
import { CustomerShell } from "@/features/customer-portal/customer-shell";
import {
  getProviderDisplayName,
  getProviderLogoFallbackText,
} from "@/lib/provider-brand";
import { listCustomerAppointments } from "@/server/repositories/customer-portal-repository";

export const metadata = { title: "Meus agendamentos" };

type CustomerAppointment = Awaited<
  ReturnType<typeof listCustomerAppointments>
>[number];

type Tab = "proximos" | "historico" | "cancelados";
type SortOrder = "desc" | "asc";

function canRebook(appointment: CustomerAppointment) {
  return appointment.service.isActive && appointment.service.category.isActive;
}

function displayStatusFor(appointment: CustomerAppointment) {
  return getCustomerDisplayStatus({
    status: appointment.status,
    endsAt: appointment.endsAt,
  });
}

function tenantDisplayName(tenant: CustomerAppointment["tenant"]) {
  return getProviderDisplayName(tenant);
}

function sortAppointments(
  appointments: CustomerAppointment[],
  sortOrder: SortOrder,
) {
  return [...appointments].sort((a, b) => {
    const diff =
      new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime();

    return sortOrder === "desc" ? diff : -diff;
  });
}

function groupAppointments(
  appointments: CustomerAppointment[],
  sortOrder: SortOrder,
) {
  const upcoming = appointments.filter((appointment) => {
    const status = displayStatusFor(appointment);
    return !isCustomerHistoryStatus(status) && !isCustomerCanceledStatus(status);
  });
  const finished = appointments.filter((appointment) =>
    isCustomerHistoryStatus(displayStatusFor(appointment)),
  );
  const canceled = appointments.filter((appointment) =>
    isCustomerCanceledStatus(displayStatusFor(appointment)),
  );

  return {
    upcoming: sortAppointments(upcoming, sortOrder),
    finished: sortAppointments(finished, sortOrder),
    canceled: sortAppointments(canceled, sortOrder),
  };
}

function formatDate(date: Date | string) {
  const parsed = new Date(date);
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "America/Sao_Paulo",
  }).format(parsed);
}

function formatTime(date: Date | string) {
  const parsed = new Date(date);
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: "America/Sao_Paulo",
  }).format(parsed);
}

function statusPill(status: AppointmentStatus) {
  return <AppointmentStatusBadge status={status} />;
}

function TabLink({
  tab,
  current,
  sortOrder,
  children,
}: {
  tab: Tab;
  current: Tab;
  sortOrder: SortOrder;
  children: React.ReactNode;
}) {
  const active = tab === current;

  return (
    <Link
      href={`/cliente/agendamentos?tab=${tab}&sort=${sortOrder}`}
      className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
        active
          ? "bg-foreground text-background"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </Link>
  );
}

function SortButton({
  currentTab,
  sortOrder,
}: {
  currentTab: Tab;
  sortOrder: SortOrder;
}) {
  const nextSortOrder = sortOrder === "desc" ? "asc" : "desc";

  return (
    <Button asChild variant="outline" size="sm" className="rounded-full">
      <Link href={`/cliente/agendamentos?tab=${currentTab}&sort=${nextSortOrder}`}>
        <ArrowDownUp className="size-3.5" />
        {sortOrder === "desc" ? "Mais recentes" : "Mais antigos"}
      </Link>
    </Button>
  );
}

function AppointmentCard({
  appointment,
  showRebook = false,
}: {
  appointment: CustomerAppointment;
  showRebook?: boolean;
}) {
  const displayStatus = displayStatusFor(appointment);

  return (
    <article className="border-b p-4 last:border-b-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="line-clamp-2 font-bold text-foreground">
            {appointment.service.name}
          </h2>
          <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
            {appointment.tenant.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={appointment.tenant.logoUrl}
                alt=""
                className="size-5 rounded-md border object-cover"
              />
            ) : (
              <span className="grid size-5 shrink-0 place-items-center rounded-md bg-primary/10 text-[9px] font-bold text-primary">
                {getProviderLogoFallbackText(tenantDisplayName(appointment.tenant))}
              </span>
            )}
            <span className="truncate">{tenantDisplayName(appointment.tenant)}</span>
          </div>
        </div>
        {statusPill(displayStatus)}
      </div>

      <div className="mt-4 space-y-2 text-sm text-muted-foreground">
        <div className="inline-flex items-center gap-1.5">
          <CalendarDays className="size-3.5" aria-hidden="true" />
          {formatDate(appointment.startsAt)}
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-1.5">
            <Clock className="size-3.5" aria-hidden="true" />
            {formatTime(appointment.startsAt)}
          </span>
          <Link
            href={`/cliente/agendamentos/${appointment.id}`}
            className="inline-flex shrink-0 items-center gap-1 font-semibold text-primary"
          >
            Ver detalhes
            <ArrowRight className="size-3.5" />
          </Link>
        </div>
      </div>

      {showRebook && canRebook(appointment) ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <Button asChild size="sm" variant="outline" className="rounded-full">
            <Link
              href={`/${appointment.tenant.slug}/book?serviceId=${appointment.service.id}`}
            >
              <RotateCw className="size-3.5" />
              Agendar novamente
            </Link>
          </Button>
        </div>
      ) : null}
    </article>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed px-5 py-12 text-center">
      <p className="font-semibold text-foreground">
        Nada por aqui ainda.
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        Use o link do prestador para reservar um horário.
      </p>
    </div>
  );
}

export default async function CustomerAppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; sort?: string }>;
}) {
  const user = await requireCustomer();
  const appointments = await listCustomerAppointments(user.id);
  const { tab, sort } = await searchParams;
  const currentTab: Tab =
    tab === "historico" || tab === "cancelados" ? tab : "proximos";
  const sortOrder: SortOrder = sort === "asc" ? "asc" : "desc";
  const { upcoming, finished, canceled } = groupAppointments(
    appointments,
    sortOrder,
  );
  const list =
    currentTab === "historico"
      ? finished
      : currentTab === "cancelados"
        ? canceled
        : upcoming;

  return (
    <CustomerShell>
      <CustomerAppointmentsAutoRefresh />
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Meus agendamentos
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Acompanhe o que está marcado e o que já foi atendido.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex rounded-full border bg-card p-1">
          <TabLink tab="proximos" current={currentTab} sortOrder={sortOrder}>
            Próximos
          </TabLink>
          <TabLink tab="historico" current={currentTab} sortOrder={sortOrder}>
            Histórico
          </TabLink>
          <TabLink tab="cancelados" current={currentTab} sortOrder={sortOrder}>
            Cancelados
          </TabLink>
          </div>
          <SortButton currentTab={currentTab} sortOrder={sortOrder} />
        </div>

        {list.length ? (
          <div className="overflow-hidden rounded-2xl border bg-card">
            {list.map((appointment) => (
              <AppointmentCard
                key={appointment.id}
                appointment={appointment}
                showRebook={currentTab === "historico"}
              />
            ))}
          </div>
        ) : (
          <EmptyState />
        )}
      </div>
    </CustomerShell>
  );
}
