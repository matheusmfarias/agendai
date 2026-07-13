import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  getCurrentUserMock,
  getCurrentTenantContextMock,
  listProviderNotificationsMock,
  markProviderNotificationReadMock,
} = vi.hoisted(() => ({
  getCurrentUserMock: vi.fn(),
  getCurrentTenantContextMock: vi.fn(),
  listProviderNotificationsMock: vi.fn(),
  markProviderNotificationReadMock: vi.fn(),
}));

vi.mock("@/features/auth/permissions", () => ({
  getCurrentUser: getCurrentUserMock,
  getCurrentTenantContext: getCurrentTenantContextMock,
}));

vi.mock("@/features/provider-notifications/notification-service", () => ({
  ProviderNotificationCursorError: class ProviderNotificationCursorError extends Error {},
  listProviderNotifications: listProviderNotificationsMock,
  markProviderNotificationRead: markProviderNotificationReadMock,
}));

import { GET } from "@/app/api/provider/notifications/route";
import { PATCH as PATCH_READ } from "@/app/api/provider/notifications/[id]/read/route";
import { ProviderNotificationCursorError } from "@/features/provider-notifications/notification-service";

const tenantId = "00000000-0000-4000-8000-00000000000a";
const userId = "00000000-0000-4000-8000-000000000001";
const notificationId = "00000000-0000-4000-8000-000000000010";

const serializedNotification = {
  id: notificationId,
  tenantId,
  audience: "TENANT" as const,
  recipientUserId: null,
  type: "public_booking_created" as const,
  priority: "medium" as const,
  title: "Novo agendamento",
  description: "Cliente agendou um serviço.",
  entityType: "appointment" as const,
  entityId: "00000000-0000-4000-8000-000000000020",
  actionUrl: "/app/appointments",
  readAt: null,
  archivedAt: null,
  createdAt: "2026-07-13T12:00:00.000Z",
  metadata: { customerName: "Maria" },
};

describe("provider notification route contracts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCurrentUserMock.mockResolvedValue({ id: userId });
    getCurrentTenantContextMock.mockResolvedValue({ tenantId });
  });

  it("GET derives tenant and user from auth and returns the serialized payload", async () => {
    listProviderNotificationsMock.mockResolvedValue({
      notifications: [serializedNotification],
      unreadCount: 1,
      nextCursor: null,
    });

    const response = await GET(
      new NextRequest(
        "http://localhost/api/provider/notifications?status=unread&category=bookings&limit=10",
      ),
    );

    expect(response.status).toBe(200);
    expect(listProviderNotificationsMock).toHaveBeenCalledWith({
      tenantId,
      userId,
      status: "unread",
      category: "bookings",
      limit: 10,
    });
    expect(await response.json()).toEqual({
      notifications: [serializedNotification],
      unreadCount: 1,
      nextCursor: null,
    });
  });

  it("GET rejects malformed query input and a cursor outside the service scope", async () => {
    const malformed = await GET(
      new NextRequest("http://localhost/api/provider/notifications?limit=31"),
    );
    expect(malformed.status).toBe(400);
    expect(listProviderNotificationsMock).not.toHaveBeenCalled();

    listProviderNotificationsMock.mockRejectedValue(
      new ProviderNotificationCursorError(),
    );
    const invalidCursor = await GET(
      new NextRequest(
        `http://localhost/api/provider/notifications?cursor=${notificationId}`,
      ),
    );
    expect(invalidCursor.status).toBe(400);
    expect(await invalidCursor.json()).toEqual({ message: "Cursor inválido." });
  });

  it("PATCH validates UUID and returns the service serializer without reshaping it", async () => {
    markProviderNotificationReadMock.mockResolvedValue({
      ...serializedNotification,
      readAt: "2026-07-13T12:05:00.000Z",
    });

    const invalid = await PATCH_READ(
      new NextRequest("http://localhost/api/provider/notifications/not-an-id/read", {
        method: "PATCH",
      }),
      { params: Promise.resolve({ id: "not-an-id" }) },
    );
    expect(invalid.status).toBe(400);
    expect(markProviderNotificationReadMock).not.toHaveBeenCalled();

    const response = await PATCH_READ(
      new NextRequest(
        `http://localhost/api/provider/notifications/${notificationId}/read`,
        { method: "PATCH" },
      ),
      { params: Promise.resolve({ id: notificationId }) },
    );
    expect(response.status).toBe(200);
    expect(markProviderNotificationReadMock).toHaveBeenCalledWith({
      tenantId,
      userId,
      notificationId,
    });
    expect(await response.json()).toEqual({
      notification: {
        ...serializedNotification,
        readAt: "2026-07-13T12:05:00.000Z",
      },
    });
  });

  it("returns 401 without tenant authentication before calling services", async () => {
    getCurrentTenantContextMock.mockResolvedValue(null);

    const response = await GET(
      new NextRequest("http://localhost/api/provider/notifications"),
    );

    expect(response.status).toBe(401);
    expect(listProviderNotificationsMock).not.toHaveBeenCalled();
  });
});
