import { beforeEach, describe, expect, it, vi } from "vitest";

const { outbox, sendText } = vi.hoisted(() => ({
  outbox: { updateMany: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
  sendText: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({ prisma: { whatsAppMessageOutbox: outbox } }));
vi.mock("@/features/whatsapp/whatsapp-provider-factory", () => ({ createWhatsAppProvider: () => ({ sendText }) }));

import { processWhatsAppOutbox } from "@/workers/whatsapp-worker";
import { WhatsAppError } from "@/features/whatsapp/whatsapp-errors";

const id = crypto.randomUUID();
const tenantId = crypto.randomUUID();
const now = new Date("2026-07-14T12:00:00.000Z");
const payload = { businessName: "Studio", customerName: "Ana", serviceName: "Corte", bookingDate: "14/07/2026", bookingTime: "09:30", appointmentId: crypto.randomUUID() };
function message(overrides: Record<string, unknown> = {}) {
  return { id, tenantId, type: "APPOINTMENT_CONFIRMED", recipientPhone: "5511987654321", payload, attempts: 1, createdAt: new Date("2026-07-14T11:00:00.000Z"), connection: { tenantId, enabled: true, status: "CONNECTED", instanceName: "agendai_x", connectedAt: new Date("2026-07-13T10:00:00.000Z") }, ...overrides };
}

describe("WhatsApp worker", () => {
  beforeEach(() => { vi.clearAllMocks(); outbox.updateMany.mockResolvedValue({ count: 1 }); outbox.findUnique.mockResolvedValue(message()); outbox.update.mockResolvedValue({}); sendText.mockResolvedValue({ externalMessageId: "remote-1" }); });
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
    outbox.findUnique.mockResolvedValue(message({ connection: { tenantId, enabled: true, status: "CONNECTED", instanceName: "", connectedAt: new Date("2026-07-13T10:00:00.000Z") } }));

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
    outbox.findUnique.mockResolvedValue(message({ connection: { tenantId, enabled: true, status: "CONNECTED", instanceName: "agendai_x", connectedAt: null } }));
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
    outbox.findUnique.mockResolvedValue(message({ connection: { tenantId, enabled: false, status: "CONNECTED", instanceName: "agendai_x" } }));
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
    outbox.findUnique.mockResolvedValue(message({ connection: { tenantId: crypto.randomUUID(), enabled: true, status: "CONNECTED", instanceName: "other" } }));
    await processWhatsAppOutbox(id, { now });
    expect(sendText).not.toHaveBeenCalled();
    expect(outbox.update).toHaveBeenLastCalledWith({
      where: { id },
      data: expect.objectContaining({ status: "FAILED", lastErrorCode: "WHATSAPP_DELIVERY_DISABLED" }),
    });
  });
});
