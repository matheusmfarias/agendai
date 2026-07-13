import Link from "next/link";
import { ArrowRight, CalendarDays, Clock, RotateCw, Star } from "lucide-react";

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

export const metadata = { title: "Minha conta" };

function avatarInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}

function tenantDisplayName(tenant: {
  name: string;
  publicDisplayName?: string | null;
}) {
  return getProviderDisplayName(tenant);
}

function formatDate(date: Date | string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(date));
}

function formatTime(date: Date | string) {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(date));
}

function greeting() {
  const hour = Number(
    new Intl.DateTimeFormat("pt-BR", {
      hour: "2-digit",
      hourCycle: "h23",
      timeZone: "America/Sao_Paulo",
    }).format(new Date()),
  );

  if (hour < 12) return "Bom dia,";
  if (hour < 18) return "Boa tarde,";
  return "Boa noite,";
}

function statusPill(status: AppointmentStatus) {
  return <AppointmentStatusBadge status={status} />;
}

export default async function CustomerHomePage() {
  const user = await requireCustomer();
  const appointments = await listCustomerAppointments(user.id);

  const upcoming = appointments
    .filter((appointment) => {
      const status = getCustomerDisplayStatus({
        status: appointment.status,
        endsAt: appointment.endsAt,
      });

      return !isCustomerHistoryStatus(status) && !isCustomerCanceledStatus(status);
    })
    .sort(
      (a, b) =>
        new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
    );
  const history = appointments
    .filter((appointment) =>
      isCustomerHistoryStatus(
        getCustomerDisplayStatus({
          status: appointment.status,
          endsAt: appointment.endsAt,
        }),
      ),
    )
    .sort(
      (a, b) =>
        new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime(),
    );
  const nextAppointment = upcoming[0] ?? null;
  const recentHistory = history[0] ?? null;

  return (
    <CustomerShell>
      <CustomerAppointmentsAutoRefresh />
      <div className="space-y-8">
        <section className="flex items-center gap-4">
          {user.avatarUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={user.avatarUrl}
              alt={user.name}
              className="size-12 rounded-full object-cover"
            />
          ) : (
            <div className="grid size-12 place-items-center rounded-full bg-primary/10 font-bold text-primary">
              {avatarInitials(user.name)}
            </div>
          )}
          <div>
            <p className="text-sm text-muted-foreground">{greeting()}</p>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {user.name.split(" ")[0]}
            </h1>
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-muted-foreground">
              Próximo agendamento
            </h2>
            <Link
              href="/cliente/agendamentos"
              className="text-sm font-semibold text-primary"
            >
              Ver todos
            </Link>
          </div>

          {nextAppointment ? (
            <article className="rounded-2xl border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-bold text-foreground">
                    {nextAppointment.service.name}
                  </h3>
                  <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                    {nextAppointment.tenant.logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={nextAppointment.tenant.logoUrl}
                        alt=""
                        className="size-5 rounded-md border object-cover"
                      />
                    ) : (
                      <span className="grid size-5 shrink-0 place-items-center rounded-md bg-primary/10 text-[9px] font-bold text-primary">
                        {getProviderLogoFallbackText(
                          tenantDisplayName(nextAppointment.tenant),
                        )}
                      </span>
                    )}
                    <span className="truncate">
                      {tenantDisplayName(nextAppointment.tenant)}
                    </span>
                  </div>
                </div>
                {statusPill(
                  getCustomerDisplayStatus({
                    status: nextAppointment.status,
                    endsAt: nextAppointment.endsAt,
                  }),
                )}
              </div>

              <div className="mt-4 space-y-2 text-sm text-muted-foreground">
                <div className="inline-flex items-center gap-1.5">
                  <CalendarDays className="size-3.5" aria-hidden="true" />
                  {formatDate(nextAppointment.startsAt)}
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="inline-flex items-center gap-1.5">
                    <Clock className="size-3.5" aria-hidden="true" />
                    {formatTime(nextAppointment.startsAt)}
                  </span>
                  <Link
                    href={`/cliente/agendamentos/${nextAppointment.id}`}
                    className="inline-flex shrink-0 items-center gap-1 font-semibold text-primary"
                  >
                    Ver detalhes
                    <ArrowRight className="size-3.5" aria-hidden="true" />
                  </Link>
                </div>
              </div>
            </article>
          ) : (
            <div className="rounded-2xl border border-dashed px-5 py-8 text-center">
              <p className="font-semibold text-foreground">
                Você ainda não tem agendamentos.
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Use o link do prestador para reservar um horário.
              </p>
            </div>
          )}
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-muted-foreground">
            Histórico recente
          </h2>

          {recentHistory ? (
            <article className="flex items-center justify-between gap-3 rounded-2xl border bg-card p-4">
              <div className="min-w-0">
                <h3 className="truncate font-bold text-foreground">
                  {recentHistory.service.name}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {formatDate(recentHistory.startsAt)} ·{" "}
                  {formatTime(recentHistory.startsAt)}
                  {recentHistory.review ? (
                    <span className="ml-2 inline-flex items-center gap-1 text-warning">
                      <Star
                        className="size-3.5 fill-warning"
                        aria-hidden="true"
                      />
                      {recentHistory.review.rating}
                    </span>
                  ) : null}
                </p>
              </div>
              <Button asChild variant="outline" size="sm" className="rounded-full">
                <Link
                  href={`/${recentHistory.tenant.slug}/book?serviceId=${recentHistory.service.id}`}
                >
                  <RotateCw className="size-3.5" />
                  Agendar
                </Link>
              </Button>
            </article>
          ) : (
            <div className="rounded-2xl border border-dashed px-5 py-8 text-center">
              <p className="font-semibold text-foreground">
                Nenhum atendimento concluído ainda.
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Seu histórico aparecerá aqui depois dos atendimentos.
              </p>
            </div>
          )}
        </section>
      </div>
    </CustomerShell>
  );
}
