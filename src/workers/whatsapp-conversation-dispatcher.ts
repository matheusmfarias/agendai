import type { Queue } from "bullmq";

import { prisma } from "@/lib/prisma";
import type { WhatsAppConversationJob } from "@/workers/whatsapp-conversation-queue";

export async function dispatchWhatsAppConversationInbox(
  queue: Pick<Queue<WhatsAppConversationJob, void, "process">, "add">,
  now = new Date(),
) {
  const messages = await prisma.whatsAppInboundMessage.findMany({
    where: {
      status: { in: ["PENDING", "RETRYING"] },
      OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: now } }],
    },
    orderBy: { receivedAt: "asc" },
    take: 50,
    select: { id: true },
  });
  let queued = 0;
  for (const message of messages) {
    const claimed = await prisma.whatsAppInboundMessage.updateMany({
      where: { id: message.id, status: { in: ["PENDING", "RETRYING"] } },
      data: { status: "QUEUED", nextAttemptAt: null },
    });
    if (!claimed.count) continue;
    try {
      await queue.add(
        "process",
        { inboundMessageId: message.id },
        { jobId: `inbound-${message.id}` },
      );
      queued += 1;
    } catch (error) {
      await prisma.whatsAppInboundMessage.updateMany({
        where: { id: message.id, status: "QUEUED" },
        data: { status: "RETRYING", nextAttemptAt: new Date(now.getTime() + 60_000) },
      });
      throw error;
    }
  }
  return queued;
}
