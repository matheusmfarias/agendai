import {
  getAvailableSlots,
} from "@/features/booking-core/availability";
import { normalizeBrazilianCustomerPhone } from "@/features/booking-core/phone";
import {
  EXTERNAL_BOOKING_MESSAGES,
  persistExternalAppointment,
  prepareExternalAppointment,
} from "@/features/booking-core/external-appointment-service";
import {
  isTenantBookableForPublicLink,
  canCreatePublicAppointmentForTenant,
} from "@/features/booking-core/tenant-policy";
import { parseLocalDateTimeInTimezone } from "@/features/booking-core/timezone";
import { createProviderNotification } from "@/features/provider-notifications/notification-service";
import type { CreateProviderNotificationInput } from "@/features/provider-notifications/notification-service";
import { getSubscriptionPolicy } from "@/features/subscriptions/subscription-policy";
import type { PublicBookingInput } from "@/features/public-booking/public-booking-schemas";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export const PUBLIC_BOOKING_UNAVAILABLE_MESSAGE =
  "Este serviço de agendamento está temporariamente indisponível. Entre em contato diretamente com o estabelecimento.";

export const PUBLIC_BOOKING_MESSAGES = EXTERNAL_BOOKING_MESSAGES;

function notificationDateParts(value: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(value);
  const field = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return {
    date: `${field("year")}-${field("month")}-${field("day")}`,
    time: `${field("hour")}:${field("minute")}`,
  };
}

type CustomerUserForPublicBooking = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
};
type TenantCustomerForPublicBooking = {
  id: string;
  name: string;
  phone: string;
  userId: string | null;
};

export type PublicReviewSummary = Awaited<
  ReturnType<typeof getPublicReviewSummary>
>;

const publicTenantSelect = {
  id: true,
  name: true,
  slug: true,
  publicDisplayName: true,
  logoUrl: true,
  description: true,
  address: true,
  neighborhood: true,
  addressComplement: true,
  city: true,
  state: true,
  timezone: true,
  defaultAppointmentDuration: true,
  defaultSlotInterval: true,
  minBookingNoticeMinutes: true,
  maxBookingAdvanceDays: true,
  status: true,
  publicLinkActive: true,
  subscription: {
    select: {
      status: true,
      expiresAt: true,
      plan: { select: { publicLinkEnabled: true } },
    },
  },
  serviceCategories: {
    where: { isActive: true },
    orderBy: [{ position: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      description: true,
      services: {
        where: { isActive: true },
        orderBy: [{ position: "asc" }, { name: "asc" }],
        select: {
          id: true,
          name: true,
          description: true,
          durationMinutes: true,
          priceType: true,
          priceValue: true,
          bookingMode: true,
        },
      },
    },
  },
} satisfies Prisma.TenantSelect;

export async function getPublicTenantBySlug(slug: string) {
  return prisma.tenant.findUnique({
    where: { slug },
    select: publicTenantSelect,
  });
}

export async function getPublicPageData(slug: string) {
  const tenant = await getPublicTenantBySlug(slug);
  if (!tenant || !isTenantBookableForPublicLink(tenant)) {
    return { available: false as const, tenant: null };
  }

  return { available: true as const, tenant };
}

export async function getPublicReviewSummary(tenantId: string) {
  const aggregate = await prisma.appointmentReview.aggregate({
    where: {
      tenantId,
      rating: { gte: 1, lte: 5 },
      appointment: { status: "FINISHED", tenantId },
    },
    _avg: { rating: true },
    _count: { rating: true },
  });

  return {
    count: aggregate._count.rating,
    average:
      aggregate._avg.rating === null
        ? null
        : Math.round(aggregate._avg.rating * 10) / 10,
  };
}

export async function getPublicBookingData(slug: string, serviceId?: string) {
  const pageData = await getPublicPageData(slug);
  if (!pageData.available) return pageData;

  const services = pageData.tenant.serviceCategories.flatMap((category) =>
    category.services.map((service) => ({
      ...service,
      categoryName: category.name,
    })),
  );
  const service = serviceId
    ? (services.find((candidate) => candidate.id === serviceId) ?? null)
    : null;

  const slots = service
    ? await getAvailableSlots(pageData.tenant.id, service.id, {
        context: { tenant: pageData.tenant, service },
      })
    : [];

  return {
    available: true as const,
    tenant: pageData.tenant,
    services,
    selectedService: service,
    slots,
  };
}

export async function getPublicBookingReviewData(
  slug: string,
  serviceId: string,
  startsAt: string,
) {
  const pageData = await getPublicPageData(slug);
  if (!pageData.available) return pageData;

  const service = pageData.tenant.serviceCategories
    .flatMap((category) => category.services)
    .find((candidate) => candidate.id === serviceId);
  if (!service) {
    return {
      available: true as const,
      tenant: pageData.tenant,
      selectedService: null,
      slots: [],
    };
  }

  const [customFields, slots] = await Promise.all([
    prisma.customField.findMany({
      where: {
        tenantId: pageData.tenant.id,
        serviceId: service.id,
        isActive: true,
      },
      orderBy: [{ position: "asc" }, { label: "asc" }],
      select: {
        id: true,
        label: true,
        fieldType: true,
        options: true,
        isRequired: true,
      },
    }),
    getAvailableSlots(pageData.tenant.id, service.id, {
      context: { tenant: pageData.tenant, service },
      dates: [startsAt.slice(0, 10)],
    }),
  ]);

  return {
    available: true as const,
    tenant: pageData.tenant,
    selectedService: { ...service, customFields },
    slots,
  };
}

export { getAvailableSlots };

export async function createPublicBooking(
  input: PublicBookingInput,
  customerUserId: string,
  ipAddress?: string | null,
) {
  const result = await prisma.$transaction(
    async (tx) => {
      const tenant = await tx.tenant.findUnique({
        where: { slug: input.tenantSlug },
        include: { subscription: { include: { plan: true } } },
      });
      if (!tenant || !isTenantBookableForPublicLink(tenant)) {
        throw new Error(PUBLIC_BOOKING_UNAVAILABLE_MESSAGE);
      }

      // Subscription enforcement: block creation at 8+ days overdue
      if (!canCreatePublicAppointmentForTenant(tenant)) {
        const policy = getSubscriptionPolicy({
          tenantStatus: tenant.status,
          subscription: tenant.subscription
            ? {
                status: tenant.subscription.status,
                expiresAt: tenant.subscription.expiresAt,
                plan: {
                  publicLinkEnabled: tenant.subscription.plan.publicLinkEnabled,
                  whatsappEnabled: false,
                },
              }
            : null,
        });

        await tx.auditLog.create({
          data: {
            tenantId: tenant.id,
            actorType: "CUSTOMER",
            eventType: "SUBSCRIPTION_ENFORCEMENT_BLOCKED_PUBLIC_APPOINTMENT",
            description: "Tentativa de agendamento público bloqueada por política de assinatura.",
            metadata: {
              tenantId: tenant.id,
              channel: "PUBLIC_LINK",
              policyStatus: policy.status,
              daysOverdue: policy.daysOverdue,
            },
          },
        });

        throw new Error(PUBLIC_BOOKING_UNAVAILABLE_MESSAGE);
      }

      const startsAt = parseLocalDateTimeInTimezone(
        input.startsAt,
        tenant.timezone,
      );
      if (!startsAt) {
        throw new Error("Selecione um horário válido.");
      }

      const prepared = await prepareExternalAppointment(tx, {
        tenantId: tenant.id,
        serviceId: input.serviceId,
        startsAt,
        customFields: input.customFields,
      });
      const { service, status } = prepared;

      const findCustomerUser = tx.user.findFirst as unknown as (
        args: unknown,
      ) => Promise<CustomerUserForPublicBooking | null>;
      const customerUser = await findCustomerUser({
        where: {
          id: customerUserId,
          globalRole: "CUSTOMER",
          isActive: true,
        },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
        },
      });
      if (!customerUser) {
        throw new Error(
          "Para concluir o agendamento, entre com uma conta de cliente.",
        );
      }

      const phone = normalizeBrazilianCustomerPhone(customerUser.phone);
      if (!phone) {
        throw new Error(
          "Complete seu cadastro com telefone para concluir o agendamento.",
        );
      }

      const findCustomer = tx.customer.findFirst as unknown as (
        args: unknown,
      ) => Promise<TenantCustomerForPublicBooking | null>;
      const updateCustomer = tx.customer.update as unknown as (
        args: unknown,
      ) => Promise<TenantCustomerForPublicBooking>;
      const createCustomer = tx.customer.create as unknown as (
        args: unknown,
      ) => Promise<TenantCustomerForPublicBooking>;

      const existingCustomerByUser = await findCustomer({
        where: {
          tenantId: tenant.id,
          userId: customerUser.id,
        },
      });
      // An operational Customer can predate authenticated customer accounts.
      // A phone match is useful for scheduling, but is not proof of ownership:
      // never attach or transfer Customer.userId based on that match.
      const unownedCustomerByPhone = existingCustomerByUser
        ? null
        : await findCustomer({
            where: {
              tenantId: tenant.id,
              userId: null,
              OR: [{ phone }, { phone: customerUser.phone?.trim() ?? phone }],
            },
          });
      const customerData = {
        userId: customerUser.id,
        name: customerUser.name,
        phone,
        email: customerUser.email,
        isActive: true,
      };
      const customer = existingCustomerByUser
        ? await updateCustomer({
            where: { id: existingCustomerByUser.id },
            data: customerData,
          })
        : unownedCustomerByPhone
          ? unownedCustomerByPhone
        : await createCustomer({
            data: {
              tenantId: tenant.id,
              ...customerData,
            },
          });

      const { appointment } = await persistExternalAppointment(tx, {
        prepared,
        channel: "PUBLIC_LINK",
        customer,
        customerUserId: customerUser.id,
        customerNotes: input.customerNotes,
      });

      if (status === "CONFIRMED" || status === "REQUESTED") {
        const { date: bookingDate, time: bookingTime } = notificationDateParts(
          startsAt,
          tenant.timezone,
        );
        const requiresConfirmation = status === "REQUESTED";
        const title = requiresConfirmation
          ? "Agendamento aguardando confirmação"
          : "Novo agendamento pelo link público";
        const description = requiresConfirmation
          ? `${customer.name} solicitou ${service.name} para ${bookingDate} às ${bookingTime}.`
          : `${customer.name} agendou ${service.name} para ${bookingDate} às ${bookingTime}.`;

        const notification: CreateProviderNotificationInput = {
          tenantId: tenant.id,
          audience: "TENANT",
          type: requiresConfirmation
            ? "booking_confirmation_required"
            : "public_booking_created",
          priority: requiresConfirmation ? "high" : "medium",
          title,
          description,
          entityType: "appointment",
          entityId: appointment.id,
          actionUrl: `/app/appointments?startDate=${bookingDate}&appointmentId=${appointment.id}&highlight=notification`,
          metadata: {
            customerName: customer.name,
            serviceName: service.name,
            bookingDate,
            bookingTime,
            source: "public_link",
            requiresConfirmation,
          },
        };
        await createProviderNotification(notification, tx);
      }

      const metadata = {
        tenantId: tenant.id,
        appointmentId: appointment.id,
        customerId: customer.id,
        customerUserId: customerUser.id,
        serviceId: service.id,
        origin: "PUBLIC_LINK",
        status,
      };
      await tx.appointmentEvent.createMany({
        data: [
          {
            tenantId: tenant.id,
            appointmentId: appointment.id,
            actorType: "CUSTOMER",
            eventType: "CREATED",
            description: `Agendamento público criado para ${customer.name}.`,
            metadata,
          },
          {
            tenantId: tenant.id,
            appointmentId: appointment.id,
            actorType: "CUSTOMER",
            eventType: "PUBLIC_BOOKING_CREATED",
            description: "Agendamento criado pelo link público.",
            metadata,
          },
        ],
      });
      await tx.auditLog.create({
        data: {
          tenantId: tenant.id,
          actorType: "CUSTOMER",
          eventType: "PUBLIC_APPOINTMENT_CREATED",
          description: `Agendamento público criado para "${service.name}".`,
          metadata,
          ipAddress,
        },
      });

      return {
        appointmentId: appointment.id,
        status,
        message: PUBLIC_BOOKING_MESSAGES[service.bookingMode],
      };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );

  return {
    appointmentId: result.appointmentId,
    status: result.status,
    message: result.message,
  };
}

/**
 * Lightweight query for the public layout header.
 *
 * Only selects the tenant name (indexed lookup on slug), avoiding the
 * heavy joins of getPublicTenantBySlug which is only needed per-page.
 */
export async function getPublicTenantNameForHeader(slug: string) {
  return prisma.tenant.findUnique({
    where: { slug },
    select: { name: true, publicDisplayName: true },
  });
}

export async function getPublicBookingConfirmation(
  slug: string,
  appointmentId: string,
  customerUserId: string,
) {
  const tenant = await prisma.tenant.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (!tenant) return null;

  return prisma.appointment.findFirst({
    where: {
      id: appointmentId,
      tenantId: tenant.id,
      customerUserId,
      origin: "PUBLIC_LINK",
    },
    include: {
      tenant: { select: { name: true, publicDisplayName: true, slug: true } },
      customerUser: { select: { name: true } },
      service: { select: { name: true, bookingMode: true } },
      customValues: {
        include: {
          customField: { select: { label: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });
}
