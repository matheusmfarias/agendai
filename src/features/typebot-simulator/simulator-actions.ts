"use server";

import { requireSuperAdmin } from "@/features/auth/permissions";
import {
  buildCustomFieldsText,
  buildServicesText,
  buildSlotsText,
  BusinessError,
  confirmTypebotCustomer,
  createTypebotCustomer,
  createTypebotAppointment,
  getBusinessData,
  getTypebotCategories,
  getTypebotAvailableDates,
  getTypebotAvailablePeriods,
  getTypebotAppointment,
  getTypebotCustomFields,
  getTypebotServiceDetail,
  getTypebotServices,
  getTypebotSlots,
  getTypebotTenant,
  lookupTypebotCustomer,
  validateTypebotTenant,
  type TypebotAppointmentResult,
  type TypebotAvailableDateItem,
  type TypebotAvailablePeriodItem,
  type TypebotAvailabilityPeriod,
  type TypebotCategoryItem,
  type TypebotCustomField,
  type TypebotServiceDetail,
} from "@/features/typebot/typebot-service";
import { canCreateTypebotAppointmentForTenant } from "@/features/booking-core/tenant-policy";
import {
  getSubscriptionPolicy,
  type SubscriptionPolicyInput,
} from "@/features/subscriptions/subscription-policy";
import { prisma } from "@/lib/prisma";
import type { StepLog } from "@/features/typebot-simulator/simulator-types";

// ---------------------------------------------------------------------------
// Tenant lookup
// ---------------------------------------------------------------------------

export type TenantOption = {
  id: string;
  name: string;
  slug: string;
  status: string;
  planName: string;
  subscriptionStatus: string;
  whatsappEnabled: boolean;
  policyStatus: string;
  daysOverdue: number;
  canCreateTypebot: boolean;
};

export async function loadTenants(): Promise<TenantOption[]> {
  await requireSuperAdmin();

  const tenants = await prisma.tenant.findMany({
    orderBy: { name: "asc" },
    include: {
      subscription: {
        include: {
          plan: { select: { name: true, whatsappEnabled: true, publicLinkEnabled: true } },
        },
      },
    },
  });

  return tenants.map((t) => {
    const policy = getSubscriptionPolicy({
      tenantStatus: t.status,
      subscription: t.subscription
        ? {
            status: t.subscription.status,
            expiresAt: t.subscription.expiresAt,
            plan: {
              publicLinkEnabled: t.subscription.plan.publicLinkEnabled ?? false,
              whatsappEnabled: t.subscription.plan.whatsappEnabled ?? false,
            },
          }
        : null,
    });

    return {
      id: t.id,
      name: t.name,
      slug: t.slug,
      status: t.status,
      planName: t.subscription?.plan.name ?? "Sem plano",
      subscriptionStatus: t.subscription?.status ?? "NONE",
      whatsappEnabled: t.subscription?.plan.whatsappEnabled ?? false,
      policyStatus: policy.status,
      daysOverdue: policy.daysOverdue,
      canCreateTypebot: policy.canCreateTypebotAppointment,
    };
  });
}

// ---------------------------------------------------------------------------
// Step 1 — Business
// ---------------------------------------------------------------------------

export type SimulatorBusinessResult = {
  ok: boolean;
  business?: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    city: string;
    state: string;
    whatsapp: string;
    whatsappUrl: string | null;
  };
  error?: { code: string; message: string };
  log: StepLog;
};

export async function fetchBusiness(
  tenantSlug: string,
): Promise<SimulatorBusinessResult> {
  await requireSuperAdmin();

  const now = new Date().toISOString();
  const tenant = await getTypebotTenant(tenantSlug);

  if (!tenant || !validateTypebotTenant(tenant)) {
    return {
      ok: false,
      error: {
        code: "BUSINESS_UNAVAILABLE",
        message: "Este atendimento está temporariamente indisponível.",
      },
      log: {
        step: "business",
        status: "error",
        request: `GET /api/typebot/${tenantSlug}/business`,
        response: JSON.stringify({ code: "BUSINESS_UNAVAILABLE" }),
        timestamp: now,
      },
    };
  }

  const business = getBusinessData(tenant);

  return {
    ok: true,
    business,
    log: {
      step: "business",
      status: "ok",
      request: `GET /api/typebot/${tenantSlug}/business`,
      response: JSON.stringify({ ok: true, tenant: { ...business, id: "..." } }),
      timestamp: now,
    },
  };
}

// ---------------------------------------------------------------------------
// Step 2 — Identify customer
// ---------------------------------------------------------------------------

export type SimulatorIdentifyResult = {
  ok: boolean;
  lookup?: {
    status: "FOUND" | "NOT_FOUND" | "AMBIGUOUS";
    customerName: string | null;
  };
  customer?: { id: string; name: string; phone: string; email: string | null };
  session?: { id: string; status: string };
  error?: { code: string; message: string };
  log: StepLog;
};

export async function lookupSimulatorCustomer(
  tenantSlug: string,
  phone: string,
): Promise<SimulatorIdentifyResult> {
  await requireSuperAdmin();

  const now = new Date().toISOString();
  const tenant = await getTypebotTenant(tenantSlug);

  if (!tenant || !validateTypebotTenant(tenant)) {
    return {
      ok: false,
      error: {
        code: "BUSINESS_UNAVAILABLE",
        message: "Este atendimento está temporariamente indisponível.",
      },
      log: {
        step: "identify",
        status: "error",
        request: `POST /api/typebot/${tenantSlug}/customers/identify`,
        response: JSON.stringify({ code: "BUSINESS_UNAVAILABLE" }),
        timestamp: now,
      },
    };
  }

  try {
    const result = await lookupTypebotCustomer(tenant.id, phone);

    return {
      ok: true,
      lookup: {
        status: result.status,
        customerName: result.customer?.name ?? null,
      },
      session: {
        id: result.session.id,
        status: result.session.status,
      },
      log: {
        step: "identify",
        status: "ok",
        request: `POST /api/typebot/${tenantSlug}/customers/identify`,
        response: JSON.stringify({
          ok: true,
          lookup: { status: result.status },
          session: { id: result.session.id },
        }),
        timestamp: now,
      },
    };
  } catch (error) {
    if (error instanceof BusinessError) {
      return {
        ok: false,
        error: { code: error.code, message: error.message },
        log: {
          step: "identify",
          status: "error",
          request: `POST /api/typebot/${tenantSlug}/customers/identify`,
          response: JSON.stringify({ code: error.code }),
          timestamp: now,
        },
      };
    }
    throw error;
  }
}

export async function resolveSimulatorCustomer(
  tenantSlug: string,
  input:
    | { action: "CONFIRM"; sessionId: string }
    | {
        action: "CREATE";
        sessionId: string;
        name: string;
        email?: string;
        rejectedExisting?: boolean;
      },
): Promise<SimulatorIdentifyResult> {
  await requireSuperAdmin();
  const now = new Date().toISOString();
  const tenant = await getTypebotTenant(tenantSlug);
  if (!tenant || !validateTypebotTenant(tenant)) {
    return {
      ok: false,
      error: {
        code: "BUSINESS_UNAVAILABLE",
        message: "Este atendimento está temporariamente indisponível.",
      },
      log: {
        step: "identify",
        status: "error",
        request: `POST /api/typebot/${tenantSlug}/customers/identify`,
        response: JSON.stringify({ code: "BUSINESS_UNAVAILABLE" }),
        timestamp: now,
      },
    };
  }

  try {
    const result = input.action === "CONFIRM"
      ? await confirmTypebotCustomer(tenant.id, input.sessionId)
      : await createTypebotCustomer(tenant.id, input);
    return {
      ok: true,
      customer: result.customer,
      session: { id: result.session.id, status: result.session.status },
      log: {
        step: "identify",
        status: "ok",
        request: `POST /api/typebot/${tenantSlug}/customers/identify`,
        response: JSON.stringify({
          ok: true,
          action: input.action,
          customer: { id: result.customer.id },
        }),
        timestamp: now,
      },
    };
  } catch (error) {
    if (error instanceof BusinessError) {
      return {
        ok: false,
        error: { code: error.code, message: error.message },
        log: {
          step: "identify",
          status: "error",
          request: `POST /api/typebot/${tenantSlug}/customers/identify`,
          response: JSON.stringify({ code: error.code }),
          timestamp: now,
        },
      };
    }
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Step 3 — Categories
// ---------------------------------------------------------------------------

export type SimulatorCategoriesResult = {
  ok: boolean;
  categories?: TypebotCategoryItem[];
  error?: { code: string; message: string };
  log: StepLog;
};

export async function fetchCategories(
  tenantSlug: string,
): Promise<SimulatorCategoriesResult> {
  await requireSuperAdmin();
  const now = new Date().toISOString();
  const tenant = await getTypebotTenant(tenantSlug);
  if (!tenant || !validateTypebotTenant(tenant)) {
    return {
      ok: false,
      error: {
        code: "BUSINESS_UNAVAILABLE",
        message: "Este atendimento está temporariamente indisponível.",
      },
      log: {
        step: "categories",
        status: "error",
        request: `GET /api/typebot/${tenantSlug}/categories`,
        response: JSON.stringify({ code: "BUSINESS_UNAVAILABLE" }),
        timestamp: now,
      },
    };
  }

  const categories = await getTypebotCategories(tenant.id);
  return {
    ok: true,
    categories,
    log: {
      step: "categories",
      status: "ok",
      request: `GET /api/typebot/${tenantSlug}/categories`,
      response: JSON.stringify({ ok: true, count: categories.length }),
      timestamp: now,
    },
  };
}

// ---------------------------------------------------------------------------
// Step 4 — Services
// ---------------------------------------------------------------------------

export type SimulatorServicesResult = {
  ok: boolean;
  services?: {
    number: number;
    id: string;
    categoryId: string;
    category: string;
    name: string;
    description: string | null;
    durationMinutes: number;
    priceText: string | null;
    bookingMode: string;
  }[];
  text?: string;
  error?: { code: string; message: string };
  log: StepLog;
};

export async function fetchServices(
  tenantSlug: string,
  categoryId: string,
): Promise<SimulatorServicesResult> {
  await requireSuperAdmin();

  const now = new Date().toISOString();
  const tenant = await getTypebotTenant(tenantSlug);

  if (!tenant || !validateTypebotTenant(tenant)) {
    return {
      ok: false,
      error: {
        code: "BUSINESS_UNAVAILABLE",
        message: "Este atendimento está temporariamente indisponível.",
      },
      log: {
        step: "services",
        status: "error",
        request: `GET /api/typebot/${tenantSlug}/services?categoryId=${categoryId}`,
        response: JSON.stringify({ code: "BUSINESS_UNAVAILABLE" }),
        timestamp: now,
      },
    };
  }

  const services = await getTypebotServices(tenant.id, categoryId);
  const text = buildServicesText(services);

  return {
    ok: true,
    services,
    text,
    log: {
      step: "services",
      status: "ok",
      request: `GET /api/typebot/${tenantSlug}/services?categoryId=${categoryId}`,
      response: JSON.stringify({ ok: true, count: services.length }),
      timestamp: now,
    },
  };
}

// ---------------------------------------------------------------------------
// Step 4 — Service detail
// ---------------------------------------------------------------------------

export type SimulatorServiceDetailResult = {
  ok: boolean;
  service?: TypebotServiceDetail;
  customFieldsText?: string;
  error?: { code: string; message: string };
  log: StepLog;
};

export async function fetchServiceDetail(
  tenantSlug: string,
  serviceId: string,
): Promise<SimulatorServiceDetailResult> {
  await requireSuperAdmin();

  const now = new Date().toISOString();
  const tenant = await getTypebotTenant(tenantSlug);

  if (!tenant || !validateTypebotTenant(tenant)) {
    return {
      ok: false,
      error: {
        code: "BUSINESS_UNAVAILABLE",
        message: "Este atendimento está temporariamente indisponível.",
      },
      log: {
        step: "service-detail",
        status: "error",
        request: `GET /api/typebot/${tenantSlug}/services/${serviceId}`,
        response: JSON.stringify({ code: "BUSINESS_UNAVAILABLE" }),
        timestamp: now,
      },
    };
  }

  const detail = await getTypebotServiceDetail(tenant.id, serviceId);

  if (!detail) {
    return {
      ok: false,
      error: {
        code: "SERVICE_NOT_FOUND",
        message: "Esse serviço não está disponível no momento.",
      },
      log: {
        step: "service-detail",
        status: "error",
        request: `GET /api/typebot/${tenantSlug}/services/${serviceId}`,
        response: JSON.stringify({ code: "SERVICE_NOT_FOUND" }),
        timestamp: now,
      },
    };
  }

  return {
    ok: true,
    service: detail,
    customFieldsText: buildCustomFieldsText(detail.customFields),
    log: {
      step: "service-detail",
      status: "ok",
      request: `GET /api/typebot/${tenantSlug}/services/${serviceId}`,
      response: JSON.stringify({
        ok: true,
        fields: detail.customFields.length,
      }),
      timestamp: now,
    },
  };
}

export async function fetchCustomFields(
  tenantSlug: string,
  serviceId: string,
): Promise<{
  ok: boolean;
  fields?: TypebotCustomField[];
  error?: { code: string; message: string };
  log: StepLog;
}> {
  await requireSuperAdmin();
  const now = new Date().toISOString();
  const tenant = await getTypebotTenant(tenantSlug);
  const fields = tenant && validateTypebotTenant(tenant)
    ? await getTypebotCustomFields(tenant.id, serviceId)
    : null;

  if (!fields) {
    return {
      ok: false,
      error: {
        code: tenant ? "SERVICE_NOT_FOUND" : "BUSINESS_UNAVAILABLE",
        message: "Não foi possível carregar as perguntas deste serviço.",
      },
      log: {
        step: "custom-fields",
        status: "error",
        request: `GET /api/typebot/${tenantSlug}/services/${serviceId}/custom-fields`,
        response: JSON.stringify({ ok: false }),
        timestamp: now,
      },
    };
  }

  return {
    ok: true,
    fields,
    log: {
      step: "custom-fields",
      status: "ok",
      request: `GET /api/typebot/${tenantSlug}/services/${serviceId}/custom-fields`,
      response: JSON.stringify({ ok: true, fields: fields.length }),
      timestamp: now,
    },
  };
}

// ---------------------------------------------------------------------------
// Step 5 — Available dates
// ---------------------------------------------------------------------------

export type SimulatorAvailableDatesResult = {
  ok: boolean;
  dates?: TypebotAvailableDateItem[];
  nextStartDate?: string | null;
  error?: { code: string; message: string };
  log: StepLog;
};

export async function fetchAvailableDates(
  tenantSlug: string,
  serviceId: string,
  startDate?: string,
): Promise<SimulatorAvailableDatesResult> {
  await requireSuperAdmin();

  const now = new Date().toISOString();
  const request = `GET /api/typebot/${tenantSlug}/services/${serviceId}/available-dates${startDate ? `?startDate=${startDate}&days=14` : "?days=14"}`;
  const tenant = await getTypebotTenant(tenantSlug);
  if (!tenant || !validateTypebotTenant(tenant)) {
    return {
      ok: false,
      error: {
        code: "BUSINESS_UNAVAILABLE",
        message: "Este atendimento está temporariamente indisponível.",
      },
      log: {
        step: "dates",
        status: "error",
        request,
        response: JSON.stringify({ code: "BUSINESS_UNAVAILABLE" }),
        timestamp: now,
      },
    };
  }

  const result = await getTypebotAvailableDates(tenant.id, serviceId, {
    startDate,
    days: 14,
  });
  if (!result.service) {
    return {
      ok: false,
      error: {
        code: "SERVICE_NOT_FOUND",
        message: "Esse serviço não está disponível no momento.",
      },
      log: {
        step: "dates",
        status: "error",
        request,
        response: JSON.stringify({ code: "SERVICE_NOT_FOUND" }),
        timestamp: now,
      },
    };
  }

  return {
    ok: true,
    dates: result.dates,
    nextStartDate: result.nextStartDate,
    log: {
      step: "dates",
      status: "ok",
      request,
      response: JSON.stringify({
        ok: true,
        dates: result.dates.length,
        nextStartDate: result.nextStartDate,
      }),
      timestamp: now,
    },
  };
}

// ---------------------------------------------------------------------------
// Step 6 — Available periods
// ---------------------------------------------------------------------------

export type SimulatorAvailablePeriodsResult = {
  ok: boolean;
  periods?: TypebotAvailablePeriodItem[];
  error?: { code: string; message: string };
  log: StepLog;
};

export async function fetchAvailablePeriods(
  tenantSlug: string,
  serviceId: string,
  date: string,
): Promise<SimulatorAvailablePeriodsResult> {
  await requireSuperAdmin();
  const now = new Date().toISOString();
  const request = `GET /api/typebot/${tenantSlug}/services/${serviceId}/available-periods?date=${date}`;
  const tenant = await getTypebotTenant(tenantSlug);
  if (!tenant || !validateTypebotTenant(tenant)) {
    return {
      ok: false,
      error: {
        code: "BUSINESS_UNAVAILABLE",
        message: "Este atendimento está temporariamente indisponível.",
      },
      log: {
        step: "periods",
        status: "error",
        request,
        response: JSON.stringify({ code: "BUSINESS_UNAVAILABLE" }),
        timestamp: now,
      },
    };
  }

  const result = await getTypebotAvailablePeriods(tenant.id, serviceId, date);
  if (!result.service) {
    return {
      ok: false,
      error: {
        code: "SERVICE_NOT_FOUND",
        message: "Esse serviço não está disponível no momento.",
      },
      log: {
        step: "periods",
        status: "error",
        request,
        response: JSON.stringify({ code: "SERVICE_NOT_FOUND" }),
        timestamp: now,
      },
    };
  }

  return {
    ok: true,
    periods: result.periods,
    log: {
      step: "periods",
      status: "ok",
      request,
      response: JSON.stringify({ ok: true, count: result.periods.length }),
      timestamp: now,
    },
  };
}

// ---------------------------------------------------------------------------
// Step 7 — Slots
// ---------------------------------------------------------------------------

export type SimulatorSlotsResult = {
  ok: boolean;
  slots?: {
    number: number;
    startsAt: string;
    endsAt: string;
    label: string;
  }[];
  text?: string;
  error?: { code: string; message: string };
  log: StepLog;
};

export async function fetchSlots(
  tenantSlug: string,
  serviceId: string,
  date: string,
  period: TypebotAvailabilityPeriod,
): Promise<SimulatorSlotsResult> {
  await requireSuperAdmin();

  const now = new Date().toISOString();
  const tenant = await getTypebotTenant(tenantSlug);

  if (!tenant || !validateTypebotTenant(tenant)) {
    return {
      ok: false,
      error: {
        code: "BUSINESS_UNAVAILABLE",
        message: "Este atendimento está temporariamente indisponível.",
      },
      log: {
        step: "slots",
        status: "error",
        request: `GET /api/typebot/${tenantSlug}/services/${serviceId}/slots?date=${date}&days=1&period=${period}`,
        response: JSON.stringify({ code: "BUSINESS_UNAVAILABLE" }),
        timestamp: now,
      },
    };
  }

  const { service, slots } = await getTypebotSlots(tenant.id, serviceId, {
    date,
    days: 1,
    period,
  });

  if (!service) {
    return {
      ok: false,
      error: {
        code: "SERVICE_NOT_FOUND",
        message: "Esse serviço não está disponível no momento.",
      },
      log: {
        step: "slots",
        status: "error",
        request: `GET /api/typebot/${tenantSlug}/services/${serviceId}/slots?date=${date}&days=1&period=${period}`,
        response: JSON.stringify({ code: "SERVICE_NOT_FOUND" }),
        timestamp: now,
      },
    };
  }

  if (!slots.length) {
    return {
      ok: false,
      error: {
        code: "NO_SLOTS_AVAILABLE",
        message: "Nenhum horário disponível para este serviço nos próximos dias.",
      },
      log: {
        step: "slots",
        status: "error",
        request: `GET /api/typebot/${tenantSlug}/services/${serviceId}/slots?date=${date}&days=1&period=${period}`,
        response: JSON.stringify({ code: "NO_SLOTS_AVAILABLE" }),
        timestamp: now,
      },
    };
  }

  return {
    ok: true,
    slots,
    text: buildSlotsText(slots),
    log: {
      step: "slots",
      status: "ok",
      request: `GET /api/typebot/${tenantSlug}/services/${serviceId}/slots?date=${date}&days=1&period=${period}`,
      response: JSON.stringify({ ok: true, count: slots.length }),
      timestamp: now,
    },
  };
}

// ---------------------------------------------------------------------------
// Step 6 — Create appointment
// ---------------------------------------------------------------------------

export type SimulatorCreateResult = {
  ok: boolean;
  appointment?: TypebotAppointmentResult;
  error?: { code: string; message: string };
  log: StepLog;
};

export async function createSimulatorAppointment(
  tenantSlug: string,
  sessionId: string,
  customerId: string,
  serviceId: string,
  startsAt: string,
  customValues?: { customFieldId: string; value: string }[],
  customerNotes?: string,
): Promise<SimulatorCreateResult> {
  await requireSuperAdmin();

  const now = new Date().toISOString();
  const tenant = await getTypebotTenant(tenantSlug);
  // Capture data before type guard so we can use it even after narrowing
  const policyInput: SubscriptionPolicyInput | null = tenant
    ? {
        tenantStatus: tenant.status,
        subscription: tenant.subscription
          ? {
              status: tenant.subscription.status,
              expiresAt: tenant.subscription.expiresAt,
              plan: {
                publicLinkEnabled: tenant.subscription.plan.publicLinkEnabled ?? false,
                whatsappEnabled: tenant.subscription.plan.whatsappEnabled ?? false,
              },
            }
          : null,
      }
    : null;

  if (!tenant || !validateTypebotTenant(tenant)) {
    const policy = policyInput ? getSubscriptionPolicy(policyInput) : null;
    const adminMessage = policy
      ? `[Admin] Bloqueado — política: ${policy.status} (${policy.daysOverdue} dias vencido). Tipo de bloqueio: acesso Typebot.`
      : "Este atendimento está temporariamente indisponível.";

    return {
      ok: false,
      error: {
        code: "BUSINESS_UNAVAILABLE",
        message: adminMessage,
      },
      log: {
        step: "appointment",
        status: "error",
        request: `POST /api/typebot/${tenantSlug}/appointments`,
        response: JSON.stringify({
          code: "BUSINESS_UNAVAILABLE",
          policyStatus: policy?.status,
          daysOverdue: policy?.daysOverdue,
        }),
        timestamp: now,
      },
    };
  }

  // Subscription enforcement: block creation at 8+ days overdue
  if (!canCreateTypebotAppointmentForTenant(tenant)) {
    const policy = getSubscriptionPolicy({
      tenantStatus: tenant.status,
      subscription: tenant.subscription
        ? {
            status: tenant.subscription.status,
            expiresAt: tenant.subscription.expiresAt,
            plan: {
              publicLinkEnabled: tenant.subscription.plan.publicLinkEnabled,
              whatsappEnabled: tenant.subscription.plan.whatsappEnabled ?? false,
            },
          }
        : null,
    });

    return {
      ok: false,
      error: {
        code: "BUSINESS_UNAVAILABLE",
        message: `[Admin] Bloqueado por política de assinatura: ${policy.status} (${policy.daysOverdue} dias vencido). Criação de agendamento Typebot bloqueada.`,
      },
      log: {
        step: "appointment",
        status: "error",
        request: `POST /api/typebot/${tenantSlug}/appointments`,
        response: JSON.stringify({
          code: "BUSINESS_UNAVAILABLE",
          policyStatus: policy.status,
          daysOverdue: policy.daysOverdue,
        }),
        timestamp: now,
      },
    };
  }

  try {
    const appointment = await createTypebotAppointment(tenant.id, {
      sessionId,
      customerId,
      serviceId,
      startsAt,
      customValues: customValues ?? [],
      customerNotes: customerNotes ?? "Simulação via painel admin",
    });

    return {
      ok: true,
      appointment,
      log: {
        step: "appointment",
        status: "ok",
        request: `POST /api/typebot/${tenantSlug}/appointments`,
        response: JSON.stringify({
          ok: true,
          appointment: {
            id: appointment.id,
            status: appointment.status,
            origin: appointment.origin,
          },
        }),
        timestamp: now,
      },
    };
  } catch (error) {
    if (error instanceof BusinessError) {
      return {
        ok: false,
        error: { code: error.code, message: error.message },
        log: {
          step: "appointment",
          status: "error",
          request: `POST /api/typebot/${tenantSlug}/appointments`,
          response: JSON.stringify({ code: error.code }),
          timestamp: now,
        },
      };
    }
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Query appointment
// ---------------------------------------------------------------------------

export type SimulatorQueryResult = {
  ok: boolean;
  appointment?: {
    id: string;
    status: string;
    origin: string;
    serviceName: string;
    customerName: string;
    startsAt: string;
    endsAt: string;
    priceText: string | null;
  };
  log: StepLog;
};

export async function querySimulatorAppointment(
  tenantSlug: string,
  appointmentId: string,
): Promise<SimulatorQueryResult> {
  await requireSuperAdmin();

  const now = new Date().toISOString();
  const tenant = await getTypebotTenant(tenantSlug);

  if (!tenant || !validateTypebotTenant(tenant)) {
    return {
      ok: false,
      log: {
        step: "query",
        status: "error",
        request: `GET /api/typebot/${tenantSlug}/appointments/${appointmentId}`,
        response: JSON.stringify({ code: "BUSINESS_UNAVAILABLE" }),
        timestamp: now,
      },
    };
  }

  const appointment = await getTypebotAppointment(tenant.id, appointmentId);

  return {
    ok: !!appointment,
    appointment: appointment ?? undefined,
    log: {
      step: "query",
      status: appointment ? "ok" : "error",
      request: `GET /api/typebot/${tenantSlug}/appointments/${appointmentId}`,
      response: appointment
        ? JSON.stringify({ ok: true, appointment: { id: appointment.id } })
        : JSON.stringify({ code: "APPOINTMENT_NOT_FOUND" }),
      timestamp: now,
    },
  };
}
