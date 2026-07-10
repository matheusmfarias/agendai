import type { ReactNode } from "react";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

type ListToolbarProps = {
  children: ReactNode;
};

/**
 * Thin wrapper for filter / search toolbars.
 *
 * Wraps children in a responsive grid so filters stack on mobile
 * and spread across columns on wider viewports.
 */
export function ListToolbar({ children }: ListToolbarProps) {
  return (
    <div className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-card p-4">
      {children}
    </div>
  );
}
