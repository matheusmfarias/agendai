import type { MouseEvent } from "react";
import Link from "next/link";
import { ChevronRight, Clock } from "lucide-react";

import { formatCurrency } from "@/lib/formatters";

const BOOKING_MODE_LABELS = {
  DIRECT: "Agendamento direto",
  REQUIRES_CONFIRMATION: "Precisa confirmação",
  INFORMATIONAL: "Combinar pelo contato",
} as const;

type PriceType = "FIXED" | "STARTING_AT" | "ON_REQUEST" | "HIDDEN";
type BookingMode = keyof typeof BOOKING_MODE_LABELS;

interface ServiceCardProps {
  service: {
    id: string;
    name: string;
    description: string | null;
    durationMinutes: number;
    priceType: PriceType;
    priceValue: { toString(): string } | null;
    bookingMode: BookingMode;
  };
  tenantSlug: string;
  divided?: boolean;
  disabled?: boolean;
  pending?: boolean;
  onSelect?: (serviceId: string) => void;
}

function priceLabel(service: ServiceCardProps["service"]) {
  if (service.priceType === "HIDDEN") return null;
  if (service.priceType === "ON_REQUEST") return "Sob consulta";
  if (!service.priceValue) return null;

  const value = formatCurrency(service.priceValue.toString());
  return service.priceType === "STARTING_AT" ? `A partir de ${value}` : value;
}

export function ServiceCard({
  service,
  tenantSlug,
  divided = false,
  disabled = false,
  pending = false,
  onSelect,
}: ServiceCardProps) {
  const price = priceLabel(service);

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    if (disabled) {
      event.preventDefault();
      return;
    }

    const modifiedClick =
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey;
    if (!modifiedClick && onSelect) {
      event.preventDefault();
      onSelect(service.id);
    }
  }

  return (
    <Link
      href={`/${tenantSlug}/book?serviceId=${service.id}`}
      onClick={handleClick}
      aria-disabled={disabled}
      aria-label={`${pending ? "Carregando" : "Agendar"} ${service.name}`}
      className={`group grid w-full grid-cols-[1fr_auto] items-center gap-3 p-4 text-left transition-colors hover:bg-muted/35 active:bg-muted/50 focus-visible:relative focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/30 aria-disabled:cursor-wait aria-disabled:opacity-70 ${
        divided ? "border-t border-border" : ""
      }`}
    >
      <div className="min-w-0">
        <div className="flex items-start justify-between gap-3">
          <h3 className="line-clamp-2 text-[15px] font-semibold leading-snug text-foreground">
            {service.name}
          </h3>
          {price ? (
            <p className="shrink-0 text-sm font-bold leading-snug text-foreground">
              {price}
            </p>
          ) : null}
        </div>

        {service.description ? (
          <p className="mt-1 line-clamp-2 text-sm leading-snug text-muted-foreground">
            {service.description}
          </p>
        ) : null}

        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs leading-snug text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Clock className="size-3" aria-hidden="true" />
            {service.durationMinutes} min
          </span>
          <span>{BOOKING_MODE_LABELS[service.bookingMode]}</span>
        </div>
      </div>

      <span className="grid size-8 place-items-center rounded-full bg-primary text-primary-foreground transition-transform group-hover:translate-x-0.5">
        {pending ? (
          <span className="size-3 animate-pulse rounded-full bg-primary-foreground" />
        ) : (
          <ChevronRight className="size-4" aria-hidden="true" />
        )}
      </span>
    </Link>
  );
}
