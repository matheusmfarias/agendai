import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { guardMock, prismaMock } = vi.hoisted(() => ({
  guardMock: vi.fn(),
  prismaMock: {
    tenant: { findUnique: vi.fn() },
    service: { findFirst: vi.fn() },
    availabilityRule: { findMany: vi.fn() },
    appointment: { findMany: vi.fn() },
    scheduleBlock: { findMany: vi.fn() },
  },
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/features/typebot/typebot-rate-limit", () => ({
  guardTypebotEndpoint: guardMock,
}));

import { GET as getAvailableDatesRoute } from "@/app/api/typebot/[tenantSlug]/services/[serviceId]/available-dates/route";
import { GET as getAvailablePeriodsRoute } from "@/app/api/typebot/[tenantSlug]/services/[serviceId]/available-periods/route";
import { GET as getSlotsRoute } from "@/app/api/typebot/[tenantSlug]/services/[serviceId]/slots/route";
import {
  getTypebotAvailableDates,
  getTypebotAvailablePeriods,
  getTypebotAvailabilityPeriod,
  getTypebotSlots,
} from "@/features/typebot/typebot-service";

const tenant = {
  timezone: "America/Sao_Paulo",
  defaultAppointmentDuration: 30,
  defaultSlotInterval: 30,
  minBookingNoticeMinutes: 0,
  maxBookingAdvanceDays: 30,
};
const service = { id: "service-a", name: "Consulta", durationMinutes: 30 };
const tenantWithSubscription = {
  ...tenant,
  id: "tenant-a",
  slug: "tenant-a",
  status: "ACTIVE",
  subscription: {
    status: "ACTIVE",
    expiresAt: new Date("2026-08-14T00:00:00.000Z"),
    plan: { publicLinkEnabled: true, whatsappEnabled: true },
  },
};

describe("Typebot availability endpoint consistency", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-14T15:00:00.000Z"));
    vi.clearAllMocks();
    guardMock.mockResolvedValue({ ok: true });
    prismaMock.tenant.findUnique.mockImplementation(
      ({ where }: { where: { id?: string; slug?: string } }) =>
        Promise.resolve(
          where.slug === "tenant-a"
            ? tenantWithSubscription
            : where.id === "tenant-a" || where.id === "tenant-b"
              ? tenant
              : null,
        ),
    );
    prismaMock.service.findFirst.mockImplementation(
      ({ where }: { where: { id: string; tenantId: string } }) =>
        Promise.resolve(
          where.id === "service-a" && where.tenantId === "tenant-a"
            ? service
            : null,
        ),
    );
    prismaMock.availabilityRule.findMany.mockImplementation(
      ({ where }: { where: { tenantId: string } }) =>
        Promise.resolve(
          where.tenantId === "tenant-a"
            ? [
                {
                  weekday: 4,
                  startTime: new Date("1970-01-01T09:00:00.000Z"),
                  endTime: new Date("1970-01-01T15:30:00.000Z"),
                  slotIntervalMinutes: 30,
                },
              ]
            : [],
        ),
    );
    prismaMock.appointment.findMany.mockResolvedValue([]);
    prismaMock.scheduleBlock.findMany.mockResolvedValue([]);
  });

  afterEach(() => vi.useRealTimers());

  it("uses tenant local time at the period boundaries", () => {
    expect(
      getTypebotAvailabilityPeriod(
        new Date("2026-07-16T14:59:00.000Z"),
        "America/Sao_Paulo",
      ),
    ).toBe("MORNING");
    expect(
      getTypebotAvailabilityPeriod(
        new Date("2026-07-16T15:00:00.000Z"),
        "America/Sao_Paulo",
      ),
    ).toBe("AFTERNOON");
    expect(
      getTypebotAvailabilityPeriod(
        new Date("2026-07-16T21:00:00.000Z"),
        "America/Sao_Paulo",
      ),
    ).toBe("EVENING");
  });

  it("returns the same 13 slots for a date advertised by available-dates", async () => {
    const availableDates = await getTypebotAvailableDates(
      "tenant-a",
      "service-a",
      { startDate: "2026-07-16", days: 1 },
    );
    expect(availableDates.dates).toEqual([
      { date: "2026-07-16", label: "Qui, 16/07", slotCount: 13 },
    ]);

    const slots = await getTypebotSlots("tenant-a", "service-a", {
      date: availableDates.dates[0]?.date,
      days: 1,
    });

    expect(slots.slots).toHaveLength(13);
    expect(slots.slots.every((slot) => slot.label.startsWith("16/07/2026")))
      .toBe(true);
    expect(slots.slots.some((slot) => slot.label.includes("15/07/2026")))
      .toBe(false);
    expect(slots.slots.some((slot) => slot.label.includes("17/07/2026")))
      .toBe(false);
  });

  it("keeps the HTTP endpoint responses consistent for the same local date", async () => {
    const availableResponse = await getAvailableDatesRoute(
      new Request(
        "http://localhost/api/typebot/tenant-a/services/service-a/available-dates?startDate=2026-07-16&days=1",
      ),
      {
        params: Promise.resolve({
          tenantSlug: "tenant-a",
          serviceId: "service-a",
        }),
      },
    );
    const availableBody = await availableResponse.json();

    expect(availableResponse.status).toBe(200);
    expect(availableBody.dates).toEqual([
      { date: "2026-07-16", label: "Qui, 16/07", slotCount: 13 },
    ]);

    const slotsResponse = await getSlotsRoute(
      new Request(
        `http://localhost/api/typebot/tenant-a/services/service-a/slots?date=${availableBody.dates[0].date}&days=1`,
      ),
      {
        params: Promise.resolve({
          tenantSlug: "tenant-a",
          serviceId: "service-a",
        }),
      },
    );
    const slotsBody = await slotsResponse.json();

    expect(slotsResponse.status).toBe(200);
    expect(slotsBody.slots).toHaveLength(13);
    expect(
      slotsBody.slots.every((slot: { label: string }) =>
        slot.label.startsWith("16/07/2026"),
      ),
    ).toBe(true);
    expect(prismaMock.appointment.findMany).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tenantId: "tenant-a",
          startsAt: { lt: new Date("2026-07-17T03:00:00.000Z") },
          endsAt: { gt: new Date("2026-07-16T03:00:00.000Z") },
        }),
      }),
    );
  });

  it("returns no slots for a local date without recurring availability", async () => {
    const availableDates = await getTypebotAvailableDates(
      "tenant-a",
      "service-a",
      { startDate: "2026-07-17", days: 1 },
    );
    const slots = await getTypebotSlots("tenant-a", "service-a", {
      date: "2026-07-17",
      days: 1,
    });

    expect(availableDates.dates).toEqual([]);
    expect(slots.slots).toEqual([]);
  });

  it("classifies and filters slots by the tenant local period", async () => {
    prismaMock.availabilityRule.findMany.mockResolvedValue([
      {
        weekday: 4,
        startTime: new Date("1970-01-01T09:00:00.000Z"),
        endTime: new Date("1970-01-01T20:00:00.000Z"),
        slotIntervalMinutes: 180,
      },
    ]);

    const periods = await getTypebotAvailablePeriods(
      "tenant-a",
      "service-a",
      "2026-07-16",
    );
    const afternoon = await getTypebotSlots("tenant-a", "service-a", {
      date: "2026-07-16",
      days: 1,
      period: "AFTERNOON",
    });

    expect(periods.periods).toEqual([
      { value: "MORNING", label: "Manhã", slotCount: 1 },
      { value: "AFTERNOON", label: "Tarde", slotCount: 2 },
      { value: "EVENING", label: "Noite", slotCount: 1 },
    ]);
    expect(afternoon.slots).toHaveLength(2);
    expect(afternoon.slots.map((slot) => slot.startsAt.slice(11, 16))).toEqual([
      "15:00",
      "18:00",
    ]);
  });

  it("returns periods through the HTTP endpoint and accepts the period in slots", async () => {
    const periodsResponse = await getAvailablePeriodsRoute(
      new Request(
        "http://localhost/api/typebot/tenant-a/services/service-a/available-periods?date=2026-07-16",
      ),
      {
        params: Promise.resolve({
          tenantSlug: "tenant-a",
          serviceId: "service-a",
        }),
      },
    );
    const periodsBody = await periodsResponse.json();
    const slotsResponse = await getSlotsRoute(
      new Request(
        "http://localhost/api/typebot/tenant-a/services/service-a/slots?date=2026-07-16&days=1&period=AFTERNOON",
      ),
      {
        params: Promise.resolve({
          tenantSlug: "tenant-a",
          serviceId: "service-a",
        }),
      },
    );
    const slotsBody = await slotsResponse.json();

    expect(periodsResponse.status).toBe(200);
    expect(periodsBody.periods).toEqual([
      { value: "MORNING", label: "Manhã", slotCount: 6 },
      { value: "AFTERNOON", label: "Tarde", slotCount: 7 },
    ]);
    expect(slotsResponse.status).toBe(200);
    expect(slotsBody.slots).toHaveLength(7);
  });

  it("does not resolve a service through another tenant", async () => {
    const availableDates = await getTypebotAvailableDates(
      "tenant-b",
      "service-a",
      { startDate: "2026-07-16", days: 1 },
    );
    const slots = await getTypebotSlots("tenant-b", "service-a", {
      date: "2026-07-16",
      days: 1,
    });

    expect(availableDates.service).toBeNull();
    expect(slots.service).toBeNull();
    expect(prismaMock.service.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: "service-a",
          tenantId: "tenant-b",
        }),
      }),
    );
    expect(prismaMock.availabilityRule.findMany).not.toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ tenantId: "tenant-b" }),
      }),
    );
  });
});
