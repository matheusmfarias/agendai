import { LogOut, UserRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { logoutAction } from "@/features/auth/auth-actions";

type DashboardHeaderProps = {
  userName: string;
  userEmail: string;
  contextLabel: string;
  /** Optional subtitle. Falls back to a generic string if not provided. */
  subtitle?: string;
};

export function DashboardHeader({
  userName,
  userEmail,
  contextLabel,
  subtitle,
}: DashboardHeaderProps) {
  return (
    <header className="flex min-h-16 items-center justify-between gap-4 border-b bg-card px-4 sm:px-6">
      <div>
        <p className="text-sm font-medium">{contextLabel}</p>
        <p className="text-xs text-muted-foreground">
          {subtitle ?? "Painel de gestão"}
        </p>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden text-right sm:block">
          <p className="text-sm font-medium">{userName}</p>
          <p className="text-xs text-muted-foreground">{userEmail}</p>
        </div>
        <span className="grid size-9 place-items-center rounded-full bg-secondary text-secondary-foreground">
          <UserRound className="size-4" />
        </span>
        <form action={logoutAction}>
          <Button type="submit" variant="ghost" size="icon" title="Sair">
            <LogOut className="size-4" />
            <span className="sr-only">Sair</span>
          </Button>
        </form>
      </div>
    </header>
  );
}
