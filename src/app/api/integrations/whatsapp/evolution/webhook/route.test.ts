import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { updateMany } = vi.hoisted(() => ({ updateMany: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { whatsAppConnection: { updateMany } } }));
vi.mock("@/features/whatsapp/whatsapp-config", () => ({ getWhatsAppConfig: () => ({ enabled: true, webhookSecret: "s".repeat(32) }) }));

import { POST } from "@/app/api/integrations/whatsapp/evolution/webhook/route";

function request(body: unknown, secret = "s".repeat(32)) {
  return new NextRequest("http://localhost/api/integrations/whatsapp/evolution/webhook", {
    method: "POST",
    headers: { "content-type": "application/json", "x-agendai-webhook-secret": secret },
    body: JSON.stringify(body),
  });
}

describe("Evolution webhook", () => {
  beforeEach(() => { vi.clearAllMocks(); updateMany.mockResolvedValue({ count: 1 }); });
  it("rejeita segredo incorreto antes de consultar instância", async () => {
    expect((await POST(request({ event: "CONNECTION_UPDATE" }, "wrong"))).status).toBe(401);
    expect(updateMany).not.toHaveBeenCalled();
  });
  it("resolve o tenant exclusivamente pela instância conhecida", async () => {
    const response = await POST(request({ event: "CONNECTION_UPDATE", instance: "agendai_x", data: { state: "open", tenantId: crypto.randomUUID() } }));
    expect(response.status).toBe(200);
    expect(updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { instanceName: "agendai_x" }, data: expect.objectContaining({ status: "CONNECTED" }) }));
  });
  it("aceita somente eventos previstos e não persiste QR", async () => {
    expect((await POST(request({ event: "MESSAGES_UPSERT", instance: "agendai_x", data: {} }))).status).toBe(400);
    await POST(request({ event: "QRCODE_UPDATED", instance: "agendai_x", data: { qrcode: "secret" } }));
    expect(updateMany).toHaveBeenLastCalledWith({ where: { instanceName: "agendai_x" }, data: { status: "AWAITING_QR" } });
  });
});
