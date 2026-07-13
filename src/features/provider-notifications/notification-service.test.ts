import { beforeEach, describe, expect, it, vi } from "vitest";

const { providerNotification, providerNotificationPreference } = vi.hoisted(() => ({
  providerNotification: {
    count: vi.fn(),
    create: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    upsert: vi.fn(),
  },
  providerNotificationPreference: {
    findUnique: vi.fn(),
    upsert: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: { providerNotification, providerNotificationPreference },
}));

import {
  createProviderNotification,
  listProviderNotifications,
  markAllProviderNotificationsRead,
  markProviderNotificationRead,
  getProviderNotificationPreferences,
  updateProviderNotificationPreferences,
} from "@/features/provider-notifications/notification-service";

const tenantId = crypto.randomUUID();
const userId = crypto.randomUUID();
const notificationId = crypto.randomUUID();

function notification(overrides: Record<string, unknown> = {}) {
  return {
    id: notificationId,
    tenantId,
    recipientUserId: null,
    type: "public_booking_created",
    priority: "medium",
    title: "Novo agendamento pelo link público",
    description: "Cliente agendou um serviço.",
    entityType: "appointment",
    entityId: crypto.randomUUID(),
    actionUrl: "/app/appointments",
    readAt: null,
    archivedAt: null,
    metadata: {
      customerName: "Maria",
      serviceName: "Corte",
      unexpectedPrivateValue: "não pode sair pela API",
    },
    createdAt: new Date("2026-07-10T12:00:00.000Z"),
    updatedAt: new Date("2026-07-10T12:00:00.000Z"),
    ...overrides,
  };
}

describe("provider notification service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists only notifications scoped to the active tenant and recipient", async () => {
    providerNotification.findMany.mockResolvedValue([notification()]);
    providerNotification.count.mockResolvedValue(1);

    const result = await listProviderNotifications({ tenantId, userId });

    expect(providerNotification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tenantId,
          archivedAt: null,
          OR: [{ recipientUserId: null }, { recipientUserId: userId }],
        }),
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: 21,
      }),
    );
    expect(result.unreadCount).toBe(1);
    expect(result.notifications[0]?.metadata).toEqual({
      customerName: "Maria",
      serviceName: "Corte",
    });
  });

  it("marks an individual notification only after finding it in the active scope", async () => {
    providerNotification.findFirst.mockResolvedValue(notification());
    providerNotification.update.mockResolvedValue(notification({ readAt: new Date() }));

    await markProviderNotificationRead({ tenantId, userId, notificationId });

    expect(providerNotification.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: notificationId,
          tenantId,
          archivedAt: null,
          OR: [{ recipientUserId: null }, { recipientUserId: userId }],
        }),
      }),
    );
    expect(providerNotification.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: notificationId } }),
    );
  });

  it("marks all notifications as read only in the active tenant and recipient scope", async () => {
    providerNotification.updateMany.mockResolvedValue({ count: 2 });

    await markAllProviderNotificationsRead({ tenantId, userId });

    expect(providerNotification.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tenantId,
          archivedAt: null,
          readAt: null,
          OR: [{ recipientUserId: null }, { recipientUserId: userId }],
        }),
      }),
    );
  });

  it("deduplicates notifications that refer to the same appointment event", async () => {
    const entityId = crypto.randomUUID();
    providerNotification.upsert.mockResolvedValue(notification({ entityId }));

    await createProviderNotification({
      tenantId,
      type: "public_booking_created",
      priority: "medium",
      title: "Novo agendamento pelo link público",
      description: "Maria agendou Corte.",
      entityType: "appointment",
      entityId,
    });

    expect(providerNotification.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          tenantId_type_entityId: { tenantId, type: "public_booking_created", entityId },
        },
        update: {},
      }),
    );
  });

  it("returns defaults when a user has not saved notification preferences", async () => {
    providerNotificationPreference.findUnique.mockResolvedValue(null);

    const result = await getProviderNotificationPreferences(tenantId, userId);

    expect(result.hasStoredPreferences).toBe(false);
    expect(result.preferences).toMatchObject({
      panelNotificationsEnabled: true,
      soundEnabled: false,
      paymentNotificationsEnabled: true,
    });
  });

  it("updates notification preferences in the current tenant and user scope", async () => {
    providerNotificationPreference.upsert.mockResolvedValue({
      panelNotificationsEnabled: true,
      soundEnabled: true,
      publicBookingNotificationsEnabled: true,
      cancellationNotificationsEnabled: true,
      rescheduleNotificationsEnabled: true,
      paymentNotificationsEnabled: false,
    });

    await updateProviderNotificationPreferences(tenantId, userId, {
      soundEnabled: true,
      paymentNotificationsEnabled: false,
    });

    expect(providerNotificationPreference.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId_userId: { tenantId, userId } },
        update: { soundEnabled: true, paymentNotificationsEnabled: false },
      }),
    );
  });
});
