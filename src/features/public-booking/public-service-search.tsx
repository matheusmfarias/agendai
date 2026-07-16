"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { ServiceCategorySection } from "@/features/public-booking/service-category-section";

type Service = {
  id: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  priceType: "FIXED" | "STARTING_AT" | "ON_REQUEST" | "HIDDEN";
  priceValue: { toString(): string } | null;
  bookingMode: "DIRECT" | "REQUIRES_CONFIRMATION" | "INFORMATIONAL";
};

type Category = {
  id: string;
  name: string;
  description: string | null;
  services: Service[];
};

interface PublicServiceSearchProps {
  categories: Category[];
  tenantSlug: string;
}

function normalizeSearch(value: string | null | undefined) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

function matchesTerm(category: Category, service: Service, term: string) {
  const text = [category.name, service.name, service.description]
    .map(normalizeSearch)
    .join(" ");

  return text.includes(term);
}

export function PublicServiceSearch({
  categories,
  tenantSlug,
}: PublicServiceSearchProps) {
  const [query, setQuery] = useState("");
  const router = useRouter();
  const [pendingServiceId, setPendingServiceId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const normalizedQuery = normalizeSearch(query);
  const totalServices = categories.reduce(
    (total, category) => total + category.services.length,
    0,
  );

  const filteredCategories = useMemo(() => {
    if (!normalizedQuery) return categories;

    return categories
      .map((category) => ({
        ...category,
        services: category.services.filter((service) =>
          matchesTerm(category, service, normalizedQuery),
        ),
      }))
      .filter((category) => category.services.length > 0);
  }, [categories, normalizedQuery]);

  const hasResults = filteredCategories.some(
    (category) => category.services.length > 0,
  );

  function selectService(serviceId: string) {
    if (isPending) return;
    setPendingServiceId(serviceId);
    startTransition(() => {
      router.push(`/${tenantSlug}/book?serviceId=${serviceId}`);
    });
  }

  return (
    <section className="space-y-3" aria-busy={isPending}>
      {isPending ? (
        <p className="sr-only" role="status">
          Carregando horários do serviço selecionado.
        </p>
      ) : null}
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-foreground">
            Serviços
          </h2>
          <p className="text-sm text-muted-foreground">
            {totalServices} {totalServices === 1 ? "opção" : "opções"} para agendar
          </p>
        </div>
      </div>

      <div className="sticky top-0 z-20 -mx-4 bg-background/95 px-4 py-2 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar serviço"
            className="h-11 rounded-md border-border bg-card pl-9 shadow-none"
            aria-label="Buscar serviço"
          />
        </div>
      </div>

      {hasResults ? (
        <div className="space-y-4">
          {filteredCategories.map((category) => (
            <ServiceCategorySection
              key={category.id}
              category={category}
              tenantSlug={tenantSlug}
              disabled={isPending}
              pendingServiceId={pendingServiceId}
              onSelectService={selectService}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border bg-card px-5 py-8 text-center">
          <p className="font-semibold text-foreground">
            Nenhum serviço encontrado
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Tente buscar por outro termo.
          </p>
        </div>
      )}
    </section>
  );
}
