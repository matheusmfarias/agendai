import type { ReactNode } from "react";

/**
 * Thin shell for all customer portal pages.
 *
 * Applies the off-white paper background (--background) and constrains
 * content to a readable max-width with consistent padding.
 *
 * All customer pages should use this as their outermost wrapper.
 */
interface CustomerShellProps {
  children: ReactNode;
}

export function CustomerShell({ children }: CustomerShellProps) {
  return (
    <main className="mx-auto w-full max-w-5xl bg-background px-4 pb-28 pt-6 sm:px-6 sm:pb-8 sm:pt-8 lg:px-8">
      {children}
    </main>
  );
}
