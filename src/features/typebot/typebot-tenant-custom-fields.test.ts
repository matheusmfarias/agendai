import { beforeEach, describe, expect, it, vi } from "vitest";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    typebotSession: { findFirst: vi.fn() },
    customer: { findFirst: vi.fn() },
    service: { findFirst: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import { createTypebotAppointment } from "@/features/typebot/typebot-service";

describe("Typebot custom field tenant isolation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.typebotSession.findFirst.mockResolvedValue({
      id: "session-a",
      tenantId: "tenant-a",
    });
    prismaMock.customer.findFirst.mockResolvedValue({
      id: "customer-a",
      name: "Cliente A",
      phone: "5511999999999",
    });
    prismaMock.service.findFirst.mockResolvedValue({
      id: "service-a",
      durationMinutes: 30,
      bookingMode: "DIRECT",
      priceValue: null,
      customFields: [],
    });
  });

  it("rejects a tenant B custom field before opening the write transaction", async () => {
    await expect(
      createTypebotAppointment("tenant-a", {
        sessionId: "session-a",
        customerId: "customer-a",
        serviceId: "service-a",
        startsAt: "2026-07-20T12:00:00.000Z",
        customValues: [{ customFieldId: "field-b", value: "segredo" }],
      }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });

    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });
});
