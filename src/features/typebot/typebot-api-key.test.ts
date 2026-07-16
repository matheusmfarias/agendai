import { beforeEach, describe, expect, it, vi } from "vitest";

const { credentialCount, credentialFindFirst, credentialUpdate } = vi.hoisted(() => ({
  credentialCount: vi.fn(),
  credentialFindFirst: vi.fn(),
  credentialUpdate: vi.fn().mockResolvedValue({}),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    typebotCredential: {
      findFirst: credentialFindFirst,
      update: credentialUpdate,
      count: credentialCount,
    },
  },
}));

import { validateTypebotAuth } from "@/features/typebot/typebot-api-key";
import { hashToken } from "@/features/typebot/typebot-token-utils";

describe("Typebot per-tenant authentication", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  it("accepts an active credential only for its own tenant", async () => {
    credentialFindFirst.mockResolvedValue({
      id: "credential-a",
      tenant: { slug: "tenant-a" },
    });
    const token = "agz_tb_tenant_a_secret";

    await expect(validateTypebotAuth(new Request("http://local", {
      headers: { "x-typebot-api-key": token },
    }), "tenant-a")).resolves.toEqual({
      ok: true,
      credentialId: "credential-a",
    });
    expect(credentialFindFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        tokenHash: hashToken(token),
        isActive: true,
        revokedAt: null,
      },
    }));
  });

  it("rejects a valid credential when the URL names another tenant", async () => {
    credentialFindFirst.mockResolvedValue({
      id: "credential-a",
      tenant: { slug: "tenant-a" },
    });

    await expect(validateTypebotAuth(new Request("http://local", {
      headers: { "x-typebot-api-key": "agz_tb_tenant_a_secret" },
    }), "tenant-b")).resolves.toEqual({ ok: false, code: "UNAUTHORIZED" });
    expect(credentialUpdate).not.toHaveBeenCalled();
  });

  it("rejects revoked or inactive credentials through the persistence filter", async () => {
    credentialFindFirst.mockResolvedValue(null);

    await expect(validateTypebotAuth(new Request("http://local", {
      headers: { "x-typebot-api-key": "agz_tb_revoked_secret" },
    }), "tenant-a")).resolves.toEqual({ ok: false, code: "UNAUTHORIZED" });
    expect(credentialFindFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ isActive: true, revokedAt: null }),
    }));
    expect(credentialUpdate).not.toHaveBeenCalled();
  });

  it("never accepts the global fallback in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("TYPEBOT_API_KEY", "global-secret");

    await expect(validateTypebotAuth(new Request("http://local", {
      headers: { "x-typebot-api-key": "global-secret" },
    }), "tenant-a")).resolves.toEqual({ ok: false, code: "UNAUTHORIZED" });
    expect(credentialCount).not.toHaveBeenCalled();
  });

  it("allows the development fallback only without a tenant credential", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("TYPEBOT_API_KEY", "global-secret");
    credentialCount.mockResolvedValueOnce(0).mockResolvedValueOnce(1);
    const request = () => new Request("http://local", {
      headers: { "x-typebot-api-key": "global-secret" },
    });

    await expect(validateTypebotAuth(request(), "tenant-a")).resolves.toEqual({
      ok: true,
      credentialId: "global",
    });
    await expect(validateTypebotAuth(request(), "tenant-a")).resolves.toEqual({
      ok: false,
      code: "UNAUTHORIZED",
    });
  });
});
