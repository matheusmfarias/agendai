import { Queue } from "bullmq";

import { getWhatsAppConfig } from "@/features/whatsapp/whatsapp-config";

export const WHATSAPP_QUEUE_NAME = "agendai-whatsapp-transactional";
export type WhatsAppJob = { outboxId: string };

export function createQueueRedisConnection() {
  const config = getWhatsAppConfig();
  if (!config.redisUrl) throw new Error("Redis da fila WhatsApp não configurado.");
  const url = new URL(config.redisUrl);
  return {
    host: url.hostname,
    port: Number(url.port || 6379),
    username: url.username || undefined,
    password: url.password || undefined,
    db: url.pathname.length > 1 ? Number(url.pathname.slice(1)) : 0,
    ...(url.protocol === "rediss:" ? { tls: {} } : {}),
    maxRetriesPerRequest: null,
  };
}

export function createWhatsAppQueue(connection = createQueueRedisConnection()) {
  return new Queue<WhatsAppJob, void, "send">(WHATSAPP_QUEUE_NAME, {
    connection,
    defaultJobOptions: {
      attempts: 5,
      backoff: { type: "exponential", delay: 30_000 },
      removeOnComplete: { age: 24 * 60 * 60, count: 5_000 },
      removeOnFail: { age: 7 * 24 * 60 * 60, count: 10_000 },
    },
  });
}
