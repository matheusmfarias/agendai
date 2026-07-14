import { beforeEach, describe, expect, it, vi } from "vitest";

const { prismaMock, txMock, enqueueRequestedMock } = vi.hoisted(() => {
  const tx = {
    tenant: { findUnique: vi.fn() },
    appointment: { create: vi.fn() },
    appointmentCustomValue: { createMany: vi.fn() },
    appointmentEvent: { createMany: vi.fn() },
    auditLog: { create: vi.fn() },
    typebotSession: { update: vi.fn() },
  };
  return {
    txMock: tx,
    enqueueRequestedMock: vi.fn(),
    prismaMock: {
      typebotSession: { findFirst: vi.fn() },
      customer: { findFirst: vi.fn() },
      service: { findFirst: vi.fn() },
      $transaction: vi.fn(
        async (callback: (txClient: typeof tx) => Promise<unknown>) =>
          callback(tx),
      ),
    },
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
vi.mock("@/features/whatsapp/whatsapp-outbox-service", () => ({
  enqueueAppointmentRequested: enqueueRequestedMock,
}));

import { createTypebotAppointment } from "@/features/typebot/typebot-service";

describe("Typebot custom field tenant isolation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.typebotSession.findFirst.mockResolvedValue({
      id: "session-a",
      tenantId: "tenant-a",
    });
    prismaMock.customer.findFirst.mockResolvedValue({
      id: "customer-a",
      name: "Cliente A",
      phone: "5511999999999",
    });
    prismaMock.service.findFirst.mockResolvedValue({
      id: "service-a",
      name: "Consulta",
      durationMinutes: 30,
      bookingMode: "DIRECT",
      priceType: "HIDDEN",
      priceValue: null,
      customFields: [],
    });
    txMock.tenant.findUnique.mockResolvedValue({
      id: "tenant-a",
      name: "Clínica A",
      publicDisplayName: null,
      timezone: "America/Sao_Paulo",
    });
    txMock.appointment.create.mockResolvedValue({
      id: "appointment-a",
      status: "REQUESTED",
      startsAt: new Date("2026-07-20T12:00:00.000Z"),
      endsAt: new Date("2026-07-20T12:30:00.000Z"),
    });
  });

  it("rejects a tenant B custom field before opening the write transaction", async () => {
    await expect(
      createTypebotAppointment("tenant-a", {
        sessionId: "session-a",
        customerId: "customer-a",
        serviceId: "service-a",
        startsAt: "2026-07-20T12:00:00.000Z",
        customValues: [{ customFieldId: "field-b", value: "segredo" }],
      }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });

    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("creates the requested outbox in the Typebot appointment transaction", async () => {
    prismaMock.service.findFirst.mockResolvedValue({
      id: "service-a",
      name: "Consulta",
      durationMinutes: 30,
      bookingMode: "REQUIRES_CONFIRMATION",
      priceType: "HIDDEN",
      priceValue: null,
      customFields: [],
    });

    await createTypebotAppointment("tenant-a", {
      sessionId: "session-a",
      customerId: "customer-a",
      serviceId: "service-a",
      startsAt: "2026-07-20T12:00:00.000Z",
    });

    expect(enqueueRequestedMock).toHaveBeenCalledWith(
      txMock,
      expect.objectContaining({
        tenantId: "tenant-a",
        appointmentId: "appointment-a",
        customerPhone: "5511999999999",
        serviceName: "Consulta",
        businessName: "Clínica A",
      }),
    );
  });

  it("does not create APPOINTMENT_REQUESTED for a DIRECT Typebot booking", async () => {
    await createTypebotAppointment("tenant-a", {
      sessionId: "session-a",
      customerId: "customer-a",
      serviceId: "service-a",
      startsAt: "2026-07-20T12:00:00.000Z",
    });

    expect(enqueueRequestedMock).not.toHaveBeenCalled();
  });
});
