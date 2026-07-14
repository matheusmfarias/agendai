import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { EvolutionWhatsAppProvider } from "@/features/whatsapp/providers/evolution-whatsapp-provider";
import type { WhatsAppConfig } from "@/features/whatsapp/whatsapp-config";

const config: WhatsAppConfig = {
  enabled: true, evolutionApiUrl: "http://evolution.local:8080", evolutionApiKey: "a".repeat(32),
  webhookSecret: "s".repeat(32), publicUrl: "http://agendai.local:3000", redisUrl: "redis://localhost:6380", workerConcurrency: 2,
};

describe("EvolutionWhatsAppProvider", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  const sendText = () =>
    new EvolutionWhatsAppProvider(config).sendText({
      instanceName: "agendai_x",
      recipientPhone: "5511999999999",
      text: "Teste",
    });

  it("cria instância somente na URL configurada", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ instance: { instanceName: "agendai_x", instanceId: "remote" } }), { status: 201 }));
    const result = await new EvolutionWhatsAppProvider(config).createInstance({ instanceName: "agendai_x", webhookUrl: "http://agendai.local/api/integrations/whatsapp/evolution/webhook", webhookSecret: "s".repeat(32) });
    expect(result).toMatchObject({ instanceName: "agendai_x", status: "AWAITING_QR" });
    expect(vi.mocked(fetch).mock.calls[0]?.[0].toString()).toBe("http://evolution.local:8080/instance/create");
    const request = vi.mocked(fetch).mock.calls[0]?.[1];
    const body = JSON.parse(String(request?.body)) as {
      webhook: { events: string[]; headers: Record<string, string> };
    };
    expect(body.webhook.events).toEqual(["QRCODE_UPDATED", "CONNECTION_UPDATE"]);
    expect(body.webhook.headers).toEqual({
      "x-agendai-webhook-secret": "s".repeat(32),
    });
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

  it("classifica ECONNREFUSED como indisponibilidade transitória", async () => {
    const cause = Object.assign(new Error("connect ECONNREFUSED"), {
      code: "ECONNREFUSED",
    });
    vi.mocked(fetch).mockRejectedValue(
      Object.assign(new TypeError("fetch failed"), { cause }),
    );
    await expect(sendText()).rejects.toMatchObject({
      code: "WHATSAPP_PROVIDER_UNAVAILABLE",
      retryable: true,
    });
  });

  it("classifica timeout como transitório", async () => {
    vi.mocked(fetch).mockRejectedValue(new DOMException("timed out", "TimeoutError"));
    await expect(sendText()).rejects.toMatchObject({
      code: "WHATSAPP_TIMEOUT",
      retryable: true,
    });
  });

  it("classifica fetch failed sem resposta como indisponibilidade transitória", async () => {
    vi.mocked(fetch).mockRejectedValue(new TypeError("fetch failed"));
    await expect(sendText()).rejects.toMatchObject({
      code: "WHATSAPP_PROVIDER_UNAVAILABLE",
      retryable: true,
    });
  });

  it.each([
    ["JSON", new Response(JSON.stringify({ retryAfter: 30 }), { status: 429 })],
    ["não JSON", new Response("too many requests", { status: 429 })],
  ])("classifica HTTP 429 com corpo %s como rate limit transitório", async (_bodyType, response) => {
    vi.mocked(fetch).mockResolvedValue(response);
    await expect(sendText()).rejects.toMatchObject({
      code: "WHATSAPP_RATE_LIMITED",
      retryable: true,
      httpStatus: 429,
    });
  });

  it.each([
    [500, new Response(JSON.stringify({ error: "offline" }), { status: 500 })],
    [502, new Response("<html>bad gateway</html>", { status: 502 })],
    [503, new Response(null, { status: 503 })],
    [504, new Response("gateway timeout", { status: 504 })],
  ])("classifica HTTP %s como indisponibilidade transitória sem interpretar o corpo", async (status, response) => {
    vi.mocked(fetch).mockResolvedValue(response);
    await expect(sendText()).rejects.toMatchObject({
      code: "WHATSAPP_PROVIDER_UNAVAILABLE",
      retryable: true,
      httpStatus: status,
    });
  });

  it("mantém HTTP 401 como falha permanente de autorização", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 401 }));
    await expect(sendText()).rejects.toMatchObject({
      code: "WHATSAPP_PROVIDER_UNAUTHORIZED",
      retryable: false,
      httpStatus: 401,
    });
  });

  it("mantém HTTP 400 como requisição inválida permanente", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ error: "invalid payload" }), { status: 400 }),
    );
    await expect(sendText()).rejects.toMatchObject({
      code: "WHATSAPP_PROVIDER_BAD_REQUEST",
      retryable: false,
      httpStatus: 400,
    });
  });

  it("mantém HTTP 404 como instância inexistente permanente", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 404 }));
    await expect(sendText()).rejects.toMatchObject({
      code: "WHATSAPP_INSTANCE_NOT_FOUND",
      retryable: false,
      httpStatus: 404,
    });
  });

  it("classifica apenas HTTP 2xx com contrato inválido como resposta inválida", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ unexpected: true }), { status: 200 }),
    );
    await expect(sendText()).rejects.toMatchObject({
      code: "WHATSAPP_INVALID_PROVIDER_RESPONSE",
      retryable: false,
      httpStatus: 200,
    });
  });

  it("aceita HTTP 200 com payload de envio válido", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ key: { id: "message-valid" } }), { status: 200 }),
    );
    await expect(sendText()).resolves.toEqual({
      externalMessageId: "message-valid",
    });
  });
});
