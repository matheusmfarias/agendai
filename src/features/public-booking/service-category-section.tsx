import { ServiceCard } from "@/features/public-booking/service-card";

type Service = {
  id: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  priceType: "FIXED" | "STARTING_AT" | "ON_REQUEST" | "HIDDEN";
  priceValue: { toString(): string } | null;
  bookingMode: "DIRECT" | "REQUIRES_CONFIRMATION" | "INFORMATIONAL";
};

interface ServiceCategorySectionProps {
  category: {
    id: string;
    name: string;
    description: string | null;
    services: Service[];
  };
  tenantSlug: string;
  disabled?: boolean;
  pendingServiceId?: string | null;
  onSelectService?: (serviceId: string) => void;
}

export function ServiceCategorySection({
  category,
  tenantSlug,
  disabled = false,
  pendingServiceId,
  onSelectService,
}: ServiceCategorySectionProps) {
  if (!category.services.length) return null;

  return (
    <section className="space-y-2">
      <div className="flex items-baseline justify-between gap-3 px-1">
        <h2 className="text-base font-bold text-foreground">{category.name}</h2>
        <p className="shrink-0 text-xs text-muted-foreground">
          {category.services.length}{" "}
          {category.services.length === 1 ? "serviço" : "serviços"}
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
        {category.services.map((service, index) => (
          <ServiceCard
            key={service.id}
            service={service}
            tenantSlug={tenantSlug}
            divided={index > 0}
            disabled={disabled}
            pending={pendingServiceId === service.id}
            onSelect={onSelectService}
          />
        ))}
      </div>
    </section>
  );
}
