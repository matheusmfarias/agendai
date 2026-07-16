import { beforeEach, describe, expect, it, vi } from "vitest";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: { service: { findFirst: vi.fn() } },
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import { getTypebotCustomFields } from "@/features/typebot/typebot-service";

describe("Typebot service custom fields", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns only active fields in configured order and tenant scope", async () => {
    prismaMock.service.findFirst.mockResolvedValue({
      customFields: [
        {
          id: "field-text",
          key: "modelo_do_carro",
          label: "Modelo do carro",
          fieldType: "TEXT",
          isRequired: true,
          options: null,
          position: 1,
        },
        {
          id: "field-select",
          key: "tipo",
          label: "Tipo",
          fieldType: "SELECT",
          isRequired: false,
          options: ["A", "B"],
          position: 2,
        },
      ],
    });

    await expect(
      getTypebotCustomFields("tenant-a", "service-a"),
    ).resolves.toEqual([
      {
        id: "field-text",
        key: "modelo_do_carro",
        label: "Modelo do carro",
        type: "TEXT",
        required: true,
        placeholder: null,
        options: [],
        order: 1,
      },
      expect.objectContaining({
        id: "field-select",
        options: ["A", "B"],
        order: 2,
      }),
    ]);
    expect(prismaMock.service.findFirst).toHaveBeenCalledWith({
      where: {
        id: "service-a",
        tenantId: "tenant-a",
        isActive: true,
        category: { isActive: true },
      },
      select: {
        customFields: {
          where: { isActive: true },
          orderBy: [{ position: "asc" }, { label: "asc" }],
          select: expect.any(Object),
        },
      },
    });
  });

  it("does not expose fields when the service is outside the tenant", async () => {
    prismaMock.service.findFirst.mockResolvedValue(null);

    await expect(
      getTypebotCustomFields("tenant-a", "service-b"),
    ).resolves.toBeNull();
  });
});
