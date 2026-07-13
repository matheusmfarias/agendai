import { NextRequest, NextResponse } from "next/server";

import { getCurrentTenantContext, getCurrentUser } from "@/features/auth/permissions";
import { markProviderNotificationRead } from "@/features/provider-notifications/notification-service";

export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const [user, context, routeParams] = await Promise.all([
    getCurrentUser(),
    getCurrentTenantContext(),
    params,
  ]);
  if (!user || !context) {
    return NextResponse.json({ message: "Não autorizado." }, { status: 401 });
  }

  const notification = await markProviderNotificationRead({
    tenantId: context.tenantId,
    userId: user.id,
    notificationId: routeParams.id,
  });
  if (!notification) {
    return NextResponse.json({ message: "Notificação não encontrada." }, { status: 404 });
  }

  return NextResponse.json({
    notification: {
      ...notification,
      readAt: notification.readAt?.toISOString() ?? null,
      archivedAt: notification.archivedAt?.toISOString() ?? null,
      createdAt: notification.createdAt.toISOString(),
    },
  });
}
