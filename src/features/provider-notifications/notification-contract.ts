import { z } from "zod";

import type {
  ProviderNotification,
  ProviderNotificationCategory,
  ProviderNotificationMetadata,
  ProviderNotificationPriority,
  ProviderNotificationType,
} from "@/features/provider-notifications/types";
import {
  PROVIDER_NOTIFICATION_TYPES,
  PROVIDER_NOTIFICATION_PRIORITIES,
} from "@/features/provider-notifications/types";

export const providerNotificationListQuerySchema = z.object({
  status: z.enum(["all", "unread", "read"]).default("all"),
  category: z.enum(["bookings", "financial", "system"]).optional(),
  type: z.enum(PROVIDER_NOTIFICATION_TYPES).optional(),
  limit: z.coerce.number().int().min(1).max(30).default(20),
  cursor: z.string().uuid().optional(),
});

export const providerNotificationIdSchema = z.string().uuid();

export function notificationCategoryForType(
  type: ProviderNotificationType,
): ProviderNotificationCategory {
  if (type === "payment_pending" || type === "payment_received") {
    return "financial";
  }
  if (type === "business_setup_incomplete" || type === "system") {
    return "system";
  }
  return "bookings";
}

export function typesForNotificationCategory(
  category?: ProviderNotificationCategory,
) {
  return category
    ? PROVIDER_NOTIFICATION_TYPES.filter(
        (type) => notificationCategoryForType(type) === category,
      )
    : undefined;
}

export function safeProviderNotificationActionUrl(value: unknown) {
  if (typeof value !== "string") return null;
  if (!/^\/app(?:\/|$)/.test(value)) return null;
  if (value.startsWith("//") || value.includes("://") || value.includes("\\")) {
    return null;
  }
  const rawPathname = value.split(/[?#]/, 1)[0] ?? "";
  if (/%[0-9a-f]{2}/i.test(rawPathname)) return null;
  try {
    const parsed = new URL(value, "https://agendai.invalid");
    return parsed.origin === "https://agendai.invalid" &&
      /^\/app(?:\/|$)/.test(parsed.pathname)
      ? `${parsed.pathname}${parsed.search}${parsed.hash}`
      : null;
  } catch {
    return null;
  }
}

export function sanitizeProviderNotificationMetadata(
  value: unknown,
): ProviderNotificationMetadata | null {
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

type NotificationRecord = {
  id: string;
  tenantId: string;
  audience: "TENANT" | "USER";
  recipientUserId: string | null;
  type: string;
  priority: string;
  title: string;
  description: string;
  entityType: string | null;
  entityId: string | null;
  actionUrl: string | null;
  archivedAt: Date | null;
  createdAt: Date;
  metadata: unknown;
  reads?: { readAt: Date }[];
};

export function serializeProviderNotification(
  notification: NotificationRecord,
): ProviderNotification {
  const type = PROVIDER_NOTIFICATION_TYPES.includes(
    notification.type as ProviderNotificationType,
  )
    ? (notification.type as ProviderNotificationType)
    : "system";
  const priority = PROVIDER_NOTIFICATION_PRIORITIES.includes(
    notification.priority as ProviderNotificationPriority,
  )
    ? (notification.priority as ProviderNotificationPriority)
    : "medium";
  const entityTypes = [
    "appointment",
    "customer",
    "payment",
    "service",
    "business",
  ] as const;
  const entityType = entityTypes.includes(
    notification.entityType as (typeof entityTypes)[number],
  )
    ? (notification.entityType as (typeof entityTypes)[number])
    : null;

  return {
    id: notification.id,
    tenantId: notification.tenantId,
    audience: notification.audience,
    recipientUserId: notification.recipientUserId,
    type,
    priority,
    title: notification.title,
    description: notification.description,
    entityType,
    entityId: notification.entityId,
    actionUrl: safeProviderNotificationActionUrl(notification.actionUrl),
    readAt: notification.reads?.[0]?.readAt.toISOString() ?? null,
    archivedAt: notification.archivedAt?.toISOString() ?? null,
    createdAt: notification.createdAt.toISOString(),
    metadata: sanitizeProviderNotificationMetadata(notification.metadata),
  };
}
