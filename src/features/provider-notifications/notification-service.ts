import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import type {
  ProviderNotificationMetadata,
  ProviderNotificationPriority,
  ProviderNotificationPreferences,
  ProviderNotificationType,
} from "@/features/provider-notifications/types";
import { DEFAULT_PROVIDER_NOTIFICATION_PREFERENCES } from "@/features/provider-notifications/types";

export type CreateProviderNotificationInput = {
  tenantId: string;
  recipientUserId?: string | null;
  type: ProviderNotificationType;
  priority: ProviderNotificationPriority;
  title: string;
  description: string;
  entityType?: "appointment" | "customer" | "payment" | "service" | "business";
  entityId?: string | null;
  actionUrl?: string | null;
  metadata?: ProviderNotificationMetadata;
};

export async function createProviderNotification(
  input: CreateProviderNotificationInput,
) {
  const data = {
    tenantId: input.tenantId,
    recipientUserId: input.recipientUserId,
    type: input.type,
    priority: input.priority,
    title: input.title,
    description: input.description,
    entityType: input.entityType,
    entityId: input.entityId,
    actionUrl: input.actionUrl,
    metadata: input.metadata,
  };

  if (!input.entityId) {
    return prisma.providerNotification.create({ data });
  }

  return prisma.providerNotification.upsert({
    where: {
      tenantId_type_entityId: {
        tenantId: input.tenantId,
        type: input.type,
        entityId: input.entityId,
      },
    },
    create: data,
    update: {},
  });
}

function sanitizeMetadata(value: unknown): ProviderNotificationMetadata | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  const text = (key: keyof ProviderNotificationMetadata) =>
    typeof input[key] === "string" ? input[key] : undefined;
  const source = text("source");
  const metadata: ProviderNotificationMetadata = {
    customerName: text("customerName"),
    serviceName: text("serviceName"),
    professionalName: text("professionalName"),
    bookingDate: text("bookingDate"),
    bookingTime: text("bookingTime"),
    oldBookingDate: text("oldBookingDate"),
    oldBookingTime: text("oldBookingTime"),
    source:
      source === "public_link" ||
      source === "manual" ||
      source === "whatsapp" ||
      source === "typebot"
        ? source
        : undefined,
    requiresConfirmation:
      typeof input.requiresConfirmation === "boolean"
        ? input.requiresConfirmation
        : undefined,
  };

  return Object.values(metadata).some((item) => item !== undefined)
    ? metadata
    : null;
}

export async function getProviderNotificationPreferences(
  tenantId: string,
  userId: string,
) {
  const preferences = await prisma.providerNotificationPreference.findUnique({
    where: { tenantId_userId: { tenantId, userId } },
  });

  return {
    preferences: preferences
      ? {
          panelNotificationsEnabled: preferences.panelNotificationsEnabled,
          soundEnabled: preferences.soundEnabled,
          publicBookingNotificationsEnabled:
            preferences.publicBookingNotificationsEnabled,
          cancellationNotificationsEnabled:
            preferences.cancellationNotificationsEnabled,
          rescheduleNotificationsEnabled: preferences.rescheduleNotificationsEnabled,
          paymentNotificationsEnabled: preferences.paymentNotificationsEnabled,
        }
      : DEFAULT_PROVIDER_NOTIFICATION_PREFERENCES,
    hasStoredPreferences: Boolean(preferences),
  };
}

export async function updateProviderNotificationPreferences(
  tenantId: string,
  userId: string,
  input: Partial<ProviderNotificationPreferences>,
) {
  const preferences = await prisma.providerNotificationPreference.upsert({
    where: { tenantId_userId: { tenantId, userId } },
    create: {
      tenantId,
      userId,
      ...DEFAULT_PROVIDER_NOTIFICATION_PREFERENCES,
      ...input,
    },
    update: input,
  });

  return {
    panelNotificationsEnabled: preferences.panelNotificationsEnabled,
    soundEnabled: preferences.soundEnabled,
    publicBookingNotificationsEnabled:
      preferences.publicBookingNotificationsEnabled,
    cancellationNotificationsEnabled: preferences.cancellationNotificationsEnabled,
    rescheduleNotificationsEnabled: preferences.rescheduleNotificationsEnabled,
    paymentNotificationsEnabled: preferences.paymentNotificationsEnabled,
  };
}

export async function listProviderNotifications({
  tenantId,
  userId,
  status = "all",
  type,
  limit = 20,
  cursor,
}: {
  tenantId: string;
  userId: string;
  status?: "unread" | "read" | "all";
  type?: string;
  limit?: number;
  cursor?: string;
}) {
  const where: Prisma.ProviderNotificationWhereInput = {
    tenantId,
    archivedAt: null,
    OR: [{ recipientUserId: null }, { recipientUserId: userId }],
    ...(status === "unread" ? { readAt: null } : {}),
    ...(status === "read" ? { readAt: { not: null } } : {}),
    ...(type ? { type } : {}),
  };
  const take = Math.min(Math.max(limit, 1), 30);
  const scopedCursor = cursor
    ? await prisma.providerNotification.findFirst({
        where: { ...where, id: cursor },
        select: { id: true },
      })
    : null;
  const [notifications, unreadCount] = await Promise.all([
    prisma.providerNotification.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: take + 1,
      ...(scopedCursor ? { cursor: { id: scopedCursor.id }, skip: 1 } : {}),
    }),
    prisma.providerNotification.count({
      where: { ...where, readAt: null },
    }),
  ]);
  const hasMore = notifications.length > take;
  const page = hasMore ? notifications.slice(0, take) : notifications;

  return {
    notifications: page.map((notification) => ({
      ...notification,
      metadata: sanitizeMetadata(notification.metadata),
    })),
    unreadCount,
    nextCursor: hasMore ? page.at(-1)?.id ?? null : null,
  };
}

export async function markProviderNotificationRead({
  tenantId,
  userId,
  notificationId,
}: {
  tenantId: string;
  userId: string;
  notificationId: string;
}) {
  const notification = await prisma.providerNotification.findFirst({
    where: {
      id: notificationId,
      tenantId,
      archivedAt: null,
      OR: [{ recipientUserId: null }, { recipientUserId: userId }],
    },
  });
  if (!notification) return null;
  if (notification.readAt) return notification;

  return prisma.providerNotification.update({
    where: { id: notificationId },
    data: { readAt: new Date() },
  });
}

export async function markAllProviderNotificationsRead({
  tenantId,
  userId,
}: {
  tenantId: string;
  userId: string;
}) {
  return prisma.providerNotification.updateMany({
    where: {
      tenantId,
      archivedAt: null,
      readAt: null,
      OR: [{ recipientUserId: null }, { recipientUserId: userId }],
    },
    data: { readAt: new Date() },
  });
}
