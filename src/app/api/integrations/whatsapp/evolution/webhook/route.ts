import { timingSafeEqual } from "node:crypto";

import { NextRequest, NextResponse } from "next/server";

import { getWhatsAppConfig } from "@/features/whatsapp/whatsapp-config";
import { activateWhatsAppConversationHandoff } from "@/features/whatsapp/whatsapp-conversation-handoff";
import { evolutionWebhookSchema } from "@/features/whatsapp/whatsapp-schemas";
import {
  parseEvolutionInboundMessage,
  parseEvolutionOwnMessage,
} from "@/features/whatsapp/whatsapp-inbound-message";
import type { WhatsAppConnectionState } from "@/features/whatsapp/whatsapp-types";
import { prisma } from "@/lib/prisma";

const MAX_BODY_BYTES = 64 * 1024;

function secretsMatch(received: string | null, expected: string) {
  if (!received) return false;
  const a = Buffer.from(received);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

function mapStatus(event: string, data: Record<string, unknown> | undefined): WhatsAppConnectionState {
  if (event === "qrcode.updated") return "AWAITING_QR";
  const raw = String(data?.state ?? data?.status ?? "").toLowerCase();
  if (raw === "open" || raw === "connected") return "CONNECTED";
  if (raw === "connecting") return "CONNECTING";
  if (["close", "closed", "disconnected"].includes(raw)) return "DISCONNECTED";
  return "DEGRADED";
}

function safeWebhookDiagnostic(value: unknown) {
  const body = value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
  const data = body.data && typeof body.data === "object" && !Array.isArray(body.data)
    ? body.data as Record<string, unknown>
    : {};
  return {
    event: typeof body.event === "string" ? body.event.slice(0, 80) : null,
    receivedFields: Object.keys(body).slice(0, 24),
    dataFields: Object.keys(data).slice(0, 24),
  };
}

async function readLimitedBody(request: Request) {
  if (!request.body) return "";
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_BODY_BYTES) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}

async function handleWebhook(request: NextRequest) {
  const config = getWhatsAppConfig();
  if (!config.enabled || !config.webhookSecret) {
    return NextResponse.json({ message: "Indisponível." }, { status: 503 });
  }
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return NextResponse.json({ message: "Conteúdo inválido." }, { status: 415 });
  }
  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (declaredLength > MAX_BODY_BYTES) {
    return NextResponse.json({ message: "Payload excede o limite." }, { status: 413 });
  }
  if (!secretsMatch(request.headers.get("x-agendai-webhook-secret"), config.webhookSecret)) {
    return NextResponse.json({ message: "Não autorizado." }, { status: 401 });
  }
  const text = await readLimitedBody(request);
  if (text === null) {
    return NextResponse.json({ message: "Payload excede o limite." }, { status: 413 });
  }
  let body: unknown;
  try {
    body = JSON.parse(text) as unknown;
  } catch {
    console.warn("Evolution webhook ignorado", { reason: "invalid_json" });
    return NextResponse.json({ message: "Evento inválido." }, { status: 400 });
  }
  const parsed = evolutionWebhookSchema.safeParse(body);
  if (!parsed.success) {
    console.warn("Evolution webhook ignorado", {
      reason: "invalid_schema",
      ...safeWebhookDiagnostic(body),
    });
    return NextResponse.json({ message: "Evento inválido." }, { status: 400 });
  }
  const instanceName =
    parsed.data.instanceName ??
    parsed.data.instance ??
    parsed.data.data?.instance;
  if (!instanceName) {
    console.warn("Evolution webhook ignorado", {
      reason: "missing_instance",
      ...safeWebhookDiagnostic(body),
    });
    return NextResponse.json({ message: "Evento inválido." }, { status: 400 });
  }

  const now = new Date();
  if (parsed.data.event === "messages.upsert") {
    const ownMessage = parseEvolutionOwnMessage({
      data: parsed.data.data,
      sender: parsed.data.sender,
    });
    if (ownMessage) {
      const handled = await prisma.$transaction(async (tx) => {
        const connection = await tx.whatsAppConnection.findUnique({
          where: { instanceName },
          select: { id: true, tenantId: true, enabled: true },
        });
        if (!connection || !connection.enabled) {
          return { matched: false, source: "UNMATCHED", handoffActivated: false, duplicate: false };
        }

        const sentByAgendaI = await tx.whatsAppSentMessageReceipt.findFirst({
          where: {
            tenantId: connection.tenantId,
            connectionId: connection.id,
            externalMessageId: ownMessage.messageId,
          },
          select: { id: true },
        });
        if (sentByAgendaI) {
          return { matched: true, source: "AGENDAI", handoffActivated: false, duplicate: false };
        }

        const created = await tx.whatsAppInboundMessage.createMany({
          data: {
            tenantId: connection.tenantId,
            connectionId: connection.id,
            messageId: ownMessage.messageId,
            senderPhone: ownMessage.recipientPhone,
            messageText: "",
            status: "IGNORED",
            receivedAt: now,
            processedAt: now,
          },
          skipDuplicates: true,
        });
        if (created.count === 0) {
          return { matched: true, source: "HUMAN", handoffActivated: false, duplicate: true };
        }

        const handoffActivated = await activateWhatsAppConversationHandoff(tx, {
          tenantId: connection.tenantId,
          conversationId: ownMessage.recipientPhone,
          now,
          origin: "HUMAN_INTERVENED",
        });
        return { matched: true, source: "HUMAN", handoffActivated, duplicate: false };
      });
      return NextResponse.json({ accepted: true, ...handled });
    }

    const inbound = parseEvolutionInboundMessage({
      data: parsed.data.data,
      sender: parsed.data.sender,
    });
    if (!inbound.accepted) {
      console.info("Evolution inbound message ignored", { reason: inbound.reason });
      return NextResponse.json({ accepted: true, ignored: inbound.reason });
    }
    const stored = await prisma.$transaction(async (tx) => {
      const connection = await tx.whatsAppConnection.findUnique({
        where: { instanceName },
        select: { id: true, tenantId: true, enabled: true },
      });
      if (!connection || !connection.enabled) return { matched: false, created: false };
      const created = await tx.whatsAppInboundMessage.createMany({
        data: {
          tenantId: connection.tenantId,
          connectionId: connection.id,
          messageId: inbound.messageId,
          senderPhone: inbound.senderPhone,
          messageText: inbound.text,
          receivedAt: now,
        },
        skipDuplicates: true,
      });
      return { matched: true, created: created.count === 1 };
    });
    return NextResponse.json({
      accepted: true,
      matched: stored.matched,
      duplicate: stored.matched && !stored.created,
    });
  }

  const status = mapStatus(parsed.data.event, parsed.data.data);
  const matched = await prisma.$transaction(async (tx) => {
    const connection = await tx.whatsAppConnection.findUnique({
      where: { instanceName },
      select: { id: true, tenantId: true },
    });
    if (!connection) return false;
    await tx.whatsAppConnection.updateMany({
      where: { id: connection.id, tenantId: connection.tenantId },
      data: {
        status,
        ...(status === "CONNECTED"
          ? { connectedAt: now, lastHealthyAt: now, disconnectedAt: null, lastErrorCode: null }
          : status === "DISCONNECTED"
            ? { disconnectedAt: now }
            : {}),
      },
    });
    if (status === "CONNECTED") {
      await tx.whatsAppMessageOutbox.updateMany({
        where: {
          tenantId: connection.tenantId,
          connectionId: connection.id,
          status: "RETRYING",
        },
        data: { nextAttemptAt: now },
      });
    }
    return true;
  });
  return NextResponse.json({ accepted: true, matched });
}

export async function POST(request: NextRequest) {
  try {
    return await handleWebhook(request);
  } catch {
    console.error("Evolution webhook internal error");
    return NextResponse.json({ message: "Erro interno." }, { status: 500 });
  }
}
