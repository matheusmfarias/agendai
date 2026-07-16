import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    tenant: { findUnique: vi.fn() },
    service: { findFirst: vi.fn() },
    availabilityRule: { findMany: vi.fn() },
    appointment: { findMany: vi.fn() },
    scheduleBlock: { findMany: vi.fn() },
  },
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import {
  getAvailableSlots,
  getBookableDateRange,
} from "@/features/booking-core/availability";

describe("getAvailableSlots", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-14T12:00:00Z"));
    vi.clearAllMocks();
    prismaMock.availabilityRule.findMany.mockResolvedValue([
      {
        weekday: 3,
        startTime: new Date("1970-01-01T09:00:00Z"),
        endTime: new Date("1970-01-01T12:00:00Z"),
        slotIntervalMinutes: 30,
      },
    ]);
    prismaMock.appointment.findMany.mockResolvedValue([
      {
        startsAt: new Date("2026-07-15T12:00:00Z"),
        endsAt: new Date("2026-07-15T13:00:00Z"),
      },
    ]);
    prismaMock.scheduleBlock.findMany.mockResolvedValue([
      {
        startsAt: new Date("2026-07-15T13:00:00Z"),
        endsAt: new Date("2026-07-15T14:00:00Z"),
      },
    ]);
  });

  afterEach(() => vi.useRealTimers());

  it("uses preloaded context, limits the query window and merges conflicts", async () => {
    const slots = await getAvailableSlots("tenant-a", "service-a", {
      context: {
        tenant: {
          timezone: "America/Sao_Paulo",
          defaultAppointmentDuration: 30,
          defaultSlotInterval: 30,
          minBookingNoticeMinutes: 0,
          maxBookingAdvanceDays: 30,
        },
        service: { durationMinutes: 60 },
      },
      dates: ["2026-07-15"],
    });

    expect(prismaMock.tenant.findUnique).not.toHaveBeenCalled();
    expect(prismaMock.service.findFirst).not.toHaveBeenCalled();
    expect(slots.map((slot) => slot.value)).toEqual(["2026-07-15T11:00"]);
    expect(prismaMock.appointment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ tenantId: "tenant-a" }),
      }),
    );
  });

  it("does not query availability outside the tenant booking window", async () => {
    const slots = await getAvailableSlots("tenant-a", "service-a", {
      context: {
        tenant: {
          timezone: "America/Sao_Paulo",
          defaultAppointmentDuration: 30,
          defaultSlotInterval: 30,
          minBookingNoticeMinutes: 0,
          maxBookingAdvanceDays: 2,
        },
        service: { durationMinutes: 60 },
      },
      dates: ["2027-01-01"],
    });

    expect(slots).toEqual([]);
    expect(prismaMock.availabilityRule.findMany).not.toHaveBeenCalled();
    expect(prismaMock.appointment.findMany).not.toHaveBeenCalled();
  });
});

describe("getBookableDateRange", () => {
  it("crosses a month boundary without changing the requested local dates", () => {
    expect(
      getBookableDateRange({
        timezone: "America/Sao_Paulo",
        maxBookingAdvanceDays: 10,
        startDate: "2026-07-31",
        days: 2,
        now: new Date("2026-07-30T15:00:00.000Z"),
      }),
    ).toEqual(["2026-07-31", "2026-08-01"]);
  });

  it("keeps calendar dates stable across a historical DST transition", () => {
    expect(
      getBookableDateRange({
        timezone: "America/Sao_Paulo",
        maxBookingAdvanceDays: 5,
        startDate: "2018-11-03",
        days: 3,
        now: new Date("2018-11-03T15:00:00.000Z"),
      }),
    ).toEqual(["2018-11-03", "2018-11-04", "2018-11-05"]);
  });

  it("returns exactly one local date for days=1", () => {
    expect(
      getBookableDateRange({
        timezone: "America/Sao_Paulo",
        maxBookingAdvanceDays: 30,
        startDate: "2026-07-16",
        days: 1,
        now: new Date("2026-07-14T15:00:00.000Z"),
      }),
    ).toEqual(["2026-07-16"]);
  });
});
