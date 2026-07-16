import Link from "next/link";
import { ArrowLeft, Clock } from "lucide-react";

import { getCurrentUser } from "@/features/auth/permissions";
import { PublicBookingForm } from "@/features/public-booking/public-booking-form";
import { PublicBookingServicePicker } from "@/features/public-booking/public-booking-service-picker";
import { getPublicBookingData } from "@/features/public-booking/public-booking-service";
import { PublicShell } from "@/features/public-booking/public-shell";
import { PublicUnavailablePage } from "@/features/public-booking/public-unavailable";
import { formatCurrency } from "@/lib/formatters";

export const metadata = {
  title: "Agendar serviço",
};

export const dynamic = "force-dynamic";

const BOOKING_MODE_LABELS: Record<string, string> = {
  DIRECT: "Confirmação imediata",
  REQUIRES_CONFIRMATION: "Sujeito à confirmação",
  INFORMATIONAL: "Contato para combinar",
};

function priceLabel(
  priceType: string,
  priceValue: { toString(): string } | null,
) {
  if (priceType === "HIDDEN") return null;
  if (priceType === "ON_REQUEST") return "Sob consulta";
  if (!priceValue) return null;
  const value = formatCurrency(priceValue.toString());
  return priceType === "STARTING_AT" ? `A partir de ${value}` : value;
}

export default async function TenantBookPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantSlug: string }>;
  searchParams: Promise<{ serviceId?: string }>;
}) {
  const [{ tenantSlug }, { serviceId }] = await Promise.all([
    params,
    searchParams,
  ]);
  const [data, currentUser] = await Promise.all([
    getPublicBookingData(tenantSlug, serviceId),
    getCurrentUser(),
  ]);

  if (!data.available) {
    return <PublicUnavailablePage />;
  }

  const customerUser =
    String(currentUser?.globalRole) === "CUSTOMER" ? currentUser : null;
  const redirectTo = serviceId
    ? `/${data.tenant.slug}/book?serviceId=${serviceId}`
    : `/${data.tenant.slug}/book`;

  const selectedService = data.selectedService;
  const tenantName = data.tenant.publicDisplayName || data.tenant.name;
  const price = selectedService
    ? priceLabel(
        selectedService.priceType,
        selectedService.priceValue as { toString(): string } | null,
      )
    : null;

  return (
    <PublicShell>
      <div className="mx-auto max-w-2xl space-y-5 pb-24 sm:pb-8">
        <div>
          <Link
            href={`/${data.tenant.slug}`}
            className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Voltar para serviços
          </Link>
        </div>

        {!selectedService ? (
          <section className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">
                {tenantName}
              </p>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Escolha um serviço
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Selecione o atendimento para ver horários disponíveis.
              </p>
            </div>

            <PublicBookingServicePicker
              tenantSlug={data.tenant.slug}
              services={data.services}
            />
          </section>
        ) : (
          <section className="space-y-5">
            <article className="rounded-2xl border bg-card px-4 py-4">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
                Serviço escolhido
              </p>
              <h1 className="mt-2 text-lg font-bold leading-snug text-foreground">
                {selectedService.name}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                {price ? (
                  <span className="font-bold text-foreground">{price}</span>
                ) : null}
                <span className="inline-flex items-center gap-1">
                  <Clock className="size-3.5" aria-hidden="true" />
                  {selectedService.durationMinutes} min
                </span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                {BOOKING_MODE_LABELS[selectedService.bookingMode] ??
                  selectedService.bookingMode}
              </p>
            </article>

            {data.slots.length ? (
              <PublicBookingForm
                tenantSlug={data.tenant.slug}
                serviceId={selectedService.id}
                slots={data.slots}
                timezone={data.tenant.timezone}
                customerUser={customerUser}
                visitorUser={
                  currentUser
                    ? { globalRole: String(currentUser.globalRole) }
                    : null
                }
                redirectTo={redirectTo}
              />
            ) : (
              <div className="rounded-2xl border bg-card px-4 py-6 text-center">
                <p className="text-sm text-muted-foreground">
                  Nenhum horário disponível para este serviço nos próximos dias.
                  Tente novamente mais tarde ou entre em contato com o
                  estabelecimento.
                </p>
              </div>
            )}
          </section>
        )}
      </div>
    </PublicShell>
  );
}
