import type { AppointmentFilterInput } from "@/features/appointments/appointment-schemas";
import { prisma } from "@/lib/prisma";

function dateRange(filters: AppointmentFilterInput) {
  if (!filters.startDate && !filters.endDate) return undefined;
  return {
    ...(filters.startDate
      ? { gte: new Date(`${filters.startDate}T00:00:00-03:00`) }
      : {}),
    ...(filters.endDate
      ? { lte: new Date(`${filters.endDate}T23:59:59.999-03:00`) }
      : {}),
  };
}

export function listAppointments(
  tenantId: string,
  filters: AppointmentFilterInput,
) {
  return prisma.appointment.findMany({
    where: {
      tenantId,
      ...(dateRange(filters) ? { startsAt: dateRange(filters) } : {}),
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.serviceId ? { serviceId: filters.serviceId } : {}),
      ...(filters.customerId ? { customerId: filters.customerId } : {}),
      ...(filters.origin ? { origin: filters.origin } : {}),
    },
    orderBy: { startsAt: "asc" },
    include: {
      customer: { select: { name: true, phone: true } },
      service: { select: { name: true } },
      events: {
        where: { eventType: "CHECKOUT_COMPLETED" },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { id: true, createdAt: true, metadata: true },
      },
    },
  });
}

export function getAppointment(tenantId: string, id: string) {
  return prisma.appointment.findFirst({
    where: { id, tenantId },
    include: {
      customer: true,
      service: {
        include: {
          category: { select: { name: true, isActive: true } },
          customFields: {
            where: { isActive: true },
            orderBy: [{ position: "asc" }, { label: "asc" }],
          },
        },
      },
      createdBy: { select: { name: true } },
      customValues: {
        include: {
          customField: {
            select: {
              id: true,
              label: true,
              fieldType: true,
              serviceId: true,
              service: { select: { id: true, name: true, durationMinutes: true } },
            },
          },
        },
        orderBy: { createdAt: "asc" },
      },
      events: { orderBy: { createdAt: "asc" } },
      review: {
        select: {
          id: true,
          rating: true,
          comment: true,
          createdAt: true,
          customerUser: { select: { name: true } },
        },
      },
    },
  });
}

export function listActiveServiceOptions(tenantId: string) {
  return prisma.service.findMany({
    where: { tenantId, isActive: true },
    orderBy: [{ position: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      durationMinutes: true,
      priceType: true,
      priceValue: true,
      customFields: {
        where: { isActive: true },
        orderBy: [{ position: "asc" }, { label: "asc" }],
        select: {
          id: true,
          label: true,
          fieldType: true,
          options: true,
          isRequired: true,
          position: true,
        },
      },
      category: { select: { name: true, isActive: true } },
    },
  });
}

export async function getAppointmentDashboardMetrics(tenantId: string) {
  const now = new Date();
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  const todayStart = new Date(`${today}T00:00:00-03:00`);
  const todayEnd = new Date(`${today}T23:59:59.999-03:00`);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const canceledStatuses = [
    "CANCELED_BY_CUSTOMER",
    "CANCELED_BY_PROVIDER",
  ] as const;
  const hiddenTodayStatuses = [...canceledStatuses, "NO_SHOW"] as const;
  const dashboardAppointmentSelect = {
    id: true,
    startsAt: true,
    endsAt: true,
    status: true,
    origin: true,
    customer: { select: { name: true } },
    service: { select: { name: true } },
  };

  const [
    todayCount,
    futureCount,
    canceledCount,
    activeCustomers,
    todayAppointments,
    overdueCompletion,
    upcoming,
  ] = await Promise.all([
      prisma.appointment.count({
        where: { tenantId, startsAt: { gte: todayStart, lte: todayEnd } },
      }),
      prisma.appointment.count({
        where: {
          tenantId,
          startsAt: { gt: todayEnd },
          status: { notIn: [...canceledStatuses, "NO_SHOW", "FINISHED"] },
        },
      }),
      prisma.appointment.count({
        where: {
          tenantId,
          status: { in: [...canceledStatuses] },
          updatedAt: { gte: sevenDaysAgo },
        },
      }),
      prisma.customer.count({ where: { tenantId, isActive: true } }),
      prisma.appointment.findMany({
        where: {
          tenantId,
          startsAt: { gte: todayStart, lte: todayEnd },
          status: { notIn: [...hiddenTodayStatuses] },
        },
        orderBy: { startsAt: "asc" },
        select: dashboardAppointmentSelect,
      }),
      prisma.appointment.findMany({
        where: {
          tenantId,
          endsAt: { lt: todayStart },
          status: { in: ["CONFIRMED", "RESCHEDULED", "IN_PROGRESS"] },
        },
        orderBy: { endsAt: "asc" },
        take: 5,
        select: dashboardAppointmentSelect,
      }),
      prisma.appointment.findMany({
        where: {
          tenantId,
          startsAt: { gte: now },
          status: { notIn: [...canceledStatuses, "NO_SHOW", "FINISHED"] },
        },
        orderBy: { startsAt: "asc" },
        take: 5,
        select: dashboardAppointmentSelect,
      }),
    ]);

  return {
    todayCount,
    futureCount,
    canceledCount,
    activeCustomers,
    todayAppointments,
    upcoming,
    overdueCompletion,
  };
}
