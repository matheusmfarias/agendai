import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { getAvailableSlotsMock, prismaMock } = vi.hoisted(() => ({
  getAvailableSlotsMock: vi.fn(),
  prismaMock: {
    tenant: { findUnique: vi.fn() },
    service: { findFirst: vi.fn() },
  },
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/features/booking-core/availability", () => ({
  getAvailableSlots: getAvailableSlotsMock,
  getBookableDateRange: ({
    startDate,
    days,
  }: {
    startDate: string;
    days: number;
  }) => {
    const [year, month, day] = startDate.split("-").map(Number);
    return Array.from({ length: days }, (_, index) => {
      const date = new Date(Date.UTC(year, month - 1, day + index, 12));
      return date.toISOString().slice(0, 10);
    });
  },
  publicStatusForBookingMode: vi.fn(),
  assertAvailability: vi.fn(),
  assertNoSlotConflict: vi.fn(),
}));

import { getTypebotAvailableDates } from "@/features/typebot/typebot-service";
import { typebotAvailableDatesQuerySchema } from "@/features/typebot/typebot-availability-schemas";

const tenant = {
  timezone: "America/Sao_Paulo",
  defaultAppointmentDuration: 30,
  defaultSlotInterval: 30,
  minBookingNoticeMinutes: 0,
  maxBookingAdvanceDays: 30,
};
const service = { id: "service-a", name: "Consulta", durationMinutes: 30 };

function slot(date: string, hour: string) {
  return {
    date,
    value: `${date}T${hour}`,
    label: `${date.split("-").reverse().join("/")} ${hour}`,
    startsAt: new Date(`${date}T${hour}:00-03:00`),
    endsAt: new Date(`${date}T${hour}:00-03:00`),
  };
}

describe("getTypebotAvailableDates", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-14T15:00:00.000Z"));
    vi.clearAllMocks();
    prismaMock.tenant.findUnique.mockResolvedValue(tenant);
    prismaMock.service.findFirst.mockResolvedValue(service);
  });

  afterEach(() => vi.useRealTimers());

  it("returns only dates with slots and counts every available slot", async () => {
    getAvailableSlotsMock.mockResolvedValue([
      slot("2026-07-16", "09:00"),
      slot("2026-07-16", "10:00"),
      slot("2026-07-18", "11:00"),
    ]);

    const result = await getTypebotAvailableDates("tenant-a", "service-a", {
      startDate: "2026-07-14",
      days: 7,
    });

    expect(result.dates).toEqual([
      { date: "2026-07-16", label: "Qui, 16/07", slotCount: 2 },
      { date: "2026-07-18", label: "Sáb, 18/07", slotCount: 1 },
    ]);
    expect(getAvailableSlotsMock).toHaveBeenCalledWith(
      "tenant-a",
      "service-a",
      expect.objectContaining({
        context: expect.objectContaining({ tenant }),
        dates: expect.arrayContaining(["2026-07-14", "2026-07-20"]),
      }),
    );
  });

  it("scopes the service to the tenant before calculating availability", async () => {
    prismaMock.service.findFirst.mockResolvedValue(null);

    const result = await getTypebotAvailableDates("tenant-a", "service-b");

    expect(prismaMock.service.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: "service-b", tenantId: "tenant-a" }),
      }),
    );
    expect(result).toEqual({ service: null, dates: [], nextStartDate: null });
    expect(getAvailableSlotsMock).not.toHaveBeenCalled();
  });

  it("keeps the tenant calendar date unchanged near a UTC day boundary", async () => {
    vi.setSystemTime(new Date("2026-07-15T02:00:00.000Z"));
    prismaMock.tenant.findUnique.mockResolvedValue({
      ...tenant,
      timezone: "America/Rio_Branco",
    });
    getAvailableSlotsMock.mockResolvedValue([slot("2026-07-14", "20:00")]);

    const result = await getTypebotAvailableDates("tenant-a", "service-a", {
      days: 1,
    });

    expect(result.dates[0]?.date).toBe("2026-07-14");
    expect(getAvailableSlotsMock.mock.calls[0]?.[2]?.dates).toEqual([
      "2026-07-14",
    ]);
  });

  it("returns three dates and continues after the last date without skipping", async () => {
    getAvailableSlotsMock.mockResolvedValue([
      slot("2026-07-15", "09:00"),
      slot("2026-07-16", "09:00"),
      slot("2026-07-17", "09:00"),
      slot("2026-07-18", "09:00"),
    ]);

    const firstPage = await getTypebotAvailableDates("tenant-a", "service-a");
    expect(firstPage.dates.map((item) => item.date)).toEqual([
      "2026-07-15",
      "2026-07-16",
      "2026-07-17",
    ]);
    expect(firstPage.nextStartDate).toBe("2026-07-18");

    getAvailableSlotsMock.mockResolvedValue([slot("2026-07-18", "09:00")]);
    const nextPage = await getTypebotAvailableDates("tenant-a", "service-a", {
      startDate: firstPage.nextStartDate ?? undefined,
    });
    expect(nextPage.dates[0]?.date).toBe("2026-07-18");
    expect(getAvailableSlotsMock.mock.calls[1]?.[2]?.dates[0]).toBe(
      "2026-07-18",
    );
  });

  it("returns an empty list and advances the search window when possible", async () => {
    getAvailableSlotsMock.mockResolvedValue([]);

    const result = await getTypebotAvailableDates("tenant-a", "service-a", {
      startDate: "2026-07-14",
      days: 14,
    });

    expect(result.dates).toEqual([]);
    expect(result.nextStartDate).toBe("2026-07-28");
  });
});

describe("typebotAvailableDatesQuerySchema", () => {
  it("uses the default window and accepts an omitted start date", () => {
    expect(
      typebotAvailableDatesQuerySchema.parse({
        startDate: "",
        days: "",
      }),
    ).toEqual({ startDate: undefined, days: 14 });
  });

  it("rejects impossible calendar dates and windows over 14 days", () => {
    expect(
      typebotAvailableDatesQuerySchema.safeParse({
        startDate: "2026-02-31",
        days: "14",
      }).success,
    ).toBe(false);
    expect(
      typebotAvailableDatesQuerySchema.safeParse({
        startDate: "2026-07-14",
        days: "15",
      }).success,
    ).toBe(false);
  });
});
