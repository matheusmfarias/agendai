import { beforeEach, describe, expect, it, vi } from "vitest";

const { enqueueRequestedMock, enqueueConfirmationMock } = vi.hoisted(() => ({
  enqueueRequestedMock: vi.fn(),
  enqueueConfirmationMock: vi.fn(),
}));

vi.mock("@/features/booking-core/availability", () => ({
  assertAvailability: vi.fn(),
  assertNoSlotConflict: vi.fn(),
  publicStatusForBookingMode: vi.fn((mode: string) =>
    mode === "REQUIRES_CONFIRMATION" ? "REQUESTED" : "CONFIRMED",
  ),
}));
vi.mock("@/features/whatsapp/whatsapp-outbox-service", () => ({
  enqueueAppointmentRequested: enqueueRequestedMock,
  enqueueAppointmentConfirmation: enqueueConfirmationMock,
}));

import {
  persistExternalAppointment,
  prepareExternalAppointment,
  type ExternalBookingChannel,
} from "@/features/booking-core/external-appointment-service";
import type { Prisma } from "@/generated/prisma/client";

const startsAt = new Date("2026-07-20T12:00:00.000Z");

function createTransaction(bookingMode: "DIRECT" | "REQUIRES_CONFIRMATION") {
  const tx = {
    service: {
      findFirst: vi.fn().mockResolvedValue({
        id: "service-a",
        name: "Consulta",
        durationMinutes: 60,
        priceType: "FIXED",
        priceValue: "100",
        bookingMode,
        category: { name: "Geral" },
        customFields: [],
      }),
    },
    appointment: {
      create: vi.fn().mockResolvedValue({ id: "appointment-a" }),
    },
    appointmentCustomValue: { createMany: vi.fn() },
  };

  return tx as unknown as Prisma.TransactionClient;
}

async function createFor(
  channel: ExternalBookingChannel,
  bookingMode: "DIRECT" | "REQUIRES_CONFIRMATION",
) {
  const tx = createTransaction(bookingMode);
  const prepared = await prepareExternalAppointment(tx, {
    tenantId: "tenant-a",
    serviceId: "service-a",
    startsAt,
    customFields: {},
  });
  const result = await persistExternalAppointment(tx, {
    prepared,
    channel,
    customer: {
      id: "customer-a",
      name: "Cliente A",
      phone: "5511999999999",
    },
  });

  return { tx, result };
}

describe("external appointment channel equivalence", () => {
  beforeEach(() => vi.clearAllMocks());

  it.each(["PUBLIC_LINK", "TYPEBOT"] as const)(
    "applies DIRECT rules and confirmation outbox for %s",
    async (channel) => {
      const { tx, result } = await createFor(channel, "DIRECT");

      expect(result.status).toBe("CONFIRMED");
      expect(enqueueConfirmationMock).toHaveBeenCalledOnce();
      expect(enqueueRequestedMock).not.toHaveBeenCalled();
      expect(tx.appointment.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenant: { connect: { id: "tenant-a" } },
          status: "CONFIRMED",
          origin: channel === "PUBLIC_LINK" ? "PUBLIC_LINK" : "WHATSAPP",
        }),
      });
    },
  );

  it.each(["PUBLIC_LINK", "TYPEBOT"] as const)(
    "applies REQUIRES_CONFIRMATION rules and requested outbox for %s",
    async (channel) => {
      const { tx, result } = await createFor(
        channel,
        "REQUIRES_CONFIRMATION",
      );

      expect(result.status).toBe("REQUESTED");
      expect(enqueueRequestedMock).toHaveBeenCalledOnce();
      expect(enqueueConfirmationMock).not.toHaveBeenCalled();
      expect(tx.appointment.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenant: { connect: { id: "tenant-a" } },
          status: "REQUESTED",
          origin: channel === "PUBLIC_LINK" ? "PUBLIC_LINK" : "WHATSAPP",
        }),
      });
    },
  );
});
