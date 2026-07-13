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

async function readLimitedJson(response: Response) {
  const contentLength = Number(response.headers.get("content-length") ?? 0);
  if (contentLength > MAX_RESPONSE_BYTES) {
    throw new WhatsAppError(
      WHATSAPP_ERROR_CODES.INVALID_PROVIDER_RESPONSE,
      "Resposta da Evolution excedeu o limite.",
    );
  }
  if (!response.body) return null;
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_RESPONSE_BYTES) {
      await reader.cancel();
      throw new WhatsAppError(
        WHATSAPP_ERROR_CODES.INVALID_PROVIDER_RESPONSE,
        "Resposta da Evolution excedeu o limite.",
      );
    }
    chunks.push(value);
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
    throw new WhatsAppError(
      WHATSAPP_ERROR_CODES.INVALID_PROVIDER_RESPONSE,
      "Resposta inválida da Evolution.",
    );
  }
}

function providerError(status: number) {
  if (status === 401 || status === 403) {
    return new WhatsAppError(
      WHATSAPP_ERROR_CODES.PROVIDER_UNAUTHORIZED,
      "Evolution rejeitou a credencial.",
      false,
      status,
    );
  }
  if (status === 404) {
    return new WhatsAppError(
      WHATSAPP_ERROR_CODES.INSTANCE_NOT_FOUND,
      "Instância da Evolution não encontrada.",
      false,
      status,
    );
  }
  if (status === 409) {
    return new WhatsAppError(
      WHATSAPP_ERROR_CODES.PROVIDER_CONFLICT,
      "Instância da Evolution já existe.",
      false,
      status,
    );
  }
  if (status === 429) {
    return new WhatsAppError(
      WHATSAPP_ERROR_CODES.RATE_LIMITED,
      "Evolution limitou temporariamente as requisições.",
      true,
      status,
    );
  }
  return new WhatsAppError(
    WHATSAPP_ERROR_CODES.PROVIDER_UNAVAILABLE,
    "Evolution indisponível.",
    status >= 500,
    status,
  );
}

function parseProviderResponse<T>(schema: z.ZodType<T>, value: unknown): T {
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    throw new WhatsAppError(
      WHATSAPP_ERROR_CODES.INVALID_PROVIDER_RESPONSE,
      "Resposta incompatível da Evolution.",
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

  private async request(path: string, init?: RequestInit) {
    const response = await fetch(new URL(path, this.baseUrl), {
      ...init,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      headers: {
        apikey: this.apiKey,
        accept: "application/json",
        ...(init?.body ? { "content-type": "application/json" } : {}),
        ...init?.headers,
      },
      cache: "no-store",
    }).catch((error: unknown) => {
      throw new WhatsAppError(
        WHATSAPP_ERROR_CODES.PROVIDER_UNAVAILABLE,
        error instanceof Error ? error.message : "Falha de rede com a Evolution.",
        true,
      );
    });
    const body = await readLimitedJson(response);
    if (!response.ok) throw providerError(response.status);
    return body;
  }

  async createInstance(input: CreateWhatsAppInstanceInput) {
    const response = parseProviderResponse(createResponseSchema,
      await this.request("/instance/create", {
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
      }),
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
    const response = parseProviderResponse(qrResponseSchema,
      await this.request(`/instance/connect/${encodeURIComponent(instanceName)}`),
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
    const response = parseProviderResponse(sendResponseSchema,
      await this.request(
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
      ),
    );
    return { externalMessageId: response.key.id };
  }

  async disconnect(instanceName: string) {
    await this.request(`/instance/logout/${encodeURIComponent(instanceName)}`, {
      method: "DELETE",
    });
  }

  async deleteInstance(instanceName: string) {
    await this.request(`/instance/delete/${encodeURIComponent(instanceName)}`, {
      method: "DELETE",
    });
  }

  async fetchInstanceInfo(instanceName: string) {
    const response = parseProviderResponse(connectionResponseSchema,
      await this.request(
        `/instance/connectionState/${encodeURIComponent(instanceName)}`,
      ),
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
