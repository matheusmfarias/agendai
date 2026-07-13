import type { WhatsAppProvider } from "@/features/whatsapp/contracts/whatsapp-provider";
import { EvolutionWhatsAppProvider } from "@/features/whatsapp/providers/evolution-whatsapp-provider";
import { getWhatsAppConfig } from "@/features/whatsapp/whatsapp-config";

export function createWhatsAppProvider(): WhatsAppProvider {
  return new EvolutionWhatsAppProvider(getWhatsAppConfig());
}
