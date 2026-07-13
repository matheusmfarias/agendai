"use client";

import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  CalendarPlus,
  Clock3,
  Play,
  Settings,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type HeroTenant = {
  name: string;
  slug: string;
  city: string | null;
  state: string | null;
  onboardingStatus: string;
};

type ProviderDashboardHeroProps = {
  tenant: HeroTenant;
  policyWarningLevel: string;
  hasActiveService: boolean;
  hasAvailability: boolean;
  todayCount: number;
  futureCount: number;
};

type HeroCta = {
  label: string;
  href: string;
  icon: React.ReactNode;
};

function getHeroCta(props: ProviderDashboardHeroProps): HeroCta {
  const { tenant, policyWarningLevel, hasActiveService, hasAvailability } =
    props;

  if (tenant.onboardingStatus !== "COMPLETED") {
    return {
      label:
        tenant.onboardingStatus === "SKIPPED"
          ? "Retomar configuração"
          : "Continuar configuração",
      href: "/app/onboarding",
      icon: <Play className="size-4" />,
    };
  }

  if (policyWarningLevel === "BLOCKED") {
    return {
      label: "Ver configurações",
      href: "/app/settings",
      icon: <Settings className="size-4" />,
    };
  }

  if (hasActiveService && hasAvailability) {
    return {
      label: "Novo agendamento",
      href: "/app/appointments?panel=new",
      icon: <CalendarPlus className="size-4" />,
    };
  }

  return {
    label: "Ver agenda",
    href: "/app/appointments",
    icon: <ArrowRight className="size-4" />,
  };
}

function getStatusSummary(props: ProviderDashboardHeroProps): string {
  const { policyWarningLevel, hasActiveService, hasAvailability } = props;

  if (policyWarningLevel === "BLOCKED") {
    return "Agendamentos com restrição. Revise as configurações do negócio para operar sem bloqueios.";
  }

  if (policyWarningLevel === "CRITICAL") {
    return "A operação precisa de atenção para evitar bloqueios.";
  }

  if (!hasActiveService || !hasAvailability) {
    return "Complete serviços e horários para liberar a agenda online.";
  }

  return "Operação pronta para receber agendamentos.";
}

function getGreeting() {
  const hour = new Date().getHours();

  if (hour < 12) return "Bom dia,";
  if (hour < 18) return "Boa tarde,";
  return "Boa noite,";
}

export function ProviderDashboardHero(props: ProviderDashboardHeroProps) {
  const cta = getHeroCta(props);
  const statusSummary = getStatusSummary(props);
  const location =
    [props.tenant.city, props.tenant.state].filter(Boolean).join(", ") || null;

  return (
    <Card className="overflow-hidden border-border/80 bg-card/95 shadow-sm">
      <CardContent className="p-4 sm:p-5 lg:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 space-y-3">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">{getGreeting()},</p>
              <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                {props.tenant.name}
              </h1>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {location ? (
                <Badge variant="secondary" className="text-xs font-medium">
                  {location}
                </Badge>
              ) : null}
              {props.tenant.onboardingStatus !== "COMPLETED" ? (
                <Badge variant="warning" className="text-xs font-medium">
                  Configuração pendente
                </Badge>
              ) : props.policyWarningLevel === "BLOCKED" ? (
                <Badge variant="destructive" className="text-xs font-medium">
                  Operação restrita
                </Badge>
              ) : (
                <Badge variant="success" className="text-xs font-medium">
                  Operação ativa
                </Badge>
              )}
            </div>

            <p className="max-w-2xl text-sm text-muted-foreground">
              {statusSummary}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] lg:min-w-[520px]">
            <Link
              href="/app/appointments"
              className="rounded-xl border border-border bg-background px-4 py-3 transition-colors hover:bg-muted/50"
            >
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <CalendarDays className="size-4" />
                Hoje
              </div>
              <p className="mt-1 text-2xl font-semibold tabular-nums">
                {props.todayCount}
              </p>
            </Link>

            <Link
              href="/app/appointments"
              className="rounded-xl border border-border bg-background px-4 py-3 transition-colors hover:bg-muted/50"
            >
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock3 className="size-4" />
                Próximos
              </div>
              <p className="mt-1 text-2xl font-semibold tabular-nums">
                {props.futureCount}
              </p>
            </Link>

            <Button asChild className="h-full min-h-12 self-stretch">
              <Link href={cta.href}>
                {cta.icon}
                {cta.label}
              </Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
