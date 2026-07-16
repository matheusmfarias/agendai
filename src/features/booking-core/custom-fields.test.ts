import { describe, expect, it } from "vitest";

import { validateCustomFields } from "@/features/booking-core/custom-fields";

describe("validateCustomFields fail-closed contract", () => {
  it("rejects an unknown custom_* key instead of silently ignoring it", () => {
    const result = validateCustomFields(
      [
        {
          id: "field-a",
          label: "Campo A",
          fieldType: "TEXT",
          isRequired: false,
          options: null,
        },
      ],
      { "custom_field-b": "tenant B" },
    );

    expect(result).toEqual({
      ok: false,
      fieldErrors: {
        "custom_field-b": ["Campo personalizado inválido."],
      },
    });
  });

  it("still ignores non-custom transport keys", () => {
    expect(validateCustomFields([], { sessionId: "safe" })).toEqual({
      ok: true,
      rows: [],
    });
  });

  it.each([
    ["NUMBER", "dez", "Informe um número válido"],
    ["DATE", "2026-02-30", "Informe uma data válida"],
    ["BOOLEAN", "Talvez", "Informe Sim ou Não"],
  ])("rejects invalid %s values", (fieldType, value, message) => {
    const result = validateCustomFields(
      [
        {
          id: "field-a",
          label: "Pergunta",
          fieldType,
          isRequired: false,
          options: null,
        },
      ],
      { "custom_field-a": value },
    );

    expect(result).toEqual({
      ok: false,
      fieldErrors: {
        "custom_field-a": [expect.stringContaining(message)],
      },
    });
  });

  it("accepts all values represented by the public form", () => {
    const fields = [
      { id: "text", label: "Texto", fieldType: "TEXT", isRequired: true, options: null },
      { id: "long", label: "Texto longo", fieldType: "TEXTAREA", isRequired: true, options: null },
      { id: "number", label: "Número", fieldType: "NUMBER", isRequired: true, options: null },
      { id: "date", label: "Data", fieldType: "DATE", isRequired: true, options: null },
      { id: "boolean", label: "Confirmação", fieldType: "BOOLEAN", isRequired: true, options: null },
      { id: "select", label: "Opção", fieldType: "SELECT", isRequired: true, options: ["A", "B"] },
    ];

    expect(
      validateCustomFields(fields, {
        custom_text: "Curto",
        custom_long: "Texto longo",
        custom_number: "10.5",
        custom_date: "2026-07-16",
        custom_boolean: "Não",
        custom_select: "B",
      }),
    ).toEqual({
      ok: true,
      rows: [
        { customFieldId: "text", value: "Curto" },
        { customFieldId: "long", value: "Texto longo" },
        { customFieldId: "number", value: "10.5" },
        { customFieldId: "date", value: "2026-07-16" },
        { customFieldId: "boolean", value: "Não" },
        { customFieldId: "select", value: "B" },
      ],
    });
  });
});
