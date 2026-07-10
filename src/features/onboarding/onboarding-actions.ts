"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/features/audit/audit-log-service";
import { requireProviderManager } from "@/features/auth/permissions";
import { getRequestIpAddress } from "@/features/auth/request-context";
import {
  applySegmentTemplate,
} from "@/features/segment-templates/segment-template-service";
import { DEFAULT_AVAILABILITY } from "@/features/segment-templates/segment-template-definitions";
import type { SegmentTemplateKey } from "@/features/segment-templates/segment-template-types";
import {
  getProviderOnboardingChecklist,
} from "@/features/onboarding/onboarding-checklist-service";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getOnboardingActor() {
  const context = await requireProviderManager();
  return {
    actorId: context.user.id,
    tenantId: context.tenantId,
    ipAddress: await getRequestIpAddress(),
  };
}

/**
 * Parse "HH:mm" into a Date set to 1970-01-01 UTC for PostgreSQL Time column.
 */
function timeStringToDate(time: string): Date {
  const [h, m] = time.split(":").map(Number);
  return new Date(Date.UTC(1970, 0, 1, h, m, 0));
}

/**
 * Check if a DB Time matches a "HH:mm" string.
 */
function timeStringEqual(dbTime: Date, timeString: string): boolean {
  const [h, m] = timeString.split(":").map(Number);
  return dbTime.getUTCHours() === h && dbTime.getUTCMinutes() === m;
}

// ---------------------------------------------------------------------------
// Start onboarding
// ---------------------------------------------------------------------------

export async function startOnboarding() {
  const { actorId, tenantId, ipAddress } = await getOnboardingActor();

  const tenant = await prisma.tenant.findFirst({
    where: { id: tenantId },
    select: { onboardingStatus: true },
  });
  if (!tenant || tenant.onboardingStatus !== "NOT_STARTED") {
    redirect("/app/dashboard");
  }

  await prisma.tenant.update({
    where: { id: tenantId },
    data: { onboardingStatus: "IN_PROGRESS" },
  });

  await createAuditLog({
    tenantId,
    actorType: "TENANT_USER",
    actorId,
    eventType: "PROVIDER_ONBOARDING_STARTED",
    description: "Prestador iniciou o wizard de onboarding.",
    metadata: { tenantId, userId: actorId },
    ipAddress,
  });

  revalidatePath("/app");
  redirect("/app/onboarding");
}

// ---------------------------------------------------------------------------
// Update business info from onboarding
// ---------------------------------------------------------------------------

export async function updateBusinessInfoFromOnboarding(formData: FormData) {
  const { actorId, tenantId, ipAddress } = await getOnboardingActor();

  const name = String(formData.get("name") ?? "").trim();
  const responsibleName = String(formData.get("responsibleName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const whatsapp = String(formData.get("whatsapp") ?? "").trim();
  const segment = String(formData.get("segment") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const state = String(formData.get("state") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();

  // Basic validation
  if (!name || name.length < 2) {
    return { ok: false, error: "Informe o nome do negócio." };
  }
  if (!responsibleName || responsibleName.length < 2) {
    return { ok: false, error: "Informe o nome do responsável." };
  }
  if (!email || !email.includes("@")) {
    return { ok: false, error: "Informe um e-mail válido." };
  }
  if (!whatsapp || whatsapp.length < 8) {
    return { ok: false, error: "Informe um WhatsApp válido." };
  }

  await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      name,
      responsibleName,
      email,
      whatsapp,
      segment: segment || undefined,
      city,
      state,
      address: address || null,
      description: description || null,
    },
  });

  await createAuditLog({
    tenantId,
    actorType: "TENANT_USER",
    actorId,
    eventType: "TENANT_SETTINGS_UPDATED",
    description: "Dados do negócio atualizados pelo wizard de onboarding.",
    metadata: { tenantId, fields: ["name", "responsibleName", "email", "whatsapp", "segment", "city", "state"] },
    ipAddress,
  });

  revalidatePath("/app/onboarding");
  revalidatePath("/app");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Apply segment template from onboarding
// ---------------------------------------------------------------------------

export type OnboardingTemplateResult = {
  ok: boolean;
  error?: string;
  created?: {
    categories: number;
    services: number;
    customFields: number;
    availabilityRules: number;
  };
};

export async function applySegmentTemplateFromOnboarding(
  templateKey: string,
): Promise<OnboardingTemplateResult> {
  const { actorId, tenantId, ipAddress } = await getOnboardingActor();

  // Validate template key
  const validKeys = [
    "mechanic",
    "barbershop",
    "manicure",
    "beauty",
    "technical_assistance",
    "clinic_simple",
  ];
  if (!validKeys.includes(templateKey)) {
    return { ok: false, error: "Template inválido." };
  }

  const result = await applySegmentTemplate(
    tenantId,
    templateKey as SegmentTemplateKey,
    false, // never include availability during template step — that's a separate step
  );

  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  await createAuditLog({
    tenantId,
    actorType: "TENANT_USER",
    actorId,
    eventType: "PROVIDER_ONBOARDING_TEMPLATE_APPLIED",
    description: `Prestador aplicou template "${templateKey}" durante o onboarding.`,
    metadata: {
      tenantId,
      userId: actorId,
      templateKey,
      createdCategories: result.created.categories,
      createdServices: result.created.services,
      createdCustomFields: result.created.customFields,
      skippedCategories: result.skipped.categories,
      skippedServices: result.skipped.services,
      skippedCustomFields: result.skipped.customFields,
    },
    ipAddress,
  });

  revalidatePath("/app/onboarding");
  revalidatePath("/app");
  return {
    ok: true,
    created: {
      categories: result.created.categories,
      services: result.created.services,
      customFields: result.created.customFields,
      availabilityRules: 0,
    },
  };
}

// ---------------------------------------------------------------------------
// Apply suggested availability from onboarding
// ---------------------------------------------------------------------------

export type OnboardingAvailabilityResult = {
  ok: boolean;
  error?: string;
  created?: number;
  skipped?: number;
};

export async function applySuggestedAvailabilityFromOnboarding(): Promise<OnboardingAvailabilityResult> {
  const { actorId, tenantId, ipAddress } = await getOnboardingActor();

  // Fetch existing rules
  const existingRules = await prisma.availabilityRule.findMany({
    where: { tenantId },
    select: { weekday: true, startTime: true, endTime: true },
  });

  let created = 0;
  let skipped = 0;

  for (const rule of DEFAULT_AVAILABILITY) {
    const exists = existingRules.some(
      (r) =>
        r.weekday === rule.weekday &&
        timeStringEqual(r.startTime, rule.startTime) &&
        timeStringEqual(r.endTime, rule.endTime),
    );

    if (exists) {
      skipped++;
    } else {
      await prisma.availabilityRule.create({
        data: {
          tenantId,
          weekday: rule.weekday,
          startTime: timeStringToDate(rule.startTime),
          endTime: timeStringToDate(rule.endTime),
          slotIntervalMinutes: rule.slotIntervalMinutes,
          isActive: true,
        },
      });
      created++;
    }
  }

  await createAuditLog({
    tenantId,
    actorType: "TENANT_USER",
    actorId,
    eventType: "PROVIDER_ONBOARDING_AVAILABILITY_APPLIED",
    description: `Prestador aplicou horários sugeridos durante o onboarding (${created} criados, ${skipped} ignorados).`,
    metadata: {
      tenantId,
      userId: actorId,
      createdAvailabilityRules: created,
      skippedAvailabilityRules: skipped,
    },
    ipAddress,
  });

  revalidatePath("/app/onboarding");
  revalidatePath("/app");
  return { ok: true, created, skipped };
}

// ---------------------------------------------------------------------------
// Complete onboarding
// ---------------------------------------------------------------------------

export async function completeOnboarding() {
  const { actorId, tenantId, ipAddress } = await getOnboardingActor();

  const checklist = await getProviderOnboardingChecklist(tenantId);

  if (!checklist.canCompleteOnboarding) {
    return {
      ok: false,
      error:
        "É necessário preencher os dados do negócio, ter pelo menos 1 serviço ativo e 1 horário configurado para concluir.",
    };
  }

  await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      onboardingStatus: "COMPLETED",
      onboardingCompletedAt: new Date(),
    },
  });

  await createAuditLog({
    tenantId,
    actorType: "TENANT_USER",
    actorId,
    eventType: "PROVIDER_ONBOARDING_COMPLETED",
    description: "Prestador concluiu o onboarding.",
    metadata: { tenantId, userId: actorId },
    ipAddress,
  });

  revalidatePath("/app");
  redirect("/app/dashboard");
}

// ---------------------------------------------------------------------------
// Skip onboarding
// ---------------------------------------------------------------------------

export async function skipOnboarding() {
  const { actorId, tenantId, ipAddress } = await getOnboardingActor();

  await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      onboardingStatus: "SKIPPED",
      onboardingSkippedAt: new Date(),
    },
  });

  await createAuditLog({
    tenantId,
    actorType: "TENANT_USER",
    actorId,
    eventType: "PROVIDER_ONBOARDING_SKIPPED",
    description: "Prestador pulou o onboarding.",
    metadata: { tenantId, userId: actorId },
    ipAddress,
  });

  revalidatePath("/app");
  redirect("/app/dashboard");
}

// ---------------------------------------------------------------------------
// Resume onboarding
// ---------------------------------------------------------------------------

export async function resumeOnboarding() {
  const { actorId, tenantId, ipAddress } = await getOnboardingActor();

  await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      onboardingStatus: "IN_PROGRESS",
      onboardingSkippedAt: null,
    },
  });

  await createAuditLog({
    tenantId,
    actorType: "TENANT_USER",
    actorId,
    eventType: "PROVIDER_ONBOARDING_RESUMED",
    description: "Prestador retomou o onboarding.",
    metadata: { tenantId, userId: actorId },
    ipAddress,
  });

  revalidatePath("/app");
  redirect("/app/onboarding");
}
