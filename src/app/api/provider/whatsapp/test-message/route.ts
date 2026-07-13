import { NextRequest, NextResponse } from "next/server";
import { whatsappErrorResponse } from "@/features/whatsapp/whatsapp-http";
import { getWhatsAppManagerContext } from "@/features/whatsapp/whatsapp-route-auth";
import { whatsappTestMessageSchema } from "@/features/whatsapp/whatsapp-schemas";
import { sendWhatsAppTestMessage } from "@/features/whatsapp/whatsapp-test-service";

export async function POST(request: NextRequest) {
  const auth = await getWhatsAppManagerContext();
  if (!auth) return NextResponse.json({ message: "Não autorizado." }, { status: 401 });
  const parsed = whatsappTestMessageSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: "Telefone inválido." }, { status: 400 });
  try {
    await sendWhatsAppTestMessage({ tenantId: auth.context.tenantId, userId: auth.user.id, phone: parsed.data.phone });
    return NextResponse.json({ message: "Mensagem de teste enviada." });
  } catch (error) {
    return whatsappErrorResponse(error);
  }
}
