import { describe, expect, it } from "vitest";

import { createPlanSchema } from "@/features/plans/plan-schemas";

describe("createPlanSchema", () => {
  it("aceita valores monetários não negativos", () => {
    const result = createPlanSchema.safeParse({
      name: "Profissional",
      description: "",
      monthlyPrice: "99.90",
      annualPrice: "999.00",
      whatsappEnabled: true,
      publicLinkEnabled: true,
      isActive: true,
    });
    expect(result.success).toBe(true);
  });

  it("rejeita valor negativo", () => {
    const result = createPlanSchema.safeParse({
      name: "Inválido",
      description: "",
      monthlyPrice: "-1",
      annualPrice: "10",
      whatsappEnabled: false,
      publicLinkEnabled: false,
      isActive: true,
    });
    expect(result.success).toBe(false);
  });
});
