import { beforeEach, describe, expect, it, vi } from "vitest";

const { connection, outbox } = vi.hoisted(() => ({
  connection: { findFirst: vi.fn() },
  outbox: { upsert: vi.fn() },
}));
vi.mock("@/features/whatsapp/whatsapp-config", () => ({ getWhatsAppConfig: () => ({ enabled: true }) }));

import { enqueueAppointmentConfirmation } from "@/features/whatsapp/whatsapp-outbox-service";
import type { Prisma } from "@/generated/prisma/client";

const tenantId = crypto.randomUUID();
const appointmentId = crypto.randomUUID();
const tx = { whatsAppConnection: connection, whatsAppMessageOutbox: outbox } as unknown as Prisma.TransactionClient;
const input = { tenantId, appointmentId, customerName: "Ana", customerPhone: "11987654321", serviceName: "Corte", startsAt: new Date("2026-07-14T12:30:00Z"), timezone: "America/Sao_Paulo", businessName: "Studio" };

describe("WhatsApp outbox", () => {
  beforeEach(() => { vi.clearAllMocks(); connection.findFirst.mockResolvedValue({ id: crypto.randomUUID() }); outbox.upsert.mockResolvedValue({ id: crypto.randomUUID(), status: "PENDING" }); });
  it("filtra a conexão pelo tenant e cria outbox idempotente", async () => {
    await expect(enqueueAppointmentConfirmation(tx, input)).resolves.toMatchObject({ created: true });
    expect(connection.findFirst).toHaveBeenCalledWith({ where: { tenantId, enabled: true, sendAppointmentConfirmation: true }, select: { id: true } });
    expect(outbox.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { tenantId_idempotencyKey: { tenantId, idempotencyKey: `appointment:${appointmentId}:confirmed:v1` } },
      create: expect.objectContaining({ tenantId, appointmentId, recipientPhone: "5511987654321" }),
    }));
  });
  it("não cria sem conexão ou preferência", async () => {
    connection.findFirst.mockResolvedValue(null);
    await expect(enqueueAppointmentConfirmation(tx, input)).resolves.toEqual({ created: false, reason: "preference_disabled" });
    expect(outbox.upsert).not.toHaveBeenCalled();
  });
  it("não cria com telefone inválido", async () => {
    await expect(enqueueAppointmentConfirmation(tx, { ...input, customerPhone: "11111111111" })).resolves.toEqual({ created: false, reason: "invalid_phone" });
    expect(connection.findFirst).not.toHaveBeenCalled();
  });
});
