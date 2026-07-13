import { beforeEach, describe, expect, it, vi } from "vitest";

const { prismaMock, providerNotification, providerNotificationRead, tenantUser } = vi.hoisted(() => {
  const notification = {
    count: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    upsert: vi.fn(),
  };
  const receipt = { upsert: vi.fn(), createMany: vi.fn() };
  const membership = { findFirst: vi.fn() };
  const preferences = { findUnique: vi.fn(), upsert: vi.fn() };
  const client = {
    providerNotification: notification,
    providerNotificationRead: receipt,
    providerNotificationPreference: preferences,
    tenantUser: membership,
  };
  return {
    providerNotification: notification,
    providerNotificationRead: receipt,
    tenantUser: membership,
    prismaMock: {
      ...client,
      $transaction: vi.fn(async (callback: (tx: typeof client) => Promise<unknown>) => callback(client)),
    },
  };
});

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import {
  createProviderNotification,
  listProviderNotifications,
  markAllProviderNotificationsRead,
  markProviderNotificationRead,
  getProviderNotificationPreferences,
  updateProviderNotificationPreferences,
  ProviderNotificationCursorError,
} from "@/features/provider-notifications/notification-service";
import type { CreateProviderNotificationInput } from "@/features/provider-notifications/notification-service";

const tenantId = crypto.randomUUID();
const userId = crypto.randomUUID();
const otherUserId = crypto.randomUUID();
const otherTenantId = crypto.randomUUID();
const notificationId = crypto.randomUUID();

function notification(overrides: Record<string, unknown> = {}) {
  return {
    id: notificationId,
    tenantId,
    audience: "TENANT",
    recipientUserId: null,
    dedupeKey: "TENANT:*:event",
    type: "public_booking_created",
    priority: "medium",
    title: "Novo agendamento",
    description: "Cliente agendou um serviço.",
    entityType: "appointment",
    entityId: crypto.randomUUID(),
    actionUrl: "/app/appointments",
    readAt: null,
    archivedAt: null,
    metadata: { customerName: "Maria", serviceName: "Corte", secret: "hidden" },
    reads: [],
    createdAt: new Date("2026-07-10T12:00:00.000Z"),
    updatedAt: new Date("2026-07-10T12:00:00.000Z"),
    ...overrides,
  };
}

describe("provider notification service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tenantUser.findFirst.mockResolvedValue({ id: crypto.randomUUID() });
  });

  it("lists tenant broadcasts and only the authenticated user's private notifications", async () => {
    providerNotification.findMany.mockResolvedValue([notification()]);
    providerNotification.count.mockResolvedValue(1);

    const result = await listProviderNotifications({ tenantId, userId });

    expect(providerNotification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tenantId,
          OR: [
            { audience: "TENANT", recipientUserId: null },
            { audience: "USER", recipientUserId: userId },
          ],
        }),
        include: {
          reads: expect.objectContaining({ where: { tenantId, userId } }),
        },
      }),
    );
    expect(result.notifications[0]?.metadata).toEqual({
      customerName: "Maria",
      serviceName: "Corte",
    });
  });

  it("creates an individual receipt without writing legacy readAt", async () => {
    providerNotification.findFirst.mockResolvedValue(notification());
    providerNotificationRead.upsert.mockResolvedValue({});

    await markProviderNotificationRead({ tenantId, userId, notificationId });

    expect(providerNotification.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ id: notificationId, tenantId }) }),
    );
    expect(providerNotificationRead.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          notificationId_tenantId_userId: { notificationId, tenantId, userId },
        },
      }),
    );
  });

  it("keeps a tenant broadcast unread for user B after user A creates a receipt", async () => {
    providerNotification.findFirst.mockResolvedValue(notification());
    providerNotificationRead.upsert.mockResolvedValue({});
    await markProviderNotificationRead({ tenantId, userId, notificationId });

    providerNotification.findMany.mockResolvedValue([notification({ reads: [] })]);
    providerNotification.count.mockResolvedValue(1);
    const resultForB = await listProviderNotifications({
      tenantId,
      userId: otherUserId,
      status: "unread",
    });

    expect(providerNotificationRead.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          notificationId_tenantId_userId: {
            notificationId,
            tenantId,
            userId,
          },
        },
      }),
    );
    expect(providerNotification.findMany).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tenantId,
          reads: { none: { tenantId, userId: otherUserId } },
        }),
        include: {
          reads: expect.objectContaining({
            where: { tenantId, userId: otherUserId },
          }),
        },
      }),
    );
    expect(resultForB.notifications[0]?.readAt).toBeNull();
    expect(resultForB.unreadCount).toBe(1);
  });

  it("does not create a receipt for an inaccessible cross-tenant notification", async () => {
    providerNotification.findFirst.mockResolvedValue(null);

    const result = await markProviderNotificationRead({
      tenantId: otherTenantId,
      userId,
      notificationId,
    });

    expect(result).toBeNull();
    expect(providerNotification.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: notificationId,
          tenantId: otherTenantId,
        }),
      }),
    );
    expect(providerNotificationRead.upsert).not.toHaveBeenCalled();
  });

  it("read-all creates receipts only for unread accessible notifications", async () => {
    providerNotification.findMany.mockResolvedValue([
      { id: notificationId },
      { id: crypto.randomUUID() },
    ]);
    providerNotificationRead.createMany.mockResolvedValue({ count: 2 });

    const result = await markAllProviderNotificationsRead({ tenantId, userId });

    expect(result.count).toBe(2);
    expect(providerNotification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tenantId,
          OR: [
            { audience: "TENANT", recipientUserId: null },
            { audience: "USER", recipientUserId: userId },
          ],
          reads: { none: { tenantId, userId } },
        }),
      }),
    );
    expect(providerNotificationRead.createMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        { notificationId, tenantId, userId },
      ]),
      skipDuplicates: true,
    });
  });

  it("paginates with a scoped cursor and returns the last visible id", async () => {
    const cursor = crypto.randomUUID();
    const firstId = crypto.randomUUID();
    const secondId = crypto.randomUUID();
    providerNotification.findFirst.mockResolvedValue({ id: cursor });
    providerNotification.findMany.mockResolvedValue([
      notification({ id: firstId }),
      notification({ id: secondId }),
      notification({ id: crypto.randomUUID() }),
    ]);
    providerNotification.count.mockResolvedValue(3);

    const result = await listProviderNotifications({
      tenantId,
      userId,
      limit: 2,
      cursor,
    });

    expect(providerNotification.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: cursor, tenantId }),
      }),
    );
    expect(providerNotification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        cursor: { id: cursor },
        skip: 1,
        take: 3,
      }),
    );
    expect(result.notifications.map(({ id }) => id)).toEqual([
      firstId,
      secondId,
    ]);
    expect(result.nextCursor).toBe(secondId);
  });

  it("rejects a cursor outside the authenticated scope before listing", async () => {
    providerNotification.findFirst.mockResolvedValue(null);

    await expect(
      listProviderNotifications({
        tenantId,
        userId,
        cursor: crypto.randomUUID(),
      }),
    ).rejects.toBeInstanceOf(ProviderNotificationCursorError);
    expect(providerNotification.findMany).not.toHaveBeenCalled();
  });

  it("validates an unread cursor without the mutable read receipt filter", async () => {
    const cursor = crypto.randomUUID();
    providerNotification.findFirst.mockResolvedValue({ id: cursor });
    providerNotification.findMany.mockResolvedValue([]);
    providerNotification.count.mockResolvedValue(0);

    await listProviderNotifications({
      tenantId,
      userId,
      status: "unread",
      category: "financial",
      cursor,
    });

    const cursorWhere = providerNotification.findFirst.mock.calls[0]?.[0].where;
    expect(cursorWhere).toMatchObject({
      id: cursor,
      tenantId,
      type: { in: ["payment_pending", "payment_received"] },
    });
    expect(cursorWhere).not.toHaveProperty("reads");
    expect(providerNotification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          reads: { none: { tenantId, userId } },
        }),
      }),
    );
  });

  it("translates the financial category into a server-side type filter", async () => {
    providerNotification.findMany.mockResolvedValue([]);
    providerNotification.count.mockResolvedValue(0);

    await listProviderNotifications({
      tenantId,
      userId,
      category: "financial",
    });

    expect(providerNotification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          type: { in: ["payment_pending", "payment_received"] },
        }),
      }),
    );
  });

  it("deduplicates with audience and recipient in the deterministic key", async () => {
    const entityId = crypto.randomUUID();
    providerNotification.upsert.mockResolvedValue(notification({ entityId }));

    await createProviderNotification({
      tenantId,
      audience: "USER",
      recipientUserId: userId,
      type: "payment_pending",
      priority: "medium",
      title: "Pagamento pendente",
      description: "Atendimento em aberto.",
      entityType: "appointment",
      entityId,
    });

    expect(tenantUser.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ tenantId, userId }) }),
    );
    expect(providerNotification.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          tenantId_dedupeKey: {
            tenantId,
            dedupeKey: `USER:${userId}:payment_pending:appointment:${entityId}`,
          },
        },
      }),
    );
  });

  it("retries a legacy row with the exact backfill key without creating a duplicate", async () => {
    const entityId = crypto.randomUUID();
    const legacyDedupeKey = `TENANT:*:public_booking_created:appointment:${entityId}`;
    providerNotification.upsert.mockResolvedValue(
      notification({ entityId, dedupeKey: legacyDedupeKey }),
    );
    const input = {
      tenantId,
      audience: "TENANT" as const,
      type: "public_booking_created" as const,
      priority: "medium" as const,
      title: "Novo agendamento",
      description: "Cliente agendou um serviço.",
      entityType: "appointment" as const,
      entityId,
    };

    await createProviderNotification(input);
    await createProviderNotification(input);

    expect(providerNotification.upsert).toHaveBeenCalledTimes(2);
    for (const [call] of providerNotification.upsert.mock.calls) {
      expect(call.where).toEqual({
        tenantId_dedupeKey: { tenantId, dedupeKey: legacyDedupeKey },
      });
    }
  });

  it("includes audience and recipient in explicit dedupe keys", async () => {
    providerNotification.upsert.mockResolvedValue(notification());

    await createProviderNotification({
      tenantId,
      audience: "TENANT",
      dedupeKey: "setup-reminder",
      type: "system",
      priority: "low",
      title: "Complete seu negócio",
      description: "Finalize as configurações.",
    });

    expect(providerNotification.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          tenantId_dedupeKey: {
            tenantId,
            dedupeKey: "TENANT:*:setup-reminder",
          },
        },
      }),
    );
  });

  it("rejects a private recipient without active membership and performs no write", async () => {
    tenantUser.findFirst.mockResolvedValue(null);
    await expect(
      createProviderNotification({
        tenantId,
        audience: "USER",
        recipientUserId: userId,
        type: "system",
        priority: "low",
        title: "Aviso",
        description: "Privado",
        entityType: "business",
        entityId: crypto.randomUUID(),
      }),
    ).rejects.toThrow(/destinatário/i);
    expect(providerNotification.upsert).not.toHaveBeenCalled();
  });

  it("rejects contradictory tenant audience and recipient without writing", async () => {
    await expect(
      createProviderNotification({
        tenantId,
        audience: "TENANT",
        recipientUserId: userId,
        type: "system",
        priority: "low",
        title: "Aviso",
        description: "Não deve virar broadcast.",
        entityType: "business",
        entityId: crypto.randomUUID(),
      } as unknown as CreateProviderNotificationInput),
    ).rejects.toThrow(/não aceita destinatário/i);
    expect(tenantUser.findFirst).not.toHaveBeenCalled();
    expect(providerNotification.upsert).not.toHaveBeenCalled();
  });

  it("rejects an omitted audience instead of inferring a broadcast", async () => {
    await expect(
      createProviderNotification({
        tenantId,
        type: "system",
        priority: "low",
        title: "Aviso",
        description: "Audiência obrigatória.",
        entityType: "business",
        entityId: crypto.randomUUID(),
      } as unknown as CreateProviderNotificationInput),
    ).rejects.toThrow(/audiência/i);
    expect(providerNotification.upsert).not.toHaveBeenCalled();
  });

  it.each([undefined, "not-a-uuid"])(
    "rejects USER audience with missing or invalid recipient %s",
    async (recipientUserId) => {
      await expect(
        createProviderNotification({
          tenantId,
          audience: "USER",
          recipientUserId,
          type: "system",
          priority: "low",
          title: "Aviso privado",
          description: "Destinatário obrigatório.",
          entityType: "business",
          entityId: crypto.randomUUID(),
        } as unknown as CreateProviderNotificationInput),
      ).rejects.toThrow(/UUID válido/i);
      expect(tenantUser.findFirst).not.toHaveBeenCalled();
      expect(providerNotification.upsert).not.toHaveBeenCalled();
    },
  );

  it("returns defaults and updates preferences only for an active membership", async () => {
    prismaMock.providerNotificationPreference.findUnique.mockResolvedValue(null);
    const defaults = await getProviderNotificationPreferences(tenantId, userId);
    expect(defaults.hasStoredPreferences).toBe(false);

    prismaMock.providerNotificationPreference.upsert.mockResolvedValue({
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
    expect(prismaMock.providerNotificationPreference.upsert).toHaveBeenCalled();
  });
});
