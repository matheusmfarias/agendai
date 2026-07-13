import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
  safeProviderNotificationActionUrl,
  serializeProviderNotification,
  typesForNotificationCategory,
} from "@/features/provider-notifications/notification-contract";
import type {
  ProviderNotificationCategory,
  ProviderNotificationMetadata,
  ProviderNotificationPriority,
  ProviderNotificationPreferences,
  ProviderNotificationType,
} from "@/features/provider-notifications/types";
import { DEFAULT_PROVIDER_NOTIFICATION_PREFERENCES } from "@/features/provider-notifications/types";
import { z } from "zod";

type NotificationClient = Prisma.TransactionClient | typeof prisma;

export class ProviderNotificationCursorError extends Error {}

type CreateProviderNotificationBase = {
  tenantId: string;
  dedupeKey?: string;
  type: ProviderNotificationType;
  priority: ProviderNotificationPriority;
  title: string;
  description: string;
  entityType?: "appointment" | "customer" | "payment" | "service" | "business";
  entityId?: string | null;
  actionUrl?: string | null;
  metadata?: ProviderNotificationMetadata;
};

export type CreateProviderNotificationInput = CreateProviderNotificationBase &
  (
    | { audience: "TENANT"; recipientUserId?: never }
    | { audience: "USER"; recipientUserId: string }
  );

function notificationDedupeKey(input: CreateProviderNotificationInput) {
  const { audience } = input;
  if (input.dedupeKey) {
    return `${audience}:${input.recipientUserId ?? "*"}:${input.dedupeKey}`;
  }
  if (!input.entityId) {
    throw new Error("Notificação sem entidade exige chave de deduplicação.");
  }
  return [
    audience,
    input.recipientUserId ?? "*",
    input.type,
    input.entityType ?? "*",
    input.entityId,
  ].join(":");
}

export async function createProviderNotification(
  input: CreateProviderNotificationInput,
  client: NotificationClient = prisma,
) {
  const hasRecipient = Object.prototype.hasOwnProperty.call(
    input,
    "recipientUserId",
  );
  if (input.audience !== "TENANT" && input.audience !== "USER") {
    throw new Error("Audiência de notificação inválida.");
  }
  if (input.audience === "TENANT" && hasRecipient) {
    throw new Error("Notificação do tenant não aceita destinatário privado.");
  }
  if (
    input.audience === "USER" &&
    !z.string().uuid().safeParse(input.recipientUserId).success
  ) {
    throw new Error("Notificação privada exige destinatário UUID válido.");
  }
  const audience = input.audience;
  const recipientUserId =
    input.audience === "USER" ? input.recipientUserId : null;
  if (audience === "USER") {
    const privateRecipientUserId = input.recipientUserId;
    const membership = await client.tenantUser.findFirst({
      where: {
        tenantId: input.tenantId,
        userId: privateRecipientUserId,
        isActive: true,
        user: { isActive: true },
      },
      select: { id: true },
    });
    if (!membership) throw new Error("Destinatário indisponível.");
  }
  const actionUrl = safeProviderNotificationActionUrl(input.actionUrl);
  if (input.actionUrl && !actionUrl) throw new Error("Ação de notificação inválida.");
  const dedupeKey = notificationDedupeKey(input);
  const data = {
    tenantId: input.tenantId,
    audience,
    recipientUserId,
    dedupeKey,
    type: input.type,
    priority: input.priority,
    title: input.title,
    description: input.description,
    entityType: input.entityType,
    entityId: input.entityId,
    actionUrl,
    metadata: input.metadata,
  };
  return client.providerNotification.upsert({
    where: { tenantId_dedupeKey: { tenantId: input.tenantId, dedupeKey } },
    create: data,
    update: {},
  });
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
  const membership = await prisma.tenantUser.findFirst({
    where: { tenantId, userId, isActive: true, user: { isActive: true } },
    select: { id: true },
  });
  if (!membership) throw new Error("Usuário sem acesso ao tenant.");
  const preferences = await prisma.providerNotificationPreference.upsert({
    where: { tenantId_userId: { tenantId, userId } },
    create: { tenantId, userId, ...DEFAULT_PROVIDER_NOTIFICATION_PREFERENCES, ...input },
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

function accessScope(tenantId: string, userId: string): Prisma.ProviderNotificationWhereInput {
  return {
    tenantId,
    archivedAt: null,
    OR: [
      { audience: "TENANT", recipientUserId: null },
      { audience: "USER", recipientUserId: userId },
    ],
  };
}

export async function listProviderNotifications({
  tenantId,
  userId,
  status = "all",
  type,
  category,
  limit = 20,
  cursor,
}: {
  tenantId: string;
  userId: string;
  status?: "unread" | "read" | "all";
  type?: ProviderNotificationType;
  category?: ProviderNotificationCategory;
  limit?: number;
  cursor?: string;
}) {
  const scope = accessScope(tenantId, userId);
  const readScope = { tenantId, userId };
  const categoryTypes = typesForNotificationCategory(category);
  const stableWhere: Prisma.ProviderNotificationWhereInput = {
    ...scope,
    ...(type
      ? { type }
      : categoryTypes
        ? { type: { in: [...categoryTypes] } }
        : {}),
  };
  const where: Prisma.ProviderNotificationWhereInput = {
    ...stableWhere,
    ...(status === "unread" ? { reads: { none: readScope } } : {}),
    ...(status === "read" ? { reads: { some: readScope } } : {}),
  };
  const take = Math.min(Math.max(limit, 1), 30);
  const scopedCursor = cursor
      ? await prisma.providerNotification.findFirst({
        where: { ...stableWhere, id: cursor },
        select: { id: true },
      })
    : null;
  if (cursor && !scopedCursor) throw new ProviderNotificationCursorError();
  const includeReads = { where: readScope, select: { readAt: true }, take: 1 } as const;
  const [notifications, unreadCount] = await Promise.all([
    prisma.providerNotification.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: take + 1,
      ...(scopedCursor ? { cursor: { id: scopedCursor.id }, skip: 1 } : {}),
      include: { reads: includeReads },
    }),
    prisma.providerNotification.count({
      where: { ...scope, reads: { none: readScope } },
    }),
  ]);
  const hasMore = notifications.length > take;
  const page = hasMore ? notifications.slice(0, take) : notifications;
  return {
    notifications: page.map(serializeProviderNotification),
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
  return prisma.$transaction(async (tx) => {
    const notification = await tx.providerNotification.findFirst({
      where: { ...accessScope(tenantId, userId), id: notificationId },
      include: { reads: { where: { tenantId, userId }, select: { readAt: true }, take: 1 } },
    });
    if (!notification) return null;
    await tx.providerNotificationRead.upsert({
      where: {
        notificationId_tenantId_userId: { notificationId, tenantId, userId },
      },
      create: { notificationId, tenantId, userId },
      update: {},
    });
    const readAt = notification.reads[0]?.readAt ?? new Date();
    return serializeProviderNotification({ ...notification, reads: [{ readAt }] });
  });
}

export async function markAllProviderNotificationsRead({
  tenantId,
  userId,
}: {
  tenantId: string;
  userId: string;
}) {
  return prisma.$transaction(async (tx) => {
    const notifications = await tx.providerNotification.findMany({
      where: {
        ...accessScope(tenantId, userId),
        reads: { none: { tenantId, userId } },
      },
      select: { id: true },
    });
    if (!notifications.length) return { count: 0 };
    const result = await tx.providerNotificationRead.createMany({
      data: notifications.map(({ id }) => ({ notificationId: id, tenantId, userId })),
      skipDuplicates: true,
    });
    return { count: result.count };
  });
}
