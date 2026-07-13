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
const payload = { businessName: "Studio", customerName: "Ana", serviceName: "Corte", bookingDate: "14/07/2026", bookingTime: "09:30", appointmentId: crypto.randomUUID() };
function message(overrides: Record<string, unknown> = {}) {
  return { id, tenantId, recipientPhone: "5511987654321", payload, attempts: 1, connection: { tenantId, enabled: true, status: "CONNECTED", instanceName: "agendai_x" }, ...overrides };
}

describe("WhatsApp worker", () => {
  beforeEach(() => { vi.clearAllMocks(); outbox.updateMany.mockResolvedValue({ count: 1 }); outbox.findUnique.mockResolvedValue(message()); outbox.update.mockResolvedValue({}); sendText.mockResolvedValue({ externalMessageId: "remote-1" }); });
  it("não reenvia outbox que já não pode ser claimed, incluindo SENT", async () => {
    outbox.updateMany.mockResolvedValue({ count: 0 });
    await processWhatsAppOutbox(id);
    expect(sendText).not.toHaveBeenCalled();
  });
  it("valida tenant e marca SENT com id remoto", async () => {
    await processWhatsAppOutbox(id);
    expect(sendText).toHaveBeenCalledOnce();
    expect(outbox.update).toHaveBeenLastCalledWith({ where: { id }, data: expect.objectContaining({ status: "SENT", externalMessageId: "remote-1" }) });
  });
  it("agenda retry exponencial para falha temporária", async () => {
    sendText.mockRejectedValue(new WhatsAppError("WHATSAPP_PROVIDER_UNAVAILABLE", "fora", true));
    await expect(processWhatsAppOutbox(id)).rejects.toBeInstanceOf(WhatsAppError);
    expect(outbox.update).toHaveBeenLastCalledWith({ where: { id }, data: expect.objectContaining({ status: "RETRYING", lastErrorCode: "WHATSAPP_PROVIDER_UNAVAILABLE" }) });
  });
  it("marca falha definitiva sem repetir", async () => {
    outbox.findUnique.mockResolvedValue(message({ attempts: 5 }));
    sendText.mockRejectedValue(new WhatsAppError("WHATSAPP_PROVIDER_UNAVAILABLE", "fora", true));
    await processWhatsAppOutbox(id);
    expect(outbox.update).toHaveBeenLastCalledWith({ where: { id }, data: expect.objectContaining({ status: "FAILED" }) });
  });
  it("bloqueia conexão de outro tenant", async () => {
    outbox.findUnique.mockResolvedValue(message({ connection: { tenantId: crypto.randomUUID(), enabled: true, status: "CONNECTED", instanceName: "other" } }));
    await expect(processWhatsAppOutbox(id)).rejects.toMatchObject({ code: "WHATSAPP_NOT_CONNECTED" });
    expect(sendText).not.toHaveBeenCalled();
  });
});
