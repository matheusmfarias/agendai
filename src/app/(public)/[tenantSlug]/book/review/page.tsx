import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { getCurrentUser } from "@/features/auth/permissions";
import {
  formatPublicBookingDate,
  formatPublicBookingTime,
} from "@/features/public-booking/public-booking-date-time";
import { PublicBookingReviewForm } from "@/features/public-booking/public-booking-review-form";
import { getPublicBookingReviewData } from "@/features/public-booking/public-booking-service";
import { PublicShell } from "@/features/public-booking/public-shell";
import { PublicUnavailablePage } from "@/features/public-booking/public-unavailable";
import { parseLocalDateTimeInTimezone } from "@/features/booking-core/timezone";
import { formatCurrency } from "@/lib/formatters";

export const metadata = {
  title: "Revisar agendamento",
};

export const dynamic = "force-dynamic";

function priceLabel(
  priceType: string,
  priceValue: { toString(): string } | null,
) {
  if (priceType === "HIDDEN") return "Sob consulta";
  if (priceType === "ON_REQUEST") return "Sob consulta";
  if (!priceValue) return "Sob consulta";
  const value = formatCurrency(priceValue.toString());
  return priceType === "STARTING_AT" ? `A partir de ${value}` : value;
}

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60_000);
}

export default async function TenantBookReviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantSlug: string }>;
  searchParams: Promise<{ serviceId?: string; startsAt?: string }>;
}) {
  const [{ tenantSlug }, { serviceId, startsAt }] = await Promise.all([
    params,
    searchParams,
  ]);

  if (!serviceId || !startsAt) {
    return <PublicUnavailablePage />;
  }

  const [currentUser, data] = await Promise.all([
    getCurrentUser(),
    getPublicBookingReviewData(tenantSlug, serviceId, startsAt),
  ]);
  if (!currentUser || String(currentUser.globalRole) !== "CUSTOMER") {
    redirect(`/${tenantSlug}/book?serviceId=${serviceId}`);
  }

  if (!data.available || !data.selectedService) {
    return <PublicUnavailablePage />;
  }

  const selectedSlot = data.slots.find((slot) => slot.value === startsAt);
  const startsAtDate = parseLocalDateTimeInTimezone(
    startsAt,
    data.tenant.timezone,
  );

  if (!selectedSlot || !startsAtDate) {
    return <PublicUnavailablePage />;
  }

  const { tenant, selectedService } = data;
  const tenantName = tenant.publicDisplayName || tenant.name;
  const endsAtDate = addMinutes(startsAtDate, selectedService.durationMinutes);
  const totalLabel = priceLabel(
    selectedService.priceType,
    selectedService.priceValue as { toString(): string } | null,
  );

  return (
    <PublicShell>
      <div className="mx-auto max-w-2xl space-y-7">
        <Link
          href={`/${tenant.slug}/book?serviceId=${selectedService.id}`}
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Avaliação e Confirmação
        </Link>

        <section className="text-center">
          <h1 className="text-balance text-xl font-bold leading-tight tracking-tight text-foreground sm:text-2xl">
            {formatPublicBookingDate(startsAtDate, tenant.timezone)}
          </h1>
          <div className="mt-2 flex flex-wrap items-baseline justify-center gap-x-2 gap-y-1">
            <p className="whitespace-nowrap text-xl font-semibold tabular-nums text-foreground">
              {formatPublicBookingTime(startsAtDate, tenant.timezone)} –{" "}
              {formatPublicBookingTime(endsAtDate, tenant.timezone)}
            </p>
            <span className="text-sm text-muted-foreground" aria-hidden="true">
              ·
            </span>
            <p className="whitespace-nowrap text-sm font-medium text-muted-foreground">
              {selectedService.durationMinutes} min
            </p>
          </div>
          <p className="mt-2 text-sm leading-snug text-muted-foreground">
            {tenantName}
          </p>
        </section>

        <section className="rounded-lg bg-muted px-4 py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="font-medium text-foreground">
                {selectedService.name}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Prestador: sem preferência
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-sm text-foreground">{totalLabel}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {formatPublicBookingTime(startsAtDate, tenant.timezone)} -{" "}
                {formatPublicBookingTime(endsAtDate, tenant.timezone)}
              </p>
            </div>
          </div>

          <div className="mt-4 border-t pt-4 text-right">
            <span className="text-sm text-muted-foreground">Total: </span>
            <span className="ml-3 font-bold text-foreground">{totalLabel}</span>
          </div>
        </section>

        <PublicBookingReviewForm
          tenantSlug={tenant.slug}
          serviceId={selectedService.id}
          startsAt={startsAt}
          customFields={selectedService.customFields}
          totalLabel={totalLabel}
        />
      </div>
    </PublicShell>
  );
}
