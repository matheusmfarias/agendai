import { prisma } from "@/lib/prisma";

export function getProviderDashboard(tenantId: string) {
  return prisma.tenant.findFirst({
    where: { id: tenantId },
    select: {
      id: true,
      name: true,
      slug: true,
      publicDisplayName: true,
      logoUrl: true,
      city: true,
      state: true,
      status: true,
      onboardingStatus: true,
      subscription: {
        select: {
          status: true,
          expiresAt: true,
          plan: {
            select: {
              name: true,
              publicLinkEnabled: true,
              whatsappEnabled: true,
            },
          },
        },
      },
      whatsappConnections: {
        take: 1,
        select: { status: true, enabled: true },
      },
      _count: {
        select: {
          serviceCategories: { where: { isActive: true } },
          services: { where: { isActive: true } },
          availabilityRules: { where: { isActive: true } },
          scheduleBlocks: { where: { startsAt: { gte: new Date() } } },
          typebotCredentials: { where: { revokedAt: null } },
        },
      },
    },
  });
}

export function getProviderSettings(tenantId: string) {
  return prisma.tenant.findFirst({
    where: { id: tenantId },
    select: {
      id: true,
      name: true,
      slug: true,
      publicDisplayName: true,
      logoUrl: true,
      responsibleName: true,
      email: true,
      whatsapp: true,
      segment: true,
      city: true,
      state: true,
      postalCode: true,
      neighborhood: true,
      address: true,
        addressComplement: true,
        googleMapsUrl: true,
        publicLinkActive: true,
        serviceLocation: true,
      timezone: true,
      locale: true,
      currency: true,
      weekStartsOn: true,
      timeFormat: true,
      defaultAppointmentDuration: true,
      defaultSlotInterval: true,
      minBookingNoticeMinutes: true,
      maxBookingAdvanceDays: true,
      allowCustomerCancellation: true,
      allowCustomerRescheduling: true,
      cancellationNoticeHours: true,
      confirmationMessageTemplate: true,
      reminderMessageTemplate: true,
      cancellationMessageTemplate: true,
      enableAutomaticReminders: true,
      reminderLeadHours: true,
      description: true,
      status: true,
      subscription: {
        select: {
          status: true,
          expiresAt: true,
          plan: {
            select: {
              name: true,
              publicLinkEnabled: true,
              whatsappEnabled: true,
            },
          },
        },
      },
    },
    });
}

export function getProviderSchedulingDefaults(tenantId: string) {
  return prisma.tenant.findFirst({
    where: { id: tenantId },
    select: {
      defaultAppointmentDuration: true,
      defaultSlotInterval: true,
    },
  });
}

export function listServiceCategories(tenantId: string) {
  return prisma.serviceCategory.findMany({
    where: { tenantId },
    orderBy: [{ position: "asc" }, { name: "asc" }],
    include: { _count: { select: { services: true } } },
  });
}

export function getServiceCategory(tenantId: string, id: string) {
  return prisma.serviceCategory.findFirst({ where: { id, tenantId } });
}

export function listCategoryOptions(tenantId: string) {
  return prisma.serviceCategory.findMany({
    where: { tenantId },
    orderBy: [{ position: "asc" }, { name: "asc" }],
    select: { id: true, name: true, isActive: true },
  });
}

export function listServices(tenantId: string) {
  return prisma.service.findMany({
    where: { tenantId },
    orderBy: [{ position: "asc" }, { name: "asc" }],
    include: {
      category: { select: { name: true, isActive: true } },
      _count: { select: { customFields: true, appointments: true } },
    },
  });
}

export function getService(tenantId: string, id: string) {
  return prisma.service.findFirst({
    where: { id, tenantId },
    include: {
      category: { select: { name: true, isActive: true } },
      customFields: {
        orderBy: [{ position: "asc" }, { label: "asc" }],
      },
      _count: { select: { customFields: true, appointments: true } },
      appointments: {
        orderBy: { startsAt: "desc" },
        take: 5,
        select: {
          id: true,
          startsAt: true,
          status: true,
          customer: { select: { name: true } },
        },
      },
    },
  });
}

export function getCustomField(
  tenantId: string,
  serviceId: string,
  id: string,
) {
  return prisma.customField.findFirst({
    where: { id, tenantId, serviceId },
  });
}

export function listAvailabilityRules(tenantId: string) {
  return prisma.availabilityRule.findMany({
    where: { tenantId },
    orderBy: [{ weekday: "asc" }, { startTime: "asc" }],
  });
}

export function getAvailabilityRule(tenantId: string, id: string) {
  return prisma.availabilityRule.findFirst({ where: { id, tenantId } });
}

export function listScheduleBlocks(tenantId: string) {
  return prisma.scheduleBlock.findMany({
    where: { tenantId },
    orderBy: { startsAt: "asc" },
    include: { createdBy: { select: { name: true } } },
  });
}
