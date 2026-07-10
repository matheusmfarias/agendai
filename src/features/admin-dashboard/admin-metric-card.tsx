"use client";

import {
  Activity,
  AlertTriangle,
  Ban,
  Building2,
  CalendarDays,
  Clock,
  CreditCard,
  ScrollText,
  UsersRound,
  type LucideIcon,
} from "lucide-react";

import type { AdminMetricIconName } from "./admin-constants";

// ---------------------------------------------------------------------------
// Icon map — resolved client-side so server can pass strings
// ---------------------------------------------------------------------------

const ICONS: Record<AdminMetricIconName, LucideIcon> = {
  activity: Activity,
  "alert-triangle": AlertTriangle,
  ban: Ban,
  "building-2": Building2,
  "calendar-days": CalendarDays,
  clock: Clock,
  "credit-card": CreditCard,
  "scroll-text": ScrollText,
  "users-round": UsersRound,
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

type AdminMetricCardProps = {
  icon: AdminMetricIconName;
  label: string;
  value: string | number;
  tone?: "default" | "success" | "warning" | "destructive";
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AdminMetricCard({
  icon,
  label,
  value,
  tone = "default",
}: AdminMetricCardProps) {
  const Icon = ICONS[icon];

  const valueColor = {
    default: "text-foreground",
    success: "text-success",
    warning: "text-warning-foreground",
    destructive: "text-destructive",
  }[tone];

  const iconBg = {
    default: "bg-muted text-muted-foreground",
    success: "bg-success/10 text-success",
    warning: "bg-warning/10 text-warning-foreground",
    destructive: "bg-destructive/10 text-destructive",
  }[tone];

  return (
    <div className="flex items-start gap-3 rounded-lg border border-border bg-card p-4">
      <span
        className={`grid size-9 shrink-0 place-items-center rounded-lg ${iconBg}`}
      >
        <Icon className="size-4" />
      </span>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p
          className={`text-lg font-semibold tabular-nums tracking-tight ${valueColor}`}
        >
          {value}
        </p>
      </div>
    </div>
  );
}
