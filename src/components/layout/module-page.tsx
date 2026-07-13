import type * as React from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function ModulePage({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("mx-auto w-full max-w-[1400px] space-y-4", className)}
      {...props}
    />
  );
}

type ModuleHeaderProps = React.ComponentProps<"section"> & {
  title: string;
  description: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
};

export function ModuleHeader({
  title,
  description,
  icon,
  actions,
  className,
  ...props
}: ModuleHeaderProps) {
  return (
    <section
      className={cn(
        "rounded-lg border border-border bg-card p-4 shadow-card sm:p-5",
        className,
      )}
      {...props}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          {icon ? (
            <span className="grid size-10 shrink-0 place-items-center rounded-md bg-primary-soft text-primary">
              {icon}
            </span>
          ) : null}
          <div className="min-w-0">
            <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
              {title}
            </h1>
            <p className="mt-1 max-w-3xl text-sm leading-relaxed text-muted-foreground">
              {description}
            </p>
          </div>
        </div>
        {actions ? (
          <div className="grid w-full grid-cols-1 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:justify-end">
            {actions}
          </div>
        ) : null}
      </div>
    </section>
  );
}

type ModuleTabsProps = React.ComponentProps<"div"> & {
  children: React.ReactNode;
  label: string;
};

export function ModuleTabs({
  children,
  label,
  className,
  ...props
}: ModuleTabsProps) {
  return (
    <div className={cn("-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0", className)}>
      <div
        role="tablist"
        aria-label={label}
        className="inline-flex min-w-max rounded-md border border-border bg-card p-1 shadow-card"
        {...props}
      >
        {children}
      </div>
    </div>
  );
}

export function ModuleToolbar({
  className,
  ...props
}: React.ComponentProps<"section">) {
  return (
    <section
      className={cn("rounded-lg border border-border bg-card p-3 shadow-card", className)}
      {...props}
    />
  );
}

type MetricCardProps = React.ComponentProps<"div"> & {
  label: string;
  value: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  tone?: "default" | "primary" | "success" | "warning" | "danger" | "info";
  trend?: React.ReactNode;
};

const metricToneClasses = {
  default: "bg-muted text-muted-foreground",
  primary: "bg-primary-soft text-primary",
  success: "bg-success/15 text-success-foreground",
  warning: "bg-warning/15 text-warning-foreground",
  danger: "bg-destructive/10 text-destructive-text",
  info: "bg-info/15 text-info-foreground",
} as const;

export function MetricCard({
  label,
  value,
  description,
  icon,
  tone = "default",
  trend,
  className,
  ...props
}: MetricCardProps) {
  return (
    <Card className={cn("min-h-28 gap-0 rounded-lg py-0", className)} {...props}>
      <CardContent className="flex min-h-28 items-start justify-between gap-3 p-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="mt-2 text-2xl font-semibold leading-none tabular-nums text-foreground">
            {value}
          </p>
          {description || trend ? (
            <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
              {description ? <span>{description}</span> : null}
              {trend ? <span className="font-medium text-primary">{trend}</span> : null}
            </div>
          ) : null}
        </div>
        {icon ? (
          <span className={cn("grid size-9 shrink-0 place-items-center rounded-md", metricToneClasses[tone])}>
            {icon}
          </span>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function ContentGrid({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]", className)}
      {...props}
    />
  );
}

type SectionCardProps = React.ComponentProps<typeof Card> & {
  title?: string;
  description?: string;
  actions?: React.ReactNode;
};

export function SectionCard({
  title,
  description,
  actions,
  children,
  className,
  ...props
}: SectionCardProps) {
  return (
    <Card className={cn("rounded-lg", className)} {...props}>
      {title || description || actions ? (
        <CardHeader className="flex-row items-start justify-between gap-3">
          <div>
            {title ? <CardTitle>{title}</CardTitle> : null}
            {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
          </div>
          {actions}
        </CardHeader>
      ) : null}
      {children}
    </Card>
  );
}
