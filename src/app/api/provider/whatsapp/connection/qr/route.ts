import { NextResponse } from "next/server";
import { getWhatsAppQrCode } from "@/features/whatsapp/whatsapp-connection-service";
import { whatsappErrorResponse } from "@/features/whatsapp/whatsapp-http";
import { getWhatsAppManagerContext } from "@/features/whatsapp/whatsapp-route-auth";

export async function POST() {
  const auth = await getWhatsAppManagerContext();
  if (!auth) return NextResponse.json({ message: "Não autorizado." }, { status: 401 });
  try {
    return NextResponse.json(
      await getWhatsAppQrCode({ tenantId: auth.context.tenantId, userId: auth.user.id }),
      { headers: { "cache-control": "no-store, max-age=0" } },
    );
  } catch (error) {
    return whatsappErrorResponse(error);
  }
}
