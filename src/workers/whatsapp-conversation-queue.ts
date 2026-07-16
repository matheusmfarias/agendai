import { Queue } from "bullmq";

import { createQueueRedisConnection } from "@/workers/whatsapp-queue";

export const WHATSAPP_CONVERSATION_QUEUE_NAME = "agendai-whatsapp-conversation";
export type WhatsAppConversationJob = { inboundMessageId: string };

export function createWhatsAppConversationQueue(
  connection = createQueueRedisConnection(),
) {
  return new Queue<WhatsAppConversationJob, void, "process">(
    WHATSAPP_CONVERSATION_QUEUE_NAME,
    {
      connection,
      defaultJobOptions: {
        attempts: 4,
        backoff: { type: "exponential", delay: 15_000 },
        removeOnComplete: true,
        removeOnFail: true,
      },
    },
  );
}
