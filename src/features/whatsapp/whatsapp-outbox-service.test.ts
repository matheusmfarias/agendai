import { beforeEach, describe, expect, it, vi } from "vitest";

const { connection, outbox, config } = vi.hoisted(() => ({
  connection: { findFirst: vi.fn() },
  outbox: { upsert: vi.fn(), updateMany: vi.fn() },
  config: { enabled: true },
}));
vi.mock("@/features/whatsapp/whatsapp-config", () => ({
  getWhatsAppConfig: () => config,
}));

import {
  cancelPendingAppointmentReminders,
  enqueueAppointmentCompleted,
  enqueueAppointmentConfirmation,
  enqueueAppointmentRequested,
} from "@/features/whatsapp/whatsapp-outbox-service";
import type { Prisma } from "@/generated/prisma/client";

const tenantId = crypto.randomUUID();
const appointmentId = crypto.randomUUID();
const connectionId = crypto.randomUUID();
const now = new Date("2026-07-14T10:00:00.000Z");
const tx = {
  whatsAppConnection: connection,
  whatsAppMessageOutbox: outbox,
} as unknown as Prisma.TransactionClient;
const input = {
  tenantId,
  appointmentId,
  customerName: "Ana",
  customerPhone: "11987654321",
  serviceName: "Corte",
  startsAt: new Date("2026-07-15T12:30:00.000Z"),
  now,
};

function eligibleConnection(overrides: Record<string, unknown> = {}) {
  return {
    id: connectionId,
    tenant: {
      status: "ACTIVE",
      timezone: "America/Sao_Paulo",
      name: "Studio",
      publicDisplayName: null,
      confirmationMessageTemplate:
        "Confirmado: {cliente}, {serviço}, {data}, {hora}.",
      reminderMessageTemplate:
        "Lembrete: {cliente}, {serviço}, {data}, {hora}.",
      cancellationMessageTemplate:
        "Cancelado: {cliente}, {serviço}, {data}, {hora}.",
      enableAutomaticReminders: true,
      reminderLeadHours: 2,
      subscription: {
        status: "ACTIVE",
        expiresAt: new Date("2027-01-01T00:00:00.000Z"),
        plan: { publicLinkEnabled: true, whatsappEnabled: true },
      },
      ...overrides,
    },
  };
}

describe("WhatsApp outbox", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    config.enabled = true;
    connection.findFirst.mockResolvedValue(eligibleConnection());
    outbox.upsert.mockResolvedValue({
      id: crypto.randomUUID(),
      status: "PENDING",
    });
    outbox.updateMany.mockResolvedValue({ count: 1 });
  });

  it("cria confirmação idempotente com template fixo e timezone do tenant", async () => {
    await expect(
      enqueueAppointmentConfirmation(tx, input),
    ).resolves.toMatchObject({ created: true });
    expect(connection.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          tenantId,
          enabled: true,
          sendAppointmentConfirmation: true,
        },
      }),
    );
    expect(outbox.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          tenantId_idempotencyKey: {
            tenantId,
            idempotencyKey: `appointment:${appointmentId}:confirmed:v1`,
          },
        },
        create: expect.objectContaining({
          tenantId,
          appointmentId,
          recipientPhone: "5511987654321",
          payload: expect.not.objectContaining({
            messageTemplate: expect.anything(),
          }),
        }),
      }),
    );
    expect(outbox.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          payload: expect.objectContaining({
            bookingDate: "15/07/2026",
            bookingTime: "09:30",
          }),
        }),
      }),
    );
  });

  it("cria confirmação para telefone nacional válido de 10 dígitos", async () => {
    await expect(
      enqueueAppointmentConfirmation(tx, {
        ...input,
        customerPhone: "5591884991",
      }),
    ).resolves.toMatchObject({ created: true });

    expect(outbox.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          type: "APPOINTMENT_CONFIRMED",
          recipientPhone: "555591884991",
        }),
      }),
    );
  });

  it("cria solicitação com preferência e idempotência próprias", async () => {
    await expect(enqueueAppointmentRequested(tx, input)).resolves.toMatchObject({
      created: true,
    });
    expect(connection.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId, enabled: true, sendAppointmentRequested: true },
      }),
    );
    expect(outbox.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ type: "APPOINTMENT_REQUESTED" }),
      }),
    );
  });

  it("cria conclusão idempotente somente com a preferência habilitada", async () => {
    await expect(enqueueAppointmentCompleted(tx, input)).resolves.toMatchObject({
      created: true,
    });
    expect(connection.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId, enabled: true, sendAppointmentCompleted: true },
      }),
    );
    expect(outbox.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          tenantId_idempotencyKey: {
            tenantId,
            idempotencyKey: `appointment:${appointmentId}:completed:v1`,
          },
        },
        create: expect.objectContaining({ type: "APPOINTMENT_COMPLETED" }),
        update: {},
      }),
    );
  });

  it("não cria conclusão com preferência desligada ou telefone inválido", async () => {
    connection.findFirst.mockResolvedValueOnce(null);
    await expect(enqueueAppointmentCompleted(tx, input)).resolves.toEqual({
      created: false,
      reason: "preference_disabled",
    });
    await expect(
      enqueueAppointmentCompleted(tx, { ...input, customerPhone: "inválido" }),
    ).resolves.toEqual({ created: false, reason: "invalid_phone" });
    expect(outbox.upsert).not.toHaveBeenCalled();
  });

  it("não cria mensagens quando canal ou plano está indisponível", async () => {
    connection.findFirst.mockResolvedValue(
      eligibleConnection({
        subscription: {
          status: "ACTIVE",
          expiresAt: new Date("2027-01-01T00:00:00.000Z"),
          plan: { publicLinkEnabled: true, whatsappEnabled: false },
        },
      }),
    );
    await expect(enqueueAppointmentConfirmation(tx, input)).resolves.toEqual({
      created: false,
      reason: "plan_unavailable",
    });
    connection.findFirst.mockResolvedValue(null);
    await expect(enqueueAppointmentConfirmation(tx, input)).resolves.toEqual({
      created: false,
      reason: "preference_disabled",
    });
    expect(outbox.upsert).not.toHaveBeenCalled();
  });

  it("não cria com telefone inválido ou gateway desligado", async () => {
    await expect(
      enqueueAppointmentConfirmation(tx, {
        ...input,
        customerPhone: "11111111111",
      }),
    ).resolves.toEqual({ created: false, reason: "invalid_phone" });
    config.enabled = false;
    await expect(enqueueAppointmentRequested(tx, input)).resolves.toEqual({
      created: false,
      reason: "gateway_disabled",
    });
    expect(outbox.upsert).not.toHaveBeenCalled();
  });

  it("invalida lembretes obsoletos sem tocar em SENT", async () => {
    await cancelPendingAppointmentReminders(tx, tenantId, appointmentId);
    expect(outbox.updateMany).toHaveBeenCalledWith({
      where: {
        tenantId,
        appointmentId,
        type: "APPOINTMENT_REMINDER",
        status: {
          in: ["PENDING", "QUEUED", "PROCESSING", "RETRYING"],
        },
      },
      data: {
        status: "CANCELED",
        scheduledFor: null,
        nextAttemptAt: null,
      },
    });
  });
});
