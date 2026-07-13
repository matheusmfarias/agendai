import { NextRequest, NextResponse } from "next/server";

import { getCurrentTenantContext, getCurrentUser } from "@/features/auth/permissions";
import { providerNotificationIdSchema } from "@/features/provider-notifications/notification-contract";
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
  const parsedId = providerNotificationIdSchema.safeParse(routeParams.id);
  if (!parsedId.success) {
    return NextResponse.json({ message: "Identificador inválido." }, { status: 400 });
  }

  const notification = await markProviderNotificationRead({
    tenantId: context.tenantId,
    userId: user.id,
    notificationId: parsedId.data,
  });
  if (!notification) {
    return NextResponse.json({ message: "Notificação não encontrada." }, { status: 404 });
  }

  return NextResponse.json({ notification });
}
