"use client";

import Link from "next/link";
import { CalendarDays, Home, UserRound } from "lucide-react";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/cliente", label: "Início", icon: Home, exact: true },
  {
    href: "/cliente/agendamentos",
    label: "Agendamentos",
    icon: CalendarDays,
    exact: false,
  },
  { href: "/cliente/perfil", label: "Perfil", icon: UserRound, exact: false },
];

export function CustomerBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 px-3 pb-[calc(env(safe-area-inset-bottom)+0.45rem)] pt-2 shadow-[0_-8px_24px_rgba(15,23,42,0.06)] backdrop-blur sm:hidden">
      <div className="mx-auto grid max-w-md grid-cols-3 gap-1">
        {ITEMS.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex h-12 flex-col items-center justify-center gap-0.5 rounded-xl text-[11px] font-semibold transition-colors ${
                active
                  ? "text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <span
                className={`grid size-7 place-items-center rounded-full ${
                  active ? "bg-primary text-primary-foreground" : ""
                }`}
              >
                <Icon className="size-4" aria-hidden="true" />
              </span>
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
