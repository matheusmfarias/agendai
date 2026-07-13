import { beforeEach, describe, expect, it, vi } from "vitest";

const { connection, audit, sendText } = vi.hoisted(() => ({ connection: { findFirst: vi.fn() }, audit: { create: vi.fn() }, sendText: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { whatsAppConnection: connection, auditLog: audit } }));

import { sendWhatsAppTestMessage } from "@/features/whatsapp/whatsapp-test-service";
import type { WhatsAppProvider } from "@/features/whatsapp/contracts/whatsapp-provider";

function provider(): WhatsAppProvider {
  return {
    createInstance: vi.fn(),
    getConnectionStatus: vi.fn(),
    getQrCode: vi.fn(),
    sendText,
    disconnect: vi.fn(),
    deleteInstance: vi.fn(),
    fetchInstanceInfo: vi.fn(),
  };
}

describe("WhatsApp test message", () => {
  beforeEach(() => { vi.clearAllMocks(); connection.findFirst.mockResolvedValue({ instanceName: "agendai_x" }); sendText.mockResolvedValue({ externalMessageId: "test-1" }); audit.create.mockResolvedValue({}); });
  it("filtra conexão por tenant, valida telefone e audita sem telefone", async () => {
    const tenantId = crypto.randomUUID();
    await sendWhatsAppTestMessage({ tenantId, userId: crypto.randomUUID(), phone: "11987654321" }, provider());
    expect(connection.findFirst).toHaveBeenCalledWith({ where: { tenantId, status: "CONNECTED", enabled: true } });
    expect(audit.create.mock.calls[0]?.[0]).not.toEqual(expect.objectContaining({ phone: expect.anything() }));
  });
  it("limita a três testes por dez minutos", async () => {
    const input = { tenantId: crypto.randomUUID(), userId: crypto.randomUUID(), phone: "11987654321" };
    for (let count = 0; count < 3; count += 1) await sendWhatsAppTestMessage(input, provider());
    await expect(sendWhatsAppTestMessage(input, provider())).rejects.toMatchObject({ code: "WHATSAPP_RATE_LIMITED" });
  });
});
