import { NextRequest, NextResponse } from "next/server";
import { updateWhatsAppPreferences } from "@/features/whatsapp/whatsapp-connection-service";
import { whatsappErrorResponse } from "@/features/whatsapp/whatsapp-http";
import { getWhatsAppManagerContext } from "@/features/whatsapp/whatsapp-route-auth";
import { whatsappPreferenceSchema } from "@/features/whatsapp/whatsapp-schemas";

export async function PATCH(request: NextRequest) {
  const auth = await getWhatsAppManagerContext();
  if (!auth) return NextResponse.json({ message: "Não autorizado." }, { status: 401 });
  const parsed = whatsappPreferenceSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: "Preferências inválidas." }, { status: 400 });
  try {
    const connection = await updateWhatsAppPreferences(
      { tenantId: auth.context.tenantId, userId: auth.user.id },
      parsed.data,
    );
    return NextResponse.json({ connection });
  } catch (error) {
    return whatsappErrorResponse(error);
  }
}
