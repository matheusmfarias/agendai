import { beforeEach, describe, expect, it, vi } from "vitest";

const { findMany } = vi.hoisted(() => ({ findMany: vi.fn() }));

vi.mock("@/lib/prisma", () => ({
  prisma: { whatsAppConnection: { findMany } },
}));
vi.mock("@/features/whatsapp/whatsapp-config", () => ({
  getWhatsAppConfig: () => ({
    enabled: true,
    publicUrl: "https://agenda.example",
    webhookSecret: "s".repeat(32),
  }),
}));

import { synchronizeWhatsAppConversationWebhooks } from "@/workers/whatsapp-conversation-webhook-sync";

describe("WhatsApp conversation webhook sync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findMany.mockResolvedValue([
      { instanceName: "agendai_a" },
      { instanceName: "agendai_b" },
    ]);
  });

  it("configura mensagens recebidas também nas instâncias existentes", async () => {
    const configureWebhook = vi.fn().mockResolvedValue(undefined);

    await expect(
      synchronizeWhatsAppConversationWebhooks({ configureWebhook } as never),
    ).resolves.toBe(2);

    expect(findMany).toHaveBeenCalledWith({
      where: { enabled: true, provider: "EVOLUTION" },
      select: { instanceName: true },
    });
    expect(configureWebhook).toHaveBeenCalledWith({
      instanceName: "agendai_a",
      webhookUrl: "https://agenda.example/api/integrations/whatsapp/evolution/webhook",
      webhookSecret: "s".repeat(32),
    });
  });
});
