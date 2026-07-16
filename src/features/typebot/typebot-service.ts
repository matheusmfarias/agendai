import {
  getBookableDateRange,
  getAvailableSlots,
} from "@/features/booking-core/availability";
import {
  jsonOptionsToStrings,
} from "@/features/booking-core/custom-fields";
import {
  normalizeBrazilianCustomerPhone,
  normalizeBrazilianPhoneForComparison,
  toBrazilianE164Phone,
} from "@/features/booking-core/phone";
import { normalizeCustomerText } from "@/features/customers/customer-normalization";
import {
  EXTERNAL_BOOKING_MESSAGES,
  ExternalAppointmentError,
  persistExternalAppointment,
  prepareExternalAppointment,
} from "@/features/booking-core/external-appointment-service";
import {
  addDaysToDateString,
  dateAtMinutesInTimezone,
  getDateStringInTimezone,
  getPartsInTimezone,
  normalizeBookingTimezone,
} from "@/features/booking-core/timezone";
import { isTenantBookableForWhatsApp } from "@/features/booking-core/tenant-policy";
import type { BookableTenant } from "@/features/booking-core/tenant-policy";
import { Prisma } from "@/generated/prisma/client";
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
  whatsappUrl: string | null;
};

export type TypebotCategoryItem = {
  number: number;
  id: string;
  name: string;
};

export type TypebotServiceItem = {
  number: number;
  id: string;
  categoryId: string;
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

export type TypebotAvailableDateItem = {
  date: string;
  label: string;
  slotCount: number;
};

export type TypebotAvailabilityPeriod = "MORNING" | "AFTERNOON" | "EVENING";

export type TypebotAvailablePeriodItem = {
  value: TypebotAvailabilityPeriod;
  label: "Manhã" | "Tarde" | "Noite";
  slotCount: number;
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
  const whatsappPhone = toBrazilianE164Phone(tenant.whatsapp);
  return {
    id: tenant.id,
    name: tenant.publicDisplayName || tenant.name,
    slug: tenant.slug,
    description: tenant.description,
    city: tenant.city,
    state: tenant.state,
    whatsapp: tenant.whatsapp,
    whatsappUrl: whatsappPhone ? `https://wa.me/${whatsappPhone}` : null,
  };
}

// ---------------------------------------------------------------------------
// Services
// ---------------------------------------------------------------------------

export async function getTypebotCategories(tenantId: string) {
  const categories = await prisma.serviceCategory.findMany({
    where: {
      tenantId,
      isActive: true,
      services: { some: { isActive: true } },
    },
    orderBy: [{ position: "asc" }, { name: "asc" }],
    select: { id: true, name: true },
  });

  return categories.map((category, index) => ({
    number: index + 1,
    id: category.id,
    name: category.name,
  }));
}

export async function getTypebotServices(
  tenantId: string,
  categoryId?: string,
) {
  const categories = await prisma.serviceCategory.findMany({
    where: {
      tenantId,
      isActive: true,
      ...(categoryId ? { id: categoryId } : {}),
      services: { some: { isActive: true } },
    },
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
        categoryId: category.id,
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
  type: "TEXT" | "TEXTAREA" | "NUMBER" | "DATE" | "BOOLEAN" | "SELECT";
  required: boolean;
  placeholder: string | null;
  options: string[];
  order: number;
};

type TypebotCustomFieldSource = {
  id: string;
  key: string;
  label: string;
  fieldType: TypebotCustomField["type"];
  isRequired: boolean;
  options: Prisma.JsonValue | null;
  position: number;
};

function mapTypebotCustomField(
  field: TypebotCustomFieldSource,
): TypebotCustomField {
  return {
    id: field.id,
    key: field.key,
    label: field.label,
    type: field.fieldType,
    required: field.isRequired,
    placeholder: null,
    options: field.fieldType === "SELECT"
      ? jsonOptionsToStrings(field.options)
      : [],
    order: field.position,
  };
}

export async function getTypebotCustomFields(
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

  return service?.customFields.map(mapTypebotCustomField) ?? null;
}

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

  const customFields = service.customFields.map(mapTypebotCustomField);

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

const TYPEBOT_AVAILABLE_DATES_PAGE_SIZE = 3;
const TYPEBOT_AVAILABLE_DATES_WINDOW_DAYS = 14;

async function getTypebotAvailabilityContext(
  tenantId: string,
  serviceId: string,
) {
  const [tenant, service] = await Promise.all([
    prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        timezone: true,
        defaultAppointmentDuration: true,
        defaultSlotInterval: true,
        minBookingNoticeMinutes: true,
        maxBookingAdvanceDays: true,
      },
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

  return tenant && service ? { tenant, service } : null;
}

function formatTypebotAvailableDateLabel(date: string, timezone: string) {
  const formatted = new Intl.DateTimeFormat("pt-BR", {
    timeZone: normalizeBookingTimezone(timezone),
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  }).format(dateAtMinutesInTimezone(date, 12 * 60, timezone));
  const normalized = formatted.replace(".", "");
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

export async function getTypebotAvailableDates(
  tenantId: string,
  serviceId: string,
  opts?: { startDate?: string; days?: number },
) {
  const context = await getTypebotAvailabilityContext(tenantId, serviceId);
  if (!context) {
    return { service: null, dates: [], nextStartDate: null };
  }
  const { tenant, service } = context;

  const today = getDateStringInTimezone(new Date(), tenant.timezone);
  const lastBookableDate = addDaysToDateString(
    today,
    Math.max(1, tenant.maxBookingAdvanceDays) - 1,
  );
  const requestedStartDate = opts?.startDate && opts.startDate > today
    ? opts.startDate
    : today;

  if (requestedStartDate > lastBookableDate) {
    return { service, dates: [], nextStartDate: null };
  }

  const windowDays = Math.min(
    Math.max(1, opts?.days ?? TYPEBOT_AVAILABLE_DATES_WINDOW_DAYS),
    TYPEBOT_AVAILABLE_DATES_WINDOW_DAYS,
  );
  const requestedDates = getBookableDateRange({
    timezone: tenant.timezone,
    maxBookingAdvanceDays: tenant.maxBookingAdvanceDays,
    startDate: requestedStartDate,
    days: windowDays,
  });

  const slots = await getAvailableSlots(tenantId, serviceId, {
    context: {
      tenant,
      service: { durationMinutes: service.durationMinutes },
    },
    dates: requestedDates,
  });
  const countsByDate = new Map<string, number>();
  for (const slot of slots) {
    countsByDate.set(slot.date, (countsByDate.get(slot.date) ?? 0) + 1);
  }

  const allDates: TypebotAvailableDateItem[] = [...countsByDate.entries()]
    .sort(([first], [second]) => first.localeCompare(second))
    .map(([date, slotCount]) => ({
      date,
      label: formatTypebotAvailableDateLabel(date, tenant.timezone),
      slotCount,
    }));
  const dates = allDates.slice(0, TYPEBOT_AVAILABLE_DATES_PAGE_SIZE);
  const lastReturnedDate = dates.at(-1)?.date;
  const lastRequestedDate = requestedDates.at(-1);
  const nextStartDate =
    allDates.length > TYPEBOT_AVAILABLE_DATES_PAGE_SIZE && lastReturnedDate
      ? addDaysToDateString(lastReturnedDate, 1)
      : lastRequestedDate && lastRequestedDate < lastBookableDate
        ? addDaysToDateString(lastRequestedDate, 1)
        : null;

  return { service, dates, nextStartDate };
}

export async function getTypebotSlots(
  tenantId: string,
  serviceId: string,
  opts?: {
    date?: string;
    days?: number;
    period?: TypebotAvailabilityPeriod;
  },
) {
  const context = await getTypebotAvailabilityContext(tenantId, serviceId);
  if (!context) return { service: null, slots: [], timezone: null };
  const { tenant, service } = context;
  const days = Math.min(
    Math.max(1, opts?.days ?? tenant.maxBookingAdvanceDays),
    tenant.maxBookingAdvanceDays,
  );
  const requestedDates = getBookableDateRange({
    timezone: tenant.timezone,
    maxBookingAdvanceDays: tenant.maxBookingAdvanceDays,
    startDate: opts?.date,
    days: opts?.date ? 1 : days,
  });
  const allAvailableSlots = await getAvailableSlots(tenantId, serviceId, {
    context: {
      tenant,
      service: { durationMinutes: service.durationMinutes },
    },
    dates: requestedDates,
  });
  const availableSlots = opts?.period
    ? allAvailableSlots.filter(
        (slot) =>
          getTypebotAvailabilityPeriod(slot.startsAt, tenant.timezone) ===
          opts.period,
      )
    : allAvailableSlots;

  const slots: TypebotSlotItem[] = availableSlots.map((slot, index) => ({
    number: index + 1,
    startsAt: slot.startsAt.toISOString(),
    endsAt: slot.endsAt.toISOString(),
    label: slot.label,
  }));

  return { service, slots, timezone: tenant.timezone };
}

const TYPEBOT_PERIOD_LABELS: Record<
  TypebotAvailabilityPeriod,
  TypebotAvailablePeriodItem["label"]
> = {
  MORNING: "Manhã",
  AFTERNOON: "Tarde",
  EVENING: "Noite",
};

export function getTypebotAvailabilityPeriod(
  startsAt: Date,
  timezone: string,
): TypebotAvailabilityPeriod {
  const hour = Math.floor(getPartsInTimezone(startsAt, timezone).minutes / 60);
  if (hour < 12) return "MORNING";
  if (hour < 18) return "AFTERNOON";
  return "EVENING";
}

export async function getTypebotAvailablePeriods(
  tenantId: string,
  serviceId: string,
  date: string,
) {
  const result = await getTypebotSlots(tenantId, serviceId, { date, days: 1 });
  if (!result.service || !result.timezone) {
    return { service: null, periods: [] };
  }

  const counts = new Map<TypebotAvailabilityPeriod, number>();
  for (const slot of result.slots) {
    const period = getTypebotAvailabilityPeriod(
      new Date(slot.startsAt),
      result.timezone,
    );
    counts.set(period, (counts.get(period) ?? 0) + 1);
  }

  const order: TypebotAvailabilityPeriod[] = [
    "MORNING",
    "AFTERNOON",
    "EVENING",
  ];
  return {
    service: result.service,
    periods: order.flatMap((value) => {
      const slotCount = counts.get(value) ?? 0;
      return slotCount
        ? [{ value, label: TYPEBOT_PERIOD_LABELS[value], slotCount }]
        : [];
    }),
  };
}

export function buildSlotsText(slots: TypebotSlotItem[]) {
  return slots.map((slot) => `${slot.number} - ${slot.label}`).join("\n");
}

// ---------------------------------------------------------------------------
// Customer identification
// ---------------------------------------------------------------------------

type CustomerLookupMetadata = {
  status: "FOUND" | "NOT_FOUND" | "AMBIGUOUS";
  candidateCustomerId?: string;
  resolution?: "CONFIRMED" | "CREATED";
  rejectedExisting?: boolean;
};

function metadataRecord(metadata: Prisma.JsonValue | null) {
  return metadata && typeof metadata === "object" && !Array.isArray(metadata)
    ? metadata
    : {};
}

function customerLookupMetadata(metadata: Prisma.JsonValue | null) {
  const lookup = metadataRecord(metadata).customerLookup;
  if (!lookup || typeof lookup !== "object" || Array.isArray(lookup)) {
    return null;
  }
  return lookup as CustomerLookupMetadata;
}

async function findCustomersByNormalizedPhone(
  tenantId: string,
  phone: string,
) {
  const customers = await prisma.customer.findMany({
    where: { tenantId },
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      updatedAt: true,
      appointments: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { createdAt: true },
      },
    },
  });
  return customers.filter(
    (customer) =>
      normalizeBrazilianPhoneForComparison(customer.phone) === phone,
  );
}

function selectCustomerCandidate<
  T extends {
    updatedAt: Date;
    appointments: { createdAt: Date }[];
  },
>(matches: T[]) {
  return [...matches].sort((first, second) => {
    const firstAppointment = first.appointments[0]?.createdAt.getTime() ?? -1;
    const secondAppointment = second.appointments[0]?.createdAt.getTime() ?? -1;
    if (firstAppointment !== secondAppointment) {
      return secondAppointment - firstAppointment;
    }
    return second.updatedAt.getTime() - first.updatedAt.getTime();
  })[0];
}

async function findLatestTypebotSessionByPhone(
  tenantId: string,
  phone: string,
) {
  const sessions = await prisma.typebotSession.findMany({
    where: { tenantId },
    orderBy: { lastInteractionAt: "desc" },
  });
  return sessions.find(
    (session) =>
      normalizeBrazilianPhoneForComparison(session.phone) === phone,
  );
}

export async function lookupTypebotCustomer(tenantId: string, phoneInput: string) {
  const phone = normalizeBrazilianCustomerPhone(phoneInput);
  if (!phone) {
    throw new BusinessError(
      "VALIDATION_ERROR",
      "Informe um telefone válido com DDD.",
    );
  }

  const [matches, existingSession] = await Promise.all([
    findCustomersByNormalizedPhone(tenantId, phone),
    findLatestTypebotSessionByPhone(tenantId, phone),
  ]);
  const status: CustomerLookupMetadata["status"] = matches.length
    ? "FOUND"
    : "NOT_FOUND";
  const candidate = matches.length ? selectCustomerCandidate(matches) : undefined;
  const metadata = {
    ...metadataRecord(existingSession?.metadata ?? null),
    customerLookup: {
      status,
      ...(candidate ? { candidateCustomerId: candidate.id } : {}),
    },
  } satisfies Prisma.InputJsonObject;
  const session = existingSession
    ? await prisma.typebotSession.update({
        where: { id: existingSession.id },
        data: {
          phone,
          customerId: null,
          customerName: null,
          status: "STARTED",
          metadata,
          lastInteractionAt: new Date(),
        },
      })
    : await prisma.typebotSession.create({
        data: { tenantId, phone, status: "STARTED", metadata },
      });

  return {
    status,
    customer: candidate
      ? { id: candidate.id, name: candidate.name }
      : null,
    session,
  };
}

export async function confirmTypebotCustomer(
  tenantId: string,
  sessionId: string,
) {
  const session = await prisma.typebotSession.findFirst({
    where: { id: sessionId, tenantId },
  });
  if (!session) {
    throw new BusinessError("SESSION_NOT_FOUND", "Sessão não encontrada.");
  }
  const lookup = customerLookupMetadata(session.metadata);
  if (lookup?.resolution === "CONFIRMED" && session.customerId) {
    const customer = await prisma.customer.findFirst({
      where: { id: session.customerId, tenantId },
      select: { id: true, name: true, phone: true, email: true },
    });
    if (customer) return { customer, session };
  }
  if (lookup?.status !== "FOUND" || !lookup.candidateCustomerId) {
    throw new BusinessError(
      "CUSTOMER_REQUIRED",
      "Não há um cadastro inequívoco para confirmar.",
    );
  }

  const customer = await prisma.customer.findFirst({
    where: { id: lookup.candidateCustomerId, tenantId },
    select: { id: true, name: true, phone: true, email: true },
  });
  if (
    !customer ||
    normalizeBrazilianPhoneForComparison(customer.phone) !== session.phone
  ) {
    throw new BusinessError(
      "CUSTOMER_REQUIRED",
      "Não há um cadastro inequívoco para confirmar.",
    );
  }

  const updatedSession = await prisma.typebotSession.update({
    where: { id: session.id },
    data: {
      customerId: customer.id,
      customerName: customer.name,
      status: "IDENTIFIED",
      metadata: {
        ...metadataRecord(session.metadata),
        customerLookup: { ...lookup, resolution: "CONFIRMED" },
      },
      lastInteractionAt: new Date(),
    },
  });
  return { customer, session: updatedSession };
}

export async function createTypebotCustomer(
  tenantId: string,
  input: {
    sessionId: string;
    name: string;
    email?: string;
    rejectedExisting?: boolean;
  },
) {
  return prisma.$transaction(
    async (tx) => {
      const session = await tx.typebotSession.findFirst({
        where: { id: input.sessionId, tenantId },
      });
      if (!session) {
        throw new BusinessError("SESSION_NOT_FOUND", "Sessão não encontrada.");
      }
      const lookup = customerLookupMetadata(session.metadata);
      if (lookup?.resolution === "CREATED" && session.customerId) {
        const customer = await tx.customer.findFirst({
          where: { id: session.customerId, tenantId },
          select: { id: true, name: true, phone: true, email: true },
        });
        if (customer) return { customer, session };
      }
      if (lookup?.status === "FOUND" && !input.rejectedExisting) {
        throw new BusinessError(
          "CUSTOMER_REQUIRED",
          "Confirme o cadastro encontrado ou informe que não é você.",
        );
      }

      const possibleMatches = await tx.customer.findMany({
        where: { tenantId },
        select: { id: true, name: true, phone: true, email: true },
      });
      const normalizedName = normalizeCustomerText(input.name);
      const nameMatches = possibleMatches.filter(
        (customer) =>
          normalizeBrazilianPhoneForComparison(customer.phone) ===
            session.phone &&
          normalizeCustomerText(customer.name) === normalizedName,
      );
      if (nameMatches.length > 1) {
        throw new BusinessError(
          "CUSTOMER_REQUIRED",
          "Não foi possível confirmar o cadastro com segurança.",
        );
      }
      const existingByName = nameMatches[0];
      if (existingByName) {
        const updatedSession = await tx.typebotSession.update({
          where: { id: session.id },
          data: {
            customerId: existingByName.id,
            customerName: existingByName.name,
            status: "IDENTIFIED",
            metadata: {
              ...metadataRecord(session.metadata),
              customerLookup: {
                ...(lookup ?? { status: "FOUND" }),
                resolution: "CONFIRMED",
                rejectedExisting: true,
              },
            },
            lastInteractionAt: new Date(),
          },
        });
        return { customer: existingByName, session: updatedSession };
      }

      const customer = await tx.customer.create({
        data: {
          tenantId,
          name: input.name,
          phone: session.phone,
          email: input.email || null,
          isActive: true,
        },
        select: { id: true, name: true, phone: true, email: true },
      });
      const updatedSession = await tx.typebotSession.update({
        where: { id: session.id },
        data: {
          customerId: customer.id,
          customerName: customer.name,
          status: "IDENTIFIED",
          metadata: {
            ...metadataRecord(session.metadata),
            customerLookup: {
              ...(lookup ?? { status: "NOT_FOUND" }),
              resolution: "CREATED",
              rejectedExisting:
                lookup?.status === "FOUND" && input.rejectedExisting,
            },
          },
          lastInteractionAt: new Date(),
        },
      });
      return { customer, session: updatedSession };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
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
  if (session.customerId !== input.customerId) {
    throw new BusinessError(
      "CUSTOMER_REQUIRED",
      "Cliente não encontrado.",
    );
  }

  const startsAt = new Date(input.startsAt);
  if (session.lastAppointmentId) {
    const existing = await prisma.appointment.findFirst({
      where: {
        id: session.lastAppointmentId,
        tenantId,
        customerId: input.customerId,
        serviceId: input.serviceId,
        startsAt,
        origin: "WHATSAPP",
      },
      include: {
        service: {
          select: {
            name: true,
            bookingMode: true,
            priceType: true,
            priceValue: true,
          },
        },
        customer: { select: { name: true } },
      },
    });
    if (existing) {
      return {
        id: existing.id,
        status: String(existing.status),
        origin: String(existing.origin),
        startsAt: existing.startsAt.toISOString(),
        endsAt: existing.endsAt.toISOString(),
        serviceName: existing.service.name,
        customerName: existing.customer.name,
        priceText:
          existing.service.priceType === "HIDDEN"
            ? null
            : formatTypebotPrice(
                existing.service.priceType,
                existing.service.priceValue?.toString() ?? null,
              ),
        message: EXTERNAL_BOOKING_MESSAGES[existing.service.bookingMode],
      };
    }
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

  const customFieldsMap: Record<string, string> = {};
  for (const item of input.customValues ?? []) {
    customFieldsMap[`custom_${item.customFieldId}`] = item.value;
  }

  let result;
  try {
    result = await prisma.$transaction(
      async (tx) => {
        const prepared = await prepareExternalAppointment(tx, {
          tenantId,
          serviceId: input.serviceId,
          startsAt,
          customFields: customFieldsMap,
        });
        const { appointment, status, origin } =
          await persistExternalAppointment(tx, {
            prepared,
            channel: "TYPEBOT",
            customer,
            customerNotes: input.customerNotes,
          });

        const eventMetadata = {
          tenantId,
          appointmentId: appointment.id,
          customerId: customer.id,
          serviceId: prepared.service.id,
          origin,
          source: "TYPEBOT",
          sessionId: session.id,
          status,
        };

        await tx.appointmentEvent.createMany({
          data: [
            {
              tenantId,
              appointmentId: appointment.id,
              actorType: "TYPEBOT",
              eventType: "WHATSAPP_BOOKING_CREATED",
              description: `Agendamento criado via Typebot/WhatsApp para ${customer.name}.`,
              metadata: eventMetadata,
            },
          ],
        });
        await tx.auditLog.create({
          data: {
            tenantId,
            actorType: "TYPEBOT",
            eventType: "TYPEBOT_APPOINTMENT_CREATED",
            description: `Agendamento Typebot criado para "${prepared.service.name}".`,
            metadata: eventMetadata,
          },
        });
        await tx.typebotSession.update({
          where: { id: session.id },
          data: {
            lastServiceId: prepared.service.id,
            lastAppointmentId: appointment.id,
            status: "APPOINTMENT_CREATED",
            lastInteractionAt: new Date(),
          },
        });

        return { appointment, prepared, origin };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  } catch (error) {
    if (error instanceof ExternalAppointmentError) {
      const businessError = new BusinessError(
        error.code,
        error.code === "VALIDATION_ERROR"
          ? "Revise os campos informados."
          : error.message,
      );
      businessError.fieldErrors = error.fieldErrors;
      throw businessError;
    }
    throw error;
  }

  const { appointment, prepared, origin } = result;
  const message = EXTERNAL_BOOKING_MESSAGES[prepared.service.bookingMode];
  const priceText =
    prepared.service.priceType === "HIDDEN"
      ? null
      : formatTypebotPrice(
          prepared.service.priceType,
          prepared.service.priceValue?.toString() ?? null,
        );

  return {
    id: appointment.id,
    status: prepared.status,
    origin,
    startsAt: prepared.startsAt.toISOString(),
    endsAt: prepared.endsAt.toISOString(),
    serviceName: prepared.service.name,
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
    where: { id: appointmentId, tenantId, origin: "WHATSAPP" },
    include: {
      service: { select: { name: true, priceType: true, priceValue: true } },
      customer: { select: { name: true } },
      customValues: {
        orderBy: { createdAt: "asc" },
        select: {
          value: true,
          customField: { select: { id: true, key: true, label: true } },
        },
      },
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
    customValues: appointment.customValues.map((item) => ({
      customFieldId: item.customField.id,
      key: item.customField.key,
      label: item.customField.label,
      value: item.value,
    })),
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

export const TYPEBOT_MESSAGES = EXTERNAL_BOOKING_MESSAGES;
