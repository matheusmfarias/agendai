import { NextRequest, NextResponse } from "next/server";

import { getCurrentTenantContext, getCurrentUser } from "@/features/auth/permissions";
import { providerNotificationListQuerySchema } from "@/features/provider-notifications/notification-contract";
import {
  listProviderNotifications,
  ProviderNotificationCursorError,
} from "@/features/provider-notifications/notification-service";

export async function GET(request: NextRequest) {
  const [user, context] = await Promise.all([
    getCurrentUser(),
    getCurrentTenantContext(),
  ]);
  if (!user || !context) {
    return NextResponse.json({ message: "Não autorizado." }, { status: 401 });
  }

  const parsed = providerNotificationListQuerySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams.entries()),
  );
  if (!parsed.success) {
    return NextResponse.json({ message: "Parâmetros inválidos." }, { status: 400 });
  }
  try {
    const result = await listProviderNotifications({
      tenantId: context.tenantId,
      userId: user.id,
      ...parsed.data,
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ProviderNotificationCursorError) {
      return NextResponse.json({ message: "Cursor inválido." }, { status: 400 });
    }
    throw error;
  }
}
