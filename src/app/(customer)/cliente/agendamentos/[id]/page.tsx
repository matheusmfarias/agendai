import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, Clock, MapPin, RotateCw, Star } from "lucide-react";

import { AppointmentReviewForm } from "@/components/forms/appointment-review-form";
import { Button } from "@/components/ui/button";
import { AppointmentStatusBadge } from "@/features/appointments/appointment-status";
import type { AppointmentStatus } from "@/generated/prisma/client";
import { requireCustomer } from "@/features/auth/permissions";
import { getCustomerDisplayStatus } from "@/features/customer-portal/customer-appointment-status";
import { CustomerAppointmentsAutoRefresh } from "@/features/customer-portal/customer-appointments-auto-refresh";
import { CustomerShell } from "@/features/customer-portal/customer-shell";
import {
  getProviderDisplayName,
  getProviderLogoFallbackText,
} from "@/lib/provider-brand";
import { createAppointmentReviewAction } from "@/server/actions/customer-portal-actions";
import { getCustomerAppointment } from "@/server/repositories/customer-portal-repository";

export const metadata = { title: "Detalhe do agendamento" };

function statusPill(status: AppointmentStatus) {
  return <AppointmentStatusBadge status={status} className="py-1" />;
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

function tenantAddress(tenant: {
  address: string | null;
  city: string;
  state: string;
}) {
  const cityState = tenant.city && tenant.state
    ? `${tenant.city}/${tenant.state}`
    : tenant.city || tenant.state;
  if (tenant.address && cityState) return `${tenant.address}, ${cityState}`;
  return tenant.address || cityState || "—";
}

function tenantDisplayName(tenant: {
  name: string;
  publicDisplayName?: string | null;
}) {
  return getProviderDisplayName(tenant);
}

function mapQuery(tenant: {
  name: string;
  publicDisplayName?: string | null;
  address: string | null;
  city: string;
  state: string;
}) {
  const address = tenantAddress(tenant);
  return encodeURIComponent(
    address === "—"
      ? `${tenantDisplayName(tenant)}, ${tenant.city}/${tenant.state}`
      : address,
  );
}

function DetailRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[105px_1fr] gap-4 border-b px-4 py-3 last:border-b-0">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm font-semibold text-foreground">{children}</dd>
    </div>
  );
}

function renderStars(rating: number) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`Nota ${rating} de 5`}>
      {[1, 2, 3, 4, 5].map((value) => (
        <Star
          key={value}
          className={`size-4 ${
            value <= rating
              ? "fill-warning text-warning"
              : "text-muted-foreground/30"
          }`}
        />
      ))}
    </div>
  );
}

export default async function CustomerAppointmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireCustomer();
  const { id } = await params;
  const appointment = await getCustomerAppointment(user.id, id);
  if (!appointment) notFound();

  const service = appointment.service;
  const displayStatus = getCustomerDisplayStatus({
    status: appointment.status,
    endsAt: appointment.endsAt,
  });
  const canReview = appointment.status === "FINISHED" && !appointment.review;
  const canRebook =
    appointment.status === "FINISHED" &&
    service.isActive &&
    service.category.isActive;

  return (
    <CustomerShell>
      <CustomerAppointmentsAutoRefresh />
      <div className="mx-auto max-w-2xl space-y-6">
        <Link
          href="/cliente/agendamentos"
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="size-4" />
          Meus agendamentos
        </Link>

        <section className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
              Agendamento
            </p>
            <h1 className="mt-1 max-w-[12rem] text-2xl font-bold leading-tight text-foreground">
              {service.name}
            </h1>
          </div>
          {statusPill(displayStatus)}
        </section>

        <dl className="overflow-hidden rounded-2xl border bg-card">
          <DetailRow label="Prestador">
            <span className="inline-flex min-w-0 items-center gap-2">
              {appointment.tenant.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={appointment.tenant.logoUrl}
                  alt=""
                  className="size-6 rounded-md border object-cover"
                />
              ) : (
                <span className="grid size-6 shrink-0 place-items-center rounded-md bg-primary/10 text-[10px] font-bold text-primary">
                  {getProviderLogoFallbackText(
                    tenantDisplayName(appointment.tenant),
                  )}
                </span>
              )}
              <span className="truncate">
                {tenantDisplayName(appointment.tenant)}
              </span>
            </span>
          </DetailRow>
          <DetailRow label="Data">
            <span className="inline-flex items-center gap-2">
              <CalendarDays className="size-4 text-muted-foreground" />
              {formatDate(appointment.startsAt)}
            </span>
          </DetailRow>
          <DetailRow label="Hora">
            <span className="inline-flex items-center gap-2">
              <Clock className="size-4 text-muted-foreground" />
              {formatTime(appointment.startsAt)} · {service.durationMinutes} min
            </span>
          </DetailRow>
          <DetailRow label="Endereço">
            <span className="inline-flex items-start gap-2">
              <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              {tenantAddress(appointment.tenant)}
            </span>
          </DetailRow>
          <DetailRow label="Observações">
            {appointment.customerNotes || "—"}
          </DetailRow>
        </dl>

        {appointment.customValues.length ? (
          <section className="overflow-hidden rounded-2xl border bg-card">
            {appointment.customValues.map((item) => (
              <DetailRow key={item.id} label={item.customField.label}>
                {item.value}
              </DetailRow>
            ))}
          </section>
        ) : null}

        {canRebook ? (
          <Button asChild className="rounded-full">
            <Link href={`/${appointment.tenant.slug}/book?serviceId=${service.id}`}>
              <RotateCw className="size-4" />
              Agendar novamente
            </Link>
          </Button>
        ) : null}

        {appointment.review ? (
          <section className="rounded-2xl border bg-card p-4">
            <h2 className="font-bold text-foreground">Sua avaliação</h2>
            <div className="mt-3 flex items-center gap-3">
              {renderStars(appointment.review.rating)}
              <span className="text-sm text-muted-foreground">
                {appointment.review.rating} de 5
              </span>
            </div>
            {appointment.review.comment ? (
              <p className="mt-3 text-sm text-foreground">
                {appointment.review.comment}
              </p>
            ) : null}
          </section>
        ) : canReview ? (
          <section className="rounded-2xl border bg-card p-4">
            <h2 className="font-bold text-foreground">Avaliar atendimento</h2>
            <div className="mt-4">
              <AppointmentReviewForm
                appointmentId={appointment.id}
                action={createAppointmentReviewAction}
              />
            </div>
          </section>
        ) : null}

        <section className="overflow-hidden rounded-2xl border bg-card">
          <iframe
            title={`Localização de ${tenantDisplayName(appointment.tenant)}`}
            src={`https://www.google.com/maps?q=${mapQuery(
              appointment.tenant,
            )}&output=embed`}
            className="h-56 w-full border-0"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
          <div className="border-t p-3 text-right">
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${mapQuery(
                appointment.tenant,
              )}`}
              target="_blank"
              rel="noreferrer"
              className="text-sm font-semibold text-primary"
            >
              Abrir no Google Maps
            </a>
          </div>
        </section>
      </div>
    </CustomerShell>
  );
}
