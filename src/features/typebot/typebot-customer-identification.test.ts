import { beforeEach, describe, expect, it, vi } from "vitest";

const { prismaMock } = vi.hoisted(() => {
  const customer = {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
  };
  const typebotSession = {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  };
  return {
    prismaMock: {
      customer,
      typebotSession,
      $transaction: vi.fn(
        async (callback: (tx: { customer: typeof customer; typebotSession: typeof typebotSession }) => Promise<unknown>) =>
          callback({ customer, typebotSession }),
      ),
    },
  };
});

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import {
  confirmTypebotCustomer,
  createTypebotCustomer,
  lookupTypebotCustomer,
} from "@/features/typebot/typebot-service";

const sessionId = "11111111-1111-4111-8111-111111111111";

describe("Typebot customer identification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.customer.findMany.mockResolvedValue([]);
    prismaMock.typebotSession.findMany.mockResolvedValue([]);
    prismaMock.typebotSession.create.mockImplementation(async ({ data }) => ({
      id: sessionId,
      metadata: null,
      customerId: null,
      customerName: null,
      ...data,
    }));
    prismaMock.typebotSession.update.mockImplementation(async ({ where, data }) => ({
      id: where.id,
      tenantId: "tenant-a",
      phone: "11999999999",
      metadata: null,
      ...data,
    }));
  });

  it.each([
    "+55 (11) 99999-9999",
    "55 11 99999 9999",
    "(11) 99999-9999",
    "11999999999",
  ])("finds the same tenant customer for %s", async (phone) => {
    prismaMock.customer.findMany.mockResolvedValue([
      {
        id: "customer-a",
        name: "Ana",
        phone: "(11) 99999-9999",
        email: null,
      },
    ]);

    const result = await lookupTypebotCustomer("tenant-a", phone);

    expect(result.status).toBe("FOUND");
    expect(result.customer).toEqual({ id: "customer-a", name: "Ana" });
    expect(prismaMock.customer.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { tenantId: "tenant-a" } }),
    );
  });

  it("reuses the confirmed customer without overwriting it", async () => {
    prismaMock.typebotSession.findFirst.mockResolvedValue({
      id: sessionId,
      tenantId: "tenant-a",
      phone: "11999999999",
      customerId: null,
      metadata: {
        customerLookup: {
          status: "FOUND",
          candidateCustomerId: "customer-a",
        },
      },
    });
    prismaMock.customer.findFirst.mockResolvedValue({
      id: "customer-a",
      name: "Ana",
      phone: "+55 (11) 99999-9999",
      email: null,
    });

    const result = await confirmTypebotCustomer("tenant-a", sessionId);

    expect(result.customer.id).toBe("customer-a");
    expect(prismaMock.customer.create).not.toHaveBeenCalled();
    expect(prismaMock.typebotSession.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ customerId: "customer-a" }),
      }),
    );
  });

  it("creates a customer only after a lookup without an unequivocal match", async () => {
    prismaMock.typebotSession.findFirst.mockResolvedValue({
      id: sessionId,
      tenantId: "tenant-a",
      phone: "11999999999",
      customerId: null,
      metadata: { customerLookup: { status: "NOT_FOUND" } },
    });
    prismaMock.customer.create.mockResolvedValue({
      id: "customer-new",
      name: "Bruno",
      phone: "11999999999",
      email: null,
    });

    const result = await createTypebotCustomer("tenant-a", {
      sessionId,
      name: "Bruno",
    });

    expect(result.customer.id).toBe("customer-new");
    expect(prismaMock.customer.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ tenantId: "tenant-a" }),
      }),
    );
  });

  it("does not let CREATE bypass confirmation of a found customer", async () => {
    prismaMock.typebotSession.findFirst.mockResolvedValue({
      id: sessionId,
      tenantId: "tenant-a",
      phone: "11999999999",
      customerId: null,
      metadata: {
        customerLookup: {
          status: "FOUND",
          candidateCustomerId: "customer-a",
        },
      },
    });

    await expect(
      createTypebotCustomer("tenant-a", { sessionId, name: "Outra pessoa" }),
    ).rejects.toMatchObject({ code: "CUSTOMER_REQUIRED" });
    expect(prismaMock.customer.create).not.toHaveBeenCalled();
  });

  it("creates a separate customer after an explicit 'Não sou eu'", async () => {
    prismaMock.typebotSession.findFirst.mockResolvedValue({
      id: sessionId,
      tenantId: "tenant-a",
      phone: "11999999999",
      customerId: null,
      metadata: {
        customerLookup: {
          status: "FOUND",
          candidateCustomerId: "customer-a",
        },
      },
    });
    prismaMock.customer.create.mockResolvedValue({
      id: "customer-separate",
      name: "Carla",
      phone: "11999999999",
      email: null,
    });

    await expect(
      createTypebotCustomer("tenant-a", {
        sessionId,
        name: "Carla",
        rejectedExisting: true,
      }),
    ).resolves.toMatchObject({ customer: { id: "customer-separate" } });
    expect(prismaMock.$transaction).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({ isolationLevel: "Serializable" }),
    );
  });

  it("reuses the uniquely matching normalized name after 'Não sou eu'", async () => {
    prismaMock.typebotSession.findFirst.mockResolvedValue({
      id: sessionId,
      tenantId: "tenant-a",
      phone: "11999999999",
      customerId: null,
      metadata: {
        customerLookup: {
          status: "FOUND",
          candidateCustomerId: "customer-a",
        },
      },
    });
    prismaMock.customer.findMany.mockResolvedValue([
      { id: "customer-a", name: "Ana", phone: "11999999999", email: null },
      {
        id: "customer-b",
        name: "Beatriz Souza",
        phone: "+5511999999999",
        email: "bia@example.com",
      },
    ]);

    const result = await createTypebotCustomer("tenant-a", {
      sessionId,
      name: "beatriz souza",
      rejectedExisting: true,
    });

    expect(result.customer.id).toBe("customer-b");
    expect(prismaMock.customer.create).not.toHaveBeenCalled();
  });

  it("fails closed when the normalized name is still ambiguous", async () => {
    prismaMock.typebotSession.findFirst.mockResolvedValue({
      id: sessionId,
      tenantId: "tenant-a",
      phone: "11999999999",
      customerId: null,
      metadata: {
        customerLookup: {
          status: "FOUND",
          candidateCustomerId: "customer-a",
        },
      },
    });
    prismaMock.customer.findMany.mockResolvedValue([
      { id: "customer-a", name: "José", phone: "11999999999", email: null },
      { id: "customer-b", name: "Jose", phone: "5511999999999", email: null },
    ]);

    await expect(
      createTypebotCustomer("tenant-a", {
        sessionId,
        name: "JOSE",
        rejectedExisting: true,
      }),
    ).rejects.toMatchObject({ code: "CUSTOMER_REQUIRED" });
    expect(prismaMock.customer.create).not.toHaveBeenCalled();
  });

  it("prioritizes the customer used most recently without exposing duplicates", async () => {
    prismaMock.customer.findMany.mockResolvedValue([
      {
        id: "customer-1",
        name: "Ana",
        phone: "11999999999",
        email: null,
        updatedAt: new Date("2026-07-15T10:00:00.000Z"),
        appointments: [{ createdAt: new Date("2026-07-10T10:00:00.000Z") }],
      },
      {
        id: "customer-2",
        name: "Bia",
        phone: "+5511999999999",
        email: null,
        updatedAt: new Date("2026-07-14T10:00:00.000Z"),
        appointments: [{ createdAt: new Date("2026-07-14T10:00:00.000Z") }],
      },
    ]);

    const result = await lookupTypebotCustomer(
      "tenant-a",
      "(11) 99999-9999",
    );

    expect(result).toMatchObject({
      status: "FOUND",
      customer: { id: "customer-2", name: "Bia" },
    });
    expect(result.session.metadata).toEqual(
      expect.objectContaining({
        customerLookup: {
          status: "FOUND",
          candidateCustomerId: "customer-2",
        },
      }),
    );
  });

  it("falls back to the most recently updated customer without appointments", async () => {
    prismaMock.customer.findMany.mockResolvedValue([
      {
        id: "customer-1",
        name: "Ana",
        phone: "11999999999",
        email: null,
        updatedAt: new Date("2026-07-14T10:00:00.000Z"),
        appointments: [],
      },
      {
        id: "customer-2",
        name: "Bia",
        phone: "5511999999999",
        email: null,
        updatedAt: new Date("2026-07-15T10:00:00.000Z"),
        appointments: [],
      },
    ]);

    const result = await lookupTypebotCustomer("tenant-a", "11999999999");

    expect(result.customer).toEqual({ id: "customer-2", name: "Bia" });
  });

  it("keeps repeated creation idempotent within the session", async () => {
    const customer = {
      id: "customer-new",
      name: "Bruno",
      phone: "11999999999",
      email: null,
    };
    prismaMock.typebotSession.findFirst.mockResolvedValue({
      id: sessionId,
      tenantId: "tenant-a",
      phone: "11999999999",
      customerId: "customer-new",
      metadata: {
        customerLookup: { status: "NOT_FOUND", resolution: "CREATED" },
      },
    });
    prismaMock.customer.findFirst.mockResolvedValue(customer);

    await expect(
      createTypebotCustomer("tenant-a", { sessionId, name: "Bruno" }),
    ).resolves.toMatchObject({ customer });
    expect(prismaMock.customer.create).not.toHaveBeenCalled();
  });

  it("does not resolve a session from another tenant", async () => {
    prismaMock.typebotSession.findFirst.mockResolvedValue(null);

    await expect(
      confirmTypebotCustomer("tenant-b", sessionId),
    ).rejects.toMatchObject({ code: "SESSION_NOT_FOUND" });
    expect(prismaMock.typebotSession.findFirst).toHaveBeenCalledWith({
      where: { id: sessionId, tenantId: "tenant-b" },
    });
  });
});
