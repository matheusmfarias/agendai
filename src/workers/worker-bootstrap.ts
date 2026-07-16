import "dotenv/config";
import { prisma } from "@/lib/prisma";
import { dispatchWhatsAppOutbox } from "@/workers/whatsapp-outbox-dispatcher";
import { createWhatsAppQueue } from "@/workers/whatsapp-queue";
import { createWhatsAppWorker } from "@/workers/whatsapp-worker";
import { dispatchWhatsAppConversationInbox } from "@/workers/whatsapp-conversation-dispatcher";
import { createWhatsAppConversationQueue } from "@/workers/whatsapp-conversation-queue";
import { createWhatsAppConversationWorker } from "@/workers/whatsapp-conversation-worker";
import { synchronizeWhatsAppConversationWebhooks } from "@/workers/whatsapp-conversation-webhook-sync";

const queue = createWhatsAppQueue();
const worker = createWhatsAppWorker();
const conversationQueue = createWhatsAppConversationQueue();
const conversationWorker = createWhatsAppConversationWorker();
let stopping = false;
let nextWebhookSyncAt = 0;

async function dispatchLoop() {
  while (!stopping) {
    try {
      if (Date.now() >= nextWebhookSyncAt) {
        await synchronizeWhatsAppConversationWebhooks();
        nextWebhookSyncAt = Date.now() + 15 * 60_000;
      }
      await dispatchWhatsAppOutbox(queue);
      await dispatchWhatsAppConversationInbox(conversationQueue);
    } catch {
      // A fila e o outbox preservam a tentativa; não registre payloads ou telefones.
    }
    await new Promise((resolve) => setTimeout(resolve, 5_000));
  }
}

async function shutdown() {
  if (stopping) return;
  stopping = true;
  await worker.close();
  await conversationWorker.close();
  await queue.close();
  await conversationQueue.close();
  await prisma.$disconnect();
}

process.once("SIGINT", () => void shutdown());
process.once("SIGTERM", () => void shutdown());

void dispatchLoop();
