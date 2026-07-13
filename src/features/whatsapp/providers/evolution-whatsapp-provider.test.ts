import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { EvolutionWhatsAppProvider } from "@/features/whatsapp/providers/evolution-whatsapp-provider";
import { WhatsAppError } from "@/features/whatsapp/whatsapp-errors";
import type { WhatsAppConfig } from "@/features/whatsapp/whatsapp-config";

const config: WhatsAppConfig = {
  enabled: true, evolutionApiUrl: "http://evolution.local:8080", evolutionApiKey: "a".repeat(32),
  webhookSecret: "s".repeat(32), publicUrl: "http://agendai.local:3000", redisUrl: "redis://localhost:6380", workerConcurrency: 2,
};

describe("EvolutionWhatsAppProvider", () => {
  beforeEach(() => vi.stubGlobal("fetch", vi.fn()));
  afterEach(() => vi.unstubAllGlobals());

  it("cria instância somente na URL configurada", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ instance: { instanceName: "agendai_x", instanceId: "remote" } }), { status: 201 }));
    const result = await new EvolutionWhatsAppProvider(config).createInstance({ instanceName: "agendai_x", webhookUrl: "http://agendai.local/api/integrations/whatsapp/evolution/webhook", webhookSecret: "s".repeat(32) });
    expect(result).toMatchObject({ instanceName: "agendai_x", status: "AWAITING_QR" });
    expect(vi.mocked(fetch).mock.calls[0]?.[0].toString()).toBe("http://evolution.local:8080/instance/create");
  });

  it("lê estado, QR e envia texto", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(new Response(JSON.stringify({ instance: { state: "open", ownerJid: "5511999999999@s.whatsapp.net" } })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ base64: `data:image/png;base64,${"a".repeat(40)}` })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ key: { id: "message-1" } })));
    const provider = new EvolutionWhatsAppProvider(config);
    await expect(provider.getConnectionStatus("agendai_x")).resolves.toMatchObject({ status: "CONNECTED", phoneNumber: "5511999999999" });
    await expect(provider.getQrCode("agendai_x")).resolves.toMatchObject({ expiresInSeconds: 45 });
    await expect(provider.sendText({ instanceName: "agendai_x", recipientPhone: "5511999999999", text: "Teste" })).resolves.toEqual({ externalMessageId: "message-1" });
  });

  it.each([401, 404, 409, 429, 503])("normaliza erro HTTP %s sem expor resposta", async (status) => {
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ secret: "não vazar" }), { status }));
    await expect(new EvolutionWhatsAppProvider(config).getConnectionStatus("agendai_x")).rejects.toBeInstanceOf(WhatsAppError);
  });

  it("rejeita resposta incompatível", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ unexpected: true })));
    await expect(new EvolutionWhatsAppProvider(config).getQrCode("agendai_x")).rejects.toMatchObject({ code: "WHATSAPP_INVALID_PROVIDER_RESPONSE" });
  });
});
