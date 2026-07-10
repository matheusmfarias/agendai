import type { Prisma } from "@/generated/prisma/client";

export function jsonOptionsToStrings(options: Prisma.JsonValue | null) {
  if (!Array.isArray(options)) return [];

  return options
    .map((option) => (typeof option === "string" ? option.trim() : ""))
    .filter(Boolean);
}

export function validateCustomFields(
  fields: {
    id: string;
    label: string;
    fieldType: string;
    isRequired: boolean;
    options: Prisma.JsonValue | null;
  }[],
  values: Record<string, string>,
) {
  const fieldErrors: Record<string, string[]> = {};
  const rows: { customFieldId: string; value: string }[] = [];

  for (const field of fields) {
    const key = `custom_${field.id}`;
    const value = values[key]?.trim() ?? "";

    if (field.isRequired && !value) {
      fieldErrors[key] = [`Informe ${field.label}.`];
      continue;
    }

    if (!value) continue;

    if (field.fieldType === "SELECT") {
      const options = jsonOptionsToStrings(field.options);
      if (!options.includes(value)) {
        fieldErrors[key] = [`Selecione uma opção válida para ${field.label}.`];
        continue;
      }
    }

    rows.push({ customFieldId: field.id, value });
  }

  if (Object.keys(fieldErrors).length) {
    return { ok: false as const, fieldErrors };
  }

  return { ok: true as const, rows };
}

export function normalizePhone(value: string) {
  return value.replace(/\D/g, "") || value.trim();
}
