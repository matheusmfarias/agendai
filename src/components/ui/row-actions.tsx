"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RowAction = {
  label: string;
  /** Navigation link. If provided, renders as <Link>. */
  href?: string;
  /** Callback for non-navigation actions. */
  onClick?: () => void;
  /** Button variant. Defaults to "ghost". */
  variant?: "ghost" | "outline" | "destructive";
};

type RowActionsProps = {
  actions: RowAction[];
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function RowActions({ actions }: RowActionsProps) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      {actions.map((a) => {
        const variant = a.variant ?? "ghost";

        if (a.href) {
          return (
            <Button key={a.label} asChild variant={variant} size="sm">
              <Link href={a.href}>{a.label}</Link>
            </Button>
          );
        }

        return (
          <Button
            key={a.label}
            type="button"
            variant={variant}
            size="sm"
            onClick={a.onClick}
          >
            {a.label}
          </Button>
        );
      })}
    </div>
  );
}
