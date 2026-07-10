import {
  getPublicPageData,
  getPublicReviewSummary,
} from "@/features/public-booking/public-booking-service";
import { PublicFooter } from "@/features/public-booking/public-footer";
import { PublicHero } from "@/features/public-booking/public-hero";
import { PublicServiceSearch } from "@/features/public-booking/public-service-search";
import { PublicShell } from "@/features/public-booking/public-shell";
import { PublicUnavailablePage } from "@/features/public-booking/public-unavailable";

export const metadata = {
  title: "Agendamento online",
};

export default async function TenantHomePage({
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
  const reviewSummary = await getPublicReviewSummary(tenant.slug);
  const totalServices = tenant.serviceCategories.reduce(
    (total, category) => total + category.services.length,
    0,
  );
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
          <PublicHero tenant={tenant} reviewSummary={reviewSummary} />

          {totalServices > 0 ? (
            <PublicServiceSearch
              categories={searchableCategories}
              tenantSlug={tenant.slug}
            />
          ) : (
            <section className="rounded-3xl border border-dashed border-border bg-card px-6 py-10 text-center">
              <p className="text-muted-foreground">
                Nenhum serviço disponível no momento.
              </p>
            </section>
          )}
        </div>
      </PublicShell>

      <PublicFooter tenant={tenant} />
    </>
  );
}
