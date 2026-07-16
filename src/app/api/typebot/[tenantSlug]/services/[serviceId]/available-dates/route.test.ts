import { beforeEach, describe, expect, it, vi } from "vitest";

const { getAvailableDatesMock, getTenantMock, guardMock } = vi.hoisted(() => ({
  getAvailableDatesMock: vi.fn(),
  getTenantMock: vi.fn(),
  guardMock: vi.fn(),
}));

vi.mock("@/features/typebot/typebot-rate-limit", () => ({
  guardTypebotEndpoint: guardMock,
}));
vi.mock("@/features/typebot/typebot-service", () => ({
  getTypebotAvailableDates: getAvailableDatesMock,
  getTypebotTenant: getTenantMock,
  validateTypebotTenant: vi.fn(() => true),
}));

import { GET } from "@/app/api/typebot/[tenantSlug]/services/[serviceId]/available-dates/route";

describe("GET Typebot available dates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    guardMock.mockResolvedValue({ ok: true });
    getTenantMock.mockResolvedValue({ id: "tenant-a" });
  });

  it("returns the paginated contract and keeps an empty dates list successful", async () => {
    getAvailableDatesMock.mockResolvedValue({
      service: { id: "service-a" },
      dates: [],
      nextStartDate: "2026-07-28",
    });

    const response = await GET(
      new Request(
        "http://localhost/api/typebot/tenant-a/services/service-a/available-dates?startDate=2026-07-14&days=14",
      ),
      {
        params: Promise.resolve({
          tenantSlug: "tenant-a",
          serviceId: "service-a",
        }),
      },
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      dates: [],
      nextStartDate: "2026-07-28",
    });
    expect(guardMock).toHaveBeenCalledWith(
      expect.any(Request),
      "tenant-a",
      "available-dates",
    );
    expect(getAvailableDatesMock).toHaveBeenCalledWith(
      "tenant-a",
      "service-a",
      { startDate: "2026-07-14", days: 14 },
    );
  });

  it("rejects an invalid calendar date before calculating availability", async () => {
    const response = await GET(
      new Request(
        "http://localhost/api/typebot/tenant-a/services/service-a/available-dates?startDate=2026-02-31&days=14",
      ),
      {
        params: Promise.resolve({
          tenantSlug: "tenant-a",
          serviceId: "service-a",
        }),
      },
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      code: "VALIDATION_ERROR",
    });
    expect(getAvailableDatesMock).not.toHaveBeenCalled();
  });
});
