/**
 * Provider Onboarding Checklist Service.
 *
 * Checks which onboarding items are complete and whether the provider
 * can finish onboarding (minimum: business info, 1 active service, 1 active
 * availability rule).
 *
 * Reuses subscription-policy.ts and typebot-health-service.ts where
 * appropriate, without duplicating policy rules.
 */

import { prisma } from "@/lib/prisma";
import {
  getSubscriptionPolicy,
  type SubscriptionPolicyInput,
} from "@/features/subscriptions/subscription-policy";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ChecklistItemStatus = "DONE" | "WARNING" | "BLOCKED" | "OPTIONAL";

export type OnboardingChecklistItem = {
  key: string;
  label: string;
  status: ChecklistItemStatus;
  description?: string;
  actionHref?: string;
  actionLabel?: string;
};

export type OnboardingChecklist = {
  businessInfoComplete: boolean;
  hasActiveCategory: boolean;
  hasActiveService: boolean;
  hasAvailability: boolean;
  publicLinkAllowed: boolean;
  publicBookingReady: boolean;
  typebotAllowed: boolean;
  typebotReady: boolean;
  canCompleteOnboarding: boolean;
  items: OnboardingChecklistItem[];
};

// ---------------------------------------------------------------------------
// Checklist builder
// ---------------------------------------------------------------------------

export async function getProviderOnboardingChecklist(
  tenantId: string,
): Promise<OnboardingChecklist> {
  // Load tenant with subscription and counts
  const tenant = await prisma.tenant.findFirstOrThrow({
    where: { id: tenantId },
    select: {
      name: true,
      responsibleName: true,
      email: true,
      whatsapp: true,
      segment: true,
      city: true,
      state: true,
      address: true,
      description: true,
      status: true,
      subscription: {
        select: {
          status: true,
          expiresAt: true,
          plan: {
            select: {
              publicLinkEnabled: true,
              whatsappEnabled: true,
            },
          },
        },
      },
      _count: {
        select: {
          serviceCategories: { where: { isActive: true } },
          services: { where: { isActive: true } },
          availabilityRules: { where: { isActive: true } },
          typebotCredentials: { where: { revokedAt: null } },
        },
      },
    },
  });

  // Business info check
  const businessInfoComplete = Boolean(
    tenant.name &&
      tenant.responsibleName &&
      tenant.email &&
      tenant.whatsapp &&
      tenant.segment &&
      tenant.city &&
      tenant.state,
  );

  // Active counts
  const hasActiveCategory = tenant._count.serviceCategories > 0;
  const hasActiveService = tenant._count.services > 0;
  const hasAvailability = tenant._count.availabilityRules > 0;

  // Subscription policy
  let policyInput: SubscriptionPolicyInput | null = null;
  if (tenant.subscription) {
    policyInput = {
      tenantStatus: tenant.status,
      subscription: {
        status: tenant.subscription.status,
        expiresAt: tenant.subscription.expiresAt,
        plan: {
          publicLinkEnabled: tenant.subscription.plan.publicLinkEnabled,
          whatsappEnabled: tenant.subscription.plan.whatsappEnabled,
        },
      },
    };
  } else {
    policyInput = {
      tenantStatus: tenant.status,
      subscription: null,
    };
  }
  const policy = getSubscriptionPolicy(policyInput);

  // Plan capability checks
  const publicLinkAllowed = policy.canUsePublicLink;
  const publicBookingReady =
    publicLinkAllowed && hasActiveService && hasAvailability;
  const typebotAllowed = policy.canUseTypebot;
  const typebotReady = typebotAllowed && tenant._count.typebotCredentials > 0;

  // Minimum requirements
  const canCompleteOnboarding =
    businessInfoComplete && hasActiveService && hasAvailability;

  // Build checklist items
  const items: OnboardingChecklistItem[] = [
    {
      key: "business_info",
      label: "Dados do negócio preenchidos",
      status: businessInfoComplete ? "DONE" : "BLOCKED",
      description: businessInfoComplete
        ? "Nome, responsável, WhatsApp, segmento, cidade e estado preenchidos."
        : "Preencha os dados básicos do negócio para continuar.",
      actionHref: "/app/settings",
      actionLabel: "Preencher dados",
    },
    {
      key: "active_category",
      label: "Pelo menos 1 categoria ativa",
      status: hasActiveCategory ? "DONE" : "BLOCKED",
      description: hasActiveCategory
        ? `${tenant._count.serviceCategories} categoria(s) ativa(s).`
        : "Crie ao menos uma categoria de serviço.",
      actionHref: "/app/services/categories",
      actionLabel: "Criar categoria",
    },
    {
      key: "active_service",
      label: "Pelo menos 1 serviço ativo",
      status: hasActiveService ? "DONE" : "BLOCKED",
      description: hasActiveService
        ? `${tenant._count.services} serviço(s) ativo(s).`
        : "Crie ao menos um serviço ou aplique um template de segmento.",
      actionHref: "/app/services",
      actionLabel: "Criar serviço",
    },
    {
      key: "availability",
      label: "Horários configurados",
      status: hasAvailability ? "DONE" : "BLOCKED",
      description: hasAvailability
        ? `${tenant._count.availabilityRules} regra(s) de horário ativa(s).`
        : "Configure os horários de atendimento.",
      actionHref: "/app/availability",
      actionLabel: "Configurar horários",
    },
    {
      key: "subscription_active",
      label: "Assinatura permite link público",
      status: publicLinkAllowed ? "DONE" : "BLOCKED",
      description: !tenant.subscription
        ? "Nenhuma assinatura encontrada."
        : publicLinkAllowed
          ? "Seu plano permite agendamento pelo link público."
          : policy.warningLevel === "BLOCKED"
            ? "Sua assinatura precisa estar regular para liberar o link público."
            : "Seu plano atual não inclui link público.",
    },
    {
      key: "public_booking_ready",
      label: "Link público pronto",
      status: publicBookingReady ? "DONE" : publicLinkAllowed ? "WARNING" : "BLOCKED",
      description: publicBookingReady
        ? "Seu link público está pronto para ser compartilhado."
        : !publicLinkAllowed
          ? "O link público não está disponível no seu plano atual."
          : "Complete serviços e horários para liberar o agendamento pelo link público.",
    },
    {
      key: "typebot_ready",
      label: "Canal WhatsApp/Typebot",
      status: typebotReady
        ? "DONE"
        : typebotAllowed
          ? "OPTIONAL"
          : "OPTIONAL",
      description: typebotReady
        ? "Canal WhatsApp/Typebot pronto para integração."
        : typebotAllowed
          ? "Canal WhatsApp/Typebot ainda não configurado pela plataforma."
          : "Canal WhatsApp/Typebot não disponível no seu plano atual.",
    },
  ];

  return {
    businessInfoComplete,
    hasActiveCategory,
    hasActiveService,
    hasAvailability,
    publicLinkAllowed,
    publicBookingReady,
    typebotAllowed,
    typebotReady,
    canCompleteOnboarding,
    items,
  };
}
