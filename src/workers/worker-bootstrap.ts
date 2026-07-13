import { prisma } from "@/lib/prisma";
import { dispatchWhatsAppOutbox } from "@/workers/whatsapp-outbox-dispatcher";
import { createWhatsAppQueue } from "@/workers/whatsapp-queue";
import { createWhatsAppWorker } from "@/workers/whatsapp-worker";

const queue = createWhatsAppQueue();
const worker = createWhatsAppWorker();
let stopping = false;

async function dispatchLoop() {
  while (!stopping) {
    try {
      await dispatchWhatsAppOutbox(queue);
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
  await queue.close();
  await prisma.$disconnect();
}

process.once("SIGINT", () => void shutdown());
process.once("SIGTERM", () => void shutdown());

void dispatchLoop();
