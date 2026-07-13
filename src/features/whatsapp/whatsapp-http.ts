import { NextResponse } from "next/server";

import { publicWhatsAppErrorMessage, WhatsAppError } from "@/features/whatsapp/whatsapp-errors";

export function whatsappErrorResponse(error: unknown) {
  const status = error instanceof WhatsAppError ? error.httpStatus : 500;
  const code = error instanceof WhatsAppError ? error.code : "WHATSAPP_OPERATION_FAILED";
  return NextResponse.json(
    { code, message: publicWhatsAppErrorMessage(error) },
    { status: status >= 400 && status < 600 ? status : 500 },
  );
}
