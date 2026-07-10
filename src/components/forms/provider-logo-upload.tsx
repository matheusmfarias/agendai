"use client";

import { useEffect, useRef, useState } from "react";
import { Camera } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ProviderLogoUpload({
  hasLogo,
  onPreviewChange,
}: {
  hasLogo: boolean;
  onPreviewChange: (file: File | null, previewUrl: string | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;

    if (previewUrl) URL.revokeObjectURL(previewUrl);

    if (!file) {
      setPreviewUrl(null);
      onPreviewChange(null, null);
      return;
    }

    const nextPreviewUrl = URL.createObjectURL(file);
    setPreviewUrl(nextPreviewUrl);
    onPreviewChange(file, nextPreviewUrl);
  }

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        id="provider-logo"
        name="logoFile"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={handleChange}
      />
      <label
        htmlFor="provider-logo"
        className={cn(buttonVariants({ variant: "outline" }), "cursor-pointer")}
      >
        <Camera className="size-4" />
        {hasLogo ? "Alterar imagem" : "Enviar imagem"}
      </label>
      <p className="text-xs text-muted-foreground">
        JPEG, PNG ou WebP ate 2 MB. A troca so sera aplicada ao salvar.
      </p>
    </div>
  );
}
