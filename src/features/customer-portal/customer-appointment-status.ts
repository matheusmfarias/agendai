import {
  deriveTemporalAppointmentStatus,
  isAppointmentCanceledStatus,
  isAppointmentHistoryStatus,
} from "@/features/appointments/appointment-status";
import type { AppointmentStatus } from "@/generated/prisma/client";

export function getCustomerDisplayStatus({
  status,
  endsAt,
}: {
  status: AppointmentStatus;
  endsAt: Date | string;
}) {
  return deriveTemporalAppointmentStatus({ status, endsAt });
}

export function isCustomerCanceledStatus(status: AppointmentStatus) {
  return isAppointmentCanceledStatus(status);
}

export function isCustomerHistoryStatus(status: AppointmentStatus) {
  return isAppointmentHistoryStatus(status);
}
