import { describe, expect, it } from "vitest";

import { setFormDataValue } from "@/lib/form-data";

describe("setFormDataValue", () => {
  it("preserva a data de formulário no formato yyyy-MM-dd", () => {
    const formData = new FormData();
    const date = new Date("2026-07-26T12:00:00-03:00");

    setFormDataValue(formData, "expiresAt", date);

    expect(formData.get("expiresAt")).toBe("2026-07-26");
  });

  it("preserva strings de input date sem alteração", () => {
    const formData = new FormData();

    setFormDataValue(formData, "expiresAt", "2026-07-26");

    expect(formData.get("expiresAt")).toBe("2026-07-26");
  });
});
