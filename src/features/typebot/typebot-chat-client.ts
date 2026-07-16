import { z } from "zod";

const responseSchema = z
  .object({
    sessionId: z.string().min(1).optional(),
    messages: z
      .array(
        z
          .object({
            type: z.string(),
            content: z.unknown().optional(),
          })
          .passthrough(),
      )
      .default([]),
    input: z
      .object({
        type: z.string(),
        items: z
          .array(z.object({
            id: z.string().optional(),
            value: z.string().optional(),
            content: z.unknown().optional(),
          }).passthrough())
          .optional(),
        options: z
          .object({
            isLong: z.boolean().optional(),
            format: z.string().optional(),
            locale: z.string().optional(),
          })
          .passthrough()
          .optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

export type TypebotChatReply = {
  sessionId?: string;
  text: string;
  interaction?: {
    type: string;
    choices: Array<{ id: string; value: string; label: string }>;
  };
  expectedInput?: {
    type: "TEXT" | "TEXTAREA" | "NUMBER" | "DATE" | "CHOICE";
    format?: string;
  };
};

export interface TypebotChatClient {
  start(input: {
    publicId: string;
    apiBaseUrl: string;
    tenantSlug: string;
    typebotApiKey: string;
    phone: string;
  }): Promise<TypebotChatReply>;
  continue(input: { sessionId: string; message: string }): Promise<TypebotChatReply>;
}

export function buildTypebotStartPayload(input: {
  apiBaseUrl: string;
  tenantSlug: string;
  typebotApiKey: string;
  phone: string;
}) {
  return {
    isOnlyRegistering: false,
    isStreamEnabled: false,
    textBubbleContentFormat: "markdown",
    prefilledVariables: {
      apiBaseUrl: input.apiBaseUrl,
      tenantSlug: input.tenantSlug,
      typebotApiKey: input.typebotApiKey,
      phone: input.phone,
    },
  } as const;
}

export function sanitizeTypebotStartPayload(
  payload: ReturnType<typeof buildTypebotStartPayload>,
) {
  return {
    ...payload,
    prefilledVariables: {
      ...payload.prefilledVariables,
      typebotApiKey: "[REDACTED]",
    },
  };
}

export class TypebotChatError extends Error {
  constructor(
    readonly code: "UNAVAILABLE" | "SESSION_NOT_FOUND" | "INVALID_RESPONSE",
    readonly retryable: boolean,
  ) {
    super(code);
    this.name = "TypebotChatError";
  }
}

function safeTextContent(content: unknown) {
  if (typeof content === "string") return content.trim();
  if (!content || typeof content !== "object" || Array.isArray(content)) {
    return "";
  }
  const value = content as Record<string, unknown>;
  if (typeof value.markdown === "string") return value.markdown.trim();
  if (typeof value.plainText === "string") return value.plainText.trim();
  return "";
}

function choiceLabel(content: unknown) {
  if (typeof content === "string") return content.trim();
  if (!content || typeof content !== "object" || Array.isArray(content)) {
    return "";
  }
  const value = content as Record<string, unknown>;
  for (const key of ["label", "text", "title"] as const) {
    if (typeof value[key] === "string") return value[key].trim();
  }
  return "";
}

function choiceValue(item: {
  id?: string;
  value?: string;
  content?: unknown;
}, label: string) {
  if (item.value?.trim()) return item.value.trim();
  if (item.content && typeof item.content === "object" && !Array.isArray(item.content)) {
    const content = item.content as Record<string, unknown>;
    for (const key of ["value", "id"] as const) {
      if (typeof content[key] === "string" && content[key].trim()) {
        return content[key].trim();
      }
    }
  }
  return label;
}

function expectedInput(input: z.infer<typeof responseSchema>["input"]) {
  if (!input) return undefined;
  switch (input.type.toLowerCase()) {
    case "choice input":
      return { type: "CHOICE" } as const;
    case "text input":
      return { type: input.options?.isLong ? "TEXTAREA" : "TEXT" } as const;
    case "number input":
      return { type: "NUMBER" } as const;
    case "date input":
      return {
        type: "DATE",
        format: input.options?.format ?? "yyyy-MM-dd",
      } as const;
    default:
      return undefined;
  }
}

export function renderTypebotReply(value: unknown): TypebotChatReply {
  const parsed = responseSchema.safeParse(value);
  if (!parsed.success) {
    throw new TypebotChatError("INVALID_RESPONSE", false);
  }
  const messages = parsed.data.messages
    .filter((message) => message.type === "text")
    .map((message) => safeTextContent(message.content))
    .filter(Boolean);
  const choices = (parsed.data.input?.items ?? []).flatMap((item, index) => {
    const label = choiceLabel(item.content);
    if (!label) return [];
    const value = choiceValue(item, label);
    return [{ id: item.id?.trim() || `choice-${index + 1}`, value, label }];
  });
  const text = messages.join("\n\n").trim();
  const inputExpectation = expectedInput(parsed.data.input);
  return {
    sessionId: parsed.data.sessionId,
    text,
    ...(choices.length && parsed.data.input
      ? { interaction: { type: parsed.data.input.type, choices } }
      : {}),
    ...(inputExpectation ? { expectedInput: inputExpectation } : {}),
  };
}

function getTypebotViewerUrl(environment: NodeJS.ProcessEnv = process.env) {
  const value = environment.TYPEBOT_VIEWER_URL;
  if (!value) throw new TypebotChatError("UNAVAILABLE", true);
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new TypebotChatError("UNAVAILABLE", false);
  }
  return url;
}

async function request(path: string, body: unknown) {
  const baseUrl = getTypebotViewerUrl();
  const timeout = Number(process.env.TYPEBOT_REQUEST_TIMEOUT_MS ?? 15_000);
  let response: Response;
  try {
    response = await fetch(new URL(path, baseUrl), {
      method: "POST",
      headers: { "content-type": "application/json; charset=utf-8" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(Number.isFinite(timeout) ? timeout : 15_000),
      cache: "no-store",
    });
  } catch {
    throw new TypebotChatError("UNAVAILABLE", true);
  }
  if (response.status === 404) {
    throw new TypebotChatError("SESSION_NOT_FOUND", false);
  }
  if (response.status === 429 || response.status >= 500) {
    await response.body?.cancel().catch(() => undefined);
    throw new TypebotChatError("UNAVAILABLE", true);
  }
  if (!response.ok) {
    await response.body?.cancel().catch(() => undefined);
    throw new TypebotChatError("INVALID_RESPONSE", false);
  }
  try {
    return renderTypebotReply(await response.json());
  } catch (error) {
    if (error instanceof TypebotChatError) throw error;
    throw new TypebotChatError("INVALID_RESPONSE", false);
  }
}

export function createTypebotChatClient(): TypebotChatClient {
  return {
    start: ({ publicId, ...variables }) =>
      request(
        `/api/v1/typebots/${encodeURIComponent(publicId)}/startChat`,
        buildTypebotStartPayload(variables),
      ).then((reply) => {
        if (!reply.sessionId) throw new TypebotChatError("INVALID_RESPONSE", false);
        return reply;
      }),
    continue: ({ sessionId, message }) =>
      request(`/api/v1/sessions/${encodeURIComponent(sessionId)}/continueChat`, {
        textBubbleContentFormat: "markdown",
        message: { type: "text", text: message },
      }),
  };
}
