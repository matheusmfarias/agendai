export const WHATSAPP_ERROR_CODES = {
  NOT_CONNECTED: "WHATSAPP_NOT_CONNECTED",
  INVALID_PHONE: "WHATSAPP_INVALID_PHONE",
  PROVIDER_UNAVAILABLE: "WHATSAPP_PROVIDER_UNAVAILABLE",
  TIMEOUT: "WHATSAPP_TIMEOUT",
  PROVIDER_BAD_REQUEST: "WHATSAPP_PROVIDER_BAD_REQUEST",
  RATE_LIMITED: "WHATSAPP_RATE_LIMITED",
  SEND_FAILED: "WHATSAPP_SEND_FAILED",
  QR_EXPIRED: "WHATSAPP_QR_EXPIRED",
  INSTANCE_NOT_FOUND: "WHATSAPP_INSTANCE_NOT_FOUND",
  PROVIDER_UNAUTHORIZED: "WHATSAPP_PROVIDER_UNAUTHORIZED",
  PROVIDER_CONFLICT: "WHATSAPP_PROVIDER_CONFLICT",
  INVALID_PROVIDER_RESPONSE: "WHATSAPP_INVALID_PROVIDER_RESPONSE",
  DELIVERY_DISABLED: "WHATSAPP_DELIVERY_DISABLED",
  DELIVERY_WINDOW_EXPIRED: "WHATSAPP_DELIVERY_WINDOW_EXPIRED",
} as const;

export type WhatsAppErrorCode =
  (typeof WHATSAPP_ERROR_CODES)[keyof typeof WHATSAPP_ERROR_CODES];

export class WhatsAppError extends Error {
  constructor(
    readonly code: WhatsAppErrorCode,
    message: string,
    readonly retryable = false,
    readonly httpStatus = 500,
  ) {
    super(message);
    this.name = "WhatsAppError";
  }
}

export function isRetryableWhatsAppError(error: unknown) {
  return error instanceof WhatsAppError && error.retryable;
}

export function publicWhatsAppErrorMessage(error: unknown) {
  if (error instanceof WhatsAppError) {
    if (error.code === WHATSAPP_ERROR_CODES.NOT_CONNECTED) {
      return "Conecte o WhatsApp antes de continuar.";
    }
    if (error.code === WHATSAPP_ERROR_CODES.INVALID_PHONE) {
      return "Informe um telefone brasileiro válido com DDD.";
    }
    if (error.code === WHATSAPP_ERROR_CODES.RATE_LIMITED) {
      return "Limite de testes atingido. Aguarde alguns minutos.";
    }
  }
  return "Não foi possível concluir a operação com o WhatsApp agora.";
}
