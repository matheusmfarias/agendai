import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { getPublicPageData } from "@/features/public-booking/public-booking-service";
import { PublicFooter } from "@/features/public-booking/public-footer";
import { PublicServiceSearch } from "@/features/public-booking/public-service-search";
import { PublicShell } from "@/features/public-booking/public-shell";
import { PublicUnavailablePage } from "@/features/public-booking/public-unavailable";

export const metadata = {
  title: "Serviços",
};

export default async function TenantServicesPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const data = await getPublicPageData(tenantSlug);

  if (!data.available) {
    return <PublicUnavailablePage />;
  }

  const { tenant } = data;
  const tenantName = tenant.publicDisplayName || tenant.name;
  const searchableCategories = tenant.serviceCategories.map((category) => ({
    id: category.id,
    name: category.name,
    description: category.description,
    services: category.services.map((service) => ({
      id: service.id,
      name: service.name,
      description: service.description,
      durationMinutes: service.durationMinutes,
      priceType: service.priceType,
      priceValue: service.priceValue?.toString() ?? null,
      bookingMode: service.bookingMode,
    })),
  }));

  return (
    <>
      <PublicShell>
        <div className="space-y-4 sm:space-y-6">
          <div className="flex items-center gap-3">
            <Link
              href={`/${tenant.slug}`}
              className="grid size-10 place-items-center rounded-full border border-border bg-card text-foreground transition-colors hover:border-primary/40 hover:text-primary"
              aria-label="Voltar"
            >
              <ArrowLeft className="size-4" />
            </Link>
            <div className="min-w-0">
              <p className="truncate text-sm text-muted-foreground">
                {tenantName}
              </p>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Serviços
              </h1>
            </div>
          </div>

          {tenant.serviceCategories.length ? (
            <PublicServiceSearch
              categories={searchableCategories}
              tenantSlug={tenant.slug}
            />
          ) : (
            <div className="rounded-3xl border border-dashed border-border bg-card px-6 py-10 text-center">
              <p className="text-muted-foreground">
                Nenhum serviço disponível no momento.
              </p>
            </div>
          )}
        </div>
      </PublicShell>

      <PublicFooter tenant={tenant} />
    </>
  );
}
