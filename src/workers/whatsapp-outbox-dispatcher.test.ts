import { beforeEach, describe, expect, it, vi } from "vitest";

const { outbox } = vi.hoisted(() => ({ outbox: { findMany: vi.fn(), updateMany: vi.fn(), update: vi.fn() } }));
vi.mock("@/lib/prisma", () => ({ prisma: { whatsAppMessageOutbox: outbox } }));

import { dispatchWhatsAppOutbox } from "@/workers/whatsapp-outbox-dispatcher";
import type { Queue } from "bullmq";
import type { WhatsAppJob } from "@/workers/whatsapp-queue";

describe("WhatsApp dispatcher", () => {
  const id = crypto.randomUUID();
  const add = vi.fn();
  const queue = { add } as unknown as Queue<WhatsAppJob, void, "send">;
  beforeEach(() => { vi.clearAllMocks(); outbox.findMany.mockResolvedValue([{ id }]); outbox.updateMany.mockResolvedValue({ count: 1 }); add.mockResolvedValue({}); });
  it("faz claim e usa jobId determinístico", async () => {
    await expect(dispatchWhatsAppOutbox(queue)).resolves.toBe(1);
    expect(add).toHaveBeenCalledWith("send", { outboxId: id }, { jobId: id });
  });
  it("não enfileira se outro dispatcher ganhou o claim", async () => {
    outbox.updateMany.mockResolvedValue({ count: 0 });
    await expect(dispatchWhatsAppOutbox(queue)).resolves.toBe(0);
    expect(add).not.toHaveBeenCalled();
  });
  it("devolve ao retry se Redis falhar", async () => {
    add.mockRejectedValue(new Error("redis down"));
    await expect(dispatchWhatsAppOutbox(queue)).rejects.toThrow("redis down");
    expect(outbox.update).toHaveBeenCalledWith({ where: { id }, data: expect.objectContaining({ status: "RETRYING", lastErrorCode: "QUEUE_UNAVAILABLE" }) });
  });
});
