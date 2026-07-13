import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentTenantContext, getCurrentUser } from "@/features/auth/permissions";
import {
  getProviderNotificationPreferences,
  updateProviderNotificationPreferences,
} from "@/features/provider-notifications/notification-service";

const preferenceSchema = z
  .object({
    panelNotificationsEnabled: z.boolean().optional(),
    soundEnabled: z.boolean().optional(),
    publicBookingNotificationsEnabled: z.boolean().optional(),
    cancellationNotificationsEnabled: z.boolean().optional(),
    rescheduleNotificationsEnabled: z.boolean().optional(),
    paymentNotificationsEnabled: z.boolean().optional(),
  })
  .strict();

async function contextForPreferences() {
  const [user, context] = await Promise.all([
    getCurrentUser(),
    getCurrentTenantContext(),
  ]);
  return user && context ? { user, context } : null;
}

export async function GET() {
  const auth = await contextForPreferences();
  if (!auth) {
    return NextResponse.json({ message: "Não autorizado." }, { status: 401 });
  }

  return NextResponse.json(
    await getProviderNotificationPreferences(
      auth.context.tenantId,
      auth.user.id,
    ),
  );
}

export async function PATCH(request: NextRequest) {
  const auth = await contextForPreferences();
  if (!auth) {
    return NextResponse.json({ message: "Não autorizado." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = preferenceSchema.safeParse(body);
  if (!parsed.success || Object.keys(parsed.data).length === 0) {
    return NextResponse.json({ message: "Preferências inválidas." }, { status: 400 });
  }

  const preferences = await updateProviderNotificationPreferences(
    auth.context.tenantId,
    auth.user.id,
    parsed.data,
  );
  return NextResponse.json({ preferences });
}
