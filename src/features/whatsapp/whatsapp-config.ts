import { z } from "zod";

const booleanFromEnv = z
  .enum(["true", "false"])
  .default("false")
  .transform((value) => value === "true");

const configSchema = z
  .object({
    WHATSAPP_GATEWAY_ENABLED: booleanFromEnv,
    EVOLUTION_API_URL: z.string().url().refine((value) => ["http:", "https:"].includes(new URL(value).protocol), "EVOLUTION_API_URL deve usar HTTP ou HTTPS.").optional(),
    EVOLUTION_API_KEY: z.string().min(16).optional(),
    EVOLUTION_WEBHOOK_SECRET: z.string().min(24).optional(),
    AGENDAI_PUBLIC_URL: z.string().url().refine((value) => ["http:", "https:"].includes(new URL(value).protocol), "AGENDAI_PUBLIC_URL deve usar HTTP ou HTTPS.").optional(),
    AGENDAI_QUEUE_REDIS_URL: z.string().url().refine((value) => ["redis:", "rediss:"].includes(new URL(value).protocol), "AGENDAI_QUEUE_REDIS_URL deve usar Redis.").optional(),
    WHATSAPP_WORKER_CONCURRENCY: z.coerce.number().int().min(1).max(20).default(2),
  })
  .superRefine((value, context) => {
    if (!value.WHATSAPP_GATEWAY_ENABLED) return;
    for (const key of [
      "EVOLUTION_API_URL",
      "EVOLUTION_API_KEY",
      "EVOLUTION_WEBHOOK_SECRET",
      "AGENDAI_PUBLIC_URL",
      "AGENDAI_QUEUE_REDIS_URL",
    ] as const) {
      if (!value[key]) {
        context.addIssue({
          code: "custom",
          path: [key],
          message: `${key} é obrigatória quando o gateway WhatsApp está habilitado.`,
        });
      }
    }
  });

export type WhatsAppConfig = {
  enabled: boolean;
  evolutionApiUrl: string | null;
  evolutionApiKey: string | null;
  webhookSecret: string | null;
  publicUrl: string | null;
  redisUrl: string | null;
  workerConcurrency: number;
};

export class WhatsAppConfigurationError extends Error {
  readonly code = "WHATSAPP_CONFIGURATION_INVALID";
}

export function getWhatsAppConfig(
  environment: NodeJS.ProcessEnv = process.env,
): WhatsAppConfig {
  const parsed = configSchema.safeParse(environment);
  if (!parsed.success) {
    throw new WhatsAppConfigurationError(
      parsed.error.issues.map((issue) => issue.message).join(" "),
    );
  }
  return {
    enabled: parsed.data.WHATSAPP_GATEWAY_ENABLED,
    evolutionApiUrl: parsed.data.EVOLUTION_API_URL ?? null,
    evolutionApiKey: parsed.data.EVOLUTION_API_KEY ?? null,
    webhookSecret: parsed.data.EVOLUTION_WEBHOOK_SECRET ?? null,
    publicUrl: parsed.data.AGENDAI_PUBLIC_URL ?? null,
    redisUrl: parsed.data.AGENDAI_QUEUE_REDIS_URL ?? null,
    workerConcurrency: parsed.data.WHATSAPP_WORKER_CONCURRENCY,
  };
}
