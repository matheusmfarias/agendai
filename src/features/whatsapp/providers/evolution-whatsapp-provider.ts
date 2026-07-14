import { z } from "zod";

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
  | "instance.connection-status"
  | "instance.qr-code"
  | "message.send-text"
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
      await response.body?.cancel().catch(() => undefined);
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
            events: ["QRCODE_UPDATED", "CONNECTION_UPDATE"],
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
          number: input.recipientPhone,
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
