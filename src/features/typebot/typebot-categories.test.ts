import { beforeEach, describe, expect, it, vi } from "vitest";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: { serviceCategory: { findMany: vi.fn() } },
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import {
  getTypebotCategories,
  getTypebotServices,
} from "@/features/typebot/typebot-service";
import { typebotServicesQuerySchema } from "@/features/typebot/typebot-service-schemas";

describe("Typebot categories and services", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns only active categories with at least one active service", async () => {
    prismaMock.serviceCategory.findMany.mockResolvedValue([
      { id: "11111111-1111-4111-8111-111111111111", name: "Cabelo" },
    ]);

    const categories = await getTypebotCategories("tenant-a");

    expect(categories).toEqual([
      {
        number: 1,
        id: "11111111-1111-4111-8111-111111111111",
        name: "Cabelo",
      },
    ]);
    expect(prismaMock.serviceCategory.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          tenantId: "tenant-a",
          isActive: true,
          services: { some: { isActive: true } },
        },
      }),
    );
  });

  it("returns services only from the selected tenant category", async () => {
    const categoryId = "11111111-1111-4111-8111-111111111111";
    prismaMock.serviceCategory.findMany.mockResolvedValue([
      {
        id: categoryId,
        name: "Cabelo",
        services: [
          {
            id: "22222222-2222-4222-8222-222222222222",
            name: "Corte",
            description: null,
            durationMinutes: 30,
            priceType: "HIDDEN",
            priceValue: null,
            bookingMode: "DIRECT",
          },
        ],
      },
    ]);

    const services = await getTypebotServices(
      "tenant-a",
      categoryId,
    );

    expect(services).toEqual([
      expect.objectContaining({
        id: "22222222-2222-4222-8222-222222222222",
        categoryId,
        category: "Cabelo",
      }),
    ]);
    expect(prismaMock.serviceCategory.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: categoryId,
          tenantId: "tenant-a",
          isActive: true,
        }),
      }),
    );
  });

  it("rejects a malformed category id at the API boundary", () => {
    expect(
      typebotServicesQuerySchema.safeParse({ categoryId: "category-a" })
        .success,
    ).toBe(false);
  });
});
