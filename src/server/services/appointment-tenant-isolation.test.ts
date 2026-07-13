import { beforeEach, describe, expect, it, vi } from "vitest";

const { prismaMock, txMock, createProviderNotificationMock, enqueueConfirmationMock } = vi.hoisted(() => {
  const tx = {
    customer: { findFirst: vi.fn() },
    service: { findFirst: vi.fn(), findMany: vi.fn() },
    appointment: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
    scheduleBlock: { findFirst: vi.fn() },
    availabilityRule: { findMany: vi.fn() },
    appointmentCustomValue: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
    appointmentEvent: {
      findFirst: vi.fn(),
      create: vi.fn(),
      createMany: vi.fn(),
    },
    financialEntry: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    auditLog: { create: vi.fn() },
  };

  return {
    txMock: tx,
    prismaMock: {
      tenant: { findUnique: vi.fn() },
      auditLog: { create: vi.fn() },
      $transaction: vi.fn(
        async (callback: (client: typeof tx) => Promise<unknown>) =>
          callback(tx),
      ),
    },
    createProviderNotificationMock: vi.fn(),
    enqueueConfirmationMock: vi.fn(),
  };
});

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/features/provider-notifications/notification-service", () => ({
  createProviderNotification: createProviderNotificationMock,
}));
vi.mock("@/features/whatsapp/whatsapp-outbox-service", () => ({
  enqueueAppointmentConfirmation: enqueueConfirmationMock,
}));

import {
  changeAppointmentStatus,
  checkoutAppointment,
  createAppointment,
  updateAppointment,
} from "@/server/services/appointment-service";

const ids = {
  actor: "00000000-0000-4000-8000-000000000001",
  tenantA: "00000000-0000-4000-8000-00000000000a",
  tenantB: "00000000-0000-4000-8000-00000000000b",
  appointmentB: "00000000-0000-4000-8000-000000000010",
  customerA: "00000000-0000-4000-8000-000000000020",
  customerB: "00000000-0000-4000-8000-000000000021",
  serviceA: "00000000-0000-4000-8000-000000000030",
  serviceB: "00000000-0000-4000-8000-000000000031",
  extraServiceB: "00000000-0000-4000-8000-000000000032",
  customFieldB: "00000000-0000-4000-8000-000000000040",
};

const actor = {
  actorId: ids.actor,
  tenantId: ids.tenantA,
  ipAddress: "127.0.0.1",
};

const baseInput = {
  customerId: ids.customerA,
  serviceId: ids.serviceA,
  startsAt: new Date("2026-07-20T12:00:00Z"),
  customerNotes: "",
  internalNotes: "",
  estimatedPrice: undefined,
  durationMinutesOverride: undefined,
  extraServiceIds: [] as string[],
  allowOutsideAvailability: true,
  allowConcurrentAppointment: true,
  customFields: {} as Record<string, string>,
};

const createInput = { ...baseInput, status: "CONFIRMED" as const };
const updateInput = {
  ...baseInput,
  id: ids.appointmentB,
  status: "RESCHEDULED" as const,
  finalPrice: undefined,
};

const mutationMocks = () => [
  txMock.appointment.create,
  txMock.appointment.update,
  txMock.appointmentCustomValue.deleteMany,
  txMock.appointmentCustomValue.createMany,
  txMock.appointmentEvent.create,
  txMock.appointmentEvent.createMany,
  txMock.financialEntry.create,
  txMock.financialEntry.update,
  txMock.auditLog.create,
  prismaMock.auditLog.create,
  createProviderNotificationMock,
];

function expectNoSideEffects() {
  for (const mutation of mutationMocks()) {
    expect(mutation).not.toHaveBeenCalled();
  }
}

function validCustomer() {
  return { id: ids.customerA, name: "Cliente A" };
}

function validService() {
  return {
    id: ids.serviceA,
    name: "Serviço A",
    durationMinutes: 60,
    priceValue: null,
    customFields: [],
  };
}

function currentAppointment() {
  return {
    id: ids.appointmentB,
    tenantId: ids.tenantA,
    customerId: ids.customerA,
    serviceId: ids.serviceA,
    startsAt: baseInput.startsAt,
    endsAt: new Date("2026-07-20T13:00:00Z"),
    status: "CONFIRMED",
    customerNotes: null,
    internalNotes: null,
  };
}

describe("appointment service tenant isolation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.tenant.findUnique.mockResolvedValue(null);
    txMock.appointment.create.mockResolvedValue({
      id: "00000000-0000-4000-8000-000000000050",
      tenantId: ids.tenantA,
      customerId: ids.customerA,
      serviceId: ids.serviceA,
      startsAt: baseInput.startsAt,
      endsAt: new Date("2026-07-20T13:00:00Z"),
      status: "CONFIRMED",
      origin: "MANUAL_PANEL",
    });
    txMock.appointment.update.mockResolvedValue({
      ...currentAppointment(),
      status: "RESCHEDULED",
      customerNotes: "",
      internalNotes: "",
      origin: "MANUAL_PANEL",
    });
  });

  it("creates the confirmation outbox in the manual confirmation transaction", async () => {
    const current = {
      ...currentAppointment(),
      status: "REQUESTED",
      customer: { name: "Cliente A", phone: "11987654321" },
      service: { name: "Serviço A" },
      tenant: {
        timezone: "America/Sao_Paulo",
        name: "Studio A",
        publicDisplayName: null,
        address: "Rua A",
        city: "São Paulo",
        state: "SP",
      },
    };
    txMock.appointment.findFirst.mockResolvedValue(current);
    txMock.appointment.update.mockResolvedValue({ ...currentAppointment(), status: "CONFIRMED" });
    txMock.appointmentEvent.create.mockResolvedValue({});
    txMock.auditLog.create.mockResolvedValue({});

    await changeAppointmentStatus(ids.appointmentB, "CONFIRMED", undefined, actor);

    expect(enqueueConfirmationMock).toHaveBeenCalledWith(
      txMock,
      expect.objectContaining({ tenantId: ids.tenantA, appointmentId: ids.appointmentB }),
    );
  });

  it.each([
    ["edit or reschedule", () => updateAppointment(updateInput, actor)],
    [
      "cancel",
      () =>
        changeAppointmentStatus(
          ids.appointmentB,
          "CANCELED_BY_PROVIDER",
          undefined,
          actor,
        ),
    ],
    [
      "finish",
      () =>
        changeAppointmentStatus(
          ids.appointmentB,
          "FINISHED",
          100,
          actor,
        ),
    ],
    [
      "checkout",
      () =>
        checkoutAppointment(
          {
            id: ids.appointmentB,
            paymentMethod: "PIX",
            amount: 100,
            tip: 0,
            discount: 0,
          },
          actor,
        ),
    ],
  ])("rejects %s of an appointment from tenant B with no effects", async (_name, operation) => {
    txMock.appointment.findFirst.mockResolvedValue(null);

    await expect(operation()).rejects.toThrow(/Agendamento/);

    expect(txMock.appointment.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: ids.appointmentB,
          tenantId: ids.tenantA,
        }),
      }),
    );
    expectNoSideEffects();
  });

  it("rejects a tenant B customer during creation with no effects", async () => {
    txMock.customer.findFirst.mockResolvedValue(null);
    txMock.service.findFirst.mockResolvedValue(validService());

    await expect(
      createAppointment({ ...createInput, customerId: ids.customerB }, actor),
    ).rejects.toThrow(/cliente ativo/i);

    expect(txMock.customer.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: ids.customerB,
          tenantId: ids.tenantA,
        }),
      }),
    );
    expectNoSideEffects();
  });

  it("creates an administrative appointment without customer ownership", async () => {
    txMock.customer.findFirst.mockResolvedValue(validCustomer());
    txMock.service.findFirst.mockResolvedValue(validService());
    txMock.appointmentEvent.create.mockResolvedValue({ id: "event-a" });
    txMock.auditLog.create.mockResolvedValue({ id: "audit-a" });

    await createAppointment(createInput, actor);

    const createData = txMock.appointment.create.mock.calls[0]?.[0].data;
    expect(createData).not.toHaveProperty("customerUserId");
    expect(createData).not.toHaveProperty("customerUser");
    expect(createData).toMatchObject({
      tenantId: ids.tenantA,
      origin: "MANUAL_PANEL",
    });
  });

  it("persists payment_pending in the FINISHED transaction and propagates failure", async () => {
    txMock.appointment.findFirst.mockResolvedValue({
      ...currentAppointment(),
      status: "IN_PROGRESS",
      customer: { name: "Cliente A" },
      service: { name: "Serviço A" },
      tenant: { timezone: "America/Sao_Paulo" },
    });
    txMock.financialEntry.findFirst.mockResolvedValue(null);
    txMock.appointmentEvent.create.mockResolvedValue({ id: "event-a" });
    txMock.auditLog.create.mockResolvedValue({ id: "audit-a" });
    createProviderNotificationMock.mockRejectedValueOnce(new Error("notification write failed"));

    await expect(
      changeAppointmentStatus(ids.appointmentB, "FINISHED", 100, actor),
    ).rejects.toThrow("notification write failed");

    expect(createProviderNotificationMock).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: ids.tenantA,
        type: "payment_pending",
        entityId: ids.appointmentB,
      }),
      txMock,
    );
  });

  it("rejects a tenant B service during creation with no effects", async () => {
    txMock.customer.findFirst.mockResolvedValue(validCustomer());
    txMock.service.findFirst.mockResolvedValue(null);

    await expect(
      createAppointment({ ...createInput, serviceId: ids.serviceB }, actor),
    ).rejects.toThrow(/servi.o ativo/i);

    expect(txMock.service.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: ids.serviceB,
          tenantId: ids.tenantA,
        }),
      }),
    );
    expectNoSideEffects();
  });

  it("rejects a tenant B extra service during creation with no effects", async () => {
    txMock.customer.findFirst.mockResolvedValue(validCustomer());
    txMock.service.findFirst.mockResolvedValue(validService());
    txMock.service.findMany.mockResolvedValue([]);

    await expect(
      createAppointment(
        { ...createInput, extraServiceIds: [ids.extraServiceB] },
        actor,
      ),
    ).rejects.toThrow(/servi.os adicionais/i);

    expect(txMock.service.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tenantId: ids.tenantA,
          id: { in: [ids.extraServiceB] },
        }),
      }),
    );
    expectNoSideEffects();
  });

  it("rejects an unrecognized tenant B custom field during creation with no effects", async () => {
    txMock.customer.findFirst.mockResolvedValue(validCustomer());
    txMock.service.findFirst.mockResolvedValue(validService());

    await expect(
      createAppointment(
        {
          ...createInput,
          customFields: { [`custom_${ids.customFieldB}`]: "segredo" },
        },
        actor,
      ),
    ).rejects.toThrow(/campos personalizados/i);

    expectNoSideEffects();
  });

  it.each([
    ["customer", { customerId: ids.customerB }],
    ["service", { serviceId: ids.serviceB }],
  ])("rejects a tenant B %s during update with no effects", async (_name, override) => {
    txMock.appointment.findFirst.mockResolvedValue(currentAppointment());
    txMock.customer.findFirst.mockResolvedValue(
      "customerId" in override ? null : validCustomer(),
    );
    txMock.service.findFirst.mockResolvedValue(
      "serviceId" in override ? null : validService(),
    );

    await expect(
      updateAppointment({ ...updateInput, ...override }, actor),
    ).rejects.toThrow();

    expectNoSideEffects();
  });

  it("rejects a tenant B extra service during update with no effects", async () => {
    txMock.appointment.findFirst.mockResolvedValue(currentAppointment());
    txMock.customer.findFirst.mockResolvedValue(validCustomer());
    txMock.service.findFirst.mockResolvedValue(validService());
    txMock.service.findMany.mockResolvedValue([]);

    await expect(
      updateAppointment(
        { ...updateInput, extraServiceIds: [ids.extraServiceB] },
        actor,
      ),
    ).rejects.toThrow(/servi.os adicionais/i);

    expectNoSideEffects();
  });

  it("rejects an unrecognized tenant B custom field during update with no effects", async () => {
    txMock.appointment.findFirst.mockResolvedValue(currentAppointment());
    txMock.customer.findFirst.mockResolvedValue(validCustomer());
    txMock.service.findFirst.mockResolvedValue(validService());

    await expect(
      updateAppointment(
        {
          ...updateInput,
          customFields: { [`custom_${ids.customFieldB}`]: "segredo" },
        },
        actor,
      ),
    ).rejects.toThrow(/campos personalizados/i);

    expectNoSideEffects();
  });
});
