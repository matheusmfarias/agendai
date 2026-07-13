import { calculateAppointmentEnd } from "@/features/appointments/appointment-rules";
import {
  assertAvailability,
  assertNoSlotConflict,
  getAvailableSlots,
  publicStatusForBookingMode,
} from "@/features/booking-core/availability";
import {
  normalizePhone,
  validateCustomFields,
} from "@/features/booking-core/custom-fields";
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

export const PUBLIC_BOOKING_MESSAGES = {
  DIRECT: "Agendamento confirmado com sucesso.",
  REQUIRES_CONFIRMATION:
    "Sua solicitação foi enviada e aguarda confirmação do prestador.",
  INFORMATIONAL:
    "Sua solicitação foi enviada. O prestador entrará em contato para dar continuidade.",
} as const;

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
  userId: string | null;
};

export type PublicReviewSummary = Awaited<
  ReturnType<typeof getPublicReviewSummary>
>;

export async function getPublicTenantBySlug(slug: string) {
  return prisma.tenant.findUnique({
    where: { slug },
    include: {
      subscription: {
        include: {
          plan: {
            select: { publicLinkEnabled: true },
          },
        },
      },
      serviceCategories: {
        where: { isActive: true },
        orderBy: [{ position: "asc" }, { name: "asc" }],
        include: {
          services: {
            where: { isActive: true },
            orderBy: [{ position: "asc" }, { name: "asc" }],
          },
        },
      },
    },
  });
}

export async function getPublicPageData(slug: string) {
  const tenant = await getPublicTenantBySlug(slug);
  if (!tenant || !isTenantBookableForPublicLink(tenant)) {
    return { available: false as const, tenant: null };
  }

  return { available: true as const, tenant };
}

function publicCustomerName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "Cliente";
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[1][0].toUpperCase()}.`;
}

export async function getPublicReviewSummary(slug: string) {
  const tenant = await prisma.tenant.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (!tenant) {
    return {
      count: 0,
      average: null as number | null,
      recent: [],
    };
  }

  const [aggregate, recent] = await Promise.all([
    prisma.appointmentReview.aggregate({
      where: {
        tenantId: tenant.id,
        rating: { gte: 1, lte: 5 },
        appointment: { status: "FINISHED", tenantId: tenant.id },
      },
      _avg: { rating: true },
      _count: { rating: true },
    }),
    prisma.appointmentReview.findMany({
      where: {
        tenantId: tenant.id,
        rating: { gte: 1, lte: 5 },
        comment: { not: null },
        appointment: { status: "FINISHED", tenantId: tenant.id },
      },
      orderBy: { createdAt: "desc" },
      take: 3,
      select: {
        id: true,
        rating: true,
        comment: true,
        customerUser: { select: { name: true } },
      },
    }),
  ]);

  return {
    count: aggregate._count.rating,
    average:
      aggregate._avg.rating === null
        ? null
        : Math.round(aggregate._avg.rating * 10) / 10,
    recent: recent.map((review) => ({
      id: review.id,
      rating: review.rating,
      comment: review.comment,
      customerName: publicCustomerName(review.customerUser.name),
    })),
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
    ? await prisma.service.findFirst({
        where: {
          id: serviceId,
          tenantId: pageData.tenant.id,
          isActive: true,
          category: { isActive: true },
        },
        include: {
          category: { select: { name: true } },
          customFields: {
            where: { isActive: true },
            orderBy: [{ position: "asc" }, { label: "asc" }],
          },
        },
      })
    : null;

  const slots = service
    ? await getAvailableSlots(pageData.tenant.id, service.id)
    : [];

  return {
    available: true as const,
    tenant: pageData.tenant,
    services,
    selectedService: service,
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

      const service = await tx.service.findFirst({
        where: {
          id: input.serviceId,
          tenantId: tenant.id,
          isActive: true,
          category: { isActive: true },
        },
        include: {
          category: { select: { name: true } },
          customFields: {
            where: { isActive: true },
            orderBy: [{ position: "asc" }, { label: "asc" }],
          },
        },
      });
      if (!service) {
        throw new Error("Serviço indisponível para agendamento.");
      }

      const customValues = validateCustomFields(
        service.customFields.map((field) => ({
          id: field.id,
          label: field.label,
          fieldType: field.fieldType,
          isRequired: field.isRequired,
          options: field.options,
        })),
        input.customFields,
      );
      if (!customValues.ok) {
        const error = new Error("Revise os campos personalizados.");
        Object.assign(error, { fieldErrors: customValues.fieldErrors });
        throw error;
      }

      const startsAt = parseLocalDateTimeInTimezone(
        input.startsAt,
        tenant.timezone,
      );
      if (!startsAt) {
        throw new Error("Selecione um horário válido.");
      }

      const endsAt = calculateAppointmentEnd(
        startsAt,
        service.durationMinutes,
      );
      await assertAvailability(tx, tenant.id, startsAt, endsAt);
      await assertNoSlotConflict(tx, tenant.id, startsAt, endsAt);

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

      const phone = normalizePhone(customerUser.phone ?? "");
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

      const status = publicStatusForBookingMode(service.bookingMode);
      const createAppointment = tx.appointment.create as unknown as (
        args: unknown,
      ) => Promise<{ id: string }>;
      const appointment = await createAppointment({
        data: {
          tenant: { connect: { id: tenant.id } },
          customer: { connect: { id: customer.id } },
          customerUser: { connect: { id: customerUser.id } },
          service: { connect: { id: service.id } },
          origin: "PUBLIC_LINK",
          status,
          startsAt,
          endsAt,
          customerNotes: input.customerNotes,
          estimatedPrice: service.priceValue,
        },
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

      if (customValues.rows.length) {
        const appointmentCustomValueClient = (
          tx as unknown as {
            appointmentCustomValue: {
              createMany(args: unknown): Promise<unknown>;
            };
          }
        ).appointmentCustomValue;
        await appointmentCustomValueClient.createMany({
          data: customValues.rows.map((row) => ({
            appointmentId: appointment.id,
            customFieldId: row.customFieldId,
            value: row.value,
          })),
        });
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
