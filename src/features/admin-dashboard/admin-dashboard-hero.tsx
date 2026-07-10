"use client";

import Link from "next/link";
import { Plus, ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import {
  PLATFORM_HEALTH_LABELS,
  PLATFORM_HEALTH_VARIANT,
} from "./admin-constants";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

type AdminDashboardHeroProps = {
  tenantCount: number;
  activePlansCount: number;
  platformHealth: "healthy" | "warning" | "critical";
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AdminDashboardHero({
  tenantCount,
  activePlansCount,
  platformHealth,
}: AdminDashboardHeroProps) {
  const health = PLATFORM_HEALTH_LABELS[platformHealth];

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border bg-card p-6 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex items-start gap-4">
        <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
          <ShieldCheck className="size-5" />
        </span>
        <div>
          <p className="font-display text-xl font-semibold tracking-tight">
            Operação da plataforma
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Acompanhe prestadores, assinaturas e eventos críticos do AgendaZap.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Badge variant={PLATFORM_HEALTH_VARIANT[platformHealth]}>
              {health.label}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {tenantCount} prestador{tenantCount !== 1 ? "es" : ""} ·{" "}
              {activePlansCount} plano{activePlansCount !== 1 ? "s" : ""} ativo
              {activePlansCount !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
      </div>
      <Button asChild className="shrink-0">
        <Link href="/admin/tenants/new">
          <Plus className="size-4" />
          Novo prestador
        </Link>
      </Button>
    </div>
  );
}
