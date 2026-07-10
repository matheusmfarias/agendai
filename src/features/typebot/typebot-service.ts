import {
  assertAvailability,
  assertNoSlotConflict,
  getAvailableSlots,
  publicStatusForBookingMode,
} from "@/features/booking-core/availability";
import {
  jsonOptionsToStrings,
  normalizePhone,
  validateCustomFields,
} from "@/features/booking-core/custom-fields";
import {
  addDaysToDateString,
  getDateStringInTimezone,
} from "@/features/booking-core/timezone";
import { isTenantBookableForWhatsApp } from "@/features/booking-core/tenant-policy";
import type { BookableTenant } from "@/features/booking-core/tenant-policy";
import { formatCurrency } from "@/lib/formatters";
import { prisma } from "@/lib/prisma";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TypebotBusinessData = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  city: string;
  state: string;
  whatsapp: string;
};

export type TypebotServiceItem = {
  number: number;
  id: string;
  category: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  priceText: string | null;
  bookingMode: string;
};

export type TypebotSlotItem = {
  number: number;
  startsAt: string;
  endsAt: string;
  label: string;
};

export type TypebotAppointmentResult = {
  id: string;
  status: string;
  origin: string;
  startsAt?: string;
  endsAt?: string;
  serviceName?: string;
  customerName?: string;
  priceText?: string | null;
};

// ---------------------------------------------------------------------------
// Tenant & business
// ---------------------------------------------------------------------------

export async function getTypebotTenant(slug: string) {
  return prisma.tenant.findUnique({
    where: { slug },
    include: {
      subscription: {
        include: {
          plan: {
            select: { publicLinkEnabled: true, whatsappEnabled: true },
          },
        },
      },
    },
  });
}

export function validateTypebotTenant(
  tenant: unknown,
): tenant is BookableTenant {
  if (!tenant) return false;
  return isTenantBookableForWhatsApp(tenant as BookableTenant);
}

export function getBusinessData(tenant: BookableTenant & {
  id: string;
  name: string;
  publicDisplayName?: string | null;
  slug: string;
  description: string | null;
  city: string;
  state: string;
  whatsapp: string;
}): TypebotBusinessData {
  return {
    id: tenant.id,
    name: tenant.publicDisplayName || tenant.name,
    slug: tenant.slug,
    description: tenant.description,
    city: tenant.city,
    state: tenant.state,
    whatsapp: tenant.whatsapp,
  };
}

// ---------------------------------------------------------------------------
// Services
// ---------------------------------------------------------------------------

export async function getTypebotServices(tenantId: string) {
  const categories = await prisma.serviceCategory.findMany({
    where: { tenantId, isActive: true },
    orderBy: [{ position: "asc" }, { name: "asc" }],
    include: {
      services: {
        where: { isActive: true },
        orderBy: [{ position: "asc" }, { name: "asc" }],
      },
    },
  });

  const result: TypebotServiceItem[] = [];
  let counter = 1;

  for (const category of categories) {
    for (const service of category.services) {
      const priceText = formatTypebotPrice(
        service.priceType,
        service.priceValue?.toString() ?? null,
      );

      result.push({
        number: counter++,
        id: service.id,
        category: category.name,
        name: service.name,
        description: service.description,
        durationMinutes: service.durationMinutes,
        priceText,
        bookingMode: service.bookingMode,
      });
    }
  }

  return result;
}

export function buildServicesText(services: TypebotServiceItem[]) {
  return services
    .map(
      (service) =>
        `${service.number} - ${service.name} | ${service.durationMinutes} min${service.priceText ? ` | ${service.priceText}` : ""}`,
    )
    .join("\n");
}

function formatTypebotPrice(
  priceType: string,
  priceValue: string | null,
): string | null {
  if (priceType === "HIDDEN") return null;
  if (priceType === "ON_REQUEST") return "Sob avaliação";
  if (!priceValue) return null;

  const value = formatCurrency(priceValue);
  return priceType === "STARTING_AT" ? `A partir de ${value}` : value;
}

// ---------------------------------------------------------------------------
// Service detail
// ---------------------------------------------------------------------------

export type TypebotCustomField = {
  id: string;
  key: string;
  label: string;
  type: string;
  required: boolean;
  options: string[];
  order: number;
};

export type TypebotServiceDetail = {
  id: string;
  category: { id: string; name: string };
  name: string;
  description: string | null;
  durationMinutes: number;
  priceType: string;
  priceValue: string | null;
  priceText: string | null;
  bookingMode: string;
  customFields: TypebotCustomField[];
};

export async function getTypebotServiceDetail(
  tenantId: string,
  serviceId: string,
) {
  const service = await prisma.service.findFirst({
    where: {
      id: serviceId,
      tenantId,
      isActive: true,
      category: { isActive: true },
    },
    select: {
      id: true,
      name: true,
      description: true,
      durationMinutes: true,
      priceType: true,
      priceValue: true,
      bookingMode: true,
      category: {
        select: { id: true, name: true },
      },
      customFields: {
        where: { isActive: true },
        orderBy: [{ position: "asc" }, { label: "asc" }],
        select: {
          id: true,
          key: true,
          label: true,
          fieldType: true,
          isRequired: true,
          options: true,
          position: true,
        },
      },
    },
  });

  if (!service) return null;

  const priceText = formatTypebotPrice(
    service.priceType,
    service.priceValue?.toString() ?? null,
  );

  const customFields: TypebotCustomField[] = service.customFields.map(
    (field) => ({
      id: field.id,
      key: field.key,
      label: field.label,
      type: field.fieldType,
      required: field.isRequired,
      options: field.fieldType === "SELECT"
        ? jsonOptionsToStrings(field.options)
        : [],
      order: field.position,
    }),
  );

  return {
    id: service.id,
    category: { id: service.category.id, name: service.category.name },
    name: service.name,
    description: service.description,
    durationMinutes: service.durationMinutes,
    priceType: service.priceType,
    priceValue: service.priceValue?.toString() ?? null,
    priceText,
    bookingMode: service.bookingMode,
    customFields,
  };
}

export function buildCustomFieldsText(
  customFields: TypebotCustomField[],
): string {
  if (!customFields.length) return "";

  const lines = customFields.map((field, index) => {
    let line = `${index + 1} - ${field.label}`;
    if (field.type === "SELECT" && field.options.length) {
      line += `: ${field.options.join(", ")}`;
    }
    if (field.required) {
      line += " (obrigatório)";
    }
    return line;
  });

  return `Preciso de mais algumas informações:\n\n${lines.join("\n")}`;
}

// ---------------------------------------------------------------------------
// Slots
// ---------------------------------------------------------------------------

export async function getTypebotSlots(
  tenantId: string,
  serviceId: string,
  opts?: { date?: string; days?: number },
) {
  const [tenant, service] = await Promise.all([
    prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { maxBookingAdvanceDays: true, timezone: true },
    }),
    prisma.service.findFirst({
      where: {
        id: serviceId,
        tenantId,
        isActive: true,
        category: { isActive: true },
      },
      select: { id: true, name: true, durationMinutes: true },
    }),
  ]);
  if (!tenant || !service) return { service: null, slots: [] };

  const allSlots = await getAvailableSlots(tenantId, serviceId);

  const maxDays = Math.min(
    Math.max(1, opts?.days ?? tenant.maxBookingAdvanceDays),
    tenant.maxBookingAdvanceDays,
  );
  const today = getDateStringInTimezone(new Date(), tenant.timezone);
  const cutoffDate = addDaysToDateString(today, maxDays - 1);

  const filtered = allSlots.filter(
    (slot) =>
      slot.date <= cutoffDate &&
      (!opts?.date || slot.date === opts.date),
  );

  const slots: TypebotSlotItem[] = filtered.map((slot, index) => ({
    number: index + 1,
    startsAt: slot.startsAt.toISOString(),
    endsAt: slot.endsAt.toISOString(),
    label: slot.label,
  }));

  return { service, slots };
}

export function buildSlotsText(slots: TypebotSlotItem[]) {
  return slots.map((slot) => `${slot.number} - ${slot.label}`).join("\n");
}

// ---------------------------------------------------------------------------
// Customer identification
// ---------------------------------------------------------------------------

export type IdentifyCustomerInput = {
  phone: string;
  name: string;
  email?: string;
};

export async function identifyCustomer(
  tenantId: string,
  input: IdentifyCustomerInput,
) {
  const phone = normalizePhone(input.phone);

  let customer = await prisma.customer.findFirst({
    where: { tenantId, phone },
    select: { id: true, name: true, phone: true, email: true },
  });

  if (customer) {
    const updateData: { name: string; email?: string } = { name: input.name };
    if (input.email) updateData.email = input.email;

    await prisma.customer.update({
      where: { id: customer.id },
      data: updateData,
    });

    if (input.name !== customer.name || (input.email && input.email !== customer.email)) {
      customer.name = input.name;
      if (input.email) customer.email = input.email;
    }
  } else {
    customer = await prisma.customer.create({
      data: {
        tenantId,
        name: input.name,
        phone,
        email: input.email || null,
        isActive: true,
      },
      select: { id: true, name: true, phone: true, email: true },
    });
  }

  // Create or reuse Typebot session
  const session = await upsertTypebotSession(
    tenantId,
    phone,
    customer.id,
    input.name,
  );

  return { customer, session };
}

export async function upsertTypebotSession(
  tenantId: string,
  phone: string,
  customerId: string,
  customerName: string,
) {
  const existing = await prisma.typebotSession.findFirst({
    where: { tenantId, phone },
    orderBy: { lastInteractionAt: "desc" },
  });

  if (existing) {
    return prisma.typebotSession.update({
      where: { id: existing.id },
      data: {
        customerId,
        customerName,
        status: "IDENTIFIED",
        lastInteractionAt: new Date(),
      },
    });
  }

  return prisma.typebotSession.create({
    data: {
      tenantId,
      phone,
      customerId,
      customerName,
      status: "IDENTIFIED",
    },
  });
}

export async function getTypebotSession(sessionId: string, tenantId: string) {
  return prisma.typebotSession.findFirst({
    where: { id: sessionId, tenantId },
    include: {
      customer: { select: { id: true, name: true, phone: true, email: true } },
    },
  });
}

// ---------------------------------------------------------------------------
// Appointment creation
// ---------------------------------------------------------------------------

export type CreateTypebotAppointmentInput = {
  sessionId: string;
  customerId: string;
  serviceId: string;
  startsAt: string;
  customValues?: { customFieldId: string; value: string }[];
  customerNotes?: string;
};

export async function createTypebotAppointment(
  tenantId: string,
  input: CreateTypebotAppointmentInput,
) {
  const session = await getTypebotSession(input.sessionId, tenantId);
  if (!session) {
    throw new BusinessError(
      "SESSION_NOT_FOUND",
      "Sessão não encontrada ou expirada. Reinicie o atendimento.",
    );
  }

  const customer = await prisma.customer.findFirst({
    where: { id: input.customerId, tenantId },
    select: { id: true, name: true, phone: true },
  });
  if (!customer) {
    throw new BusinessError(
      "CUSTOMER_REQUIRED",
      "Cliente não encontrado.",
    );
  }

  const service = await prisma.service.findFirst({
    where: {
      id: input.serviceId,
      tenantId,
      isActive: true,
      category: { isActive: true },
    },
    include: {
      customFields: {
        where: { isActive: true },
        orderBy: [{ position: "asc" }, { label: "asc" }],
      },
    },
  });
  if (!service) {
    throw new BusinessError(
      "SERVICE_UNAVAILABLE",
      "Serviço indisponível para agendamento.",
    );
  }

  // Validate custom fields
  const customFieldsMap: Record<string, string> = {};
  for (const item of input.customValues ?? []) {
    customFieldsMap[`custom_${item.customFieldId}`] = item.value;
  }

  const customValues = validateCustomFields(
    service.customFields.map((f) => ({
      id: f.id,
      label: f.label,
      fieldType: f.fieldType,
      isRequired: f.isRequired,
      options: f.options,
    })),
    customFieldsMap,
  );
  if (!customValues.ok) {
    const error = new BusinessError(
      "VALIDATION_ERROR",
      "Revise os campos informados.",
    );
    Object.assign(error, { fieldErrors: customValues.fieldErrors });
    throw error;
  }

  const startsAt = new Date(input.startsAt);
  const endsAt = new Date(
    startsAt.getTime() + service.durationMinutes * 60_000,
  );

  // Create appointment in transaction
  const appointment = await prisma.$transaction(async (tx) => {
    await assertAvailability(tx, tenantId, startsAt, endsAt);
    await assertNoSlotConflict(tx, tenantId, startsAt, endsAt);

    const status = publicStatusForBookingMode(service.bookingMode);

    const created = await tx.appointment.create({
      data: {
        tenant: { connect: { id: tenantId } },
        customer: { connect: { id: customer.id } },
        service: { connect: { id: service.id } },
        origin: "WHATSAPP",
        status,
        startsAt,
        endsAt,
        customerNotes: input.customerNotes ?? null,
        estimatedPrice: service.priceValue,
      },
    });

    // Save custom field values
    if (customValues.rows.length) {
      await tx.appointmentCustomValue.createMany({
        data: customValues.rows.map((row) => ({
          appointmentId: created.id,
          customFieldId: row.customFieldId,
          value: row.value,
        })),
      });
    }

    // Appointment events
    const eventMetadata = {
      tenantId,
      appointmentId: created.id,
      customerId: customer.id,
      serviceId: service.id,
      origin: "WHATSAPP",
      source: "TYPEBOT",
      sessionId: session.id,
      status,
    };

    await tx.appointmentEvent.createMany({
      data: [
        {
          tenantId,
          appointmentId: created.id,
          actorType: "TYPEBOT",
          eventType: "WHATSAPP_BOOKING_CREATED",
          description: `Agendamento criado via Typebot/WhatsApp para ${customer.name}.`,
          metadata: eventMetadata,
        },
      ],
    });

    // Audit log
    await tx.auditLog.create({
      data: {
        tenantId,
        actorType: "TYPEBOT",
        eventType: "TYPEBOT_APPOINTMENT_CREATED",
        description: `Agendamento Typebot criado para "${service.name}".`,
        metadata: eventMetadata,
      },
    });

    // Update session
    await tx.typebotSession.update({
      where: { id: session.id },
      data: {
        lastServiceId: service.id,
        lastAppointmentId: created.id,
        status: "APPOINTMENT_CREATED",
        lastInteractionAt: new Date(),
      },
    });

    return created;
  });

  const message = TYPEBOT_MESSAGES[service.bookingMode];
  const priceText =
    service.priceType === "HIDDEN"
      ? null
      : formatTypebotPrice(
          service.priceType,
          service.priceValue?.toString() ?? null,
        );

  return {
    id: appointment.id,
    status: String(appointment.status),
    origin: "WHATSAPP",
    startsAt: appointment.startsAt.toISOString(),
    endsAt: appointment.endsAt.toISOString(),
    serviceName: service.name,
    customerName: customer.name,
    priceText,
    message,
  };
}

// ---------------------------------------------------------------------------
// Appointment query
// ---------------------------------------------------------------------------

export async function getTypebotAppointment(
  tenantId: string,
  appointmentId: string,
) {
  const appointment = await prisma.appointment.findFirst({
    where: { id: appointmentId, tenantId },
    include: {
      service: { select: { name: true, priceType: true, priceValue: true } },
      customer: { select: { name: true } },
    },
  });

  if (!appointment) return null;

  const priceText =
    appointment.service.priceType === "HIDDEN"
      ? null
      : formatTypebotPrice(
          appointment.service.priceType,
          appointment.service.priceValue?.toString() ?? null,
        );

  return {
    id: appointment.id,
    status: String(appointment.status),
    origin: String(appointment.origin),
    serviceName: appointment.service.name,
    customerName: appointment.customer.name,
    startsAt: appointment.startsAt.toISOString(),
    endsAt: appointment.endsAt.toISOString(),
    priceText,
  };
}

// ---------------------------------------------------------------------------
// Error handling
// ---------------------------------------------------------------------------

export class BusinessError extends Error {
  code: string;
  fieldErrors?: Record<string, string[]>;

  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = "BusinessError";
  }
}

export const TYPEBOT_MESSAGES = {
  DIRECT: "Agendamento confirmado com sucesso.",
  REQUIRES_CONFIRMATION:
    "Sua solicitação foi enviada e aguarda confirmação do prestador.",
  INFORMATIONAL:
    "Sua solicitação foi enviada. O prestador entrará em contato para dar continuidade.",
} as const;
