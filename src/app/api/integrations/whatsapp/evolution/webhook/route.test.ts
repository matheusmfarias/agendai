import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { connection, inbound, outbox, receipt, session, prismaMock } = vi.hoisted(() => {
  const connectionClient = { findUnique: vi.fn(), updateMany: vi.fn() };
  const inboundClient = { createMany: vi.fn() };
  const outboxClient = { updateMany: vi.fn() };
  const receiptClient = { findFirst: vi.fn() };
  const sessionClient = { findFirst: vi.fn(), updateMany: vi.fn() };
  const tx = {
    whatsAppConnection: connectionClient,
    whatsAppMessageOutbox: outboxClient,
    whatsAppInboundMessage: inboundClient,
    whatsAppSentMessageReceipt: receiptClient,
    typebotSession: sessionClient,
  };
  return {
    connection: connectionClient,
    inbound: inboundClient,
    outbox: outboxClient,
    receipt: receiptClient,
    session: sessionClient,
    prismaMock: {
      $transaction: vi.fn(async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx)),
    },
  };
});
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/features/whatsapp/whatsapp-config", () => ({ getWhatsAppConfig: () => ({ enabled: true, webhookSecret: "s".repeat(32) }) }));

import { POST } from "@/app/api/integrations/whatsapp/evolution/webhook/route";

function request(body: unknown, secret: string | null = "s".repeat(32)) {
  return new NextRequest("http://localhost/api/integrations/whatsapp/evolution/webhook", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(secret ? { "x-agendai-webhook-secret": secret } : {}),
    },
    body: JSON.stringify(body),
  });
}

describe("Evolution webhook", () => {
  const connectionId = crypto.randomUUID();
  const tenantId = crypto.randomUUID();
  beforeEach(() => {
    vi.clearAllMocks();
    connection.findUnique.mockResolvedValue({ id: connectionId, tenantId });
    connection.updateMany.mockResolvedValue({ count: 1 });
    outbox.updateMany.mockResolvedValue({ count: 1 });
    inbound.createMany.mockResolvedValue({ count: 1 });
    receipt.findFirst.mockResolvedValue(null);
    session.findFirst.mockResolvedValue(null);
    session.updateMany.mockResolvedValue({ count: 1 });
  });
  afterEach(() => vi.restoreAllMocks());

  it.each([null, "wrong"])("rejeita segredo ausente ou inválido: %s", async (secret) => {
    expect((await POST(request({ event: "connection.update" }, secret))).status).toBe(401);
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("antecipa todo RETRYING da conexão no state=open, inclusive INSTANCE_NOT_FOUND", async () => {
    const response = await POST(request({
      event: "connection.update",
      instance: "agendai_x",
      data: { state: "open", tenantId: crypto.randomUUID() },
      destination: "http://host.docker.internal:3000/webhook",
      date_time: "2026-07-14T12:00:00.000Z",
      server_url: "http://localhost:8080",
    }));
    expect(response.status).toBe(200);
    expect(connection.findUnique).toHaveBeenCalledWith({
      where: { instanceName: "agendai_x" },
      select: { id: true, tenantId: true },
    });
    expect(connection.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: connectionId, tenantId },
      data: expect.objectContaining({ status: "CONNECTED" }),
    }));
    expect(outbox.updateMany).toHaveBeenCalledWith({
      where: {
        tenantId,
        connectionId,
        status: "RETRYING",
      },
      data: { nextAttemptAt: expect.any(Date) },
    });
  });

  it("aceita connection.update real com state=connecting e instância dentro de data", async () => {
    const response = await POST(request({
      event: "connection.update",
      data: { instance: "agendai_nested", state: "connecting" },
    }));
    expect(response.status).toBe(200);
    expect(connection.findUnique).toHaveBeenCalledWith({
      where: { instanceName: "agendai_nested" },
      select: { id: true, tenantId: true },
    });
    expect(connection.updateMany).toHaveBeenCalledWith({
      where: { id: connectionId, tenantId },
      data: { status: "CONNECTING" },
    });
    expect(outbox.updateMany).not.toHaveBeenCalled();
  });

  it("aceita connection.update real com state=close", async () => {
    await POST(request({ event: "connection.update", instance: "agendai_x", data: { state: "close" } }));
    expect(connection.updateMany).toHaveBeenCalledWith({
      where: { id: connectionId, tenantId },
      data: { status: "DISCONNECTED", disconnectedAt: expect.any(Date) },
    });
    expect(outbox.updateMany).not.toHaveBeenCalled();
  });

  it("aceita qrcode.updated real sem persistir o QR", async () => {
    await POST(request({ event: "qrcode.updated", instance: "agendai_x", data: { qrcode: "valor-que-não-deve-ser-logado" } }));
    expect(connection.updateMany).toHaveBeenLastCalledWith({
      where: { id: connectionId, tenantId },
      data: { status: "AWAITING_QR" },
    });
    expect(outbox.updateMany).not.toHaveBeenCalled();
  });

  it("rejeita evento desconhecido e registra somente diagnóstico seguro", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const response = await POST(request({
      event: "evento.desconhecido",
      instance: "agendai_x",
      data: { phone: "5511999999999", qrcode: "segredo-do-qr" },
    }));
    expect(response.status).toBe(400);
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
    const diagnostic = JSON.stringify(warn.mock.calls);
    expect(diagnostic).toContain("receivedFields");
    expect(diagnostic).toContain("dataFields");
    expect(diagnostic).not.toContain("5511999999999");
    expect(diagnostic).not.toContain("segredo-do-qr");
  });

  it("persiste mensagem recebida tenant-safe para processamento assíncrono", async () => {
    connection.findUnique.mockResolvedValue({ id: connectionId, tenantId, enabled: true });
    const response = await POST(request({
      event: "messages.upsert",
      instance: "agendai_x",
      data: {
        key: {
          id: "message-1",
          remoteJid: "5511987654321@s.whatsapp.net",
          fromMe: false,
        },
        message: { conversation: "Olá" },
        messageType: "conversation",
      },
    }));
    expect(response.status).toBe(200);
    expect(connection.findUnique).toHaveBeenCalledWith({
      where: { instanceName: "agendai_x" },
      select: { id: true, tenantId: true, enabled: true },
    });
    expect(inbound.createMany).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tenantId,
        connectionId,
        messageId: "message-1",
        senderPhone: "11987654321",
        messageText: "Olá",
      }),
      skipDuplicates: true,
    });
  });

  it("persiste payload conversation da Evolution 2.3.6 com remoteJid LID", async () => {
    connection.findUnique.mockResolvedValue({ id: connectionId, tenantId, enabled: true });
    const response = await POST(request({
      event: "messages.upsert",
      instance: "agendai_x",
      data: {
        key: {
          id: "message-lid",
          remoteJid: "123456789@lid",
          remoteJidAlt: "555591884991@s.whatsapp.net",
          fromMe: false,
        },
        messageType: "conversation",
        message: { conversation: "Olá pelo LID" },
      },
    }));

    expect(response.status).toBe(200);
    expect(inbound.createMany).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tenantId,
        connectionId,
        messageId: "message-lid",
        senderPhone: "5591884991",
        messageText: "Olá pelo LID",
      }),
      skipDuplicates: true,
    });
  });

  it("ignora grupo sem persistir", async () => {
    const data = { key: { id: "group", remoteJid: "120363@g.us", remoteJidAlt: "5511987654321@s.whatsapp.net", fromMe: false }, message: { conversation: "grupo" } };
    const response = await POST(request({ event: "messages.upsert", instance: "agendai_x", data }));
    expect(response.status).toBe(200);
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("intervenção manual ativa o mesmo handoff somente para a conversa", async () => {
    connection.findUnique.mockResolvedValue({ id: connectionId, tenantId, enabled: true });
    const absoluteLimit = new Date("2099-07-16T09:00:00.000Z");
    session.findFirst.mockResolvedValue({
      id: crypto.randomUUID(),
      metadata: { channelPhoneInjected: true },
      handoffUntil: absoluteLimit,
    });
    const response = await POST(request({
      event: "messages.upsert",
      instance: "agendai_x",
      data: {
        key: { id: "manual-1", remoteJid: "5511987654321@s.whatsapp.net", fromMe: true },
        message: { conversation: "Atendimento manual" },
      },
    }));

    expect(response.status).toBe(200);
    expect(receipt.findFirst).toHaveBeenCalledWith({
      where: { tenantId, connectionId, externalMessageId: "manual-1" },
      select: { id: true },
    });
    expect(session.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        tenantId,
        activePhone: "11987654321",
        endedAt: null,
      }),
      data: expect.objectContaining({
        handoffUntil: absoluteLimit,
        metadata: expect.objectContaining({ handoffOrigin: "HUMAN_INTERVENED" }),
      }),
    }));
  });

  it("mensagem enviada pelo Agendaí não ativa handoff", async () => {
    connection.findUnique.mockResolvedValue({ id: connectionId, tenantId, enabled: true });
    receipt.findFirst.mockResolvedValue({ id: crypto.randomUUID() });
    const response = await POST(request({
      event: "messages.upsert",
      instance: "agendai_x",
      data: {
        key: { id: "bot-1", remoteJid: "5511987654321@s.whatsapp.net", fromMe: true },
        message: { conversation: "Resposta automática" },
      },
    }));

    expect(response.status).toBe(200);
    expect(session.findFirst).not.toHaveBeenCalled();
    expect(session.updateMany).not.toHaveBeenCalled();
    expect(inbound.createMany).not.toHaveBeenCalled();
  });

  it("trata messageId repetido como duplicado", async () => {
    connection.findUnique.mockResolvedValue({ id: connectionId, tenantId, enabled: true });
    inbound.createMany.mockResolvedValue({ count: 0 });
    const response = await POST(request({
      event: "messages.upsert",
      instance: "agendai_x",
      data: {
        key: { id: "same", remoteJid: "5511987654321@s.whatsapp.net", fromMe: false },
        message: { extendedTextMessage: { text: "Continuar" } },
      },
    }));
    await expect(response.json()).resolves.toEqual({ accepted: true, matched: true, duplicate: true });
  });

  it("retorna sucesso idempotente quando a instância não está cadastrada", async () => {
    connection.findUnique.mockResolvedValue(null);
    const response = await POST(request({
      event: "connection.update",
      instance: "instancia_desconhecida",
      data: { state: "open", tenantId: crypto.randomUUID() },
    }));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ accepted: true, matched: false });
    expect(connection.updateMany).not.toHaveBeenCalled();
    expect(outbox.updateMany).not.toHaveBeenCalled();
  });
});
