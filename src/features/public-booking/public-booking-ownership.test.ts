import { beforeEach, describe, expect, it, vi } from "vitest";

const { prismaMock, txMock, createProviderNotificationMock, enqueueConfirmationMock } = vi.hoisted(() => {
  const tx = {
    tenant: { findUnique: vi.fn() },
    service: { findFirst: vi.fn() },
    user: { findFirst: vi.fn() },
    customer: { findFirst: vi.fn(), update: vi.fn(), create: vi.fn() },
    appointment: { findFirst: vi.fn(), create: vi.fn() },
    appointmentCustomValue: { createMany: vi.fn() },
    appointmentEvent: { createMany: vi.fn() },
    auditLog: { create: vi.fn() },
  };
  return {
    txMock: tx,
    prismaMock: {
      tenant: { findUnique: vi.fn() },
      appointment: { findFirst: vi.fn() },
      $transaction: vi.fn(
        async (callback: (txClient: typeof tx) => Promise<unknown>) =>
          callback(tx),
      ),
    },
    createProviderNotificationMock: vi.fn(),
    enqueueConfirmationMock: vi.fn(),
  };
});

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/features/booking-core/availability", () => ({
  assertAvailability: vi.fn(),
  assertNoSlotConflict: vi.fn(),
  getAvailableSlots: vi.fn(),
  publicStatusForBookingMode: vi.fn((mode: string) =>
    mode === "REQUIRES_CONFIRMATION" ? "REQUESTED" : "CONFIRMED",
  ),
}));
vi.mock("@/features/booking-core/custom-fields", async () => {
  const actual = await vi.importActual<
    typeof import("@/features/booking-core/custom-fields")
  >("@/features/booking-core/custom-fields");
  return { ...actual, normalizePhone: vi.fn(() => "5511999999999") };
});
vi.mock("@/features/booking-core/tenant-policy", () => ({
  isTenantBookableForPublicLink: vi.fn(() => true),
  canCreatePublicAppointmentForTenant: vi.fn(() => true),
}));
vi.mock("@/features/booking-core/timezone", () => ({
  parseLocalDateTimeInTimezone: vi.fn(() => new Date("2026-07-20T12:00:00Z")),
}));
vi.mock("@/features/provider-notifications/notification-service", () => ({
  createProviderNotification: createProviderNotificationMock,
}));
vi.mock("@/features/whatsapp/whatsapp-outbox-service", () => ({
  enqueueAppointmentConfirmation: enqueueConfirmationMock,
}));

import {
  createPublicBooking,
  getPublicBookingConfirmation,
} from "@/features/public-booking/public-booking-service";

const input = {
  tenantSlug: "tenant-a",
  serviceId: "11111111-1111-4111-8111-111111111111",
  startsAt: "2026-07-20T09:00",
  customerNotes: "",
  customFields: {},
};

function prepareBooking() {
  txMock.tenant.findUnique.mockResolvedValue({
    id: "tenant-a-id",
    slug: "tenant-a",
    timezone: "America/Sao_Paulo",
    status: "ACTIVE",
    subscription: null,
  });
  txMock.service.findFirst.mockResolvedValue({
    id: input.serviceId,
    name: "Consulta",
    durationMinutes: 60,
    priceValue: null,
    bookingMode: "DIRECT",
    category: { name: "Geral" },
    customFields: [],
  });
  txMock.user.findFirst.mockResolvedValue({
    id: "owner-a",
    name: "Cliente Atual",
    email: "owner@example.com",
    phone: "+55 11 99999-9999",
  });
  txMock.appointment.create.mockResolvedValue({ id: "appointment-a" });
  txMock.appointmentEvent.createMany.mockResolvedValue({ count: 2 });
  txMock.auditLog.create.mockResolvedValue({ id: "audit-a" });
  createProviderNotificationMock.mockResolvedValue(undefined);
}

describe("public booking ownership", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prepareBooking();
  });

  it("reuses an unowned legacy Customer without claiming it or releasing history", async () => {
    txMock.customer.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: "legacy-customer",
        name: "Cadastro legado",
        userId: null,
      });

    await createPublicBooking(input, "owner-a");

    expect(txMock.customer.update).not.toHaveBeenCalled();
    expect(txMock.customer.create).not.toHaveBeenCalled();
    expect(txMock.appointment.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        customer: { connect: { id: "legacy-customer" } },
        customerUser: { connect: { id: "owner-a" } },
      }),
    });
    expect(createProviderNotificationMock).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: "tenant-a-id",
        type: "public_booking_created",
        entityId: "appointment-a",
      }),
      txMock,
    );
    expect(enqueueConfirmationMock).toHaveBeenCalledWith(
      txMock,
      expect.objectContaining({
        tenantId: "tenant-a-id",
        appointmentId: "appointment-a",
        serviceName: "Consulta",
      }),
    );
  });

  it("persists a confirmation-required notification in the booking transaction", async () => {
    txMock.service.findFirst.mockResolvedValue({
      id: input.serviceId,
      name: "Consulta",
      durationMinutes: 60,
      priceValue: null,
      bookingMode: "REQUIRES_CONFIRMATION",
      category: { name: "Geral" },
      customFields: [],
    });
    txMock.customer.findFirst.mockResolvedValueOnce({
      id: "owned-customer",
      name: "Cliente Atual",
      userId: "owner-a",
    });
    txMock.customer.update.mockResolvedValue({
      id: "owned-customer",
      name: "Cliente Atual",
      userId: "owner-a",
    });

    await createPublicBooking(input, "owner-a");

    expect(createProviderNotificationMock).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: "tenant-a-id",
        type: "booking_confirmation_required",
        priority: "high",
        entityId: "appointment-a",
      }),
      txMock,
    );
  });

  it("aborts the booking transaction when its durable notification fails", async () => {
    txMock.customer.findFirst.mockResolvedValueOnce({
      id: "owned-customer",
      name: "Cliente Atual",
      userId: "owner-a",
    });
    txMock.customer.update.mockResolvedValue({
      id: "owned-customer",
      name: "Cliente Atual",
      userId: "owner-a",
    });
    createProviderNotificationMock.mockRejectedValueOnce(
      new Error("notification write failed"),
    );

    await expect(createPublicBooking(input, "owner-a")).rejects.toThrow(
      "notification write failed",
    );
    expect(createProviderNotificationMock).toHaveBeenCalledWith(
      expect.any(Object),
      txMock,
    );
  });

  it("does not select or overwrite a Customer linked to another user", async () => {
    txMock.customer.findFirst.mockResolvedValue(null);
    txMock.customer.create.mockResolvedValue({
      id: "separate-customer",
      name: "Cliente Atual",
      userId: "owner-a",
    });

    await createPublicBooking(input, "owner-a");

    expect(txMock.customer.findFirst).toHaveBeenNthCalledWith(2, {
      where: expect.objectContaining({ tenantId: "tenant-a-id", userId: null }),
    });
    expect(txMock.customer.update).not.toHaveBeenCalled();
    expect(txMock.customer.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tenantId: "tenant-a-id",
        userId: "owner-a",
      }),
    });
  });

  it("keeps an existing legitimate Customer link with the same user", async () => {
    txMock.customer.findFirst.mockResolvedValueOnce({
      id: "owned-customer",
      name: "Cliente Atual",
      userId: "owner-a",
    });
    txMock.customer.update.mockResolvedValue({
      id: "owned-customer",
      name: "Cliente Atual",
      userId: "owner-a",
    });

    await createPublicBooking(input, "owner-a");

    expect(txMock.customer.findFirst).toHaveBeenCalledTimes(1);
    expect(txMock.customer.update).toHaveBeenCalledWith({
      where: { id: "owned-customer" },
      data: expect.objectContaining({ userId: "owner-a" }),
    });
  });

  it("rejects a custom field outside the tenant service before any write", async () => {
    await expect(
      createPublicBooking(
        {
          ...input,
          customFields: {
            "custom_22222222-2222-4222-8222-222222222222": "segredo",
          },
        },
        "owner-a",
      ),
    ).rejects.toThrow(/campos personalizados/i);

    expect(txMock.user.findFirst).not.toHaveBeenCalled();
    expect(txMock.customer.update).not.toHaveBeenCalled();
    expect(txMock.customer.create).not.toHaveBeenCalled();
    expect(txMock.appointment.create).not.toHaveBeenCalled();
  });

  it("denies an inactive CUSTOMER before customer or appointment writes", async () => {
    txMock.user.findFirst.mockResolvedValue(null);

    await expect(createPublicBooking(input, "owner-a")).rejects.toThrow(
      /conta de cliente/i,
    );

    expect(txMock.user.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: "owner-a", isActive: true }),
      }),
    );
    expect(txMock.customer.update).not.toHaveBeenCalled();
    expect(txMock.customer.create).not.toHaveBeenCalled();
    expect(txMock.appointment.create).not.toHaveBeenCalled();
  });
});

describe("public booking confirmation ownership", () => {
  beforeEach(() => vi.clearAllMocks());

  it("denies an appointment belonging to another owner", async () => {
    prismaMock.tenant.findUnique.mockResolvedValue({ id: "tenant-a-id" });
    prismaMock.appointment.findFirst.mockResolvedValue(null);

    const result = await getPublicBookingConfirmation(
      "tenant-a",
      "appointment-b",
      "owner-a",
    );

    expect(result).toBeNull();
    expect(prismaMock.appointment.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: "appointment-b",
          tenantId: "tenant-a-id",
          customerUserId: "owner-a",
          origin: "PUBLIC_LINK",
        },
      }),
    );
  });

  it("does not query an appointment when the tenant slug is invalid", async () => {
    prismaMock.tenant.findUnique.mockResolvedValue(null);

    const result = await getPublicBookingConfirmation(
      "tenant-b",
      "appointment-a",
      "owner-a",
    );

    expect(result).toBeNull();
    expect(prismaMock.appointment.findFirst).not.toHaveBeenCalled();
  });
});
