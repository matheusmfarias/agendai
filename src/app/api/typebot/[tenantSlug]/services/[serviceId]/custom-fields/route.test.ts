import { beforeEach, describe, expect, it, vi } from "vitest";

const { getFieldsMock, getTenantMock, guardMock } = vi.hoisted(() => ({
  getFieldsMock: vi.fn(),
  getTenantMock: vi.fn(),
  guardMock: vi.fn(),
}));

vi.mock("@/features/typebot/typebot-rate-limit", () => ({
  guardTypebotEndpoint: guardMock,
}));
vi.mock("@/features/typebot/typebot-service", () => ({
  getTypebotCustomFields: getFieldsMock,
  getTypebotTenant: getTenantMock,
  validateTypebotTenant: vi.fn(() => true),
}));

import { GET } from "@/app/api/typebot/[tenantSlug]/services/[serviceId]/custom-fields/route";

describe("GET Typebot service custom fields", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    guardMock.mockResolvedValue({ ok: true });
    getTenantMock.mockResolvedValue({ id: "tenant-a" });
  });

  it("returns the ordered field contract", async () => {
    getFieldsMock.mockResolvedValue([
      {
        id: "field-a",
        key: "modelo_do_carro",
        label: "Modelo do carro",
        type: "TEXT",
        required: true,
        placeholder: null,
        options: [],
        order: 1,
      },
    ]);

    const response = await GET(
      new Request(
        "http://localhost/api/typebot/tenant-a/services/service-a/custom-fields",
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
      fields: [expect.objectContaining({ id: "field-a", type: "TEXT" })],
    });
    expect(guardMock).toHaveBeenCalledWith(
      expect.any(Request),
      "tenant-a",
      "custom-fields",
    );
    expect(getFieldsMock).toHaveBeenCalledWith("tenant-a", "service-a");
  });

  it("keeps a service without questions successful", async () => {
    getFieldsMock.mockResolvedValue([]);

    const response = await GET(
      new Request(
        "http://localhost/api/typebot/tenant-a/services/service-a/custom-fields",
      ),
      {
        params: Promise.resolve({
          tenantSlug: "tenant-a",
          serviceId: "service-a",
        }),
      },
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true, fields: [] });
  });

  it("does not expose a service outside the resolved tenant", async () => {
    getFieldsMock.mockResolvedValue(null);

    const response = await GET(
      new Request(
        "http://localhost/api/typebot/tenant-a/services/service-b/custom-fields",
      ),
      {
        params: Promise.resolve({
          tenantSlug: "tenant-a",
          serviceId: "service-b",
        }),
      },
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      code: "SERVICE_NOT_FOUND",
    });
  });
});
