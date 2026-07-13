import { NextResponse } from "next/server";

import { getCurrentTenantContext, getCurrentUser } from "@/features/auth/permissions";
import { markAllProviderNotificationsRead } from "@/features/provider-notifications/notification-service";

export async function PATCH() {
  const [user, context] = await Promise.all([
    getCurrentUser(),
    getCurrentTenantContext(),
  ]);
  if (!user || !context) {
    return NextResponse.json({ message: "Não autorizado." }, { status: 401 });
  }

  const result = await markAllProviderNotificationsRead({
    tenantId: context.tenantId,
    userId: user.id,
  });
  return NextResponse.json({ updatedCount: result.count });
}
