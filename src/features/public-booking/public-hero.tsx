import { MapPin, Star } from "lucide-react";

import { formatPublicAddress } from "@/features/public-booking/public-address";
import { getPublicBusinessInitials } from "@/features/public-booking/public-initials";

interface PublicHeroProps {
  tenant: {
    name: string;
    publicDisplayName?: string | null;
    logoUrl?: string | null;
    description: string | null;
    address?: string | null;
    neighborhood?: string | null;
    addressComplement?: string | null;
    city: string;
    state: string;
  };
  reviewSummary?: {
    count: number;
    average: number | null;
  };
}

export function PublicHero({ tenant, reviewSummary }: PublicHeroProps) {
  const address = formatPublicAddress(tenant);
  const hasReviews = !!reviewSummary?.count && reviewSummary.average !== null;
  const displayName = tenant.publicDisplayName || tenant.name;
  const initials = getPublicBusinessInitials(displayName);

  return (
    <section className="rounded-3xl border border-border bg-card p-4 shadow-sm sm:p-5">
      <div className="flex items-start gap-3">
        {tenant.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={tenant.logoUrl}
            alt=""
            className="size-16 shrink-0 rounded-2xl border border-border object-cover sm:size-18"
          />
        ) : (
          <div className="grid size-16 shrink-0 place-items-center rounded-2xl bg-primary/10 text-lg font-bold text-primary sm:size-18">
            {initials}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <h1 className="font-sans text-[22px] font-bold leading-tight tracking-tight text-foreground sm:text-3xl">
            {displayName}
          </h1>

          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-muted-foreground">
            {hasReviews ? (
              <p className="inline-flex items-center gap-1.5 font-medium text-foreground">
                <Star
                  className="size-3.5 fill-warning text-warning"
                  aria-hidden="true"
                />
                {reviewSummary.average?.toFixed(1)} em {reviewSummary.count}{" "}
                {reviewSummary.count === 1 ? "avaliação" : "avaliações"}
              </p>
            ) : null}

            {address ? (
              <p className="inline-flex min-w-0 items-start gap-1.5">
                <MapPin
                  className="mt-0.5 size-3.5 shrink-0 text-primary"
                  aria-hidden="true"
                />
                <span className="line-clamp-2">{address}</span>
              </p>
            ) : null}
          </div>

          {tenant.description ? (
            <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
              {tenant.description}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
