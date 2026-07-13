import { beforeEach, describe, expect, it, vi } from "vitest";

const { getCurrentUser, getCurrentTenantContext } = vi.hoisted(() => ({ getCurrentUser: vi.fn(), getCurrentTenantContext: vi.fn() }));
vi.mock("@/features/auth/permissions", () => ({ getCurrentUser, getCurrentTenantContext }));

import { getWhatsAppManagerContext } from "@/features/whatsapp/whatsapp-route-auth";

describe("WhatsApp manager authorization", () => {
  beforeEach(() => { vi.clearAllMocks(); getCurrentUser.mockResolvedValue({ id: crypto.randomUUID() }); });
  it.each(["OWNER", "ADMIN"])("permite %s do tenant ativo", async (role) => {
    getCurrentTenantContext.mockResolvedValue({ tenantId: crypto.randomUUID(), role });
    await expect(getWhatsAppManagerContext()).resolves.not.toBeNull();
  });
  it.each(["OPERATOR", null])("nega papel/contexto %s", async (role) => {
    getCurrentTenantContext.mockResolvedValue(role ? { tenantId: crypto.randomUUID(), role } : null);
    await expect(getWhatsAppManagerContext()).resolves.toBeNull();
  });
});
