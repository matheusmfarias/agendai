import { beforeEach, describe, expect, it, vi } from "vitest";

const { outbox, receipt, sendText, prismaMock } = vi.hoisted(() => {
  const outboxClient = { updateMany: vi.fn(), findUnique: vi.fn(), update: vi.fn() };
  const receiptClient = { createMany: vi.fn() };
  const mock = {
    whatsAppMessageOutbox: outboxClient,
    whatsAppSentMessageReceipt: receiptClient,
    $transaction: vi.fn(async (callback: (client: unknown) => Promise<unknown>) => callback(mock)),
  };
  return { outbox: outboxClient, receipt: receiptClient, sendText: vi.fn(), prismaMock: mock };
});
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/features/whatsapp/whatsapp-provider-factory", () => ({ createWhatsAppProvider: () => ({ sendText }) }));

import { processWhatsAppOutbox } from "@/workers/whatsapp-worker";
import { WhatsAppError } from "@/features/whatsapp/whatsapp-errors";

const id = crypto.randomUUID();
const tenantId = crypto.randomUUID();
const appointmentId = crypto.randomUUID();
const connectionId = crypto.randomUUID();
const now = new Date("2026-07-14T12:00:00.000Z");
const startsAt = new Date("2026-07-15T12:30:00.000Z");
const payload = { businessName: "Studio", customerName: "Ana", serviceName: "Corte", bookingDate: "15/07/2026", bookingTime: "09:30", appointmentId, messageTemplate: "Olá, {cliente}. {serviço} em {data} às {hora}." };
const tenant = {
  status: "ACTIVE",
  subscription: {
    status: "ACTIVE",
    expiresAt: new Date("2027-01-01T00:00:00.000Z"),
    plan: { publicLinkEnabled: true, whatsappEnabled: true },
  },
};
function persistedConnection(overrides: Record<string, unknown> = {}) {
  return { id: connectionId, tenantId, enabled: true, status: "CONNECTED", instanceName: "agendai_x", connectedAt: new Date("2026-07-13T10:00:00.000Z"), tenant, ...overrides };
}
function message(overrides: Record<string, unknown> = {}) {
  return { id, tenantId, appointmentId, idempotencyKey: `appointment:${appointmentId}:confirmed:v1`, type: "APPOINTMENT_CONFIRMED", recipientPhone: "5511987654321", payload, attempts: 1, createdAt: new Date("2026-07-14T11:00:00.000Z"), scheduledFor: null, appointment: { id: appointmentId, tenantId, startsAt, status: "CONFIRMED" }, connection: persistedConnection(), ...overrides };
}

describe("WhatsApp worker", () => {
  beforeEach(() => { vi.clearAllMocks(); outbox.updateMany.mockResolvedValue({ count: 1 }); outbox.findUnique.mockResolvedValue(message()); outbox.update.mockResolvedValue({}); receipt.createMany.mockResolvedValue({ count: 1 }); sendText.mockResolvedValue({ externalMessageId: "remote-1" }); });
  it("mantém em RETRYING o 404 de uma instância previamente conectada durante restart", async () => {
    sendText.mockRejectedValue(
      new WhatsAppError(
        "WHATSAPP_INSTANCE_NOT_FOUND",
        "Instância temporariamente ausente.",
        false,
        404,
      ),
    );

    await processWhatsAppOutbox(id, {
      now,
      quickAttempt: 1,
      maxQuickAttempts: 5,
    });

    expect(outbox.update).toHaveBeenLastCalledWith({
      where: { id },
      data: expect.objectContaining({
        status: "RETRYING",
        nextAttemptAt: new Date("2026-07-14T12:05:00.000Z"),
        failedAt: null,
        lastErrorCode: "WHATSAPP_INSTANCE_NOT_FOUND",
      }),
    });
  });
  it("aumenta progressivamente o retry de instância ausente até 30 minutos", async () => {
    outbox.findUnique.mockResolvedValue(message({ attempts: 4 }));
    sendText.mockRejectedValue(
      new WhatsAppError(
        "WHATSAPP_INSTANCE_NOT_FOUND",
        "Instância temporariamente ausente.",
        false,
        404,
      ),
    );

    await processWhatsAppOutbox(id, { now });

    expect(outbox.update).toHaveBeenLastCalledWith({
      where: { id },
      data: expect.objectContaining({
        status: "RETRYING",
        nextAttemptAt: new Date("2026-07-14T12:30:00.000Z"),
      }),
    });
  });
  it("marca FAILED quando não existe conexão persistida", async () => {
    outbox.findUnique.mockResolvedValue(message({ connection: null }));

    await processWhatsAppOutbox(id, { now });

    expect(sendText).not.toHaveBeenCalled();
    expect(outbox.update).toHaveBeenLastCalledWith({
      where: { id },
      data: expect.objectContaining({
        status: "FAILED",
        nextAttemptAt: null,
        lastErrorCode: "WHATSAPP_DELIVERY_DISABLED",
      }),
    });
  });
  it("marca FAILED quando a conexão não possui instanceName", async () => {
    outbox.findUnique.mockResolvedValue(message({ connection: persistedConnection({ instanceName: "" }) }));

    await processWhatsAppOutbox(id, { now });

    expect(sendText).not.toHaveBeenCalled();
    expect(outbox.update).toHaveBeenLastCalledWith({
      where: { id },
      data: expect.objectContaining({
        status: "FAILED",
        lastErrorCode: "WHATSAPP_DELIVERY_DISABLED",
      }),
    });
  });
  it("mantém permanente o 404 sem evidência de conexão anterior", async () => {
    outbox.findUnique.mockResolvedValue(message({ connection: persistedConnection({ connectedAt: null }) }));
    sendText.mockRejectedValue(
      new WhatsAppError(
        "WHATSAPP_INSTANCE_NOT_FOUND",
        "Instância inexistente.",
        false,
        404,
      ),
    );

    await processWhatsAppOutbox(id, { now });

    expect(outbox.update).toHaveBeenLastCalledWith({
      where: { id },
      data: expect.objectContaining({
        status: "FAILED",
        nextAttemptAt: null,
        lastErrorCode: "WHATSAPP_INSTANCE_NOT_FOUND",
      }),
    });
  });
  it("não reenvia outbox que já não pode ser claimed, incluindo SENT", async () => {
    outbox.updateMany.mockResolvedValue({ count: 0 });
    await processWhatsAppOutbox(id, { now });
    expect(sendText).not.toHaveBeenCalled();
  });
  it("valida tenant e marca SENT com id remoto", async () => {
    await processWhatsAppOutbox(id, { now });
    expect(sendText).toHaveBeenCalledOnce();
    expect(receipt.createMany).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tenantId,
        connectionId,
        externalMessageId: "remote-1",
        source: "TRANSACTIONAL",
      }),
      skipDuplicates: true,
    });
    expect(outbox.update).toHaveBeenLastCalledWith({ where: { id }, data: expect.objectContaining({ status: "SENT", externalMessageId: "remote-1" }) });
  });
  it("renderiza e envia APPOINTMENT_REQUESTED sem alterar a confirmação", async () => {
    outbox.findUnique.mockResolvedValue(message({
      type: "APPOINTMENT_REQUESTED",
      payload: {
        businessName: "Studio",
        customerName: "Ana",
        serviceName: "Corte",
        bookingDate: "14/07/2026",
        bookingTime: "09:30",
        appointmentId: crypto.randomUUID(),
      },
    }));

    await processWhatsAppOutbox(id, { now });

    expect(sendText).toHaveBeenCalledWith(expect.objectContaining({
      text: expect.stringContaining("Recebemos sua solicitação de agendamento"),
    }));
    expect(outbox.update).toHaveBeenLastCalledWith({
      where: { id },
      data: expect.objectContaining({ status: "SENT" }),
    });
  });
  it("envia confirmação persistida para telefone E.164 derivado de nacional com 10 dígitos", async () => {
    outbox.findUnique.mockResolvedValue(message({ recipientPhone: "555591884991" }));

    await processWhatsAppOutbox(id, { now });

    expect(sendText).toHaveBeenCalledWith(expect.objectContaining({
      instanceName: "agendai_x",
      recipientPhone: "555591884991",
    }));
  });
  it("renderiza e envia APPOINTMENT_COMPLETED", async () => {
    outbox.findUnique.mockResolvedValue(message({
      type: "APPOINTMENT_COMPLETED",
      payload: {
        businessName: "Studio",
        customerName: "Ana",
        serviceName: "Corte",
        bookingDate: "14/07/2026",
        bookingTime: "09:30",
        appointmentId,
      },
    }));

    await processWhatsAppOutbox(id, { now });

    expect(sendText).toHaveBeenCalledWith(expect.objectContaining({
      text: expect.stringContaining("Seu atendimento foi concluído"),
    }));
  });
  it.each([
    ["APPOINTMENT_REMINDER", "Texto antigo de lembrete.", "Passando para lembrar do seu agendamento"],
    ["APPOINTMENT_CANCELED", "Texto antigo de cancelamento.", "Seu agendamento de Corte"],
  ])("usa o texto fixo de %s antes de enviar", async (type, messageTemplate, expected) => {
    outbox.findUnique.mockResolvedValue(
      message({
        type,
        payload: { ...payload, messageTemplate },
        ...(type === "APPOINTMENT_REMINDER"
          ? {
              idempotencyKey: `appointment:${appointmentId}:reminder:${startsAt.getTime()}:v1`,
            }
          : {}),
      }),
    );

    await processWhatsAppOutbox(id, { now });

    expect(sendText).toHaveBeenCalledWith(
      expect.objectContaining({ text: expect.stringContaining(expected) }),
    );
  });
  it("não envia quando o plano deixa de disponibilizar WhatsApp", async () => {
    outbox.findUnique.mockResolvedValue(
      message({
        connection: persistedConnection({
          tenant: {
            ...tenant,
            subscription: {
              ...tenant.subscription,
              plan: { publicLinkEnabled: true, whatsappEnabled: false },
            },
          },
        }),
      }),
    );

    await processWhatsAppOutbox(id, { now });

    expect(sendText).not.toHaveBeenCalled();
    expect(outbox.update).toHaveBeenLastCalledWith({
      where: { id },
      data: expect.objectContaining({
        status: "FAILED",
        lastErrorCode: "WHATSAPP_DELIVERY_DISABLED",
      }),
    });
  });
  it("inicia a janela de entrega de lembrete no horário agendado", async () => {
    outbox.findUnique.mockResolvedValue(
      message({
        type: "APPOINTMENT_REMINDER",
        idempotencyKey: `appointment:${appointmentId}:reminder:${startsAt.getTime()}:v1`,
        createdAt: new Date("2026-07-01T10:00:00.000Z"),
        scheduledFor: new Date("2026-07-14T11:30:00.000Z"),
      }),
    );

    await processWhatsAppOutbox(id, { now });

    expect(sendText).toHaveBeenCalledOnce();
  });
  it("cancela lembrete obsoleto após reagendamento sem chamar o provider", async () => {
    outbox.findUnique.mockResolvedValue(
      message({
        type: "APPOINTMENT_REMINDER",
        idempotencyKey: `appointment:${appointmentId}:reminder:${startsAt.getTime()}:v1`,
        appointment: {
          id: appointmentId,
          tenantId,
          startsAt: new Date("2026-07-16T12:30:00.000Z"),
          status: "RESCHEDULED",
        },
      }),
    );

    await processWhatsAppOutbox(id, { now });

    expect(sendText).not.toHaveBeenCalled();
    expect(outbox.update).toHaveBeenLastCalledWith({
      where: { id },
      data: {
        status: "CANCELED",
        nextAttemptAt: null,
        scheduledFor: null,
      },
    });
  });
  it.each([
    "WHATSAPP_PROVIDER_UNAVAILABLE",
    "WHATSAPP_TIMEOUT",
    "WHATSAPP_RATE_LIMITED",
  ] as const)("mantém %s em RETRYING", async (errorCode) => {
    sendText.mockRejectedValue(new WhatsAppError(errorCode, "fora", true));
    await expect(processWhatsAppOutbox(id, { now, quickAttempt: 1, maxQuickAttempts: 5 })).rejects.toBeInstanceOf(WhatsAppError);
    expect(outbox.update).toHaveBeenLastCalledWith({ where: { id }, data: expect.objectContaining({ status: "RETRYING", lastErrorCode: errorCode }) });
  });
  it("mantém RETRYING depois de esgotar as tentativas rápidas", async () => {
    outbox.findUnique.mockResolvedValue(message({ attempts: 5 }));
    sendText.mockRejectedValue(new WhatsAppError("WHATSAPP_PROVIDER_UNAVAILABLE", "fora", true));
    await processWhatsAppOutbox(id, { now, quickAttempt: 5, maxQuickAttempts: 5 });
    expect(outbox.update).toHaveBeenLastCalledWith({
      where: { id },
      data: expect.objectContaining({
        status: "RETRYING",
        nextAttemptAt: expect.any(Date),
        failedAt: null,
      }),
    });
  });
  it("envia depois que a Evolution volta em uma recuperação posterior", async () => {
    sendText.mockRejectedValueOnce(new WhatsAppError("WHATSAPP_PROVIDER_UNAVAILABLE", "fora", true));
    await expect(
      processWhatsAppOutbox(id, { now, quickAttempt: 1, maxQuickAttempts: 5 }),
    ).rejects.toBeInstanceOf(WhatsAppError);
    sendText.mockResolvedValueOnce({ externalMessageId: "remote-after-recovery" });

    await processWhatsAppOutbox(id, {
      now: new Date("2026-07-14T12:10:00.000Z"),
      quickAttempt: 1,
      maxQuickAttempts: 5,
    });

    expect(sendText).toHaveBeenCalledTimes(2);
    expect(outbox.update).toHaveBeenLastCalledWith({
      where: { id },
      data: expect.objectContaining({
        status: "SENT",
        externalMessageId: "remote-after-recovery",
      }),
    });
  });
  it("mantém erro permanente como FAILED", async () => {
    outbox.findUnique.mockResolvedValue(message({ payload: { invalid: true } }));
    await processWhatsAppOutbox(id, { now });
    expect(sendText).not.toHaveBeenCalled();
    expect(outbox.update).toHaveBeenLastCalledWith({
      where: { id },
      data: expect.objectContaining({ status: "FAILED", nextAttemptAt: null }),
    });
  });
  it("trata desativação explícita do tenant como permanente", async () => {
    outbox.findUnique.mockResolvedValue(message({ connection: persistedConnection({ enabled: false }) }));
    await processWhatsAppOutbox(id, { now });
    expect(sendText).not.toHaveBeenCalled();
    expect(outbox.update).toHaveBeenLastCalledWith({
      where: { id },
      data: expect.objectContaining({ status: "FAILED", lastErrorCode: "WHATSAPP_DELIVERY_DISABLED" }),
    });
  });
  it("marca FAILED quando a janela máxima de 24 horas expira", async () => {
    outbox.findUnique.mockResolvedValue(message({ createdAt: new Date("2026-07-13T11:59:59.000Z") }));
    await processWhatsAppOutbox(id, { now });
    expect(sendText).not.toHaveBeenCalled();
    expect(outbox.update).toHaveBeenLastCalledWith({
      where: { id },
      data: expect.objectContaining({ status: "FAILED", lastErrorCode: "WHATSAPP_DELIVERY_WINDOW_EXPIRED" }),
    });
  });
  it("bloqueia conexão de outro tenant", async () => {
    outbox.findUnique.mockResolvedValue(message({ connection: persistedConnection({ tenantId: crypto.randomUUID(), instanceName: "other" }) }));
    await processWhatsAppOutbox(id, { now });
    expect(sendText).not.toHaveBeenCalled();
    expect(outbox.update).toHaveBeenLastCalledWith({
      where: { id },
      data: expect.objectContaining({ status: "FAILED", lastErrorCode: "WHATSAPP_DELIVERY_DISABLED" }),
    });
  });
});
