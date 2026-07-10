import type { AppointmentStatus } from "@/generated/prisma/client";

const CUSTOMER_HISTORY_STATUSES = new Set<AppointmentStatus>(["FINISHED"]);

const CUSTOMER_CANCELED_STATUSES = new Set<AppointmentStatus>([
  "CANCELED_BY_CUSTOMER",
  "CANCELED_BY_PROVIDER",
  "NO_SHOW",
]);

export function getCustomerDisplayStatus({
  status,
  endsAt,
}: {
  status: AppointmentStatus;
  endsAt: Date | string;
}) {
  if (
    new Date(endsAt) < new Date() &&
    !CUSTOMER_HISTORY_STATUSES.has(status) &&
    !CUSTOMER_CANCELED_STATUSES.has(status)
  ) {
    return "FINISHED";
  }

  return status;
}

export function isCustomerCanceledStatus(status: AppointmentStatus) {
  return CUSTOMER_CANCELED_STATUSES.has(status);
}

export function isCustomerHistoryStatus(status: AppointmentStatus) {
  return CUSTOMER_HISTORY_STATUSES.has(status);
}
