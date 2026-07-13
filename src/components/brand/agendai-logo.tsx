import type * as React from "react";

import { AgendaiSymbol } from "@/components/brand/agendai-symbol";
import { brand } from "@/config/brand";
import { cn } from "@/lib/utils";

type AgendaiLogoProps = React.ComponentProps<"div"> & {
  size?: "sm" | "md" | "lg";
  variant?: "default" | "light" | "mono";
  showText?: boolean;
};

const sizeMap = {
  sm: { symbol: 28, text: "text-lg" },
  md: { symbol: 36, text: "text-2xl" },
  lg: { symbol: 52, text: "text-4xl" },
} as const;

export function AgendaiLogo({
  className,
  size = "md",
  variant = "default",
  showText = true,
  ...props
}: AgendaiLogoProps) {
  const sizes = sizeMap[size];

  return (
    <div
      className={cn("inline-flex items-center gap-2.5", className)}
      aria-label={brand.name}
      role="img"
      {...props}
    >
      <AgendaiSymbol size={sizes.symbol} variant={variant} />
      {showText ? (
        <span
          className={cn(
            "font-display font-bold leading-none tracking-tight",
            sizes.text,
            variant === "light" ? "text-white" : "text-foreground",
            variant === "mono" && "text-current",
          )}
        >
          {brand.name}
        </span>
      ) : null}
    </div>
  );
}
