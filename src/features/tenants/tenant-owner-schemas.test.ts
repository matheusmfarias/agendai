import { describe, expect, it } from "vitest";

import {
  provisionTenantOwnerSchema,
  resetTenantOwnerPasswordSchema,
} from "@/features/tenants/tenant-schemas";

describe("tenant owner schemas", () => {
  it("normaliza o e-mail ao criar acesso para tenant existente", () => {
    const result = provisionTenantOwnerSchema.parse({
      tenantId: "1f4b5ef8-fba5-4dc4-b331-3a5717e544c5",
      ownerName: "Responsável",
      ownerEmail: " DONO@EXAMPLE.COM ",
      initialPassword: "senha-segura",
      confirmInitialPassword: "senha-segura",
    });

    expect(result.ownerEmail).toBe("dono@example.com");
  });

  it("exige confirmação igual na redefinição de senha", () => {
    const result = resetTenantOwnerPasswordSchema.safeParse({
      tenantId: "1f4b5ef8-fba5-4dc4-b331-3a5717e544c5",
      userId: "2f4b5ef8-fba5-4dc4-b331-3a5717e544c5",
      newPassword: "nova-senha",
      confirmNewPassword: "outra-senha",
    });

    expect(result.success).toBe(false);
  });
});
