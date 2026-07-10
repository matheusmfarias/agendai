import { MapPin } from "lucide-react";

import { Button } from "@/components/ui/button";

type AddressMapPreviewProps = {
  address?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
};

function addressQuery({
  address,
  neighborhood,
  city,
  state,
  postalCode,
}: AddressMapPreviewProps) {
  return [address, neighborhood, city, state, postalCode, "Brasil"]
    .map((value) => value?.trim())
    .filter(Boolean)
    .join(", ");
}

export function AddressMapPreview(props: AddressMapPreviewProps) {
  const query = addressQuery(props);

  if (!query || query === "Brasil") {
    return (
      <div className="grid min-h-64 place-items-center rounded-xl border border-dashed border-border bg-muted/25 p-6 text-center text-sm text-muted-foreground md:col-span-2">
        <div>
          <MapPin className="mx-auto mb-3 size-8" />
          Preencha o endereco para visualizar o mapa.
        </div>
      </div>
    );
  }

  const encodedQuery = encodeURIComponent(query);
  const embedUrl = `https://www.google.com/maps?q=${encodedQuery}&output=embed`;
  const openUrl = `https://www.google.com/maps/search/?api=1&query=${encodedQuery}`;

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card md:col-span-2">
      <div className="flex flex-col gap-3 border-b border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold">Mapa do endereco</p>
          <p className="truncate text-xs text-muted-foreground">{query}</p>
        </div>
        <Button asChild type="button" variant="outline" size="sm">
          <a href={openUrl} target="_blank" rel="noopener noreferrer">
            <MapPin className="size-4" />
            Abrir no Maps
          </a>
        </Button>
      </div>
      <iframe
        title="Mapa do endereco"
        src={embedUrl}
        className="h-72 w-full border-0"
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
    </div>
  );
}
