import type { Queue } from "bullmq";

import type { WhatsAppJob } from "@/workers/whatsapp-queue";
import { prisma } from "@/lib/prisma";

export async function dispatchWhatsAppOutbox(
  queue: Queue<WhatsAppJob, void, "send">,
  limit = 50,
) {
  const now = new Date();
  const messages = await prisma.whatsAppMessageOutbox.findMany({
    where: {
      OR: [
        { status: "PENDING", scheduledFor: null },
        { status: "PENDING", scheduledFor: { lte: now } },
        { status: "RETRYING", nextAttemptAt: { lte: now } },
        { status: "QUEUED", queuedAt: { lte: new Date(now.getTime() - 10 * 60_000) } },
        { status: "PROCESSING", processingAt: { lte: new Date(now.getTime() - 10 * 60_000) } },
      ],
    },
    select: { id: true },
    orderBy: { createdAt: "asc" },
    take: limit,
  });
  let queued = 0;
  for (const message of messages) {
    const claimed = await prisma.whatsAppMessageOutbox.updateMany({
      where: {
        id: message.id,
        OR: [
          { status: "PENDING", scheduledFor: null },
          { status: "PENDING", scheduledFor: { lte: now } },
          { status: "RETRYING", nextAttemptAt: { lte: now } },
          {
            status: "QUEUED",
            queuedAt: { lte: new Date(now.getTime() - 10 * 60_000) },
          },
          {
            status: "PROCESSING",
            processingAt: { lte: new Date(now.getTime() - 10 * 60_000) },
          },
        ],
      },
      data: { status: "QUEUED", queuedAt: now, nextAttemptAt: null },
    });
    if (!claimed.count) continue;
    try {
      await queue.add("send", { outboxId: message.id }, { jobId: message.id });
      queued += 1;
    } catch (error) {
      await prisma.whatsAppMessageOutbox.update({
        where: { id: message.id },
        data: {
          status: "RETRYING",
          nextAttemptAt: new Date(Date.now() + 30_000),
          lastErrorCode: "QUEUE_UNAVAILABLE",
          lastErrorAt: new Date(),
        },
      });
      throw error;
    }
  }
  return queued;
}
