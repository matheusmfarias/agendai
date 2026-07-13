import { NextRequest, NextResponse } from "next/server";

import { getCurrentTenantContext, getCurrentUser } from "@/features/auth/permissions";
import { listProviderNotifications } from "@/features/provider-notifications/notification-service";
import { isProviderNotificationType } from "@/features/provider-notifications/types";

export async function GET(request: NextRequest) {
  const [user, context] = await Promise.all([
    getCurrentUser(),
    getCurrentTenantContext(),
  ]);
  if (!user || !context) {
    return NextResponse.json({ message: "Não autorizado." }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const status = searchParams.get("status");
  const type = searchParams.get("type");
  const rawLimit = Number(searchParams.get("limit") ?? "20");
  const limit = Number.isFinite(rawLimit) ? rawLimit : 20;
  const result = await listProviderNotifications({
    tenantId: context.tenantId,
    userId: user.id,
    status: status === "unread" || status === "read" ? status : "all",
    type: isProviderNotificationType(type) ? type : undefined,
    limit,
    cursor: searchParams.get("cursor") ?? undefined,
  });

  return NextResponse.json({
    notifications: result.notifications.map((notification) => ({
      ...notification,
      readAt: notification.readAt?.toISOString() ?? null,
      archivedAt: notification.archivedAt?.toISOString() ?? null,
      createdAt: notification.createdAt.toISOString(),
    })),
    unreadCount: result.unreadCount,
    nextCursor: result.nextCursor,
  });
}
