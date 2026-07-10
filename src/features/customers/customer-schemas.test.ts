import { describe, expect, it } from "vitest";

import { createCustomerSchema } from "@/features/customers/customer-schemas";

describe("customer schemas", () => {
  it("normaliza telefone e aceita e-mail vazio", () => {
    const result = createCustomerSchema.parse({
      name: "Maria",
      phone: "+55 (11) 99999-9999",
      email: "",
      notes: "",
      isActive: "true",
    });

    expect(result.phone).toBe("11999999999");
    expect(result.email).toBeNull();
  });

  it("rejeita e-mail inválido", () => {
    expect(
      createCustomerSchema.safeParse({
        name: "Maria",
        phone: "5511999999999",
        email: "invalido",
        notes: "",
        isActive: "true",
      }).success,
    ).toBe(false);
  });

  it("rejeita telefone sem DDD", () => {
    expect(
      createCustomerSchema.safeParse({
        name: "Maria",
        phone: "99999-9999",
        email: "",
        notes: "",
        isActive: "true",
      }).success,
    ).toBe(false);
  });
});
