"use client";

import { AlertTriangle, Info } from "lucide-react";

import { Alert } from "@/components/ui/alert";
import type { ProviderSubscriptionWarning } from "@/features/subscriptions/subscription-policy";

type ProviderSubscriptionNoticeProps = {
  warning: ProviderSubscriptionWarning;
};

import type { WarningLevel } from "@/features/subscriptions/subscription-policy";

const VARIANT_MAP: Record<WarningLevel, "warning" | "destructive" | "default"> = {
  NONE: "default",
  WARNING: "warning",
  CRITICAL: "destructive",
  BLOCKED: "destructive",
};

export function ProviderSubscriptionNotice({
  warning,
}: ProviderSubscriptionNoticeProps) {
  const Icon = warning.level === "WARNING" ? Info : AlertTriangle;

  return (
    <Alert variant={VARIANT_MAP[warning.level]} className="mb-4">
      <Icon className="size-4 shrink-0" />
      <span>{warning.message}</span>
    </Alert>
  );
}
