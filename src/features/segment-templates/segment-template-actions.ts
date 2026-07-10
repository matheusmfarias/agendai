"use server";

import { revalidatePath } from "next/cache";

import { createAuditLog } from "@/features/audit/audit-log-service";
import { requireSuperAdmin } from "@/features/auth/permissions";
import { getRequestIpAddress } from "@/features/auth/request-context";
import {
  applySegmentTemplate,
  listSegmentTemplates,
  previewSegmentTemplate,
} from "@/features/segment-templates/segment-template-service";
import type {
  SegmentTemplateApplicationResult,
  SegmentTemplateDefinition,
  SegmentTemplateKey,
  SegmentTemplatePreview,
} from "@/features/segment-templates/segment-template-types";

// ---------------------------------------------------------------------------
// List available templates
// ---------------------------------------------------------------------------

export async function loadSegmentTemplates(): Promise<
  SegmentTemplateDefinition[]
> {
  await requireSuperAdmin();
  return listSegmentTemplates();
}

// ---------------------------------------------------------------------------
// Preview template application
// ---------------------------------------------------------------------------

export type PreviewResult =
  | { ok: true; preview: SegmentTemplatePreview }
  | { ok: false; error: string };

export async function previewSegmentTemplateAction(
  tenantId: string,
  templateKey: SegmentTemplateKey,
  includeAvailability: boolean,
): Promise<PreviewResult> {
  await requireSuperAdmin();
  const result = await previewSegmentTemplate(
    tenantId,
    templateKey,
    includeAvailability,
  );
  if ("ok" in result && !result.ok) {
    return { ok: false, error: result.error };
  }
  return { ok: true, preview: result as SegmentTemplatePreview };
}

// ---------------------------------------------------------------------------
// Apply template
// ---------------------------------------------------------------------------

export type ApplyResult =
  | { ok: true; result: SegmentTemplateApplicationResult }
  | { ok: false; error: string };

export async function applySegmentTemplateAction(
  tenantId: string,
  tenantName: string,
  templateKey: SegmentTemplateKey,
  includeAvailability: boolean,
): Promise<ApplyResult> {
  const user = await requireSuperAdmin();

  const result = await applySegmentTemplate(
    tenantId,
    templateKey,
    includeAvailability,
  );

  if (!result.ok) {
    return { ok: false, error: result.error ?? "Erro ao aplicar template." };
  }

  // Audit log
  await createAuditLog({
    tenantId,
    actorType: "SUPER_ADMIN",
    actorId: user.id,
    eventType: "SEGMENT_TEMPLATE_APPLIED",
    description: `Template de segmento "${templateKey}" aplicado ao prestador ${tenantName}.`,
    metadata: {
      tenantId,
      templateKey,
      templateName: templateKey,
      createdCategories: result.created.categories,
      createdServices: result.created.services,
      createdCustomFields: result.created.customFields,
      createdAvailabilityRules: result.created.availabilityRules,
      skippedCategories: result.skipped.categories,
      skippedServices: result.skipped.services,
      skippedCustomFields: result.skipped.customFields,
      skippedAvailabilityRules: result.skipped.availabilityRules,
    },
    ipAddress: await getRequestIpAddress(),
  });

  revalidatePath(`/admin/tenants/${tenantId}/templates`);
  revalidatePath(`/admin/tenants/${tenantId}`);

  return { ok: true, result };
}
