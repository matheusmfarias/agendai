/**
 * Typebot integration health check per tenant.
 *
 * Queries the database to determine whether a tenant is ready for Typebot usage.
 * Returns status (READY / WARNING / BLOCKED) with individual check details.
 *
 * Never exposes tokens, hashes, or secrets.
 */

import { prisma } from "@/lib/prisma";
import { getSubscriptionPolicy } from "@/features/subscriptions/subscription-policy";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type HealthStatus = "READY" | "WARNING" | "BLOCKED";

export type CheckItem = {
  label: string;
  ok: boolean;
  detail?: string;
};

export type TypebotHealth = {
  status: HealthStatus;
  checks: CheckItem[];
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function getTypebotHealth(
  tenantId: string,
): Promise<TypebotHealth> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      status: true,
      subscription: {
        select: {
          status: true,
          expiresAt: true,
          plan: { select: { whatsappEnabled: true, publicLinkEnabled: true } },
        },
      },
    },
  });

  if (!tenant) {
    return {
      status: "BLOCKED",
      checks: [{ label: "Prestador existe", ok: false, detail: "Não encontrado." }],
    };
  }

  // Run all checks in parallel where possible
  const [
    activeCredentialCount,
    activeCategoryCount,
    activeServiceCount,
    availabilityRuleCount,
    lastCredentialUse,
    lastWhatsappAppointment,
    lastTypebotSession,
  ] = await Promise.all([
    prisma.typebotCredential.count({
      where: { tenantId, isActive: true, revokedAt: null },
    }),
    prisma.serviceCategory.count({
      where: { tenantId, isActive: true },
    }),
    prisma.service.count({
      where: { tenantId, isActive: true, category: { isActive: true } },
    }),
    prisma.availabilityRule.count({
      where: { tenantId, isActive: true },
    }),
    prisma.typebotCredential.findFirst({
      where: { tenantId, isActive: true, revokedAt: null, lastUsedAt: { not: null } },
      orderBy: { lastUsedAt: "desc" },
      select: { lastUsedAt: true },
    }),
    prisma.appointment.findFirst({
      where: { tenantId, origin: "WHATSAPP" },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }),
    prisma.typebotSession.findFirst({
      where: { tenantId },
      orderBy: { lastInteractionAt: "desc" },
      select: { lastInteractionAt: true },
    }),
  ]);

  const tenantActive = tenant.status === "ACTIVE";
  const subscriptionOk =
    tenant.subscription
    && (tenant.subscription.status === "ACTIVE" || tenant.subscription.status === "TRIAL");
  const whatsappEnabled = tenant.subscription?.plan.whatsappEnabled === true;
  const hasCredentials = activeCredentialCount > 0;
  const hasCategories = activeCategoryCount > 0;
  const hasServices = activeServiceCount > 0;
  const hasAvailability = availabilityRuleCount > 0;

  // Subscription policy
  const policy = getSubscriptionPolicy({
    tenantStatus: tenant.status,
    subscription: tenant.subscription
      ? {
          status: tenant.subscription.status,
          expiresAt: tenant.subscription.expiresAt,
          plan: {
            publicLinkEnabled: tenant.subscription.plan.publicLinkEnabled,
            whatsappEnabled: tenant.subscription.plan.whatsappEnabled,
          },
        }
      : null,
  });

  const checks: CheckItem[] = [
    {
      label: "Prestador ativo",
      ok: tenantActive,
      detail: tenantActive ? undefined : `Status: ${tenant.status}`,
    },
    {
      label: "Assinatura ativa",
      ok: Boolean(subscriptionOk),
      detail: subscriptionOk
        ? undefined
        : `Status: ${tenant.subscription?.status ?? "sem assinatura"}`,
    },
    {
      label: "WhatsApp habilitado no plano",
      ok: whatsappEnabled,
      detail: whatsappEnabled
        ? undefined
        : "Plano não inclui WhatsApp",
    },
    {
      label: "Credencial Typebot ativa",
      ok: hasCredentials,
      detail: hasCredentials
        ? `${activeCredentialCount} credencial(is) ativa(s)`
        : "Nenhuma credencial ativa",
    },
    {
      label: "Categorias ativas",
      ok: hasCategories,
      detail: hasCategories
        ? `${activeCategoryCount} categoria(s)`
        : "Nenhuma categoria ativa",
    },
    {
      label: "Serviços ativos",
      ok: hasServices,
      detail: hasServices
        ? `${activeServiceCount} serviço(s)`
        : "Nenhum serviço ativo",
    },
    {
      label: "Disponibilidade configurada",
      ok: hasAvailability,
      detail: hasAvailability
        ? `${availabilityRuleCount} regra(s)`
        : "Nenhuma regra de horário",
    },
    {
      label: "Política de assinatura",
      ok: policy.status === "ACTIVE" || policy.status === "EXPIRING_SOON" || policy.status === "OVERDUE_WARNING",
      detail: `Status: ${policy.status}${policy.daysOverdue > 0 ? ` (${policy.daysOverdue} dias vencido)` : ""}`,
    },
    {
      label: "Link público permitido",
      ok: policy.canUsePublicLink,
      detail: policy.canUsePublicLink ? "Sim" : "Bloqueado pela política",
    },
    {
      label: "Criação via link público",
      ok: policy.canCreatePublicAppointment,
      detail: policy.canCreatePublicAppointment ? "Permitida" : "Bloqueada pela política",
    },
    {
      label: "Typebot permitido",
      ok: policy.canUseTypebot,
      detail: policy.canUseTypebot ? "Sim" : "Bloqueado pela política",
    },
    {
      label: "Criação via Typebot",
      ok: policy.canCreateTypebotAppointment,
      detail: policy.canCreateTypebotAppointment ? "Permitida" : "Bloqueada pela política",
    },
    {
      label: "Criação manual permitida",
      ok: policy.canCreateManualAppointment,
      detail: policy.canCreateManualAppointment ? "Permitida" : "Bloqueada pela política",
    },
  ];

  // ---------------------------------------------------------------------------
  // Determine status
  // ---------------------------------------------------------------------------

  const blockers = !tenantActive || !subscriptionOk || !whatsappEnabled
    || !hasCredentials || !hasServices || !hasAvailability
    || !policy.canCreateTypebotAppointment;

  if (blockers) {
    const status = "BLOCKED" as const;
    return { status, checks };
  }

  const hasRecentActivity =
    lastCredentialUse
    || lastWhatsappAppointment
    || lastTypebotSession;

  const hasLowServices = activeServiceCount <= 1;

  const policyWarning =
    policy.status === "EXPIRING_SOON" || policy.status === "OVERDUE_WARNING";

  if (!hasRecentActivity || hasLowServices || policyWarning) {
    // Add informational checks for WARNING state
    checks.push({
      label: "Último uso de credencial",
      ok: Boolean(lastCredentialUse),
      detail: lastCredentialUse
        ? lastCredentialUse.lastUsedAt!.toISOString()
        : "Nunca utilizada",
    });
    checks.push({
      label: "Último agendamento WhatsApp",
      ok: Boolean(lastWhatsappAppointment),
      detail: lastWhatsappAppointment
        ? lastWhatsappAppointment.createdAt.toISOString()
        : "Nenhum agendamento",
    });
    checks.push({
      label: "Última sessão Typebot",
      ok: Boolean(lastTypebotSession),
      detail: lastTypebotSession
        ? lastTypebotSession.lastInteractionAt.toISOString()
        : "Nenhuma sessão",
    });

    const status = "WARNING" as const;
    return { status, checks };
  }

  // All good — add activity info for READY
  checks.push({
    label: "Último uso de credencial",
    ok: true,
    detail: lastCredentialUse?.lastUsedAt?.toISOString() ?? "—",
  });
  checks.push({
    label: "Último agendamento WhatsApp",
    ok: true,
    detail: lastWhatsappAppointment
      ? lastWhatsappAppointment.createdAt.toISOString()
      : "—",
  });
  checks.push({
    label: "Última sessão Typebot",
    ok: true,
    detail: lastTypebotSession
      ? lastTypebotSession.lastInteractionAt.toISOString()
      : "—",
  });

  return { status: "READY", checks };
}
