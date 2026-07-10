/**
 * Segment Template Service.
 *
 * Idempotent application of segment templates to a tenant.
 * Only creates items that don't already exist — never overwrites or duplicates.
 */

import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

import type {
  SegmentTemplateApplicationResult,
  SegmentTemplateDefinition,
  SegmentTemplateKey,
  SegmentTemplatePreview,
} from "@/features/segment-templates/segment-template-types";
import {
  getTemplateByKey,
  SEGMENT_TEMPLATES,
} from "@/features/segment-templates/segment-template-definitions";

// ---------------------------------------------------------------------------
// List available templates
// ---------------------------------------------------------------------------

export function listSegmentTemplates(): SegmentTemplateDefinition[] {
  return Object.values(SEGMENT_TEMPLATES);
}

export function getSegmentTemplate(
  key: SegmentTemplateKey,
): SegmentTemplateDefinition | undefined {
  return getTemplateByKey(key);
}

// ---------------------------------------------------------------------------
// Preview
// ---------------------------------------------------------------------------

export async function previewSegmentTemplate(
  tenantId: string,
  templateKey: SegmentTemplateKey,
  includeAvailability: boolean,
): Promise<SegmentTemplatePreview | { ok: false; error: string }> {
  const template = getTemplateByKey(templateKey);
  if (!template) {
    return { ok: false, error: `Template "${templateKey}" não encontrado.` };
  }

  // Fetch existing data for the tenant
  const [existingCategories, existingRules] = await Promise.all([
    prisma.serviceCategory.findMany({
      where: { tenantId },
      select: { id: true, name: true, services: { select: { id: true, name: true, customFields: { select: { id: true, label: true, key: true } } } } },
    }),
    prisma.availabilityRule.findMany({
      where: { tenantId, isActive: true },
      select: { id: true, weekday: true, startTime: true, endTime: true },
    }),
  ]);

  const categories = template.categories.map((tc) => {
    const existingCat = existingCategories.find((c) => c.name === tc.name);
    const services = tc.services.map((ts) => {
      const existingSvc = existingCat?.services.find((s) => s.name === ts.name);
      const customFields = (ts.customFields ?? []).map((tcf) => ({
        label: tcf.label,
        key: tcf.key,
        exists: existingSvc
          ? existingSvc.customFields.some((cf) => cf.key === tcf.key)
          : false,
      }));
      return {
        name: ts.name,
        exists: Boolean(existingSvc),
        customFields,
      };
    });
    return { name: tc.name, exists: Boolean(existingCat), services };
  });

  const availabilityRules = includeAvailability && template.availability
    ? template.availability.map((rule) => {
        const exists = existingRules.some(
          (r) =>
            r.weekday === rule.weekday &&
            timeStringEqual(r.startTime, rule.startTime) &&
            timeStringEqual(r.endTime, rule.endTime),
        );
        return {
          weekday: rule.weekday,
          startTime: rule.startTime,
          endTime: rule.endTime,
          exists,
        };
      })
    : [];

  return {
    template,
    categories,
    availabilityRules,
  };
}

// ---------------------------------------------------------------------------
// Apply template (idempotent)
// ---------------------------------------------------------------------------

export async function applySegmentTemplate(
  tenantId: string,
  templateKey: SegmentTemplateKey,
  includeAvailability: boolean,
): Promise<SegmentTemplateApplicationResult> {
  const template = getTemplateByKey(templateKey);
  if (!template) {
    return {
      ok: false,
      error: `Template "${templateKey}" não encontrado.`,
      created: { categories: 0, services: 0, customFields: 0, availabilityRules: 0 },
      skipped: { categories: 0, services: 0, customFields: 0, availabilityRules: 0 },
    };
  }

  const result: SegmentTemplateApplicationResult = {
    ok: true,
    created: { categories: 0, services: 0, customFields: 0, availabilityRules: 0 },
    skipped: { categories: 0, services: 0, customFields: 0, availabilityRules: 0 },
  };

  // Fetch existing data
  const [existingCategories, existingRules] = await Promise.all([
    prisma.serviceCategory.findMany({
      where: { tenantId },
      select: {
        id: true,
        name: true,
        services: {
          select: { id: true, name: true, customFields: { select: { key: true } } },
        },
      },
    }),
    prisma.availabilityRule.findMany({
      where: { tenantId },
      select: { weekday: true, startTime: true, endTime: true },
    }),
  ]);

  // Apply each category
  for (const tc of template.categories) {
    let categoryId: string;

    const existingCat = existingCategories.find((c) => c.name === tc.name);
    if (existingCat) {
      categoryId = existingCat.id;
      result.skipped.categories++;
    } else {
      const created = await prisma.serviceCategory.create({
        data: {
          tenantId,
          name: tc.name,
          description: tc.description ?? null,
          position: tc.order,
          isActive: true,
        },
      });
      categoryId = created.id;
      result.created.categories++;
    }

    // Apply services within this category
    for (const ts of tc.services) {
      let serviceId: string;
      const existingSvc = existingCat?.services.find((s) => s.name === ts.name);

      if (existingSvc) {
        serviceId = existingSvc.id;
        result.skipped.services++;
      } else {
        const created = await prisma.service.create({
          data: {
            tenantId,
            categoryId,
            name: ts.name,
            description: ts.description ?? null,
            durationMinutes: ts.durationMinutes,
            priceType: ts.priceType,
            priceValue: ts.priceValue ?? null,
            bookingMode: ts.bookingMode,
            requiresManualConfirmation: ts.requiresManualConfirmation ?? false,
            internalNotes: ts.internalNotes ?? null,
            position: ts.order,
            isActive: true,
          },
        });
        serviceId = created.id;
        result.created.services++;
      }

      // Apply custom fields within this service
      if (ts.customFields && ts.customFields.length > 0) {
        const existingFields = existingSvc?.customFields ?? [];
        for (const tcf of ts.customFields) {
          const exists = existingFields.some((f) => f.key === tcf.key);
          if (exists) {
            result.skipped.customFields++;
          } else {
            await prisma.customField.create({
              data: {
                tenantId,
                serviceId,
                label: tcf.label,
                key: tcf.key,
                fieldType: tcf.fieldType,
                isRequired: tcf.isRequired,
                options: tcf.options ?? ([] as unknown as Prisma.InputJsonValue),
                position: tcf.order,
                isActive: true,
              },
            });
            result.created.customFields++;
          }
        }
      }
    }
  }

  // Apply availability rules (only if requested)
  if (includeAvailability && template.availability) {
    for (const rule of template.availability) {
      const exists = existingRules.some(
        (r) =>
          r.weekday === rule.weekday &&
          timeStringEqual(r.startTime, rule.startTime) &&
          timeStringEqual(r.endTime, rule.endTime),
      );

      if (exists) {
        result.skipped.availabilityRules++;
      } else {
        // Convert "HH:mm" strings to Date objects for the Time column
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
        result.created.availabilityRules++;
      }
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Parse "HH:mm" into a Date set to 1970-01-01 for PostgreSQL Time column.
 */
function timeStringToDate(time: string): Date {
  const [h, m] = time.split(":").map(Number);
  // Use UTC 1970-01-01 to avoid timezone shifts
  return new Date(Date.UTC(1970, 0, 1, h, m, 0));
}

/**
 * Compare a DB Time (returned as Date) against a "HH:mm" string.
 */
function timeStringEqual(dbTime: Date, timeString: string): boolean {
  const [h, m] = timeString.split(":").map(Number);
  // DB times may come back with different date parts; compare only hh:mm
  const dbH = dbTime.getUTCHours();
  const dbM = dbTime.getUTCMinutes();
  return dbH === h && dbM === m;
}
