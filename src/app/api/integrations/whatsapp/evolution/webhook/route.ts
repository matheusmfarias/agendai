import { timingSafeEqual } from "node:crypto";

import { NextRequest, NextResponse } from "next/server";

import { getWhatsAppConfig } from "@/features/whatsapp/whatsapp-config";
import { evolutionWebhookSchema } from "@/features/whatsapp/whatsapp-schemas";
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
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { bodyType: value === null ? "null" : typeof value };
  }
  const body = value as Record<string, unknown>;
  const data = body.data;
  return {
    event: typeof body.event === "string" ? body.event.slice(0, 80) : undefined,
    receivedFields: Object.keys(body).slice(0, 24),
    dataFields:
      data && typeof data === "object" && !Array.isArray(data)
        ? Object.keys(data).slice(0, 24)
        : [],
  };
}

async function readLimitedBody(request: NextRequest) {
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

export async function POST(request: NextRequest) {
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
    console.warn("Evolution webhook rejeitado", { reason: "invalid_json" });
    return NextResponse.json({ message: "Evento inválido." }, { status: 400 });
  }
  const parsed = evolutionWebhookSchema.safeParse(body);
  if (!parsed.success) {
    console.warn("Evolution webhook rejeitado", {
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
    console.warn("Evolution webhook rejeitado", {
      reason: "missing_instance",
      ...safeWebhookDiagnostic(body),
    });
    return NextResponse.json({ message: "Evento inválido." }, { status: 400 });
  }

  const status = mapStatus(parsed.data.event, parsed.data.data);
  const now = new Date();
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
