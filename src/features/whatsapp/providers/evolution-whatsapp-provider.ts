import { z } from "zod";

import { toBrazilianE164Phone } from "@/features/booking-core/phone";
import type {
  CreateWhatsAppInstanceInput,
  WhatsAppInstanceInfo,
  WhatsAppProvider,
} from "@/features/whatsapp/contracts/whatsapp-provider";
import {
  WHATSAPP_ERROR_CODES,
  WhatsAppError,
} from "@/features/whatsapp/whatsapp-errors";
import type { WhatsAppConfig } from "@/features/whatsapp/whatsapp-config";
import type { WhatsAppConnectionState } from "@/features/whatsapp/whatsapp-types";

const MAX_RESPONSE_BYTES = 256 * 1024;
const REQUEST_TIMEOUT_MS = 12_000;

type ProviderEndpoint =
  | "instance.create"
  | "instance.webhook"
  | "instance.connection-status"
  | "instance.qr-code"
  | "message.send-text"
  | "message.send-buttons"
  | "message.send-list"
  | "instance.disconnect"
  | "instance.delete";

const createResponseSchema = z.object({
  instance: z.object({
    instanceName: z.string(),
    instanceId: z.string().optional(),
    status: z.string().optional(),
  }),
});
const qrResponseSchema = z.union([
  z.object({ base64: z.string().min(20) }),
  z.object({ qrcode: z.object({ base64: z.string().min(20) }) }),
]);
const connectionResponseSchema = z
  .object({
    instance: z
      .object({
        instanceName: z.string().optional(),
        instanceId: z.string().optional(),
        state: z.string().optional(),
        status: z.string().optional(),
        ownerJid: z.string().nullable().optional(),
      })
      .optional(),
    state: z.string().optional(),
  })
  .passthrough();
const sendResponseSchema = z.object({
  key: z.object({ id: z.string().min(1) }),
});
type WebhookFindResponse = {
  webhookBase64?: boolean;
  webhook?: { webhookBase64: boolean };
};
const webhookFindResponseSchema: z.ZodType<WebhookFindResponse> = z
  .object({
    webhookBase64: z.boolean().optional(),
    webhook: z.object({ webhookBase64: z.boolean() }).passthrough().optional(),
  })
  .passthrough()
  .refine(
    (value) => value.webhookBase64 !== undefined || value.webhook !== undefined,
  );

function mapConnectionState(value: string | undefined): WhatsAppConnectionState {
  switch (value?.toLowerCase()) {
    case "open":
    case "connected":
      return "CONNECTED";
    case "connecting":
      return "CONNECTING";
    case "close":
    case "closed":
    case "disconnected":
      return "DISCONNECTED";
    default:
      return "DEGRADED";
  }
}

function logProviderFailure(input: {
  endpoint: ProviderEndpoint;
  failureType: "transport" | "timeout" | "http" | "invalid_json" | "invalid_contract";
  errorCode: string;
  httpStatus?: number;
}) {
  console.warn("Evolution provider request failed", input);
}

function sanitizeDiagnosticText(value: unknown): string | string[] | undefined {
  const sanitize = (text: string) =>
    text
      .replace(/https?:\/\/[^\s"']+/gi, "[url]")
      .replace(/\b\d{8,}\b/g, "[number]")
      .slice(0, 500);
  if (typeof value === "string") return sanitize(value);
  const collectMessages = (input: unknown, depth = 0): string[] => {
    if (depth > 5) return [];
    if (typeof input === "string") return [sanitize(input)];
    if (Array.isArray(input)) {
      return input.flatMap((item) => collectMessages(item, depth + 1)).slice(0, 10);
    }
    if (input && typeof input === "object") {
      return Object.entries(input as Record<string, unknown>)
        .filter(([key]) => key === "message")
        .flatMap(([, item]) => collectMessages(item, depth + 1))
        .slice(0, 10);
    }
    return [];
  };
  const messages = collectMessages(value);
  if (messages.length === 1) return messages[0];
  if (messages.length > 1) return messages;
  return undefined;
}

function logWebhookBadRequest(body: unknown, requestBody: BodyInit | null | undefined) {
  const response = body && typeof body === "object" && !Array.isArray(body)
    ? body as Record<string, unknown>
    : {};
  const nested = response.response && typeof response.response === "object" && !Array.isArray(response.response)
    ? response.response as Record<string, unknown>
    : {};
  let payloadFields: string[] = [];
  if (typeof requestBody === "string") {
    try {
      const payload = JSON.parse(requestBody) as unknown;
      if (payload && typeof payload === "object" && !Array.isArray(payload)) {
        payloadFields = Object.keys(payload).filter((field) => field !== "headers");
      }
    } catch {
      // Não registre o corpo quando ele não puder ser interpretado com segurança.
    }
  }
  console.warn("Evolution webhook configuration rejected", {
    endpoint: "instance.webhook",
    httpStatus: 400,
    code: sanitizeDiagnosticText(response.code ?? nested.code ?? response.error),
    message: sanitizeDiagnosticText(response.message ?? nested.message),
    payloadFields,
  });
}

function recipientFormat(value: unknown) {
  if (typeof value !== "string" || !/^\d+$/.test(value)) return "NON_DIGIT";
  if (value.startsWith("55") && (value.length === 12 || value.length === 13)) {
    return `BRAZIL_E164_${value.length}_DIGITS`;
  }
  if (value.length === 10 || value.length === 11) {
    return `BRAZIL_NATIONAL_${value.length}_DIGITS`;
  }
  return `DIGITS_${value.length}`;
}

function countInteractiveOptions(payload: Record<string, unknown>) {
  let count = 0;
  for (const field of ["buttons", "options"]) {
    if (Array.isArray(payload[field])) count += payload[field].length;
  }
  if (Array.isArray(payload.sections)) {
    for (const section of payload.sections) {
      if (!section || typeof section !== "object" || Array.isArray(section)) continue;
      const rows = (section as Record<string, unknown>).rows;
      if (Array.isArray(rows)) count += rows.length;
    }
  }
  return count;
}

function logSendMessageBadRequest(
  endpoint: ProviderEndpoint,
  body: unknown,
  requestBody: BodyInit | null | undefined,
) {
  const response = body && typeof body === "object" && !Array.isArray(body)
    ? body as Record<string, unknown>
    : {};
  const nested = response.response && typeof response.response === "object" && !Array.isArray(response.response)
    ? response.response as Record<string, unknown>
    : {};
  let payload: Record<string, unknown> = {};
  if (typeof requestBody === "string") {
    try {
      const parsed = JSON.parse(requestBody) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        payload = parsed as Record<string, unknown>;
      }
    } catch {
      // O diagnóstico não inclui o corpo quando ele não é JSON válido.
    }
  }
  console.warn("Evolution conversational send rejected", {
    endpoint,
    httpStatus: 400,
    code: sanitizeDiagnosticText(response.code ?? nested.code ?? response.error),
    message: sanitizeDiagnosticText(response.message ?? nested.message),
    payloadFields: Object.keys(payload).sort(),
    textLength:
      typeof payload.text === "string"
        ? payload.text.length
        : typeof payload.description === "string"
          ? payload.description.length
          : 0,
    interactiveOptionsCount: countInteractiveOptions(payload),
    recipientFormat: recipientFormat(payload.number),
  });
}

function transportErrorDetails(error: unknown) {
  const direct = error && typeof error === "object" ? error as Record<string, unknown> : null;
  const cause = direct?.cause && typeof direct.cause === "object"
    ? direct.cause as Record<string, unknown>
    : null;
  const code = typeof direct?.code === "string"
    ? direct.code
    : typeof cause?.code === "string"
      ? cause.code
      : null;
  const name = error instanceof Error ? error.name : "";
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  const timeout =
    name === "TimeoutError" ||
    name === "AbortError" ||
    code === "ETIMEDOUT" ||
    message.includes("timed out") ||
    message.includes("timeout");
  return { timeout };
}

function normalizeTransportError(
  error: unknown,
  endpoint: ProviderEndpoint,
  httpStatus?: number,
) {
  const { timeout } = transportErrorDetails(error);
  const code = timeout
    ? WHATSAPP_ERROR_CODES.TIMEOUT
    : WHATSAPP_ERROR_CODES.PROVIDER_UNAVAILABLE;
  logProviderFailure({
    endpoint,
    failureType: timeout ? "timeout" : "transport",
    errorCode: code,
    ...(httpStatus !== undefined ? { httpStatus } : {}),
  });
  return new WhatsAppError(
    code,
    timeout ? "Tempo limite excedido ao acessar a Evolution." : "Falha de transporte com a Evolution.",
    true,
    httpStatus ?? 503,
  );
}

async function readLimitedJson(
  response: Response,
  endpoint: ProviderEndpoint,
) {
  const contentLength = Number(response.headers.get("content-length") ?? 0);
  if (contentLength > MAX_RESPONSE_BYTES) {
    logProviderFailure({
      endpoint,
      failureType: "invalid_contract",
      errorCode: WHATSAPP_ERROR_CODES.INVALID_PROVIDER_RESPONSE,
      httpStatus: response.status,
    });
    throw new WhatsAppError(
      WHATSAPP_ERROR_CODES.INVALID_PROVIDER_RESPONSE,
      "Resposta da Evolution excedeu o limite.",
      false,
      response.status,
    );
  }
  if (!response.body) return null;
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_RESPONSE_BYTES) {
        await reader.cancel();
        logProviderFailure({
          endpoint,
          failureType: "invalid_contract",
          errorCode: WHATSAPP_ERROR_CODES.INVALID_PROVIDER_RESPONSE,
          httpStatus: response.status,
        });
        throw new WhatsAppError(
          WHATSAPP_ERROR_CODES.INVALID_PROVIDER_RESPONSE,
          "Resposta da Evolution excedeu o limite.",
          false,
          response.status,
        );
      }
      chunks.push(value);
    }
  } catch (error) {
    if (error instanceof WhatsAppError) throw error;
    throw normalizeTransportError(error, endpoint, response.status);
  }
  const text = new TextDecoder().decode(
    chunks.length === 1
      ? chunks[0]
      : Uint8Array.from(chunks.flatMap((chunk) => Array.from(chunk))),
  );
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    logProviderFailure({
      endpoint,
      failureType: "invalid_json",
      errorCode: WHATSAPP_ERROR_CODES.INVALID_PROVIDER_RESPONSE,
      httpStatus: response.status,
    });
    throw new WhatsAppError(
      WHATSAPP_ERROR_CODES.INVALID_PROVIDER_RESPONSE,
      "Resposta inválida da Evolution.",
      false,
      response.status,
    );
  }
}

function providerError(status: number, endpoint: ProviderEndpoint) {
  let error: WhatsAppError;
  if (status === 401 || status === 403) {
    error = new WhatsAppError(
      WHATSAPP_ERROR_CODES.PROVIDER_UNAUTHORIZED,
      "Evolution rejeitou a credencial.",
      false,
      status,
    );
  } else if (status === 400) {
    error = new WhatsAppError(
      WHATSAPP_ERROR_CODES.PROVIDER_BAD_REQUEST,
      "Evolution rejeitou os dados da requisição.",
      false,
      status,
    );
  } else if (status === 404) {
    error = new WhatsAppError(
      WHATSAPP_ERROR_CODES.INSTANCE_NOT_FOUND,
      "Instância da Evolution não encontrada.",
      false,
      status,
    );
  } else if (status === 409) {
    error = new WhatsAppError(
      WHATSAPP_ERROR_CODES.PROVIDER_CONFLICT,
      "Instância da Evolution já existe.",
      false,
      status,
    );
  } else if (status === 429) {
    error = new WhatsAppError(
      WHATSAPP_ERROR_CODES.RATE_LIMITED,
      "Evolution limitou temporariamente as requisições.",
      true,
      status,
    );
  } else if (status >= 500) {
    error = new WhatsAppError(
      WHATSAPP_ERROR_CODES.PROVIDER_UNAVAILABLE,
      "Evolution indisponível.",
      true,
      status,
    );
  } else {
    error = new WhatsAppError(
      WHATSAPP_ERROR_CODES.PROVIDER_BAD_REQUEST,
      "Evolution rejeitou a requisição.",
      false,
      status,
    );
  }
  logProviderFailure({
    endpoint,
    failureType: "http",
    errorCode: error.code,
    httpStatus: status,
  });
  return error;
}

function parseProviderResponse<T>(
  schema: z.ZodType<T>,
  value: unknown,
  endpoint: ProviderEndpoint,
  httpStatus: number,
): T {
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    logProviderFailure({
      endpoint,
      failureType: "invalid_contract",
      errorCode: WHATSAPP_ERROR_CODES.INVALID_PROVIDER_RESPONSE,
      httpStatus,
    });
    throw new WhatsAppError(
      WHATSAPP_ERROR_CODES.INVALID_PROVIDER_RESPONSE,
      "Resposta incompatível da Evolution.",
      false,
      httpStatus,
    );
  }
  return parsed.data;
}

function transportRecipientPhone(value: string) {
  const phone = toBrazilianE164Phone(value);
  if (!phone) {
    throw new WhatsAppError(
      WHATSAPP_ERROR_CODES.INVALID_PHONE,
      "Telefone brasileiro inválido.",
      false,
      400,
    );
  }
  return phone;
}

function safeInteractiveText(value: string, maxLength: number) {
  return value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

export class EvolutionWhatsAppProvider implements WhatsAppProvider {
  private readonly baseUrl: URL;
  private readonly apiKey: string;

  constructor(config: WhatsAppConfig) {
    if (!config.enabled || !config.evolutionApiUrl || !config.evolutionApiKey) {
      throw new WhatsAppError(
        WHATSAPP_ERROR_CODES.PROVIDER_UNAVAILABLE,
        "Gateway WhatsApp não configurado.",
      );
    }
    this.baseUrl = new URL(config.evolutionApiUrl);
    this.apiKey = config.evolutionApiKey;
  }

  private async request(
    endpoint: ProviderEndpoint,
    path: string,
    init?: RequestInit,
  ) {
    let response: Response;
    try {
      response = await fetch(new URL(path, this.baseUrl), {
        ...init,
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        headers: {
          apikey: this.apiKey,
          accept: "application/json",
          ...(init?.body ? { "content-type": "application/json" } : {}),
          ...init?.headers,
        },
        cache: "no-store",
      });
    } catch (error) {
      throw normalizeTransportError(error, endpoint);
    }
    if (!response.ok) {
      if (endpoint === "instance.webhook" && response.status === 400) {
        let body: unknown = null;
        try {
          body = await readLimitedJson(response, endpoint);
        } catch {
          // O diagnóstico permanece restrito aos metadados seguros disponíveis.
        }
        logWebhookBadRequest(body, init?.body);
      } else if (endpoint.startsWith("message.send-") && response.status === 400) {
        let body: unknown = null;
        try {
          body = await readLimitedJson(response, endpoint);
        } catch {
          // O diagnóstico permanece restrito aos metadados seguros disponíveis.
        }
        logSendMessageBadRequest(endpoint, body, init?.body);
      } else {
        await response.body?.cancel().catch(() => undefined);
      }
      throw providerError(response.status, endpoint);
    }
    return {
      body: await readLimitedJson(response, endpoint),
      status: response.status,
    };
  }

  async createInstance(input: CreateWhatsAppInstanceInput) {
    const result = await this.request(
      "instance.create",
      "/instance/create",
      {
        method: "POST",
        body: JSON.stringify({
          instanceName: input.instanceName,
          integration: "WHATSAPP-BAILEYS",
          qrcode: true,
          rejectCall: true,
          groupsIgnore: true,
          alwaysOnline: false,
          readMessages: false,
          readStatus: false,
          webhook: {
            enabled: true,
            url: input.webhookUrl,
            webhookByEvents: false,
            base64: true,
            events: ["QRCODE_UPDATED", "CONNECTION_UPDATE", "MESSAGES_UPSERT"],
            headers: { "x-agendai-webhook-secret": input.webhookSecret },
          },
        }),
      },
    );
    const response = parseProviderResponse(
      createResponseSchema,
      result.body,
      "instance.create",
      result.status,
    );
    return {
      externalId: response.instance.instanceId ?? null,
      instanceName: response.instance.instanceName,
      phoneNumber: null,
      status:
        response.instance.status === "open" ? "CONNECTED" : "AWAITING_QR",
    } satisfies WhatsAppInstanceInfo;
  }

  async configureWebhook(input: CreateWhatsAppInstanceInput) {
    await this.request(
      "instance.webhook",
      `/webhook/set/${encodeURIComponent(input.instanceName)}`,
      {
        method: "POST",
        body: JSON.stringify({
          webhook: {
            enabled: true,
            url: input.webhookUrl,
            webhookByEvents: false,
            webhookBase64: false,
            byEvents: false,
            base64: false,
            events: ["MESSAGES_UPSERT", "CONNECTION_UPDATE", "QRCODE_UPDATED"],
            headers: { "x-agendai-webhook-secret": input.webhookSecret },
          },
        }),
      },
    );

    const verification = await this.request(
      "instance.webhook",
      `/webhook/find/${encodeURIComponent(input.instanceName)}`,
    );
    const configuredPayload = parseProviderResponse(
      webhookFindResponseSchema,
      verification.body,
      "instance.webhook",
      verification.status,
    );
    const webhookBase64 = configuredPayload.webhook?.webhookBase64
      ?? configuredPayload.webhookBase64;
    if (webhookBase64 !== false) {
      logProviderFailure({
        endpoint: "instance.webhook",
        failureType: "invalid_contract",
        errorCode: WHATSAPP_ERROR_CODES.INVALID_PROVIDER_RESPONSE,
        httpStatus: verification.status,
      });
      throw new WhatsAppError(
        WHATSAPP_ERROR_CODES.INVALID_PROVIDER_RESPONSE,
        "Evolution não aplicou a configuração JSON do webhook.",
        false,
        verification.status,
      );
    }
  }

  async getConnectionStatus(instanceName: string) {
    return this.fetchInstanceInfo(instanceName);
  }

  async getQrCode(instanceName: string) {
    const result = await this.request(
      "instance.qr-code",
      `/instance/connect/${encodeURIComponent(instanceName)}`,
    );
    const response = parseProviderResponse(
      qrResponseSchema,
      result.body,
      "instance.qr-code",
      result.status,
    );
    return {
      base64: "base64" in response ? response.base64 : response.qrcode.base64,
      expiresInSeconds: 45,
    };
  }

  async sendText(input: {
    instanceName: string;
    recipientPhone: string;
    text: string;
  }) {
    const result = await this.request(
      "message.send-text",
      `/message/sendText/${encodeURIComponent(input.instanceName)}`,
      {
        method: "POST",
        body: JSON.stringify({
          number: transportRecipientPhone(input.recipientPhone),
          text: input.text,
          delay: 1_000,
          linkPreview: false,
        }),
      },
    );
    const response = parseProviderResponse(
      sendResponseSchema,
      result.body,
      "message.send-text",
      result.status,
    );
    return { externalMessageId: response.key.id };
  }

  async sendButtons(input: {
    instanceName: string;
    recipientPhone: string;
    text: string;
    options: Array<{ id: string; title: string }>;
  }) {
    const result = await this.request(
      "message.send-buttons",
      `/message/sendButtons/${encodeURIComponent(input.instanceName)}`,
      {
        method: "POST",
        body: JSON.stringify({
          number: transportRecipientPhone(input.recipientPhone),
          title: "Agendaí",
          description: safeInteractiveText(input.text, 1_024),
          footer: "Agendaí",
          buttons: input.options.slice(0, 3).map((option) => ({
            type: "reply",
            displayText: safeInteractiveText(option.title, 20),
            id: safeInteractiveText(option.id, 200),
          })),
          delay: 1_000,
        }),
      },
    );
    const response = parseProviderResponse(
      sendResponseSchema,
      result.body,
      "message.send-buttons",
      result.status,
    );
    return { externalMessageId: response.key.id };
  }

  async sendList(input: {
    instanceName: string;
    recipientPhone: string;
    text: string;
    options: Array<{ id: string; title: string }>;
  }) {
    const result = await this.request(
      "message.send-list",
      `/message/sendList/${encodeURIComponent(input.instanceName)}`,
      {
        method: "POST",
        body: JSON.stringify({
          number: transportRecipientPhone(input.recipientPhone),
          title: "Agendaí",
          description: safeInteractiveText(input.text, 1_024),
          footerText: "Agendaí",
          buttonText: "Ver opções",
          sections: [{
            title: "Opções",
            rows: input.options.map((option) => ({
              title: safeInteractiveText(option.title, 24),
              rowId: safeInteractiveText(option.id, 200),
            })),
          }],
          delay: 1_000,
        }),
      },
    );
    const response = parseProviderResponse(
      sendResponseSchema,
      result.body,
      "message.send-list",
      result.status,
    );
    return { externalMessageId: response.key.id };
  }

  async disconnect(instanceName: string) {
    await this.request(
      "instance.disconnect",
      `/instance/logout/${encodeURIComponent(instanceName)}`,
      { method: "DELETE" },
    );
  }

  async deleteInstance(instanceName: string) {
    await this.request(
      "instance.delete",
      `/instance/delete/${encodeURIComponent(instanceName)}`,
      { method: "DELETE" },
    );
  }

  async fetchInstanceInfo(instanceName: string) {
    const result = await this.request(
      "instance.connection-status",
      `/instance/connectionState/${encodeURIComponent(instanceName)}`,
    );
    const response = parseProviderResponse(
      connectionResponseSchema,
      result.body,
      "instance.connection-status",
      result.status,
    );
    const instance = response.instance;
    const owner = instance?.ownerJid?.split("@")[0] ?? null;
    return {
      externalId: instance?.instanceId ?? null,
      instanceName: instance?.instanceName ?? instanceName,
      phoneNumber: owner,
      status: mapConnectionState(instance?.state ?? instance?.status ?? response.state),
    } satisfies WhatsAppInstanceInfo;
  }
}
