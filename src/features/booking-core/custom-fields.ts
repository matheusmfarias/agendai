import type { Prisma } from "@/generated/prisma/client";

export function jsonOptionsToStrings(options: Prisma.JsonValue | null) {
  if (!Array.isArray(options)) return [];

  return options
    .map((option) => (typeof option === "string" ? option.trim() : ""))
    .filter(Boolean);
}

function isValidDateValue(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function validateCustomFieldValue(
  field: { label: string; fieldType: string; options: Prisma.JsonValue | null },
  value: string,
) {
  switch (field.fieldType) {
    case "TEXT":
    case "TEXTAREA":
      return null;
    case "NUMBER":
      return Number.isFinite(Number(value))
        ? null
        : `Informe um número válido para ${field.label}.`;
    case "DATE":
      return isValidDateValue(value)
        ? null
        : `Informe uma data válida para ${field.label}.`;
    case "BOOLEAN":
      return value === "Sim" || value === "Não"
        ? null
        : `Informe Sim ou Não para ${field.label}.`;
    case "SELECT":
      return jsonOptionsToStrings(field.options).includes(value)
        ? null
        : `Selecione uma opção válida para ${field.label}.`;
    default:
      return `Campo ${field.label} possui um tipo inválido.`;
  }
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
  const allowedKeys = new Set(fields.map((field) => `custom_${field.id}`));

  for (const key of Object.keys(values)) {
    if (key.startsWith("custom_") && !allowedKeys.has(key)) {
      fieldErrors[key] = ["Campo personalizado inválido."];
    }
  }

  for (const field of fields) {
    const key = `custom_${field.id}`;
    const value = values[key]?.trim() ?? "";

    if (field.isRequired && !value) {
      fieldErrors[key] = [`Informe ${field.label}.`];
      continue;
    }

    if (!value) continue;

    const validationError = validateCustomFieldValue(field, value);
    if (validationError) {
      fieldErrors[key] = [validationError];
      continue;
    }

    rows.push({ customFieldId: field.id, value });
  }

  if (Object.keys(fieldErrors).length) {
    return { ok: false as const, fieldErrors };
  }

  return { ok: true as const, rows };
}
