"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { PublicSlotsSkeleton } from "@/features/public-booking/public-booking-loading";

type BookingServiceOption = {
  id: string;
  name: string;
  categoryName: string;
  durationMinutes: number;
};

export function PublicBookingServicePicker({
  tenantSlug,
  services,
}: {
  tenantSlug: string;
  services: BookingServiceOption[];
}) {
  const router = useRouter();
  const [pendingServiceId, setPendingServiceId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function selectService(serviceId: string) {
    if (isPending) return;
    setPendingServiceId(serviceId);
    startTransition(() => {
      router.push(`/${tenantSlug}/book?serviceId=${serviceId}`);
    });
  }

  return (
    <div className="space-y-5" aria-busy={isPending}>
      <div className="divide-y rounded-2xl border bg-card px-3">
        {services.map((service) => (
          <button
            key={service.id}
            type="button"
            disabled={isPending}
            onClick={() => selectService(service.id)}
            className="flex w-full items-center justify-between gap-4 py-3 text-left transition-colors hover:text-primary disabled:cursor-wait disabled:opacity-70"
          >
            <div className="min-w-0">
              <p className="line-clamp-2 font-semibold text-foreground">
                {service.name}
              </p>
              <p className="text-sm text-muted-foreground">
                {service.categoryName} &middot; {service.durationMinutes} min
              </p>
            </div>
            <Button
              asChild
              size="sm"
              className="h-8 shrink-0 rounded-full px-3"
            >
              <span>
                {isPending && pendingServiceId === service.id
                  ? "Carregando…"
                  : "Reservar"}
              </span>
            </Button>
          </button>
        ))}
      </div>

      {isPending ? <PublicSlotsSkeleton /> : null}
    </div>
  );
}
