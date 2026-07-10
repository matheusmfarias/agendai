import { z } from "zod";

import { typebotError, typebotOk, TYPEFBOT_ERROR_CODES, assertNoMojibake } from "@/features/typebot/typebot-responses";
import { BusinessError, createTypebotAppointment, getTypebotTenant, validateTypebotTenant } from "@/features/typebot/typebot-service";
import { canCreateTypebotAppointmentForTenant } from "@/features/booking-core/tenant-policy";
import { getSubscriptionPolicy } from "@/features/subscriptions/subscription-policy";
import { guardTypebotEndpoint } from "@/features/typebot/typebot-rate-limit";
import { createAuditLog } from "@/features/audit/audit-log-service";

const bodySchema = z.object({
  sessionId: z.string().uuid("Session inválida."),
  customerId: z.string().uuid("Cliente inválido."),
  serviceId: z.string().uuid("Serviço inválido."),
  startsAt: z.string().refine(
    (value) => !Number.isNaN(new Date(value).getTime()),
    { message: "Horário inválido." },
  ),
  customValues: z
    .array(
      z.object({
        customFieldId: z.string().uuid(),
        value: z.string(),
      }),
    )
    .optional()
    .default([]),
  customerNotes: z.string().trim().max(2000).optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ tenantSlug: string }> },
) {
  const { tenantSlug } = await params;
  const guard = await guardTypebotEndpoint(request, tenantSlug, "appointments");
  if (!guard.ok) return guard.response;

  const tenant = await getTypebotTenant(tenantSlug);

  if (!tenant || !validateTypebotTenant(tenant)) {
    return typebotError(
      TYPEFBOT_ERROR_CODES.BUSINESS_UNAVAILABLE,
      "Este atendimento está temporariamente indisponível.",
    );
  }

  // Subscription enforcement: block Typebot appointment creation at 8+ days overdue
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

    void createAuditLog({
      tenantId: tenant.id,
      actorType: "TYPEBOT",
      eventType: "SUBSCRIPTION_ENFORCEMENT_BLOCKED_TYPEBOT_APPOINTMENT",
      description: "Tentativa de agendamento Typebot bloqueada por política de assinatura.",
      metadata: {
        tenantId: tenant.id,
        channel: "WHATSAPP",
        policyStatus: policy.status,
        daysOverdue: policy.daysOverdue,
      },
    });

    return typebotError(
      TYPEFBOT_ERROR_CODES.BUSINESS_UNAVAILABLE,
      "Este atendimento está temporariamente indisponível.",
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return typebotError(TYPEFBOT_ERROR_CODES.VALIDATION_ERROR, "Payload inválido.");
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return typebotError(
      TYPEFBOT_ERROR_CODES.VALIDATION_ERROR,
      "Revise os campos informados.",
    );
  }

  // Defensive: reject mojibake from wrong client encoding
  const badField = assertNoMojibake({
    customerNotes: parsed.data.customerNotes ?? null,
    ...Object.fromEntries(
      (parsed.data.customValues ?? []).map((cv) => [
        `custom_${cv.customFieldId}`,
        cv.value,
      ]),
    ),
  });
  if (badField) {
    return typebotError(
      TYPEFBOT_ERROR_CODES.VALIDATION_ERROR,
      "O texto enviado contém caracteres inválidos. Envie os dados em UTF-8.",
    );
  }

  try {
    const appointment = await createTypebotAppointment(
      tenant.id,
      parsed.data,
    );

    return typebotOk(
      {
        appointment: {
          id: appointment.id,
          status: appointment.status,
          origin: appointment.origin,
          startsAt: appointment.startsAt,
          endsAt: appointment.endsAt,
        },
        message: appointment.message,
      },
      201,
    );
  } catch (error) {
    if (error instanceof BusinessError) {
      await createAuditLog({
        tenantId: tenant.id,
        actorType: "TYPEBOT",
        eventType: "TYPEBOT_APPOINTMENT_REJECTED",
        description: "Tentativa de agendamento Typebot rejeitada.",
        metadata: {
          tenantId: tenant.id,
          reason: error.code,
          serviceId: parsed.data.serviceId,
        },
      });

      return typebotError(error.code, error.message);
    }
    throw error;
  }
}
