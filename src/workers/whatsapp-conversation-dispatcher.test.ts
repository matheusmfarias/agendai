import { beforeEach, describe, expect, it, vi } from "vitest";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    whatsAppInboundMessage: {
      findMany: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import { dispatchWhatsAppConversationInbox } from "@/workers/whatsapp-conversation-dispatcher";

describe("WhatsApp conversation inbox dispatcher", () => {
  beforeEach(() => vi.clearAllMocks());

  it("reenfileira PENDING e RETRYING vencidos com jobId determinístico", async () => {
    const now = new Date("2026-07-15T12:00:00.000Z");
    prismaMock.whatsAppInboundMessage.findMany.mockResolvedValue([
      { id: "inbound-a" },
      { id: "inbound-b" },
    ]);
    prismaMock.whatsAppInboundMessage.updateMany.mockResolvedValue({ count: 1 });
    const queue = { add: vi.fn().mockResolvedValue({}) };

    await expect(dispatchWhatsAppConversationInbox(queue as never, now)).resolves.toBe(2);

    expect(prismaMock.whatsAppInboundMessage.findMany).toHaveBeenCalledWith({
      where: {
        status: { in: ["PENDING", "RETRYING"] },
        OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: now } }],
      },
      orderBy: { receivedAt: "asc" },
      take: 50,
      select: { id: true },
    });
    expect(queue.add).toHaveBeenNthCalledWith(
      1,
      "process",
      { inboundMessageId: "inbound-a" },
      { jobId: "inbound-inbound-a" },
    );
  });

  it("devolve ao banco quando Redis falha, sem perder a mensagem", async () => {
    prismaMock.whatsAppInboundMessage.findMany.mockResolvedValue([{ id: "inbound-a" }]);
    prismaMock.whatsAppInboundMessage.updateMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 1 });
    const queue = { add: vi.fn().mockRejectedValue(new Error("redis down")) };

    await expect(dispatchWhatsAppConversationInbox(queue as never)).rejects.toThrow("redis down");
    expect(prismaMock.whatsAppInboundMessage.updateMany).toHaveBeenLastCalledWith({
      where: { id: "inbound-a", status: "QUEUED" },
      data: { status: "RETRYING", nextAttemptAt: expect.any(Date) },
    });
  });
});
