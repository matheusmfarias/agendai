
/**
 * Standardized JSON responses for Typebot API endpoints.
 * Explicitly sets charset=utf-8 so clients (including PowerShell)
 * interpret the response correctly.
 */

function jsonResponse(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      ...init?.headers,
      "content-type": "application/json; charset=utf-8",
    },
  });
}

export function typebotOk<T>(data: T, status = 200) {
  return jsonResponse({ ok: true, ...data }, { status });
}

export function typebotError(
  code: string,
  message: string,
  status = 400,
) {
  return jsonResponse({ ok: false, code, message }, { status });
}

const REPLACEMENT_CHAR = "�"; // "�"

/**
 * Rejects strings that contain the Unicode replacement character,
 * which indicates the caller sent mojibake (e.g. PowerShell defaulting
 * to Windows-1252 instead of UTF-8).
 */
export function hasReplacementChar(value: string): boolean {
  return value.includes(REPLACEMENT_CHAR);
}

export function assertNoMojibake(
  fields: Record<string, string | null | undefined>,
): string | null {
  for (const [key, value] of Object.entries(fields)) {
    if (value && hasReplacementChar(value)) {
      return key;
    }
  }
  return null;
}

export const TYPEFBOT_ERROR_CODES = {
  UNAUTHORIZED: "UNAUTHORIZED",
  RATE_LIMITED: "RATE_LIMITED",
  BUSINESS_UNAVAILABLE: "BUSINESS_UNAVAILABLE",
  SERVICE_NOT_FOUND: "SERVICE_NOT_FOUND",
  SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE",
  NO_SLOTS_AVAILABLE: "NO_SLOTS_AVAILABLE",
  CUSTOMER_REQUIRED: "CUSTOMER_REQUIRED",
  SESSION_NOT_FOUND: "SESSION_NOT_FOUND",
  INVALID_SLOT: "INVALID_SLOT",
  SLOT_UNAVAILABLE: "SLOT_UNAVAILABLE",
  CUSTOM_FIELD_REQUIRED: "CUSTOM_FIELD_REQUIRED",
  CUSTOM_FIELD_INVALID: "CUSTOM_FIELD_INVALID",
  APPOINTMENT_NOT_FOUND: "APPOINTMENT_NOT_FOUND",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;
