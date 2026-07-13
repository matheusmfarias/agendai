import { NextResponse } from "next/server";

import { createWhatsAppConnection, getWhatsAppConnection, refreshWhatsAppConnection } from "@/features/whatsapp/whatsapp-connection-service";
import { whatsappErrorResponse } from "@/features/whatsapp/whatsapp-http";
import { getWhatsAppManagerContext } from "@/features/whatsapp/whatsapp-route-auth";

export async function GET() {
  const auth = await getWhatsAppManagerContext();
  if (!auth) return NextResponse.json({ message: "Não autorizado." }, { status: 401 });
  try {
    const connection = await refreshWhatsAppConnection(
      { tenantId: auth.context.tenantId, userId: auth.user.id },
    ).catch(() => getWhatsAppConnection(auth.context.tenantId));
    return NextResponse.json({ connection: await connection });
  } catch (error) {
    return whatsappErrorResponse(error);
  }
}

export async function POST() {
  const auth = await getWhatsAppManagerContext();
  if (!auth) return NextResponse.json({ message: "Não autorizado." }, { status: 401 });
  try {
    const connection = await createWhatsAppConnection({ tenantId: auth.context.tenantId, userId: auth.user.id });
    return NextResponse.json({ connection }, { status: 201 });
  } catch (error) {
    return whatsappErrorResponse(error);
  }
}
