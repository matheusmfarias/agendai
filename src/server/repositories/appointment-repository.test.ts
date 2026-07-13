import { beforeEach, describe, expect, it, vi } from "vitest";

const { findManyMock, findFirstMock } = vi.hoisted(() => ({
  findManyMock: vi.fn(),
  findFirstMock: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    appointment: {
      findMany: findManyMock,
      findFirst: findFirstMock,
    },
  },
}));

import {
  getAppointment,
  listAppointments,
} from "@/server/repositories/appointment-repository";

describe("appointment repository tenant isolation", () => {
  beforeEach(() => vi.clearAllMocks());

  it("scopes list filters to the authenticated tenant", async () => {
    findManyMock.mockResolvedValue([]);

    await listAppointments("tenant-a", {
      customerId: "00000000-0000-4000-8000-000000000021",
      serviceId: "00000000-0000-4000-8000-000000000031",
    });

    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tenantId: "tenant-a",
          customerId: "00000000-0000-4000-8000-000000000021",
          serviceId: "00000000-0000-4000-8000-000000000031",
        }),
      }),
    );
  });

  it("requires tenant and appointment id together for detail lookup", async () => {
    findFirstMock.mockResolvedValue(null);

    const result = await getAppointment("tenant-a", "appointment-b");

    expect(result).toBeNull();
    expect(findFirstMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "appointment-b", tenantId: "tenant-a" },
      }),
    );
  });
});
