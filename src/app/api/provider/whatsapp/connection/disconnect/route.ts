import { NextResponse } from "next/server";
import { disconnectWhatsApp } from "@/features/whatsapp/whatsapp-connection-service";
import { whatsappErrorResponse } from "@/features/whatsapp/whatsapp-http";
import { getWhatsAppManagerContext } from "@/features/whatsapp/whatsapp-route-auth";

export async function POST() {
  const auth = await getWhatsAppManagerContext();
  if (!auth) return NextResponse.json({ message: "Não autorizado." }, { status: 401 });
  try {
    return NextResponse.json({ connection: await disconnectWhatsApp({ tenantId: auth.context.tenantId, userId: auth.user.id }) });
  } catch (error) {
    return whatsappErrorResponse(error);
  }
}
