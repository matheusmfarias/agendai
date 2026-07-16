import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  prismaMock,
  txMock,
  enqueueRequestedMock,
  enqueueConfirmationMock,
} = vi.hoisted(() => {
  const tx = {
    tenant: { findUnique: vi.fn() },
    service: { findFirst: vi.fn() },
    appointment: { create: vi.fn() },
    appointmentCustomValue: { createMany: vi.fn() },
    appointmentEvent: { createMany: vi.fn() },
    auditLog: { create: vi.fn() },
    typebotSession: { update: vi.fn() },
  };
  return {
    txMock: tx,
    enqueueRequestedMock: vi.fn(),
    enqueueConfirmationMock: vi.fn(),
    prismaMock: {
      typebotSession: { findFirst: vi.fn() },
      appointment: { findFirst: vi.fn() },
      customer: { findFirst: vi.fn() },
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
  enqueueAppointmentConfirmation: enqueueConfirmationMock,
}));

import {
  createTypebotAppointment,
  getTypebotAppointment,
} from "@/features/typebot/typebot-service";

describe("Typebot custom field tenant isolation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.typebotSession.findFirst.mockResolvedValue({
      id: "session-a",
      tenantId: "tenant-a",
      customerId: "customer-a",
      status: "IDENTIFIED",
      lastAppointmentId: null,
    });
    prismaMock.customer.findFirst.mockResolvedValue({
      id: "customer-a",
      name: "Cliente A",
      phone: "5511999999999",
    });
    txMock.service.findFirst.mockResolvedValue({
      id: "service-a",
      name: "Consulta",
      durationMinutes: 30,
      bookingMode: "DIRECT",
      priceType: "HIDDEN",
      priceValue: null,
      category: { name: "Geral" },
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

  it("rejects a tenant B custom field before any write", async () => {
    await expect(
      createTypebotAppointment("tenant-a", {
        sessionId: "session-a",
        customerId: "customer-a",
        serviceId: "service-a",
        startsAt: "2026-07-20T12:00:00.000Z",
        customValues: [{ customFieldId: "field-b", value: "segredo" }],
      }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });

    expect(txMock.appointment.create).not.toHaveBeenCalled();
    expect(txMock.appointmentCustomValue.createMany).not.toHaveBeenCalled();
  });

  it("persists validated custom values with the appointment", async () => {
    txMock.service.findFirst.mockResolvedValue({
      id: "service-a",
      name: "Limpeza interna",
      durationMinutes: 30,
      bookingMode: "DIRECT",
      priceType: "HIDDEN",
      priceValue: null,
      category: { name: "Geral" },
      customFields: [
        {
          id: "field-a",
          label: "Modelo do carro",
          fieldType: "TEXT",
          isRequired: true,
          options: null,
        },
      ],
    });

    await createTypebotAppointment("tenant-a", {
      sessionId: "session-a",
      customerId: "customer-a",
      serviceId: "service-a",
      startsAt: "2026-07-20T12:00:00.000Z",
      customValues: [{ customFieldId: "field-a", value: "Onix 2020" }],
    });

    expect(txMock.appointmentCustomValue.createMany).toHaveBeenCalledWith({
      data: [
        {
          appointmentId: "appointment-a",
          customFieldId: "field-a",
          value: "Onix 2020",
        },
      ],
    });
  });

  it("rejects a missing required answer before creating the appointment", async () => {
    txMock.service.findFirst.mockResolvedValue({
      id: "service-a",
      name: "Limpeza interna",
      durationMinutes: 30,
      bookingMode: "DIRECT",
      priceType: "HIDDEN",
      priceValue: null,
      category: { name: "Geral" },
      customFields: [
        {
          id: "field-a",
          label: "Modelo do carro",
          fieldType: "TEXT",
          isRequired: true,
          options: null,
        },
      ],
    });

    await expect(
      createTypebotAppointment("tenant-a", {
        sessionId: "session-a",
        customerId: "customer-a",
        serviceId: "service-a",
        startsAt: "2026-07-20T12:00:00.000Z",
        customValues: [],
      }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });

    expect(txMock.appointment.create).not.toHaveBeenCalled();
  });

  it("creates the requested outbox in the Typebot appointment transaction", async () => {
    txMock.service.findFirst.mockResolvedValue({
      id: "service-a",
      name: "Consulta",
      durationMinutes: 30,
      bookingMode: "REQUIRES_CONFIRMATION",
      priceType: "HIDDEN",
      priceValue: null,
      category: { name: "Geral" },
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
        customerName: "Cliente A",
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
    expect(enqueueConfirmationMock).toHaveBeenCalledWith(
      txMock,
      expect.objectContaining({ appointmentId: "appointment-a" }),
    );
  });

  it("returns the existing appointment after the identification step is retried", async () => {
    prismaMock.typebotSession.findFirst.mockResolvedValue({
      id: "session-a",
      tenantId: "tenant-a",
      customerId: "customer-a",
      status: "IDENTIFIED",
      lastAppointmentId: "appointment-a",
    });
    prismaMock.appointment.findFirst.mockResolvedValue({
      id: "appointment-a",
      status: "CONFIRMED",
      origin: "WHATSAPP",
      startsAt: new Date("2026-07-20T12:00:00.000Z"),
      endsAt: new Date("2026-07-20T12:30:00.000Z"),
      service: {
        name: "Consulta",
        bookingMode: "DIRECT",
        priceType: "HIDDEN",
        priceValue: null,
      },
      customer: { name: "Cliente A" },
    });

    const result = await createTypebotAppointment("tenant-a", {
      sessionId: "session-a",
      customerId: "customer-a",
      serviceId: "service-a",
      startsAt: "2026-07-20T12:00:00.000Z",
    });

    expect(result.id).toBe("appointment-a");
    expect(prismaMock.appointment.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: "appointment-a",
          tenantId: "tenant-a",
          customerId: "customer-a",
          serviceId: "service-a",
          startsAt: new Date("2026-07-20T12:00:00.000Z"),
        }),
      }),
    );
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
    expect(enqueueRequestedMock).not.toHaveBeenCalled();
    expect(enqueueConfirmationMock).not.toHaveBeenCalled();
  });

  it("rejects a customer that does not belong to the Typebot session", async () => {
    await expect(
      createTypebotAppointment("tenant-a", {
        sessionId: "session-a",
        customerId: "customer-b",
        serviceId: "service-a",
        startsAt: "2026-07-20T12:00:00.000Z",
      }),
    ).rejects.toMatchObject({ code: "CUSTOMER_REQUIRED" });

    expect(prismaMock.customer.findFirst).not.toHaveBeenCalled();
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("queries only Typebot appointments inside the authenticated tenant", async () => {
    prismaMock.appointment.findFirst.mockResolvedValue(null);

    await expect(
      getTypebotAppointment("tenant-a", "appointment-a"),
    ).resolves.toBeNull();

    expect(prismaMock.appointment.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: "appointment-a",
          tenantId: "tenant-a",
          origin: "WHATSAPP",
        },
      }),
    );
  });

  it("returns saved answers in the tenant-scoped appointment detail", async () => {
    prismaMock.appointment.findFirst.mockResolvedValue({
      id: "appointment-a",
      status: "CONFIRMED",
      origin: "WHATSAPP",
      startsAt: new Date("2026-07-20T12:00:00.000Z"),
      endsAt: new Date("2026-07-20T12:30:00.000Z"),
      service: { name: "Limpeza", priceType: "HIDDEN", priceValue: null },
      customer: { name: "Cliente A" },
      customValues: [
        {
          value: "Onix 2020",
          customField: {
            id: "field-a",
            key: "modelo_do_carro",
            label: "Modelo do carro",
          },
        },
      ],
    });

    await expect(
      getTypebotAppointment("tenant-a", "appointment-a"),
    ).resolves.toMatchObject({
      customValues: [
        {
          customFieldId: "field-a",
          key: "modelo_do_carro",
          label: "Modelo do carro",
          value: "Onix 2020",
        },
      ],
    });
    expect(prismaMock.appointment.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: "appointment-a",
          tenantId: "tenant-a",
          origin: "WHATSAPP",
        },
      }),
    );
  });
});
