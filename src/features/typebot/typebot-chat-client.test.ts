import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  buildTypebotStartPayload,
  createTypebotChatClient,
  renderTypebotReply,
  sanitizeTypebotStartPayload,
} from "@/features/typebot/typebot-chat-client";

describe("Typebot chat client", () => {
  beforeEach(() => {
    process.env.TYPEBOT_VIEWER_URL = "https://typebot.example.com";
    process.env.TYPEBOT_REQUEST_TIMEOUT_MS = "5000";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.TYPEBOT_VIEWER_URL;
    delete process.env.TYPEBOT_REQUEST_TIMEOUT_MS;
  });

  it("starts the published bot with phone as a prefilled variable", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      sessionId: "session-a",
      messages: [{ type: "text", content: { type: "markdown", markdown: "Como podemos ajudar?" } }],
      input: {
        type: "choice input",
        items: [
          { id: "schedule", value: "Agendar um horário", content: "Agendar um horário" },
          { id: "handoff", value: "Falar com atendente", content: "Falar com atendente" },
        ],
      },
    }), { status: 200, headers: { "content-type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);

    const reply = await createTypebotChatClient().start({
      publicId: "agenda-a",
      apiBaseUrl: "https://agenda.example.com",
      tenantSlug: "tenant-a",
      typebotApiKey: "agz_tb_tenant_a_secret",
      phone: "5511999999999",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      new URL("https://typebot.example.com/api/v1/typebots/agenda-a/startChat"),
      expect.objectContaining({ method: "POST" }),
    );
    const request = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(JSON.parse(String(request.body))).toMatchObject({
      textBubbleContentFormat: "markdown",
      prefilledVariables: {
        apiBaseUrl: "https://agenda.example.com",
        tenantSlug: "tenant-a",
        typebotApiKey: "agz_tb_tenant_a_secret",
        phone: "5511999999999",
      },
    });
    expect(reply).toEqual({
      sessionId: "session-a",
      text: "Como podemos ajudar?",
      interaction: {
        type: "choice input",
        choices: [
          { id: "schedule", value: "Agendar um horário", label: "Agendar um horário" },
          { id: "handoff", value: "Falar com atendente", label: "Falar com atendente" },
        ],
      },
      expectedInput: { type: "CHOICE" },
    });
  });

  it.each([
    ["text input", { isLong: false }, { type: "TEXT" }],
    ["text input", { isLong: true }, { type: "TEXTAREA" }],
    ["number input", { locale: "pt-BR" }, { type: "NUMBER" }],
    ["date input", { format: "yyyy-MM-dd" }, { type: "DATE", format: "yyyy-MM-dd" }],
  ])("preserva o estado esperado de %s", (type, options, expectedInput) => {
    expect(renderTypebotReply({
      messages: [],
      input: { type, options },
    })).toEqual({ text: "", expectedInput });
  });

  it("sanitiza a credencial ao diagnosticar o payload inicial", () => {
    const payload = buildTypebotStartPayload({
      apiBaseUrl: "https://agenda.example.com",
      tenantSlug: "tenant-a",
      typebotApiKey: "agz_tb_tenant_a_secret",
      phone: "5511987654321",
    });

    expect(sanitizeTypebotStartPayload(payload)).toMatchObject({
      prefilledVariables: {
        apiBaseUrl: "https://agenda.example.com",
        tenantSlug: "tenant-a",
        typebotApiKey: "[REDACTED]",
        phone: "5511987654321",
      },
    });
    expect(JSON.stringify(sanitizeTypebotStartPayload(payload))).not.toContain(
      "agz_tb_tenant_a_secret",
    );
  });

  it("continues the same official session with a text or button answer", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      messages: [{ type: "text", content: { type: "markdown", markdown: "Escolha a categoria" } }],
    }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await createTypebotChatClient().continue({ sessionId: "session-a", message: "Agendar um horário" });

    expect(fetchMock).toHaveBeenCalledWith(
      new URL("https://typebot.example.com/api/v1/sessions/session-a/continueChat"),
      expect.any(Object),
    );
    const request = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(JSON.parse(String(request.body))).toMatchObject({
      message: { type: "text", text: "Agendar um horário" },
    });
    expect(String(request.body)).not.toContain("prefilledVariables");
  });

  it("aceita uma continuação que retorna somente um input livre", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      messages: [],
      input: {
        id: "input-modelo",
        type: "text input",
        options: { isLong: false },
      },
    }), { status: 200 })));

    await expect(createTypebotChatClient().continue({
      sessionId: "session-a",
      message: "09:00",
    })).resolves.toEqual({
      text: "",
      expectedInput: { type: "TEXT" },
    });
  });
});
