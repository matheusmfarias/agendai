import { timingSafeEqual } from "node:crypto";

import { NextRequest, NextResponse } from "next/server";

import { getWhatsAppConfig } from "@/features/whatsapp/whatsapp-config";
import { evolutionWebhookSchema } from "@/features/whatsapp/whatsapp-schemas";
import type { WhatsAppConnectionState } from "@/features/whatsapp/whatsapp-types";
import { prisma } from "@/lib/prisma";

const MAX_BODY_BYTES = 64 * 1024;
const ALLOWED_EVENTS = new Set(["QRCODE_UPDATED", "CONNECTION_UPDATE"]);

function secretsMatch(received: string | null, expected: string) {
  if (!received) return false;
  const a = Buffer.from(received);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

function mapStatus(event: string, data: Record<string, unknown> | undefined): WhatsAppConnectionState {
  if (event === "QRCODE_UPDATED") return "AWAITING_QR";
  const raw = String(data?.state ?? data?.status ?? "").toLowerCase();
  if (raw === "open" || raw === "connected") return "CONNECTED";
  if (raw === "connecting") return "CONNECTING";
  if (["close", "closed", "disconnected"].includes(raw)) return "DISCONNECTED";
  return "DEGRADED";
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
  const parsed = evolutionWebhookSchema.safeParse(
    (() => {
      try { return JSON.parse(text) as unknown; } catch { return null; }
    })(),
  );
  if (!parsed.success || !ALLOWED_EVENTS.has(parsed.data.event)) {
    return NextResponse.json({ message: "Evento inválido." }, { status: 400 });
  }
  const nestedInstance = typeof parsed.data.data?.instance === "string" ? parsed.data.data.instance : undefined;
  const instanceName = parsed.data.instanceName ?? parsed.data.instance ?? nestedInstance;
  if (!instanceName) return NextResponse.json({ message: "Evento inválido." }, { status: 400 });

  const status = mapStatus(parsed.data.event, parsed.data.data);
  const now = new Date();
  const updated = await prisma.whatsAppConnection.updateMany({
    where: { instanceName },
    data: {
      status,
      ...(status === "CONNECTED"
        ? { connectedAt: now, lastHealthyAt: now, disconnectedAt: null, lastErrorCode: null }
        : status === "DISCONNECTED"
          ? { disconnectedAt: now, enabled: false }
          : {}),
    },
  });
  return NextResponse.json({ accepted: true, matched: updated.count > 0 });
}
