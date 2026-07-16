import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { TypebotChatError } from "@/features/typebot/typebot-chat-client";
import { encryptTypebotCredential } from "@/features/typebot/typebot-credential-crypto";
import { WhatsAppError } from "@/features/whatsapp/whatsapp-errors";

const { prismaMock } = vi.hoisted(() => {
  const mock = {
    whatsAppInboundMessage: {
      updateMany: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    typebotSession: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    whatsAppMessageOutbox: { findFirst: vi.fn() },
    whatsAppSentMessageReceipt: { createMany: vi.fn() },
    $transaction: vi.fn(),
  };
  mock.$transaction.mockImplementation(async (input: unknown) =>
    typeof input === "function"
      ? (input as (client: typeof mock) => Promise<unknown>)(mock)
      : Promise.all(input as Promise<unknown>[]));
  return { prismaMock: mock };
});

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import { processWhatsAppConversationMessage } from "@/workers/whatsapp-conversation-worker";

const now = new Date("2026-07-15T12:00:00.000Z");
const tenantId = "00000000-0000-4000-8000-000000000001";
const connectionId = "00000000-0000-4000-8000-000000000002";
const encryptionKey = Buffer.alloc(32, 9).toString("base64");

function encryptedToken(token: string) {
  return encryptTypebotCredential(token, {
    TYPEBOT_CREDENTIAL_ENCRYPTION_KEY: encryptionKey,
  });
}

function inbound(overrides: Record<string, unknown> = {}) {
  return {
    id: "00000000-0000-4000-8000-000000000003",
    tenantId,
    connectionId,
    messageId: "message-1",
    senderPhone: "5511999999999",
    messageText: "Olá",
    responseText: null,
    responsePayload: null,
    fallbackSentAt: null,
    attempts: 1,
    receivedAt: new Date("2026-07-15T11:59:00.000Z"),
    connection: {
      id: connectionId,
      tenantId,
      instanceName: "agendai_tenant_a",
      enabled: true,
      status: "CONNECTED",
      tenant: {
        typebotPublicId: "agenda-a",
        slug: "tenant-a",
        typebotCredentials: [{ tokenEncrypted: encryptedToken("agz_tb_tenant_a") }],
        status: "ACTIVE",
        subscription: {
          status: "ACTIVE",
          expiresAt: new Date("2026-08-15T00:00:00.000Z"),
          plan: { publicLinkEnabled: true, whatsappEnabled: true },
        },
      },
    },
    ...overrides,
  };
}

function session(overrides: Record<string, unknown> = {}) {
  return {
    id: "00000000-0000-4000-8000-000000000004",
    tenantId,
    phone: "5511999999999",
    activePhone: "5511999999999",
    externalSessionId: null,
    handoffUntil: null,
    endedAt: null,
    metadata: { channelPhoneInjected: true },
    status: "STARTED",
    lastInteractionAt: now,
    ...overrides,
  };
}

describe("WhatsApp Typebot conversation worker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.AGENDAI_PUBLIC_URL = "https://agenda.example.com/app-path";
    process.env.TYPEBOT_CREDENTIAL_ENCRYPTION_KEY = encryptionKey;
    prismaMock.whatsAppInboundMessage.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.whatsAppInboundMessage.findUnique.mockResolvedValue(inbound());
    prismaMock.whatsAppInboundMessage.findMany.mockResolvedValue([]);
    prismaMock.whatsAppInboundMessage.update.mockResolvedValue({});
    prismaMock.typebotSession.findFirst.mockResolvedValue(null);
    prismaMock.typebotSession.findUnique.mockResolvedValue({
      status: "STARTED",
      lastAppointmentId: null,
      metadata: { channelPhoneInjected: true },
    });
    prismaMock.whatsAppMessageOutbox.findFirst.mockResolvedValue(null);
    prismaMock.typebotSession.create.mockResolvedValue(session());
    prismaMock.typebotSession.update.mockResolvedValue(session());
    prismaMock.typebotSession.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.whatsAppSentMessageReceipt.createMany.mockResolvedValue({ count: 1 });
  });

  afterEach(() => {
    delete process.env.AGENDAI_PUBLIC_URL;
    delete process.env.TYPEBOT_CREDENTIAL_ENCRYPTION_KEY;
  });

  it("inicia sessão com phone e envia a resposta pela instância do tenant", async () => {
    const typebot = {
      start: vi.fn().mockResolvedValue({ sessionId: "typebot-session-a", text: "Como podemos ajudar?" }),
      continue: vi.fn(),
    };
    const provider = { sendText: vi.fn().mockResolvedValue({ externalMessageId: "out-1" }) };

    await processWhatsAppConversationMessage("inbound-a", { now, typebot, provider: provider as never });

    expect(typebot.start).toHaveBeenCalledWith({
      publicId: "agenda-a",
      apiBaseUrl: "https://agenda.example.com",
      tenantSlug: "tenant-a",
      typebotApiKey: "agz_tb_tenant_a",
      phone: "5511999999999",
    });
    expect(provider.sendText).toHaveBeenCalledWith({
      instanceName: "agendai_tenant_a",
      recipientPhone: "5511999999999",
      text: "Como podemos ajudar?",
    });
    expect(prismaMock.whatsAppSentMessageReceipt.createMany).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tenantId,
        connectionId,
        externalMessageId: "out-1",
        source: "CONVERSATIONAL",
      }),
      skipDuplicates: true,
    });
    expect(prismaMock.typebotSession.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { tenantId, activePhone: "5511999999999", endedAt: null },
    }));
    expect(prismaMock.typebotSession.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tenantId,
        phone: "5511999999999",
        metadata: {
          channelPhoneInjected: true,
          channel: "WHATSAPP",
          conversationId: "5511999999999",
        },
      }),
    });
    expect(prismaMock.whatsAppInboundMessage.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({
          connection: expect.objectContaining({
            include: expect.objectContaining({
              tenant: expect.objectContaining({
                select: expect.objectContaining({
                  slug: true,
                  typebotCredentials: expect.objectContaining({
                    where: {
                      isActive: true,
                      revokedAt: null,
                      tokenEncrypted: { not: null },
                    },
                  }),
                }),
              }),
            }),
          }),
        }),
      }),
    );
  });

  it("mantém telefone nacional até o boundary do provider", async () => {
    prismaMock.whatsAppInboundMessage.findUnique.mockResolvedValue(inbound({
      senderPhone: "5591884991",
    }));
    const typebot = {
      start: vi.fn().mockResolvedValue({ sessionId: "typebot-session-a", text: "Como podemos ajudar?" }),
      continue: vi.fn(),
    };
    const provider = { sendText: vi.fn().mockResolvedValue({ externalMessageId: "out-1" }) };

    await processWhatsAppConversationMessage("inbound-national", {
      now,
      typebot,
      provider: provider as never,
    });

    expect(typebot.start).toHaveBeenCalledWith(expect.objectContaining({
      phone: "5591884991",
    }));
    expect(provider.sendText).toHaveBeenCalledWith(expect.objectContaining({
      recipientPhone: "5591884991",
    }));
  });

  it("continua a mesma sessão na segunda mensagem", async () => {
    prismaMock.typebotSession.findFirst.mockResolvedValue(session({ externalSessionId: "typebot-session-a" }));
    const current = inbound();
    prismaMock.whatsAppInboundMessage.findUnique.mockResolvedValue(inbound({
      messageText: "Agendar um horário",
      connection: {
        ...current.connection,
        tenant: { ...current.connection.tenant, typebotCredentials: [] },
      },
    }));
    const typebot = {
      start: vi.fn(),
      continue: vi.fn().mockResolvedValue({ text: "Escolha uma categoria" }),
    };
    const provider = { sendText: vi.fn().mockResolvedValue({ externalMessageId: "out-2" }) };

    await processWhatsAppConversationMessage("inbound-b", { now, typebot, provider: provider as never });

    expect(typebot.continue).toHaveBeenCalledWith({
      sessionId: "typebot-session-a",
      message: "Agendar um horário",
    });
    expect(typebot.start).not.toHaveBeenCalled();
    expect(prismaMock.whatsAppInboundMessage.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ tenantId, status: "PROCESSED" }),
      }),
    );
    expect(provider.sendText).toHaveBeenCalledWith({
      instanceName: "agendai_tenant_a",
      recipientPhone: "5511999999999",
      text: "Escolha uma categoria",
    });
  });

  it("renova uma sessÃ£o antiga sem contexto e reinjeta phone", async () => {
    prismaMock.typebotSession.findFirst.mockResolvedValue(
      session({ externalSessionId: "legacy-session", metadata: null }),
    );
    const typebot = {
      start: vi.fn().mockResolvedValue({
        sessionId: "new-session",
        text: "Como podemos ajudar?",
      }),
      continue: vi.fn(),
    };
    const provider = {
      sendText: vi.fn().mockResolvedValue({ externalMessageId: "out-legacy" }),
    };

    await processWhatsAppConversationMessage("inbound-legacy", {
      now,
      typebot,
      provider: provider as never,
    });

    expect(prismaMock.typebotSession.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId, activePhone: "5511999999999", endedAt: null },
      }),
    );
    expect(typebot.continue).not.toHaveBeenCalled();
    expect(typebot.start).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantSlug: "tenant-a",
        phone: "5511999999999",
      }),
    );
  });

  it.each([
    ["TEXT", "Onix 2020"],
    ["TEXT", "2"],
    ["TEXTAREA", "Veículo com bancos claros e detalhes no painel."],
  ])("envia entrada livre %s sem interpretar números como escolha", async (inputType, answer) => {
    prismaMock.typebotSession.findFirst.mockResolvedValue(
      session({ externalSessionId: "typebot-session-a" }),
    );
    prismaMock.whatsAppInboundMessage.findUnique.mockResolvedValue(
      inbound({ messageText: answer }),
    );
    prismaMock.whatsAppInboundMessage.findMany.mockResolvedValue([{
      responseText: "Modelo do carro\n\nObrigatória",
      responsePayload: {
        text: "Modelo do carro\n\nObrigatória",
        expectedInput: { type: inputType },
      },
    }]);
    const typebot = {
      start: vi.fn(),
      continue: vi.fn().mockResolvedValue({ text: "Resposta registrada" }),
    };
    const provider = { sendText: vi.fn().mockResolvedValue({ externalMessageId: "out-free" }) };

    await processWhatsAppConversationMessage(`inbound-${inputType}`, {
      now,
      typebot,
      provider: provider as never,
    });

    expect(typebot.continue).toHaveBeenCalledWith({
      sessionId: "typebot-session-a",
      message: answer,
    });
  });

  it("apresenta TEXT obrigatório diretamente sem a opção Responder", async () => {
    prismaMock.typebotSession.findFirst.mockResolvedValue(
      session({ externalSessionId: "typebot-session-a" }),
    );
    prismaMock.whatsAppInboundMessage.findUnique.mockResolvedValue(
      inbound({ messageText: "09:00" }),
    );
    const typebot = {
      start: vi.fn(),
      continue: vi.fn().mockResolvedValue({
        text:
          "Qual modelo do carro?\nDigite sua resposta ou “Voltar” para retornar.",
        expectedInput: { type: "TEXT" },
      }),
    };
    const provider = {
      sendText: vi.fn().mockResolvedValue({ externalMessageId: "out-field" }),
      sendButtons: vi.fn(),
      sendList: vi.fn(),
    };

    await processWhatsAppConversationMessage("inbound-field-prompt", {
      now,
      typebot,
      provider: provider as never,
    });

    expect(provider.sendText).toHaveBeenCalledWith({
      instanceName: "agendai_tenant_a",
      recipientPhone: "5511999999999",
      text:
        "Qual modelo do carro?\n\nDigite sua resposta ou “Voltar” para retornar.",
    });
    expect(provider.sendButtons).not.toHaveBeenCalled();
    expect(provider.sendList).not.toHaveBeenCalled();
    expect(JSON.stringify(prismaMock.whatsAppInboundMessage.update.mock.calls)).not.toContain(
      "Responder",
    );
  });

  it("mantém resposta numérica como valor livre quando aguarda NUMBER", async () => {
    prismaMock.typebotSession.findFirst.mockResolvedValue(
      session({ externalSessionId: "typebot-session-a" }),
    );
    prismaMock.whatsAppInboundMessage.findUnique.mockResolvedValue(
      inbound({ messageText: "2,5" }),
    );
    prismaMock.whatsAppInboundMessage.findMany.mockResolvedValue([{
      responseText: "Quantidade",
      responsePayload: { text: "Quantidade", expectedInput: { type: "NUMBER" } },
    }]);
    const typebot = {
      start: vi.fn(),
      continue: vi.fn().mockResolvedValue({ text: "Resposta registrada" }),
    };
    const provider = { sendText: vi.fn().mockResolvedValue({ externalMessageId: "out-number" }) };

    await processWhatsAppConversationMessage("inbound-number-value", {
      now,
      typebot,
      provider: provider as never,
    });

    expect(typebot.continue).toHaveBeenCalledWith({
      sessionId: "typebot-session-a",
      message: "2,5",
    });
  });

  it("rejeita NUMBER inválido antes de chamar continueChat", async () => {
    prismaMock.typebotSession.findFirst.mockResolvedValue(
      session({ externalSessionId: "typebot-session-a" }),
    );
    prismaMock.whatsAppInboundMessage.findUnique.mockResolvedValue(
      inbound({ messageText: "dois" }),
    );
    prismaMock.whatsAppInboundMessage.findMany.mockResolvedValue([{
      responseText: "Quantidade",
      responsePayload: { text: "Quantidade", expectedInput: { type: "NUMBER" } },
    }]);
    const typebot = { start: vi.fn(), continue: vi.fn() };
    const provider = { sendText: vi.fn().mockResolvedValue({ externalMessageId: "invalid-number" }) };

    await processWhatsAppConversationMessage("inbound-invalid-number-format", {
      now,
      typebot,
      provider: provider as never,
    });

    expect(typebot.continue).not.toHaveBeenCalled();
    expect(provider.sendText).toHaveBeenCalledWith(expect.objectContaining({
      text: "Número inválido. Digite um número válido.",
    }));
  });

  it.each([
    ["2026-07-16", true],
    ["2026-02-30", false],
    ["16/07/2026", false],
  ])("valida DATE %s antes de continuar", async (answer, valid) => {
    prismaMock.typebotSession.findFirst.mockResolvedValue(
      session({ externalSessionId: "typebot-session-a" }),
    );
    prismaMock.whatsAppInboundMessage.findUnique.mockResolvedValue(
      inbound({ messageText: answer }),
    );
    prismaMock.whatsAppInboundMessage.findMany.mockResolvedValue([{
      responseText: "Data do veículo",
      responsePayload: {
        text: "Data do veículo",
        expectedInput: { type: "DATE", format: "yyyy-MM-dd" },
      },
    }]);
    const typebot = {
      start: vi.fn(),
      continue: vi.fn().mockResolvedValue({ text: "Resposta registrada" }),
    };
    const provider = { sendText: vi.fn().mockResolvedValue({ externalMessageId: "out-date" }) };

    await processWhatsAppConversationMessage(`inbound-date-${answer}`, {
      now,
      typebot,
      provider: provider as never,
    });

    if (valid) {
      expect(typebot.continue).toHaveBeenCalledWith({
        sessionId: "typebot-session-a",
        message: answer,
      });
    } else {
      expect(typebot.continue).not.toHaveBeenCalled();
      expect(provider.sendText).toHaveBeenCalledWith(expect.objectContaining({
        text: "Data inválida. Use o formato AAAA-MM-DD.",
      }));
    }
  });

  it.each(["Pular", "Voltar"])("encaminha navegação %s sem tratá-la como valor tipado", async (command) => {
    prismaMock.typebotSession.findFirst.mockResolvedValue(
      session({ externalSessionId: "typebot-session-a" }),
    );
    prismaMock.whatsAppInboundMessage.findUnique.mockResolvedValue(
      inbound({ messageText: command.toLowerCase() }),
    );
    prismaMock.whatsAppInboundMessage.findMany.mockResolvedValue([{
      responseText: "Observação opcional",
      responsePayload: { text: "Observação opcional", expectedInput: { type: "TEXT" } },
    }]);
    const typebot = {
      start: vi.fn(),
      continue: vi.fn().mockResolvedValue({ text: "Próxima etapa" }),
    };
    const provider = { sendText: vi.fn().mockResolvedValue({ externalMessageId: "out-nav" }) };

    await processWhatsAppConversationMessage(`inbound-${command}`, {
      now,
      typebot,
      provider: provider as never,
    });

    expect(typebot.continue).toHaveBeenCalledWith({
      sessionId: "typebot-session-a",
      message: command,
    });
  });

  it.each([
    ["NUMBER", "Voltar", "-9007199254740991"],
    ["NUMBER", "Pular", "-9007199254740990"],
    ["DATE", "Voltar", "1000-01-01"],
    ["DATE", "Pular", "1000-01-02"],
  ])("encaminha %s %s por valor tipado reservado", async (inputType, command, expectedValue) => {
    prismaMock.typebotSession.findFirst.mockResolvedValue(
      session({ externalSessionId: "typebot-session-a" }),
    );
    prismaMock.whatsAppInboundMessage.findUnique.mockResolvedValue(
      inbound({ messageText: command }),
    );
    prismaMock.whatsAppInboundMessage.findMany.mockResolvedValue([{
      responseText: "Campo tipado",
      responsePayload: {
        text: "Campo tipado",
        expectedInput: {
          type: inputType,
          ...(inputType === "DATE" ? { format: "yyyy-MM-dd" } : {}),
        },
      },
    }]);
    const typebot = {
      start: vi.fn(),
      continue: vi.fn().mockResolvedValue({ text: "Navegação aplicada" }),
    };
    const provider = { sendText: vi.fn().mockResolvedValue({ externalMessageId: "out-typed-nav" }) };

    await processWhatsAppConversationMessage(`inbound-${inputType}-${command}`, {
      now,
      typebot,
      provider: provider as never,
    });

    expect(typebot.continue).toHaveBeenCalledWith({
      sessionId: "typebot-session-a",
      message: expectedValue,
    });
  });

  it("envia duas escolhas como uma única mensagem numerada e persiste a resposta estruturada", async () => {
    const interaction = {
      type: "choice input",
      choices: [
        { id: "schedule", value: "Agendar um horário", label: "Agendar um horário" },
        { id: "i_intent_handoff", value: "Falar com atendente", label: "Falar com atendente" },
      ],
    };
    const typebot = {
      start: vi.fn().mockResolvedValue({
        sessionId: "typebot-session-a",
        text: "Como podemos ajudar?",
        interaction,
      }),
      continue: vi.fn(),
    };
    const provider = {
      sendText: vi.fn().mockResolvedValue({ externalMessageId: "text-1" }),
      sendButtons: vi.fn(),
      sendList: vi.fn(),
    };

    await processWhatsAppConversationMessage("inbound-buttons", {
      now,
      typebot,
      provider: provider as never,
    });

    expect(provider.sendText).toHaveBeenCalledWith({
      instanceName: "agendai_tenant_a",
      recipientPhone: "5511999999999",
      text: "Como podemos ajudar?\n\n1. Agendar um horário\n2. Falar com atendente\n\nResponda com o número da opção.",
    });
    expect(provider.sendButtons).not.toHaveBeenCalled();
    expect(provider.sendList).not.toHaveBeenCalled();
    expect(prismaMock.whatsAppInboundMessage.update).toHaveBeenCalledWith({
      where: { id: expect.any(String) },
      data: expect.objectContaining({
        responsePayload: { text: "Como podemos ajudar?", interaction },
      }),
    });
  });

  it("envia dez opções numeradas preservando a ordem", async () => {
    const choices = Array.from({ length: 10 }, (_, index) => ({
      id: `choice-${index + 1}`,
      value: `value-${index + 1}`,
      label: `Opção ${index + 1}`,
    }));
    const typebot = {
      start: vi.fn().mockResolvedValue({
        sessionId: "typebot-session-a",
        text: "Escolha uma categoria",
        interaction: { type: "choice input", choices },
      }),
      continue: vi.fn(),
    };
    const provider = {
      sendText: vi.fn().mockResolvedValue({ externalMessageId: "text-10" }),
      sendButtons: vi.fn(),
      sendList: vi.fn(),
    };

    await processWhatsAppConversationMessage("inbound-list", {
      now,
      typebot,
      provider: provider as never,
    });

    const sentText = provider.sendText.mock.calls[0]?.[0].text;
    expect(sentText).toContain("1. Opção 1");
    expect(sentText).toContain("10. Opção 10");
    expect(sentText.indexOf("1. Opção 1")).toBeLessThan(sentText.indexOf("10. Opção 10"));
    expect(provider.sendButtons).not.toHaveBeenCalled();
    expect(provider.sendList).not.toHaveBeenCalled();
  });

  it("usa fallback numerado quando a quantidade excede o limite da lista", async () => {
    const choices = Array.from({ length: 11 }, (_, index) => ({
      id: `choice-${index + 1}`,
      value: `value-${index + 1}`,
      label: `Opção ${index + 1}`,
    }));
    const typebot = {
      start: vi.fn().mockResolvedValue({
        sessionId: "typebot-session-a",
        text: "Escolha uma opção",
        interaction: { type: "choice input", choices },
      }),
      continue: vi.fn(),
    };
    const provider = {
      sendText: vi.fn().mockResolvedValue({ externalMessageId: "fallback-list" }),
      sendButtons: vi.fn(),
      sendList: vi.fn(),
    };

    await processWhatsAppConversationMessage("inbound-long-list", {
      now,
      typebot,
      provider: provider as never,
    });

    const sentText = provider.sendText.mock.calls[0]?.[0].text;
    expect(sentText).toContain("10. Opção 10");
    expect(sentText).not.toContain("11. Opção 11");
    expect(provider.sendButtons).not.toHaveBeenCalled();
    expect(provider.sendList).not.toHaveBeenCalled();
  });

  it("reenvia opções persistidas sem chamar o Typebot novamente", async () => {
    const responsePayload = {
      text: "Como podemos ajudar?",
      interaction: {
        type: "choice input",
        choices: [
          { id: "schedule", value: "schedule", label: "Agendar um horário" },
          { id: "i_intent_handoff", value: "handoff", label: "Falar com atendente" },
        ],
      },
    };
    prismaMock.whatsAppInboundMessage.findUnique.mockResolvedValue(inbound({
      status: "PROCESSING",
      responseText: responsePayload.text,
      responsePayload,
    }));
    const typebot = { start: vi.fn(), continue: vi.fn() };
    const provider = {
      sendText: vi.fn().mockResolvedValue({ externalMessageId: "text-retry" }),
      sendButtons: vi.fn(),
      sendList: vi.fn(),
    };

    await processWhatsAppConversationMessage("inbound-retry", {
      now,
      typebot,
      provider: provider as never,
    });

    expect(typebot.start).not.toHaveBeenCalled();
    expect(typebot.continue).not.toHaveBeenCalled();
    expect(provider.sendText).toHaveBeenCalledWith(expect.objectContaining({
      text: expect.stringContaining("2. Falar com atendente"),
    }));
    expect(provider.sendButtons).not.toHaveBeenCalled();
    expect(provider.sendList).not.toHaveBeenCalled();
  });

  it("preserva opções antes de agendar retry por falha transitória", async () => {
    const responsePayload = {
      text: "Como podemos ajudar?",
      interaction: {
        type: "choice input",
        choices: [
          { id: "schedule", value: "schedule", label: "Agendar um horário" },
          { id: "i_intent_handoff", value: "handoff", label: "Falar com atendente" },
        ],
      },
    };
    const typebot = {
      start: vi.fn().mockResolvedValue({
        sessionId: "typebot-session-a",
        ...responsePayload,
      }),
      continue: vi.fn(),
    };
    const provider = {
      sendText: vi.fn().mockRejectedValue(
        new WhatsAppError("WHATSAPP_PROVIDER_UNAVAILABLE", "offline", true, 503),
      ),
      sendButtons: vi.fn(),
      sendList: vi.fn(),
    };

    await processWhatsAppConversationMessage("inbound-transient", {
      now,
      typebot,
      provider: provider as never,
      maxQuickAttempts: 1,
    });

    expect(prismaMock.whatsAppInboundMessage.update).toHaveBeenCalledWith({
      where: { id: expect.any(String) },
      data: expect.objectContaining({ responsePayload }),
    });
    expect(prismaMock.whatsAppInboundMessage.update).toHaveBeenLastCalledWith({
      where: { id: expect.any(String) },
      data: expect.objectContaining({
        status: "RETRYING",
        nextAttemptAt: expect.any(Date),
      }),
    });
  });

  it("numera até uma única opção de navegação", async () => {
    const typebot = {
      start: vi.fn().mockResolvedValue({
        sessionId: "typebot-session-a",
        text: "Como podemos ajudar?",
        interaction: {
          type: "choice input",
          choices: [
            { id: "back", value: "back", label: "Voltar" },
          ],
        },
      }),
      continue: vi.fn(),
    };
    const provider = {
      sendText: vi.fn().mockResolvedValue({ externalMessageId: "text-one" }),
      sendButtons: vi.fn(),
      sendList: vi.fn(),
    };

    await processWhatsAppConversationMessage("inbound-fallback", {
      now,
      typebot,
      provider: provider as never,
    });

    expect(provider.sendText).toHaveBeenCalledWith(expect.objectContaining({
      text: "Como podemos ajudar?\n\n1. Voltar\n\nResponda com o número da opção.",
    }));
    expect(provider.sendButtons).not.toHaveBeenCalled();
    expect(provider.sendList).not.toHaveBeenCalled();
  });

  it("interpreta resposta numérica pelo valor persistido da opção", async () => {
    prismaMock.typebotSession.findFirst.mockResolvedValue(
      session({ externalSessionId: "typebot-session-a" }),
    );
    prismaMock.whatsAppInboundMessage.findUnique.mockResolvedValue(
      inbound({ messageText: "2" }),
    );
    prismaMock.whatsAppInboundMessage.findMany.mockResolvedValue([{
      responseText: "Escolha",
      responsePayload: {
        text: "Escolha",
        interaction: {
          type: "choice input",
          choices: [
            { id: "one", value: "schedule", label: "Agendar" },
            { id: "i_intent_handoff", value: "handoff", label: "Falar com atendente" },
          ],
        },
      },
    }]);
    const typebot = {
      start: vi.fn(),
      continue: vi.fn().mockResolvedValue({ text: "Certo" }),
    };
    const provider = { sendText: vi.fn().mockResolvedValue({ externalMessageId: "out" }) };

    await processWhatsAppConversationMessage("inbound-number", {
      now,
      typebot,
      provider: provider as never,
    });

    expect(typebot.continue).toHaveBeenCalledWith({
      sessionId: "typebot-session-a",
      message: "handoff",
    });
  });

  it.each([
    ["BOOLEAN", ["Sim", "Não"], "2", "Não"],
    ["SELECT", ["Hatch", "Sedan", "SUV"], "3", "SUV"],
  ])("mantém %s como escolha numerada", async (_fieldType, labels, answer, expected) => {
    prismaMock.typebotSession.findFirst.mockResolvedValue(
      session({ externalSessionId: "typebot-session-a" }),
    );
    prismaMock.whatsAppInboundMessage.findUnique.mockResolvedValue(
      inbound({ messageText: answer }),
    );
    prismaMock.whatsAppInboundMessage.findMany.mockResolvedValue([{
      responseText: "Escolha uma opção",
      responsePayload: {
        text: "Escolha uma opção",
        expectedInput: { type: "CHOICE" },
        interaction: {
          type: "choice input",
          choices: labels.map((label, index) => ({
            id: `choice-${index + 1}`,
            value: label,
            label,
          })),
        },
      },
    }]);
    const typebot = {
      start: vi.fn(),
      continue: vi.fn().mockResolvedValue({ text: "Resposta registrada" }),
    };
    const provider = { sendText: vi.fn().mockResolvedValue({ externalMessageId: "out-choice" }) };

    await processWhatsAppConversationMessage(`inbound-${_fieldType}`, {
      now,
      typebot,
      provider: provider as never,
    });

    expect(typebot.continue).toHaveBeenCalledWith({
      sessionId: "typebot-session-a",
      message: expected,
    });
  });

  it("responde número fora da faixa sem avançar a sessão Typebot", async () => {
    prismaMock.typebotSession.findFirst.mockResolvedValue(
      session({ externalSessionId: "typebot-session-a" }),
    );
    prismaMock.whatsAppInboundMessage.findUnique.mockResolvedValue(
      inbound({ messageText: "3" }),
    );
    prismaMock.whatsAppInboundMessage.findMany.mockResolvedValue([{
      responseText: "Escolha",
      responsePayload: {
        text: "Escolha",
        interaction: {
          type: "choice input",
          choices: [
            { id: "one", value: "schedule", label: "Agendar" },
            { id: "i_intent_handoff", value: "handoff", label: "Falar com atendente" },
          ],
        },
      },
    }]);
    const typebot = { start: vi.fn(), continue: vi.fn() };
    const provider = {
      sendText: vi.fn().mockResolvedValue({ externalMessageId: "invalid-option" }),
      sendButtons: vi.fn(),
      sendList: vi.fn(),
    };

    await processWhatsAppConversationMessage("inbound-invalid-number", {
      now,
      typebot,
      provider: provider as never,
    });

    expect(typebot.start).not.toHaveBeenCalled();
    expect(typebot.continue).not.toHaveBeenCalled();
    expect(provider.sendText).toHaveBeenCalledWith({
      instanceName: "agendai_tenant_a",
      recipientPhone: "5511999999999",
      text: "Opção inválida. Responda com um número entre 1 e 2.",
    });
    expect(provider.sendButtons).not.toHaveBeenCalled();
    expect(provider.sendList).not.toHaveBeenCalled();
  });

  it("responde texto inválido em uma escolha sem encaminhar o erro ao Typebot", async () => {
    prismaMock.typebotSession.findFirst.mockResolvedValue(
      session({ externalSessionId: "typebot-session-a" }),
    );
    prismaMock.whatsAppInboundMessage.findUnique.mockResolvedValue(
      inbound({ messageText: "qualquer coisa" }),
    );
    prismaMock.whatsAppInboundMessage.findMany.mockResolvedValue([{
      responseText: "Como podemos ajudar?",
      responsePayload: {
        text: "Como podemos ajudar?",
        interaction: {
          type: "choice input",
          choices: [
            { id: "i_intent_booking", value: "Agendar um horário", label: "Agendar um horário" },
            { id: "i_intent_handoff", value: "Falar com atendente", label: "Falar com atendente" },
            { id: "i_intent_end", value: "Encerrar atendimento", label: "Encerrar atendimento" },
          ],
        },
      },
    }]);
    const typebot = { start: vi.fn(), continue: vi.fn() };
    const provider = { sendText: vi.fn().mockResolvedValue({ externalMessageId: "invalid-text" }) };

    await processWhatsAppConversationMessage("inbound-invalid-text", {
      now,
      typebot,
      provider: provider as never,
    });

    expect(typebot.continue).not.toHaveBeenCalled();
    expect(provider.sendText).toHaveBeenCalledWith(expect.objectContaining({
      text: "Opção inválida. Responda com um número entre 1 e 3.",
    }));
  });

  it("traduz a mensagem padrão de erro retornada pelo Typebot", async () => {
    const typebot = {
      start: vi.fn().mockResolvedValue({
        sessionId: "typebot-session-a",
        text: "Invalid message. Please, try again.",
        interaction: {
          type: "choice input",
          choices: [
            { id: "i_intent_booking", value: "Agendar um horário", label: "Agendar um horário" },
          ],
        },
      }),
      continue: vi.fn(),
    };
    const provider = { sendText: vi.fn().mockResolvedValue({ externalMessageId: "localized" }) };

    await processWhatsAppConversationMessage("inbound-localized-error", {
      now,
      typebot,
      provider: provider as never,
    });

    const sentText = provider.sendText.mock.calls[0]?.[0].text;
    expect(sentText).toContain("Opção inválida. Escolha uma das opções disponíveis.");
    expect(sentText).not.toContain("Invalid message");
    expect(sentText).not.toContain("Please");
  });

  it("preserva o candidato gravado pelo LOOKUP ao persistir a resposta do Typebot", async () => {
    const candidateCustomerId = "00000000-0000-4000-8000-000000000077";
    prismaMock.typebotSession.findFirst.mockResolvedValue(
      session({ externalSessionId: "typebot-session-a" }),
    );
    prismaMock.typebotSession.findUnique.mockResolvedValue({
      status: "STARTED",
      lastAppointmentId: null,
      metadata: {
        channelPhoneInjected: true,
        customerLookup: {
          status: "FOUND",
          candidateCustomerId,
        },
      },
    });
    prismaMock.whatsAppInboundMessage.findUnique.mockResolvedValue(
      inbound({ messageText: "1" }),
    );
    prismaMock.whatsAppInboundMessage.findMany.mockResolvedValue([
      {
        responseText: "Continuar",
        responsePayload: {
          text: "Continuar",
          interaction: {
            type: "choice input",
            choices: [
              { id: "continue", value: "Continuar", label: "Continuar" },
            ],
          },
        },
      },
    ]);
    const typebot = {
      start: vi.fn(),
      continue: vi.fn().mockResolvedValue({
        sessionId: "typebot-session-a",
        text: "Encontrei um cadastro em nome de Matheus Farias.",
        interaction: {
          type: "choice input",
          choices: [
            { id: "yes", value: "Sim, continuar", label: "Sim, continuar" },
            { id: "no", value: "Não sou eu", label: "Não sou eu" },
          ],
        },
      }),
    };
    const provider = {
      sendText: vi.fn().mockResolvedValue({ externalMessageId: "out-lookup" }),
    };

    await processWhatsAppConversationMessage("inbound-lookup", {
      now,
      typebot,
      provider: provider as never,
    });

    expect(prismaMock.typebotSession.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          metadata: expect.objectContaining({
            customerLookup: {
              status: "FOUND",
              candidateCustomerId,
            },
          }),
        }),
      }),
    );
  });

  it("falha de forma segura quando não há credencial recuperável", async () => {
    const current = inbound();
    prismaMock.whatsAppInboundMessage.findUnique.mockResolvedValue(inbound({
      connection: {
        ...current.connection,
        tenant: { ...current.connection.tenant, typebotCredentials: [] },
      },
    }));
    const typebot = { start: vi.fn(), continue: vi.fn() };
    const provider = { sendText: vi.fn().mockResolvedValue({ externalMessageId: "fallback" }) };

    await processWhatsAppConversationMessage("inbound-without-credential", {
      now,
      typebot,
      provider: provider as never,
    });

    expect(typebot.start).not.toHaveBeenCalled();
    expect(prismaMock.whatsAppInboundMessage.update).toHaveBeenLastCalledWith({
      where: { id: expect.any(String) },
      data: expect.objectContaining({
        status: "FAILED",
        lastErrorCode: "TYPEBOT_UNAVAILABLE",
      }),
    });
  });

  it("não compartilha sessão entre tenants para o mesmo telefone", async () => {
    const tenantB = "00000000-0000-4000-8000-000000000010";
    prismaMock.whatsAppInboundMessage.findUnique.mockResolvedValue(
      inbound({
        tenantId: tenantB,
        connection: {
          ...inbound().connection,
          tenantId: tenantB,
          instanceName: "agendai_tenant_b",
          tenant: {
            ...inbound().connection.tenant,
            typebotPublicId: "agenda-b",
            slug: "tenant-b",
            typebotCredentials: [{ tokenEncrypted: encryptedToken("agz_tb_tenant_b") }],
          },
        },
      }),
    );
    const typebot = { start: vi.fn().mockResolvedValue({ sessionId: "session-b", text: "Menu B" }), continue: vi.fn() };
    const provider = { sendText: vi.fn().mockResolvedValue({ externalMessageId: "out-b" }) };

    await processWhatsAppConversationMessage("inbound-b", { now, typebot, provider: provider as never });

    expect(prismaMock.typebotSession.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { tenantId: tenantB, activePhone: "5511999999999", endedAt: null },
    }));
    expect(prismaMock.typebotSession.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ tenantId: tenantB }),
    });
    expect(typebot.start).toHaveBeenCalledWith({
      publicId: "agenda-b",
      apiBaseUrl: "https://agenda.example.com",
      tenantSlug: "tenant-b",
      typebotApiKey: "agz_tb_tenant_b",
      phone: "5511999999999",
    });
  });

  it("reiniciar encerra a sessão anterior e inicia uma nova", async () => {
    prismaMock.typebotSession.findFirst.mockResolvedValue(session({ externalSessionId: "old" }));
    prismaMock.whatsAppInboundMessage.findUnique.mockResolvedValue(inbound({ messageText: "reiniciar" }));
    const typebot = { start: vi.fn().mockResolvedValue({ sessionId: "new", text: "Menu" }), continue: vi.fn() };
    const provider = { sendText: vi.fn().mockResolvedValue({ externalMessageId: "out-3" }) };

    await processWhatsAppConversationMessage("inbound-c", { now, typebot, provider: provider as never });

    expect(prismaMock.typebotSession.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { tenantId, activePhone: "5511999999999", endedAt: null },
    }));
    expect(typebot.start).toHaveBeenCalledOnce();
    expect(typebot.start).toHaveBeenCalledWith(expect.objectContaining({
      tenantSlug: "tenant-a",
      phone: "5511999999999",
    }));
    expect(typebot.continue).not.toHaveBeenCalled();
  });

  it("continua a sessão no ponto atual antes de 30 minutos", async () => {
    prismaMock.typebotSession.findFirst.mockResolvedValue(session({
      externalSessionId: "typebot-session-a",
      lastInteractionAt: new Date(now.getTime() - (30 * 60_000 - 1)),
    }));
    prismaMock.whatsAppInboundMessage.findUnique.mockResolvedValue(
      inbound({ messageText: "Resposta atual" }),
    );
    const typebot = {
      start: vi.fn(),
      continue: vi.fn().mockResolvedValue({ text: "Próximo passo" }),
    };
    const provider = { sendText: vi.fn().mockResolvedValue({ externalMessageId: "out-active" }) };

    await processWhatsAppConversationMessage("inbound-active", {
      now,
      typebot,
      provider: provider as never,
    });

    expect(typebot.continue).toHaveBeenCalledWith({
      sessionId: "typebot-session-a",
      message: "Resposta atual",
    });
    expect(typebot.start).not.toHaveBeenCalled();
  });

  it("expira aos 30 minutos, ignora opção antiga e inicia uma nova sessão", async () => {
    prismaMock.typebotSession.findFirst.mockResolvedValue(session({
      externalSessionId: "typebot-session-a",
      lastInteractionAt: new Date(now.getTime() - 30 * 60_000),
    }));
    prismaMock.whatsAppInboundMessage.findUnique.mockResolvedValue(
      inbound({ messageText: "2" }),
    );
    prismaMock.whatsAppInboundMessage.findMany.mockResolvedValue([{
      responseText: "Escolha um horário",
      responsePayload: {
        text: "Escolha um horário",
        interaction: {
          type: "choice input",
          choices: [
            { id: "slot-1", value: "2026-07-16T09:00:00-03:00", label: "09:00" },
            { id: "slot-2", value: "2026-07-16T10:00:00-03:00", label: "10:00" },
          ],
        },
      },
    }]);
    const typebot = {
      start: vi.fn().mockResolvedValue({ sessionId: "typebot-session-new", text: "Novo menu" }),
      continue: vi.fn(),
    };
    const provider = { sendText: vi.fn().mockResolvedValue({ externalMessageId: "out-restarted" }) };

    await processWhatsAppConversationMessage("inbound-expired", {
      now,
      typebot,
      provider: provider as never,
    });

    expect(prismaMock.typebotSession.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { tenantId, activePhone: "5511999999999", endedAt: null },
    }));
    expect(typebot.start).toHaveBeenCalledOnce();
    expect(typebot.continue).not.toHaveBeenCalled();
    expect(prismaMock.whatsAppInboundMessage.findMany).not.toHaveBeenCalled();
    expect(provider.sendText).toHaveBeenCalledWith(expect.objectContaining({
      text: expect.stringContaining(
        "Como passou algum tempo, vamos começar novamente para consultar horários atualizados.",
      ),
    }));
  });

  it("handoff pausa mensagens seguintes até o timeout", async () => {
    prismaMock.typebotSession.findFirst.mockResolvedValue(session({
      externalSessionId: "typebot-session-a",
      handoffUntil: new Date("2026-07-15T13:00:00.000Z"),
    }));
    prismaMock.whatsAppInboundMessage.findUnique.mockResolvedValue(inbound({ messageText: "Preciso de ajuda" }));
    const typebot = { start: vi.fn(), continue: vi.fn() };
    const provider = { sendText: vi.fn() };

    await processWhatsAppConversationMessage("inbound-d", { now, typebot, provider: provider as never });

    expect(typebot.start).not.toHaveBeenCalled();
    expect(typebot.continue).not.toHaveBeenCalled();
    expect(provider.sendText).not.toHaveBeenCalled();
    expect(prismaMock.whatsAppInboundMessage.update).toHaveBeenCalledWith({
      where: { id: expect.any(String) },
      data: expect.objectContaining({ status: "IGNORED" }),
    });
  });

  it("ativa a pausa quando o cliente escolhe falar com atendente", async () => {
    prismaMock.typebotSession.findFirst.mockResolvedValue(session({ externalSessionId: "typebot-session-a" }));
    prismaMock.whatsAppInboundMessage.findUnique.mockResolvedValue(inbound({ messageText: "2" }));
    prismaMock.whatsAppInboundMessage.findMany.mockResolvedValue([{
      responseText: "Como podemos ajudar?",
      responsePayload: {
        text: "Como podemos ajudar?",
        interaction: {
          type: "choice input",
          choices: [
            { id: "i_intent_booking", value: "Agendar um horário", label: "Agendar um horário" },
            { id: "i_intent_handoff", value: "Falar com atendente", label: "Falar com atendente" },
          ],
        },
      },
    }]);
    const typebot = {
      start: vi.fn(),
      continue: vi.fn().mockResolvedValue({ text: "O atendimento continuará com o estabelecimento." }),
    };
    const provider = { sendText: vi.fn().mockResolvedValue({ externalMessageId: "out-handoff" }) };

    await processWhatsAppConversationMessage("inbound-handoff", {
      now,
      typebot,
      provider: provider as never,
    });

    expect(prismaMock.typebotSession.update).toHaveBeenCalledWith({
      where: { id: expect.any(String) },
      data: expect.objectContaining({ handoffUntil: new Date("2026-07-16T12:00:00.000Z") }),
    });
    expect(provider.sendText).toHaveBeenCalledOnce();
  });

  it("não ativa handoff por texto livre igual ao label", async () => {
    prismaMock.typebotSession.findFirst.mockResolvedValue(
      session({ externalSessionId: "typebot-session-a" }),
    );
    prismaMock.whatsAppInboundMessage.findUnique.mockResolvedValue(
      inbound({ messageText: "Falar com atendente" }),
    );
    const typebot = {
      start: vi.fn(),
      continue: vi.fn().mockResolvedValue({ text: "Resposta livre" }),
    };
    const provider = { sendText: vi.fn().mockResolvedValue({ externalMessageId: "out-free" }) };

    await processWhatsAppConversationMessage("inbound-free-handoff-label", {
      now,
      typebot,
      provider: provider as never,
    });

    expect(typebot.continue).toHaveBeenCalledWith({
      sessionId: "typebot-session-a",
      message: "Falar com atendente",
    });
    expect(prismaMock.typebotSession.update).not.toHaveBeenCalledWith({
      where: { id: expect.any(String) },
      data: expect.objectContaining({
        handoffUntil: new Date("2026-07-16T12:00:00.000Z"),
      }),
    });
  });

  it.each(["Falar com atendente", "Encerrar atendimento"])(
    "não trata choice homônima não canônica como ação terminal: %s",
    async (label) => {
      prismaMock.typebotSession.findFirst.mockResolvedValue(
        session({ externalSessionId: "typebot-session-a" }),
      );
      prismaMock.whatsAppInboundMessage.findUnique.mockResolvedValue(
        inbound({ messageText: "1" }),
      );
      prismaMock.whatsAppInboundMessage.findMany.mockResolvedValue([{
        responseText: "Escolha o serviço",
        responsePayload: {
          text: "Escolha o serviço",
          interaction: {
            type: "choice input",
            choices: [{ id: "service-option", value: label, label }],
          },
        },
      }]);
      const typebot = {
        start: vi.fn(),
        continue: vi.fn().mockResolvedValue({ text: "Serviço selecionado" }),
      };
      const provider = {
        sendText: vi.fn().mockResolvedValue({ externalMessageId: "out-collision" }),
      };

      await processWhatsAppConversationMessage(`inbound-collision-${label}`, {
        now,
        typebot,
        provider: provider as never,
      });

      expect(typebot.continue).toHaveBeenCalledWith({
        sessionId: "typebot-session-a",
        message: label,
      });
      expect(prismaMock.typebotSession.updateMany).not.toHaveBeenCalled();
      expect(prismaMock.typebotSession.update).toHaveBeenLastCalledWith({
        where: { id: session().id },
        data: expect.objectContaining({
          activePhone: "5511999999999",
          endedAt: null,
          handoffUntil: null,
        }),
      });
    },
  );

  it("retry da escolha de handoff continua a mesma sessão sem desfazer a pausa", async () => {
    const pendingMetadata = {
      channelPhoneInjected: true,
      channel: "WHATSAPP",
      conversationId: "5511999999999",
      handoffRequested: true,
      pendingHandoffInboundMessageId: inbound().id,
    };
    prismaMock.typebotSession.findFirst
      .mockResolvedValueOnce(session({ externalSessionId: "typebot-session-a" }))
      .mockResolvedValueOnce(session({
        externalSessionId: "typebot-session-a",
        handoffUntil: new Date("2026-07-16T12:00:00.000Z"),
        metadata: pendingMetadata,
      }));
    prismaMock.whatsAppInboundMessage.findUnique.mockResolvedValue(
      inbound({ messageText: "2" }),
    );
    prismaMock.whatsAppInboundMessage.findMany.mockResolvedValue([{
      responseText: "Como podemos ajudar?",
      responsePayload: {
        text: "Como podemos ajudar?",
        interaction: {
          type: "choice input",
          choices: [
            { id: "i_intent_booking", value: "Agendar um horário", label: "Agendar um horário" },
            { id: "i_intent_handoff", value: "Falar com atendente", label: "Falar com atendente" },
          ],
        },
      },
    }]);
    const typebot = {
      start: vi.fn(),
      continue: vi.fn()
        .mockRejectedValueOnce(new TypebotChatError("UNAVAILABLE", true))
        .mockResolvedValueOnce({ text: "Conversa transferida" }),
    };
    const provider = { sendText: vi.fn().mockResolvedValue({ externalMessageId: "out-retry" }) };

    await expect(processWhatsAppConversationMessage("inbound-handoff-retry", {
      now,
      typebot,
      provider: provider as never,
    })).rejects.toBeInstanceOf(TypebotChatError);

    await processWhatsAppConversationMessage("inbound-handoff-retry", {
      now,
      typebot,
      provider: provider as never,
    });

    expect(typebot.continue).toHaveBeenCalledTimes(2);
    expect(typebot.start).not.toHaveBeenCalled();
    expect(prismaMock.typebotSession.updateMany).not.toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ activePhone: null }),
      }),
    );
    expect(provider.sendText).toHaveBeenCalledWith(expect.objectContaining({
      text: "Conversa transferida",
    }));
  });

  it("mantém o handoff com menos de 30 minutos sem renovar o teto de 24 horas", async () => {
    const absoluteLimit = new Date("2026-07-16T09:00:00.000Z");
    prismaMock.typebotSession.findFirst.mockResolvedValue(session({
      externalSessionId: "typebot-session-a",
      handoffUntil: absoluteLimit,
      lastInteractionAt: new Date("2026-07-15T11:31:00.000Z"),
    }));
    prismaMock.whatsAppInboundMessage.findUnique.mockResolvedValue(
      inbound({ messageText: "Ainda preciso de ajuda" }),
    );
    const typebot = { start: vi.fn(), continue: vi.fn() };
    const provider = { sendText: vi.fn() };

    await processWhatsAppConversationMessage("inbound-handoff-renew", {
      now,
      typebot,
      provider: provider as never,
    });

    expect(typebot.start).not.toHaveBeenCalled();
    expect(typebot.continue).not.toHaveBeenCalled();
    expect(prismaMock.typebotSession.update).toHaveBeenCalledWith({
      where: { id: session().id },
      data: {
        lastInteractionAt: now,
      },
    });
    expect(prismaMock.whatsAppInboundMessage.update).toHaveBeenCalledWith({
      where: { id: inbound().id },
      data: expect.objectContaining({
        status: "IGNORED",
        typebotSessionId: session().id,
      }),
    });
  });

  it("retoma automaticamente o bot após 30 minutos sem mensagens", async () => {
    prismaMock.typebotSession.findFirst.mockResolvedValue(session({
      externalSessionId: "typebot-session-a",
      handoffUntil: new Date("2026-07-16T12:00:00.000Z"),
      lastInteractionAt: new Date("2026-07-15T11:30:00.000Z"),
    }));
    prismaMock.whatsAppInboundMessage.findUnique.mockResolvedValue(
      inbound({ messageText: "Preciso de ajuda novamente" }),
    );
    const typebot = {
      start: vi.fn().mockResolvedValue({ sessionId: "new-after-handoff", text: "Como posso ajudar?" }),
      continue: vi.fn(),
    };
    const provider = { sendText: vi.fn().mockResolvedValue({ externalMessageId: "out-resumed" }) };

    await processWhatsAppConversationMessage("inbound-after-handoff-idle", {
      now,
      typebot,
      provider: provider as never,
    });

    expect(prismaMock.typebotSession.updateMany).toHaveBeenCalledWith({
      where: { tenantId, activePhone: "5511999999999", endedAt: null },
      data: expect.objectContaining({ activePhone: null, handoffUntil: null }),
    });
    expect(typebot.continue).not.toHaveBeenCalled();
    expect(typebot.start).toHaveBeenCalledOnce();
    expect(provider.sendText).toHaveBeenCalledWith(expect.objectContaining({
      text: "Olá! Vou retomar o atendimento automático para ajudar você.\n\nComo posso ajudar?",
    }));
  });

  it("handoff de A não afeta B no mesmo tenant", async () => {
    const customerB = "5511888888888";
    prismaMock.whatsAppInboundMessage.findUnique.mockResolvedValue(inbound({
      senderPhone: customerB,
      messageText: "Olá",
    }));
    prismaMock.typebotSession.findFirst.mockResolvedValue(null);
    prismaMock.typebotSession.create.mockResolvedValue(session({
      phone: customerB,
      activePhone: customerB,
    }));
    const typebot = {
      start: vi.fn().mockResolvedValue({ sessionId: "typebot-session-b", text: "Menu B" }),
      continue: vi.fn(),
    };
    const provider = { sendText: vi.fn().mockResolvedValue({ externalMessageId: "out-b" }) };

    await processWhatsAppConversationMessage("inbound-customer-b", {
      now,
      typebot,
      provider: provider as never,
    });

    expect(prismaMock.typebotSession.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { tenantId, activePhone: customerB, endedAt: null },
    }));
    expect(typebot.start).toHaveBeenCalledOnce();
  });

  it("menu encerra somente o handoff da conversa atual", async () => {
    prismaMock.typebotSession.findFirst.mockResolvedValue(session({
      externalSessionId: "typebot-session-a",
      handoffUntil: new Date("2026-07-16T12:00:00.000Z"),
    }));
    prismaMock.whatsAppInboundMessage.findUnique.mockResolvedValue(inbound({ messageText: "menu" }));
    const typebot = {
      start: vi.fn().mockResolvedValue({ sessionId: "new-menu", text: "Menu" }),
      continue: vi.fn(),
    };
    const provider = { sendText: vi.fn().mockResolvedValue({ externalMessageId: "out-menu" }) };

    await processWhatsAppConversationMessage("inbound-menu-handoff", {
      now,
      typebot,
      provider: provider as never,
    });

    expect(prismaMock.typebotSession.updateMany).toHaveBeenCalledWith({
      where: { tenantId, activePhone: "5511999999999", endedAt: null },
      data: expect.objectContaining({
        activePhone: null,
        handoffUntil: null,
      }),
    });
    expect(typebot.start).toHaveBeenCalledOnce();
    expect(typebot.continue).not.toHaveBeenCalled();
  });

  it("opção 3 encerra a conversa sem ativar handoff", async () => {
    prismaMock.typebotSession.findFirst.mockResolvedValue(
      session({ externalSessionId: "typebot-session-a" }),
    );
    prismaMock.whatsAppInboundMessage.findUnique.mockResolvedValue(
      inbound({ messageText: "3" }),
    );
    prismaMock.whatsAppInboundMessage.findMany.mockResolvedValue([{
      responseText: "Como podemos ajudar?",
      responsePayload: {
        text: "Como podemos ajudar?",
        interaction: {
          type: "choice input",
          choices: [
            { id: "booking", value: "Agendar um horário", label: "Agendar um horário" },
            { id: "i_intent_handoff", value: "Falar com atendente", label: "Falar com atendente" },
            { id: "i_intent_end", value: "Encerrar atendimento", label: "Encerrar atendimento" },
          ],
        },
      },
    }]);
    const typebot = {
      start: vi.fn(),
      continue: vi.fn().mockResolvedValue({
        text: "Atendimento encerrado.\n\nQuando precisar, é só mandar uma nova mensagem por aqui.",
      }),
    };
    const provider = { sendText: vi.fn().mockResolvedValue({ externalMessageId: "out-ended" }) };

    await processWhatsAppConversationMessage("inbound-end", {
      now,
      typebot,
      provider: provider as never,
    });

    expect(typebot.continue).toHaveBeenCalledWith({
      sessionId: "typebot-session-a",
      message: "Encerrar atendimento",
    });
    expect(typebot.start).not.toHaveBeenCalled();
    expect(prismaMock.typebotSession.update).toHaveBeenCalledWith({
      where: { id: session().id },
      data: expect.objectContaining({
        activePhone: null,
        endedAt: now,
        handoffUntil: null,
        status: "ABANDONED",
        metadata: expect.objectContaining({
          channel: "WHATSAPP",
          conversationId: "5511999999999",
          handoffRequested: false,
          endReason: "CUSTOMER_ENDED",
        }),
      }),
    });
    expect(provider.sendText).toHaveBeenCalledWith(expect.objectContaining({
      text: "Atendimento encerrado.\n\nQuando precisar, é só mandar uma nova mensagem por aqui.",
    }));
  });

  it.each(["APPOINTMENT_REQUESTED", "APPOINTMENT_CONFIRMED"] as const)(
    "encerra a sessão e suprime o texto final quando existe %s entregável",
    async (outboxType) => {
    prismaMock.typebotSession.findFirst.mockResolvedValue(
      session({ externalSessionId: "typebot-session-a", status: "IDENTIFIED" }),
    );
    prismaMock.typebotSession.findUnique.mockResolvedValue({
      status: "APPOINTMENT_CREATED",
      lastAppointmentId: "00000000-0000-4000-8000-000000000099",
    });
    prismaMock.whatsAppMessageOutbox.findFirst.mockResolvedValue({
      id: "00000000-0000-4000-8000-000000000098",
      type: outboxType,
    });
    prismaMock.whatsAppInboundMessage.findUnique.mockResolvedValue(
      inbound({ messageText: "1" }),
    );
    prismaMock.whatsAppInboundMessage.findMany.mockResolvedValue([
      {
        responseText: "Está tudo certo?",
        responsePayload: {
          text: "Está tudo certo?",
          interaction: {
            type: "choice input",
            choices: [
              {
                id: "i_summary_confirm",
                value: "Confirmar solicitação",
                label: "Confirmar solicitação",
              },
              { id: "i_summary_back", value: "Voltar", label: "Voltar" },
            ],
          },
        },
      },
    ]);
    const typebot = {
      start: vi.fn(),
      continue: vi.fn().mockResolvedValue({
        sessionId: "typebot-session-a",
        text: "Solicitação enviada! ✅",
      }),
    };
    const provider = {
      sendText: vi.fn().mockResolvedValue({ externalMessageId: "out-created" }),
    };

    await processWhatsAppConversationMessage("inbound-created", {
      now,
      typebot,
      provider: provider as never,
    });

    expect(typebot.continue).toHaveBeenCalledWith({
      sessionId: "typebot-session-a",
      message: "Confirmar solicitação",
    });
    const update = prismaMock.typebotSession.update.mock.calls.at(-1)?.[0];
    expect(update).toEqual({
      where: { id: session().id },
      data: expect.objectContaining({
        activePhone: null,
        endedAt: now,
        handoffUntil: null,
        metadata: expect.objectContaining({
          endReason: "APPOINTMENT_CREATED",
        }),
      }),
    });
    expect(update?.data).not.toHaveProperty("status");
    expect(prismaMock.whatsAppMessageOutbox.findFirst).toHaveBeenCalledWith({
      where: {
        tenantId,
        appointmentId: "00000000-0000-4000-8000-000000000099",
        type: { in: ["APPOINTMENT_REQUESTED", "APPOINTMENT_CONFIRMED"] },
        status: {
          in: ["PENDING", "QUEUED", "PROCESSING", "RETRYING", "SENT"],
        },
      },
      select: { id: true, type: true },
    });
    const inboundUpdate = prismaMock.whatsAppInboundMessage.update.mock.calls.at(-1)?.[0];
    expect(inboundUpdate?.data.responsePayload).toEqual(
      expect.objectContaining({ suppressedByTransactionalOutbox: true }),
    );
    expect(provider.sendText).not.toHaveBeenCalled();
  });

  it("mantém o texto final do Typebot como fallback quando a outbox não existe", async () => {
    prismaMock.typebotSession.findFirst.mockResolvedValue(
      session({ externalSessionId: "typebot-session-a", status: "IDENTIFIED" }),
    );
    prismaMock.typebotSession.findUnique.mockResolvedValue({
      status: "APPOINTMENT_CREATED",
      lastAppointmentId: "00000000-0000-4000-8000-000000000099",
    });
    prismaMock.whatsAppInboundMessage.findUnique.mockResolvedValue(
      inbound({ messageText: "1" }),
    );
    prismaMock.whatsAppInboundMessage.findMany.mockResolvedValue([
      {
        responseText: "Está tudo certo?",
        responsePayload: {
          text: "Está tudo certo?",
          interaction: {
            type: "choice input",
            choices: [
              {
                id: "i_summary_confirm",
                value: "Confirmar solicitação",
                label: "Confirmar solicitação",
              },
            ],
          },
        },
      },
    ]);
    const typebot = {
      start: vi.fn(),
      continue: vi.fn().mockResolvedValue({
        sessionId: "typebot-session-a",
        text: "Solicitação enviada! ✅",
      }),
    };
    const provider = {
      sendText: vi.fn().mockResolvedValue({ externalMessageId: "out-fallback" }),
    };

    await processWhatsAppConversationMessage("inbound-created-fallback", {
      now,
      typebot,
      provider: provider as never,
    });

    expect(provider.sendText).toHaveBeenCalledWith(
      expect.objectContaining({ text: "Solicitação enviada! ✅" }),
    );
  });

  it("retry de resposta suprimida não chama Typebot nem Evolution novamente", async () => {
    prismaMock.whatsAppInboundMessage.findUnique.mockResolvedValue(
      inbound({
        responseText: "Solicitação enviada! ✅",
        responsePayload: {
          text: "Solicitação enviada! ✅",
          suppressedByTransactionalOutbox: true,
        },
      }),
    );
    const typebot = { start: vi.fn(), continue: vi.fn() };
    const provider = { sendText: vi.fn() };

    await processWhatsAppConversationMessage("inbound-suppressed-retry", {
      now,
      typebot,
      provider: provider as never,
    });

    expect(typebot.start).not.toHaveBeenCalled();
    expect(typebot.continue).not.toHaveBeenCalled();
    expect(provider.sendText).not.toHaveBeenCalled();
  });

  it("mensagem posterior ao encerramento inicia uma nova sessão", async () => {
    prismaMock.typebotSession.findFirst.mockResolvedValue(null);
    prismaMock.whatsAppInboundMessage.findUnique.mockResolvedValue(inbound({ messageText: "Oi novamente" }));
    const typebot = {
      start: vi.fn().mockResolvedValue({ sessionId: "new-after-end", text: "Novo menu" }),
      continue: vi.fn(),
    };
    const provider = { sendText: vi.fn().mockResolvedValue({ externalMessageId: "out-after-end" }) };

    await processWhatsAppConversationMessage("inbound-after-end", {
      now,
      typebot,
      provider: provider as never,
    });

    expect(typebot.start).toHaveBeenCalledOnce();
    expect(typebot.continue).not.toHaveBeenCalled();
  });

  it("evento duplicado não aplica encerramento novamente", async () => {
    prismaMock.whatsAppInboundMessage.updateMany.mockResolvedValue({ count: 0 });
    const typebot = { start: vi.fn(), continue: vi.fn() };
    const provider = { sendText: vi.fn() };

    await processWhatsAppConversationMessage("inbound-end-duplicate", {
      now,
      typebot,
      provider: provider as never,
    });

    expect(prismaMock.whatsAppInboundMessage.findUnique).not.toHaveBeenCalled();
    expect(prismaMock.typebotSession.update).not.toHaveBeenCalled();
    expect(prismaMock.typebotSession.updateMany).not.toHaveBeenCalled();
    expect(typebot.start).not.toHaveBeenCalled();
    expect(typebot.continue).not.toHaveBeenCalled();
  });

  it("não perde mensagem em falha temporária e envia fallback uma vez", async () => {
    const typebot = {
      start: vi.fn().mockRejectedValue(new TypebotChatError("UNAVAILABLE", true)),
      continue: vi.fn(),
    };
    const provider = { sendText: vi.fn().mockResolvedValue({ externalMessageId: "fallback" }) };

    await processWhatsAppConversationMessage("inbound-e", {
      now,
      typebot,
      provider: provider as never,
      maxQuickAttempts: 1,
    });

    expect(provider.sendText).toHaveBeenCalledWith(expect.objectContaining({ text: expect.stringContaining("temporariamente indisponível") }));
    expect(prismaMock.whatsAppInboundMessage.update).toHaveBeenLastCalledWith({
      where: { id: expect.any(String) },
      data: expect.objectContaining({ status: "RETRYING", nextAttemptAt: expect.any(Date) }),
    });
  });
});
