import { MapPin } from "lucide-react";

import { formatPublicAddress } from "@/features/public-booking/public-address";

interface PublicFooterProps {
  tenant: {
    name: string;
    publicDisplayName?: string | null;
    address?: string | null;
    neighborhood?: string | null;
    addressComplement?: string | null;
    city: string;
    state: string;
  };
}

export function PublicFooter({ tenant }: PublicFooterProps) {
  const address = formatPublicAddress(tenant);
  const displayName = tenant.publicDisplayName || tenant.name;

  return (
    <footer className="border-t border-border bg-background px-4 py-5 sm:px-6">
      <div className="mx-auto flex max-w-4xl flex-col gap-2 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-semibold text-foreground">{displayName}</p>
          {address ? (
            <p className="mt-1 flex max-w-2xl items-start gap-1.5 leading-snug">
              <MapPin className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
              <span>{address}</span>
            </p>
          ) : null}
        </div>

        <p className="text-xs">Agendamento online via AgendaZap</p>
      </div>
    </footer>
  );
}
