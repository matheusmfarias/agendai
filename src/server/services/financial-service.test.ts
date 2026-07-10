import { beforeEach, describe, expect, it, vi } from "vitest";

const { prismaMock, txMock } = vi.hoisted(() => {
  const tx = {
    financialEntry: {
      findFirst: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
    financialPayment: {
      create: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
  };

  return {
    txMock: tx,
    prismaMock: {
      $transaction: vi.fn((callback) => callback(tx)),
    },
  };
});

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

import {
  refundFinancialEntry,
  registerFinancialPayment,
} from "@/server/services/financial-service";

const actor = {
  actorId: crypto.randomUUID(),
  tenantId: crypto.randomUUID(),
  ipAddress: "127.0.0.1",
};

function financialEntry(overrides = {}) {
  return {
    id: crypto.randomUUID(),
    tenantId: actor.tenantId,
    appointmentId: null,
    customerId: crypto.randomUUID(),
    serviceId: crypto.randomUUID(),
    type: "REVENUE",
    status: "PENDING",
    description: "Serviço",
    amountInCents: 10000,
    entryDate: new Date("2026-07-08T12:00:00-03:00"),
    dueDate: null,
    paidAt: null,
    paymentMethod: "PIX",
    category: "Atendimento",
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    payments: [],
    ...overrides,
  };
}

describe("financial service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("keeps entry pending after a partial payment", async () => {
    const entry = financialEntry({
      payments: [{ amountInCents: 3000 }],
    });
    txMock.financialEntry.findFirst.mockResolvedValue(entry);
    txMock.financialPayment.create.mockResolvedValue({
      id: crypto.randomUUID(),
      amountInCents: 4000,
    });

    await registerFinancialPayment(
      {
        id: entry.id,
        amount: 4000,
        paidAt: new Date("2026-07-08T12:00:00-03:00"),
        paymentMethod: "PIX",
      },
      actor,
    );

    expect(txMock.financialEntry.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "PENDING" }),
      }),
    );
  });

  it("marks entry as paid when the payment closes the balance", async () => {
    const entry = financialEntry({
      payments: [{ amountInCents: 6000 }],
    });
    txMock.financialEntry.findFirst.mockResolvedValue(entry);
    txMock.financialPayment.create.mockResolvedValue({
      id: crypto.randomUUID(),
      amountInCents: 4000,
    });

    await registerFinancialPayment(
      {
        id: entry.id,
        amount: 4000,
        paidAt: new Date("2026-07-08T12:00:00-03:00"),
        paymentMethod: "PIX",
      },
      actor,
    );

    expect(txMock.financialEntry.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "PAID" }),
      }),
    );
  });

  it("creates a refund entry and payment for refunds", async () => {
    const entry = financialEntry({
      status: "PAID",
      paidAt: new Date("2026-07-08T12:00:00-03:00"),
      payments: [{ amountInCents: 10000 }],
    });
    txMock.financialEntry.findFirst.mockResolvedValue(entry);
    txMock.financialEntry.create.mockResolvedValue({
      ...entry,
      id: crypto.randomUUID(),
      type: "REFUND",
      status: "REFUNDED",
      amountInCents: 5000,
    });

    await refundFinancialEntry(
      {
        id: entry.id,
        amount: 5000,
        reason: "Cliente reembolsado",
      },
      actor,
    );

    expect(txMock.financialEntry.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: "REFUND",
          status: "REFUNDED",
          amountInCents: 5000,
        }),
      }),
    );
    expect(txMock.financialPayment.create).toHaveBeenCalled();
  });
});
