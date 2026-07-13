import { beforeEach, describe, expect, it, vi } from "vitest";

const { appointmentFindMany, appointmentFindFirst } = vi.hoisted(() => ({
  appointmentFindMany: vi.fn(),
  appointmentFindFirst: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    appointment: {
      findMany: appointmentFindMany,
      findFirst: appointmentFindFirst,
    },
  },
}));

import {
  getCustomerAppointment,
  listCustomerAppointments,
} from "@/server/repositories/customer-portal-repository";

describe("customer portal appointment ownership", () => {
  beforeEach(() => vi.clearAllMocks());

  it("lists exclusively by Appointment.customerUserId across tenants", async () => {
    appointmentFindMany.mockResolvedValue([]);

    await listCustomerAppointments("owner-a");

    expect(appointmentFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { customerUserId: "owner-a" } }),
    );
    expect(appointmentFindMany.mock.calls[0]?.[0].where).not.toHaveProperty(
      "customer",
    );
  });

  it("requires both appointment id and owner without consulting Customer.userId", async () => {
    appointmentFindFirst.mockResolvedValue(null);

    const result = await getCustomerAppointment("owner-a", "appointment-b");

    expect(result).toBeNull();
    expect(appointmentFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "appointment-b", customerUserId: "owner-a" },
      }),
    );
    expect(appointmentFindFirst.mock.calls[0]?.[0].where).not.toHaveProperty(
      "customer",
    );
  });
});
