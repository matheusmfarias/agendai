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
      {
        id: "11111111-1111-4111-8111-111111111111",
        name: "Cabelo",
        services: [{ customFields: [] }],
      },
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
        where: expect.objectContaining({
          tenantId: "tenant-a",
          isActive: true,
        }),
      }),
    );
  });

  it("hides categories whose services cannot collect a required selection", async () => {
    prismaMock.serviceCategory.findMany.mockResolvedValue([
      {
        id: "11111111-1111-4111-8111-111111111111",
        name: "Incompatível",
        services: [
          {
            customFields: [
              { fieldType: "SELECT", options: [] },
            ],
          },
        ],
      },
      {
        id: "22222222-2222-4222-8222-222222222222",
        name: "Compatível",
        services: [{ customFields: [] }],
      },
    ]);

    await expect(getTypebotCategories("tenant-a")).resolves.toEqual([
      expect.objectContaining({
        number: 1,
        id: "22222222-2222-4222-8222-222222222222",
      }),
    ]);
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
            customFields: [],
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

  it("hides a service with a required SELECT that has no usable options", async () => {
    prismaMock.serviceCategory.findMany.mockResolvedValue([
      {
        id: "11111111-1111-4111-8111-111111111111",
        name: "Cabelo",
        services: [
          {
            id: "22222222-2222-4222-8222-222222222222",
            name: "Incompatível",
            description: null,
            durationMinutes: 30,
            priceType: "HIDDEN",
            priceValue: null,
            bookingMode: "DIRECT",
            customFields: [{ fieldType: "SELECT", options: null }],
          },
          {
            id: "33333333-3333-4333-8333-333333333333",
            name: "Compatível",
            description: null,
            durationMinutes: 30,
            priceType: "HIDDEN",
            priceValue: null,
            bookingMode: "DIRECT",
            customFields: [],
          },
        ],
      },
    ]);

    await expect(getTypebotServices("tenant-a")).resolves.toEqual([
      expect.objectContaining({
        number: 1,
        id: "33333333-3333-4333-8333-333333333333",
      }),
    ]);
  });

  it("rejects a malformed category id at the API boundary", () => {
    expect(
      typebotServicesQuerySchema.safeParse({ categoryId: "category-a" })
        .success,
    ).toBe(false);
  });
});
