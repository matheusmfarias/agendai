"use server";

import { requireSuperAdmin } from "@/features/auth/permissions";
import {
  buildCustomFieldsText,
  buildServicesText,
  buildSlotsText,
  BusinessError,
  createTypebotAppointment,
  getBusinessData,
  getTypebotAppointment,
  getTypebotServiceDetail,
  getTypebotServices,
  getTypebotSlots,
  getTypebotTenant,
  identifyCustomer,
  validateTypebotTenant,
  type TypebotAppointmentResult,
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
  customer?: { id: string; name: string; phone: string; email: string | null };
  session?: { id: string; status: string };
  error?: { code: string; message: string };
  log: StepLog;
};

export async function identifySimulatorCustomer(
  tenantSlug: string,
  phone: string,
  name: string,
  email?: string,
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
    const result = await identifyCustomer(tenant.id, { phone, name, email });

    return {
      ok: true,
      customer: {
        id: result.customer.id,
        name: result.customer.name,
        phone: result.customer.phone,
        email: result.customer.email,
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
          customer: { id: result.customer.id, name: result.customer.name },
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

// ---------------------------------------------------------------------------
// Step 3 — Services
// ---------------------------------------------------------------------------

export type SimulatorServicesResult = {
  ok: boolean;
  services?: {
    number: number;
    id: string;
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
        request: `GET /api/typebot/${tenantSlug}/services`,
        response: JSON.stringify({ code: "BUSINESS_UNAVAILABLE" }),
        timestamp: now,
      },
    };
  }

  const services = await getTypebotServices(tenant.id);
  const text = buildServicesText(services);

  return {
    ok: true,
    services,
    text,
    log: {
      step: "services",
      status: "ok",
      request: `GET /api/typebot/${tenantSlug}/services`,
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

// ---------------------------------------------------------------------------
// Step 5 — Slots
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
  days?: number,
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
        request: `GET /api/typebot/${tenantSlug}/services/${serviceId}/slots`,
        response: JSON.stringify({ code: "BUSINESS_UNAVAILABLE" }),
        timestamp: now,
      },
    };
  }

  const { service, slots } = await getTypebotSlots(tenant.id, serviceId, {
    days,
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
        request: `GET /api/typebot/${tenantSlug}/services/${serviceId}/slots`,
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
        request: `GET /api/typebot/${tenantSlug}/services/${serviceId}/slots`,
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
      request: `GET /api/typebot/${tenantSlug}/services/${serviceId}/slots`,
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
