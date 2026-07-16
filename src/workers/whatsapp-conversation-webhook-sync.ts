import type { WhatsAppProvider } from "@/features/whatsapp/contracts/whatsapp-provider";
import { getWhatsAppConfig } from "@/features/whatsapp/whatsapp-config";
import { createWhatsAppProvider } from "@/features/whatsapp/whatsapp-provider-factory";
import { prisma } from "@/lib/prisma";

export async function synchronizeWhatsAppConversationWebhooks(
  provider?: WhatsAppProvider,
) {
  const config = getWhatsAppConfig();
  if (!config.enabled || !config.publicUrl || !config.webhookSecret) return 0;
  const connections = await prisma.whatsAppConnection.findMany({
    where: { enabled: true, provider: "EVOLUTION" },
    select: { instanceName: true },
  });
  const client = provider ?? createWhatsAppProvider();
  const webhookSecret = config.webhookSecret;
  const webhookUrl = new URL(
    "/api/integrations/whatsapp/evolution/webhook",
    config.publicUrl,
  ).toString();
  const results = await Promise.allSettled(
    connections.map((connection) =>
      client.configureWebhook({
        instanceName: connection.instanceName,
        webhookUrl,
        webhookSecret,
      }),
    ),
  );
  return results.filter((result) => result.status === "fulfilled").length;
}
