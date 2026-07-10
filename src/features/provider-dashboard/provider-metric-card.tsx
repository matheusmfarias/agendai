"use client";

import Link from "next/link";
import {
  Boxes,
  CalendarClock,
  FolderOpen,
  UsersRound,
  type LucideIcon,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import type { MetricIconName } from "@/features/provider-dashboard/provider-constants";

const ICONS: Record<MetricIconName, LucideIcon> = {
  boxes: Boxes,
  "calendar-clock": CalendarClock,
  "folder-open": FolderOpen,
  "users-round": UsersRound,
};

type ProviderMetricCardProps = {
  label: string;
  value: string | number;
  icon?: MetricIconName;
  href?: string;
};

export function ProviderMetricCard({
  label,
  value,
  icon,
  href,
}: ProviderMetricCardProps) {
  const Icon = icon ? ICONS[icon] : null;

  const content = (
    <Card
      className={`h-full transition-colors ${
        href ? "hover:bg-muted/50" : ""
      }`}
    >
      <CardContent className="flex h-full items-center gap-3 p-4">
        {Icon ? (
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground">
            <Icon className="size-4" />
          </span>
        ) : null}
        <div className="min-w-0">
          <p className="text-xs leading-tight text-muted-foreground">{label}</p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-foreground">
            {value}
          </p>
        </div>
      </CardContent>
    </Card>
  );

  if (href) {
    return (
      <Link href={href} className="block h-full">
        {content}
      </Link>
    );
  }

  return content;
}
