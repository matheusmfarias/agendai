import { beforeEach, describe, expect, it, vi } from "vitest";

const { prismaMock, getAvailableSlotsMock } = vi.hoisted(() => ({
  prismaMock: {
    tenant: { findUnique: vi.fn() },
    customField: { findMany: vi.fn() },
    appointmentReview: { aggregate: vi.fn() },
  },
  getAvailableSlotsMock: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/features/booking-core/availability", () => ({
  assertAvailability: vi.fn(),
  assertNoSlotConflict: vi.fn(),
  getAvailableSlots: getAvailableSlotsMock,
  publicStatusForBookingMode: vi.fn(),
}));
vi.mock("@/features/booking-core/tenant-policy", () => ({
  isTenantBookableForPublicLink: vi.fn(() => true),
  canCreatePublicAppointmentForTenant: vi.fn(() => true),
}));

import {
  getPublicBookingData,
  getPublicBookingReviewData,
  getPublicReviewSummary,
} from "@/features/public-booking/public-booking-service";

const tenant = {
  id: "tenant-a-id",
  name: "Tenant A",
  slug: "tenant-a",
  publicDisplayName: null,
  logoUrl: null,
  description: null,
  address: null,
  neighborhood: null,
  addressComplement: null,
  city: "São Paulo",
  state: "SP",
  timezone: "America/Sao_Paulo",
  defaultAppointmentDuration: 30,
  defaultSlotInterval: 30,
  minBookingNoticeMinutes: 120,
  maxBookingAdvanceDays: 30,
  status: "ACTIVE",
  publicLinkActive: true,
  subscription: null,
  serviceCategories: [
    {
      id: "category-a",
      name: "Consultas",
      description: null,
      services: [
        {
          id: "service-a",
          name: "Consulta",
          description: null,
          durationMinutes: 60,
          priceType: "FIXED",
          priceValue: null,
          bookingMode: "DIRECT",
        },
      ],
    },
  ],
};

describe("public booking read model", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.tenant.findUnique.mockResolvedValue(tenant);
    getAvailableSlotsMock.mockResolvedValue([]);
  });

  it("does not calculate slots until a service is selected", async () => {
    const result = await getPublicBookingData("tenant-a");

    expect(result.available).toBe(true);
    expect(getAvailableSlotsMock).not.toHaveBeenCalled();
  });

  it("reuses the tenant service and availability context without refetching it", async () => {
    await getPublicBookingData("tenant-a", "service-a");

    expect(getAvailableSlotsMock).toHaveBeenCalledWith(
      "tenant-a-id",
      "service-a",
      expect.objectContaining({
        context: expect.objectContaining({
          tenant,
          service: expect.objectContaining({ id: "service-a" }),
        }),
      }),
    );
    expect(prismaMock.tenant.findUnique).toHaveBeenCalledTimes(1);
  });

  it("loads custom fields and only the selected day in parallel for review", async () => {
    prismaMock.customField.findMany.mockResolvedValue([]);

    const result = await getPublicBookingReviewData(
      "tenant-a",
      "service-a",
      "2026-07-20T09:00",
    );

    expect(result.available && result.selectedService?.customFields).toEqual(
      [],
    );
    expect(prismaMock.customField.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          tenantId: "tenant-a-id",
          serviceId: "service-a",
          isActive: true,
        },
      }),
    );
    expect(getAvailableSlotsMock).toHaveBeenCalledWith(
      "tenant-a-id",
      "service-a",
      expect.objectContaining({ dates: ["2026-07-20"] }),
    );
  });

  it("queries reviews directly by the already resolved tenant id", async () => {
    prismaMock.appointmentReview.aggregate.mockResolvedValue({
      _avg: { rating: 4.5 },
      _count: { rating: 2 },
    });
    const result = await getPublicReviewSummary("tenant-a-id");

    expect(result).toEqual({ count: 2, average: 4.5 });
    expect(prismaMock.tenant.findUnique).not.toHaveBeenCalled();
    expect(prismaMock.appointmentReview.aggregate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ tenantId: "tenant-a-id" }),
      }),
    );
  });
});
