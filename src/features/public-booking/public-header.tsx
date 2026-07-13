"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import { logoutAction } from "@/features/auth/auth-actions";
import { getPublicBusinessInitials } from "@/features/public-booking/public-initials";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface PublicHeaderUser {
  name: string;
  isCustomer: boolean;
  isLoggedIn: boolean;
}

interface PublicHeaderProps {
  /** Tenant business name, or null if the slug doesn't resolve. */
  tenantName: string | null;
  /** Raw tenant slug from the URL (used for routing). */
  tenantSlug: string;
  /** Authenticated user narrowed for the header, or null for anonymous. */
  user: PublicHeaderUser | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build the login link href based on the current page.
 *
 * - Booking page (not confirm): preserve the current URL as redirectTo so
 *   the visitor returns to the booking flow after login.
 * - All other pages: redirect to /cliente after login.
 */
function buildLoginHref(
  pathname: string,
  searchParams: URLSearchParams,
): string {
  const paramsStr = searchParams.toString();

  if (pathname.includes("/book") && !pathname.includes("/book/confirm")) {
    const fullPath = paramsStr ? `${pathname}?${paramsStr}` : pathname;
    return `/login?redirectTo=${encodeURIComponent(fullPath)}`;
  }

  return "/login?redirectTo=/cliente";
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PublicHeader({
  tenantName,
  tenantSlug,
  user,
}: PublicHeaderProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const displayName = tenantName ?? tenantSlug;
  const initials = getPublicBusinessInitials(displayName);

  const loginHref = buildLoginHref(pathname, searchParams);

  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85">
      <nav className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-2 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3 sm:gap-6">
          {tenantName ? (
            <Link
              href={`/${tenantSlug}`}
              className="flex min-w-0 items-center gap-2 rounded-full pr-2 font-sans text-sm font-semibold text-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
            >
              <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-primary/10 text-[11px] font-sans font-bold text-primary">
                {initials}
              </span>
              <span className="max-w-[52vw] truncate sm:max-w-[30vw]">
                {displayName}
              </span>
            </Link>
          ) : (
            <span className="flex min-w-0 items-center gap-2 font-sans text-sm font-semibold text-foreground">
              <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-primary/10 text-[11px] font-sans font-bold text-primary">
                {initials}
              </span>
              <span className="max-w-[52vw] truncate sm:max-w-[30vw]">
                {displayName}
              </span>
            </span>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-3 text-sm">
          {user?.isCustomer ? (
            <Link
              href="/cliente"
              className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:border-primary/40 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
            >
              Minha conta
            </Link>
          ) : user ? (
            <form action={logoutAction}>
              <button
                type="submit"
                className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:border-primary/40 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
              >
                Sair
              </button>
            </form>
          ) : (
            <Link
              href={loginHref}
              className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:border-primary/40 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
            >
              Entrar
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}
