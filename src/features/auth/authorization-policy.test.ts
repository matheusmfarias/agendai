import { describe, expect, it } from "vitest";

import {
  canAccessAdmin,
  hasTenantRole,
} from "@/features/auth/authorization-policy";

describe("authorization policy", () => {
  it("permite acesso administrativo somente ao Super Admin", () => {
    expect(canAccessAdmin("SUPER_ADMIN")).toBe(true);
    expect(canAccessAdmin("USER")).toBe(false);
  });

  it("respeita os papéis permitidos no tenant", () => {
    expect(hasTenantRole("OWNER", ["OWNER", "ADMIN"])).toBe(true);
    expect(hasTenantRole("OPERATOR", ["OWNER", "ADMIN"])).toBe(false);
  });
});
