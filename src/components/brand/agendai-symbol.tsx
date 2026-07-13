import * as React from "react";

import { cn } from "@/lib/utils";

type AgendaiSymbolProps = React.ComponentProps<"svg"> & {
  size?: number | string;
  variant?: "default" | "light" | "mono";
};

export function AgendaiSymbol({
  className,
  size = 40,
  variant = "default",
  ...props
}: AgendaiSymbolProps) {
  const id = React.useId();
  const gradientId = `agendai-symbol-${variant}-${id.replace(/:/g, "")}`;
  const stroke =
    variant === "mono" ? "currentColor" : `url(#${gradientId})`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 96 96"
      fill="none"
      aria-hidden="true"
      className={cn(
        variant === "light" ? "text-white" : "text-primary",
        className,
      )}
      {...props}
    >
      {variant !== "mono" ? (
        <defs>
          <linearGradient
            id={gradientId}
            x1="19"
            y1="77"
            x2="79"
            y2="19"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor={variant === "light" ? "#60A5FA" : "#1D4ED8"} />
            <stop offset="0.52" stopColor="#2563EB" />
            <stop offset="1" stopColor="#38BDF8" />
          </linearGradient>
        </defs>
      ) : null}
      <path
        d="M17 75.5L39.7 19.8C42.1 13.9 50.4 13.9 52.9 19.7L70.4 60.8"
        stroke={stroke}
        strokeWidth="11"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M34.7 54.2L45.5 65L75.8 34.8"
        stroke={stroke}
        strokeWidth="10"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M28.6 66.7H56.5"
        stroke={stroke}
        strokeWidth="10"
        strokeLinecap="round"
      />
    </svg>
  );
}
