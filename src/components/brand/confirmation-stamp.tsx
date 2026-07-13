"use client";

import { cn } from "@/lib/utils";

type ConfirmationStampTone = "confirmed" | "received" | "completed";

type ConfirmationStampProps = {
  children?: React.ReactNode;
  tone?: ConfirmationStampTone;
  className?: string;
};

const TONE_DEFAULTS: Record<ConfirmationStampTone, string> = {
  confirmed: "Confirmado",
  received: "Recebido",
  completed: "Concluído",
};

/**
 * Agendaí signature visual element: the confirmation stamp.
 *
 * Used sparingly in key confirmation moments:
 *   - Booking confirmation page
 *   - Onboarding completion
 *
 * The stamp renders with:
 *   - Agendaí primary color
 *   - Slightly rotated text (respects prefers-reduced-motion)
 *   - A stamp-like dashed border
 *   - Bold display typography
 *
 * Should NOT be used for generic badges or status indicators.
 */
export function ConfirmationStamp({
  children,
  tone = "confirmed",
  className,
}: ConfirmationStampProps) {
  const label = children ?? TONE_DEFAULTS[tone];

  return (
    <span
      data-slot="confirmation-stamp"
      className={cn(
        "inline-block select-none font-display text-2xl font-bold uppercase tracking-wide text-brand-terra",
        "rounded-md border-2 border-dashed border-brand-terra/50 px-5 py-2",
        "motion-safe:-rotate-3",
        className,
      )}
    >
      {label}
    </span>
  );
}
