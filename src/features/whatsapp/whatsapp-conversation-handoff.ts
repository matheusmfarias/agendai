import { Prisma } from "@/generated/prisma/client";

export type WhatsAppHandoffOrigin = "CUSTOMER_REQUESTED" | "HUMAN_INTERVENED";

type HandoffSession = {
  id: string;
  metadata: unknown;
  handoffUntil: Date | null;
};

type HandoffClient = {
  typebotSession: {
    findFirst(args: {
      where: { tenantId: string; activePhone: string; endedAt: null };
      select: { id: true; metadata: true; handoffUntil: true };
    }): Promise<HandoffSession | null>;
    updateMany(args: {
      where: { id: string; tenantId: string; activePhone: string; endedAt: null };
      data: {
        handoffUntil: Date;
        lastInteractionAt: Date;
        metadata: Prisma.InputJsonObject;
      };
    }): Promise<{ count: number }>;
  };
};

export function getWhatsAppHandoffUntil(now: Date) {
  const minutes = Number(process.env.TYPEBOT_HANDOFF_TIMEOUT_MINUTES ?? 1_440);
  const safeMinutes = Number.isFinite(minutes)
    ? Math.min(Math.max(minutes, 15), 10_080)
    : 1_440;
  return new Date(now.getTime() + safeMinutes * 60_000);
}

function mergeMetadata(
  metadata: unknown,
  values: Prisma.InputJsonObject,
): Prisma.InputJsonObject {
  const current = metadata && typeof metadata === "object" && !Array.isArray(metadata)
    ? metadata as Prisma.InputJsonObject
    : {};
  return { ...current, ...values };
}

export async function activateWhatsAppConversationHandoff(
  client: HandoffClient,
  input: {
    tenantId: string;
    conversationId: string;
    now: Date;
    origin: WhatsAppHandoffOrigin;
    pendingInboundMessageId?: string | null;
    session?: HandoffSession;
  },
) {
  const session = input.session ?? await client.typebotSession.findFirst({
    where: {
      tenantId: input.tenantId,
      activePhone: input.conversationId,
      endedAt: null,
    },
    select: { id: true, metadata: true, handoffUntil: true },
  });
  if (!session) return false;

  const updated = await client.typebotSession.updateMany({
    where: {
      id: session.id,
      tenantId: input.tenantId,
      activePhone: input.conversationId,
      endedAt: null,
    },
    data: {
      handoffUntil:
        session.handoffUntil && session.handoffUntil.getTime() > input.now.getTime()
          ? session.handoffUntil
          : getWhatsAppHandoffUntil(input.now),
      lastInteractionAt: input.now,
      metadata: mergeMetadata(session.metadata, {
        channel: "WHATSAPP",
        conversationId: input.conversationId,
        handoffRequested: true,
        handoffOrigin: input.origin,
        pendingHandoffInboundMessageId: input.pendingInboundMessageId ?? null,
      }),
    },
  });
  return updated.count === 1;
}
