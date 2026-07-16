import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { create } = vi.hoisted(() => ({ create: vi.fn() }));

vi.mock("@/lib/prisma", () => ({
  prisma: { typebotCredential: { create } },
}));

import { decryptTypebotCredential } from "@/features/typebot/typebot-credential-crypto";
import { createTypebotCredential } from "@/features/typebot/typebot-credentials-service";

describe("Typebot credentials service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.TYPEBOT_CREDENTIAL_ENCRYPTION_KEY = Buffer.alloc(32, 11).toString("base64");
    create.mockImplementation(async ({ data }) => ({
      id: "00000000-0000-4000-8000-000000000001",
      name: data.name,
      tokenPrefix: data.tokenPrefix,
    }));
  });

  afterEach(() => {
    delete process.env.TYPEBOT_CREDENTIAL_ENCRYPTION_KEY;
    delete process.env.AUTH_SECRET;
  });

  it("persiste hash e versão cifrada recuperável da nova credencial", async () => {
    const credential = await createTypebotCredential({
      tenantId: "00000000-0000-4000-8000-000000000002",
      name: "Produção",
    });
    const data = create.mock.calls[0]?.[0].data as {
      tokenHash: string;
      tokenEncrypted: string;
    };

    expect(data.tokenHash).not.toBe(credential.token);
    expect(data.tokenEncrypted).not.toContain(credential.token);
    expect(decryptTypebotCredential(data.tokenEncrypted)).toBe(credential.token);
  });

  it("não cria credencial não recuperável quando a chave está ausente", async () => {
    delete process.env.TYPEBOT_CREDENTIAL_ENCRYPTION_KEY;

    await expect(createTypebotCredential({
      tenantId: "00000000-0000-4000-8000-000000000002",
      name: "Sem chave",
    })).rejects.toThrow("Criptografia de credenciais Typebot não configurada.");
    expect(create).not.toHaveBeenCalled();
  });

  it("gera credencial recuperável usando AUTH_SECRET quando a chave dedicada está ausente", async () => {
    delete process.env.TYPEBOT_CREDENTIAL_ENCRYPTION_KEY;
    process.env.AUTH_SECRET = "a".repeat(48);

    const credential = await createTypebotCredential({
      tenantId: "00000000-0000-4000-8000-000000000002",
      name: "Produção",
    });
    const data = create.mock.calls[0]?.[0].data as { tokenEncrypted: string };

    expect(data.tokenEncrypted.startsWith("v1a.")).toBe(true);
    expect(decryptTypebotCredential(data.tokenEncrypted)).toBe(credential.token);
  });
});
