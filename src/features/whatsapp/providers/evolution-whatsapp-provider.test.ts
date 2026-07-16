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
    expect(body.webhook.events).toEqual([
      "QRCODE_UPDATED",
      "CONNECTION_UPDATE",
      "MESSAGES_UPSERT",
    ]);
    expect(body.webhook.headers).toEqual({
      "x-agendai-webhook-secret": "s".repeat(32),
    });
  });

  it("atualiza o webhook de instância existente com mensagens e segredo", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ success: true }), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({
          enabled: true,
          webhookBase64: false,
        }), { status: 200 }),
      );
    await new EvolutionWhatsAppProvider(config).configureWebhook({
      instanceName: "agendai_x",
      webhookUrl: "http://agendai.local/api/integrations/whatsapp/evolution/webhook",
      webhookSecret: "s".repeat(32),
    });

    const [url, request] = vi.mocked(fetch).mock.calls[0] ?? [];
    expect(url?.toString()).toBe("http://evolution.local:8080/webhook/set/agendai_x");
    const payload = JSON.parse(String(request?.body)) as {
      webhook: { webhookBase64: boolean; base64: boolean };
    };
    expect(payload).toEqual({
      webhook: {
        enabled: true,
        url: "http://agendai.local/api/integrations/whatsapp/evolution/webhook",
        webhookByEvents: false,
        webhookBase64: false,
        byEvents: false,
        base64: false,
        events: ["MESSAGES_UPSERT", "CONNECTION_UPDATE", "QRCODE_UPDATED"],
        headers: { "x-agendai-webhook-secret": "s".repeat(32) },
      },
    });
    expect(Object.hasOwn(payload.webhook, "webhookBase64")).toBe(true);
    expect(payload.webhook.webhookBase64).toBe(false);
    expect(Object.hasOwn(payload.webhook, "base64")).toBe(true);
    expect(payload.webhook.base64).toBe(false);
    expect(vi.mocked(fetch).mock.calls[1]?.[0].toString()).toBe(
      "http://evolution.local:8080/webhook/find/agendai_x",
    );
  });

  it("rejeita sincronização quando a Evolution converte webhookBase64 para true", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ success: true }), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({
          webhook: { enabled: true, webhookBase64: true },
        }), { status: 200 }),
      );

    await expect(new EvolutionWhatsAppProvider(config).configureWebhook({
      instanceName: "agendai_x",
      webhookUrl: "http://agendai.local/api/integrations/whatsapp/evolution/webhook",
      webhookSecret: "s".repeat(32),
    })).rejects.toMatchObject({
      code: "WHATSAPP_INVALID_PROVIDER_RESPONSE",
    });
  });

  it("registra diagnóstico seguro quando a configuração do webhook retorna 400", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({
        error: "Bad Request",
        response: {
          message: [[{
            keyword: "format",
            message: "url must be valid: https://internal.example/secret",
          }]],
        },
      }), { status: 400 }),
    );

    await expect(new EvolutionWhatsAppProvider(config).configureWebhook({
      instanceName: "agendai_x",
      webhookUrl: "http://agendai.local/api/integrations/whatsapp/evolution/webhook",
      webhookSecret: "s".repeat(32),
    })).rejects.toMatchObject({ httpStatus: 400 });

    const diagnostic = vi.mocked(console.warn).mock.calls.find(
      ([message]) => message === "Evolution webhook configuration rejected",
    );
    expect(diagnostic?.[1]).toEqual({
      endpoint: "instance.webhook",
      httpStatus: 400,
      code: "Bad Request",
      message: "url must be valid: [url]",
      payloadFields: ["webhook"],
    });
    expect(JSON.stringify(diagnostic)).not.toContain("agendai-webhook-secret");
    expect(JSON.stringify(diagnostic)).not.toContain("internal.example");
    expect(JSON.stringify(diagnostic)).not.toContain("s".repeat(32));
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
      new Response(JSON.stringify({
        code: "VALIDATION_ERROR",
        message: "number 5511999999999 invalid at https://internal.example/send",
      }), { status: 400 }),
    );
    await expect(sendText()).rejects.toMatchObject({
      code: "WHATSAPP_PROVIDER_BAD_REQUEST",
      retryable: false,
      httpStatus: 400,
    });
    const diagnostic = vi.mocked(console.warn).mock.calls.find(
      ([message]) => message === "Evolution conversational send rejected",
    );
    expect(diagnostic?.[1]).toEqual({
      endpoint: "message.send-text",
      httpStatus: 400,
      code: "VALIDATION_ERROR",
      message: "number [number] invalid at [url]",
      payloadFields: ["delay", "linkPreview", "number", "text"],
      textLength: 5,
      interactiveOptionsCount: 0,
      recipientFormat: "BRAZIL_E164_13_DIGITS",
    });
    expect(JSON.stringify(diagnostic)).not.toContain("5511999999999");
    expect(JSON.stringify(diagnostic)).not.toContain("Teste");
    expect(JSON.stringify(diagnostic)).not.toContain("internal.example");
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

  it.each([
    ["5591884991", "555591884991"],
    ["55991884991", "5555991884991"],
  ])("converte telefone nacional %s para o transporte %s", async (national, transport) => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ key: { id: "message-phone" } }), { status: 200 }),
    );

    await new EvolutionWhatsAppProvider(config).sendText({
      instanceName: "agendai_x",
      recipientPhone: national,
      text: "Teste",
    });

    const request = vi.mocked(fetch).mock.calls[0]?.[1];
    expect(JSON.parse(String(request?.body))).toMatchObject({ number: transport });
  });

  it("envia duas escolhas como botões de resposta preservando ordem e valores", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ key: { id: "message-buttons" } }), { status: 201 }),
    );

    await new EvolutionWhatsAppProvider(config).sendButtons({
      instanceName: "agendai_x",
      recipientPhone: "5591884991",
      text: "Como podemos ajudar?",
      options: [
        { id: "schedule", title: "Agendar um horário" },
        { id: "handoff", title: "Falar com atendente" },
      ],
    });

    const [url, request] = vi.mocked(fetch).mock.calls[0] ?? [];
    expect(url?.toString()).toBe("http://evolution.local:8080/message/sendButtons/agendai_x");
    expect(JSON.parse(String(request?.body))).toEqual({
      number: "555591884991",
      title: "Agendaí",
      description: "Como podemos ajudar?",
      footer: "Agendaí",
      buttons: [
        { type: "reply", displayText: "Agendar um horário", id: "schedule" },
        { type: "reply", displayText: "Falar com atendente", id: "handoff" },
      ],
      delay: 1_000,
    });
  });

  it("envia várias escolhas como lista interativa", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ key: { id: "message-list" } }), { status: 201 }),
    );
    const options = Array.from({ length: 4 }, (_, index) => ({
      id: `option-${index + 1}`,
      title: `Opção ${index + 1}`,
    }));

    await new EvolutionWhatsAppProvider(config).sendList({
      instanceName: "agendai_x",
      recipientPhone: "5591884991",
      text: "Escolha uma opção",
      options,
    });

    const [url, request] = vi.mocked(fetch).mock.calls[0] ?? [];
    expect(url?.toString()).toBe("http://evolution.local:8080/message/sendList/agendai_x");
    expect(JSON.parse(String(request?.body))).toMatchObject({
      number: "555591884991",
      sections: [{
        rows: options.map((option) => ({ title: option.title, rowId: option.id })),
      }],
    });
  });

  it("diagnostica HTTP 400 interativo sem expor destinatário ou conteúdo", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ code: "VALIDATION_ERROR", message: "invalid buttons" }), {
        status: 400,
      }),
    );

    await expect(new EvolutionWhatsAppProvider(config).sendButtons({
      instanceName: "agendai_x",
      recipientPhone: "5591884991",
      text: "Conteúdo sigiloso",
      options: [
        { id: "one", title: "Primeira" },
        { id: "two", title: "Segunda" },
      ],
    })).rejects.toMatchObject({ code: "WHATSAPP_PROVIDER_BAD_REQUEST" });

    const diagnostic = vi.mocked(console.warn).mock.calls.find(
      ([message]) => message === "Evolution conversational send rejected",
    );
    expect(diagnostic?.[1]).toMatchObject({
      endpoint: "message.send-buttons",
      httpStatus: 400,
      interactiveOptionsCount: 2,
      recipientFormat: "BRAZIL_E164_12_DIGITS",
    });
    expect(JSON.stringify(diagnostic)).not.toContain("555591884991");
    expect(JSON.stringify(diagnostic)).not.toContain("Conteúdo sigiloso");
  });
});
