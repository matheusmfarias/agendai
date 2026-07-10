import type { ReactNode } from "react";

/**
 * Thin shell for all public booking pages.
 *
 * Applies the off-white paper background (--background) and constrains
 * content to a readable max-width with consistent padding.
 *
 * All public pages should use this as their outermost wrapper.
 */
interface PublicShellProps {
  children: ReactNode;
  className?: string;
}

export function PublicShell({ children, className = "" }: PublicShellProps) {
  return (
    <main
      className={`mx-auto w-full max-w-4xl bg-background px-4 py-4 sm:px-6 sm:py-7 lg:px-8 ${className}`}
    >
      {children}
    </main>
  );
}
