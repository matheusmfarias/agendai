import type { ReactNode } from "react";

/**
 * Two-column auth shell.
 *
 * Desktop (lg+): brand panel on the left, auth content on the right.
 * Mobile (<lg): stacked — compact brand at the top, auth content below.
 *
 * The brand panel uses the Agendaí navy/blue brand field.
 */
interface AuthLayoutProps {
  brandPanel: ReactNode;
  mobileBrand: ReactNode;
  children: ReactNode;
}

export function AuthLayout({
  brandPanel,
  mobileBrand,
  children,
}: AuthLayoutProps) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Desktop brand panel */}
      <div className="hidden bg-brand-navy text-white lg:flex lg:flex-col lg:justify-center lg:px-16 lg:py-12">
        {brandPanel}
      </div>

      {/* Auth content area */}
      <div className="flex flex-col justify-center bg-background px-4 py-12 sm:px-8 lg:px-16">
        {/* Mobile brand header */}
        <div className="mb-8 lg:hidden">{mobileBrand}</div>

        {children}
      </div>
    </div>
  );
}
