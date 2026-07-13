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
});
