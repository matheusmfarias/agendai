import type { WhatsAppConnectionState } from "@/features/whatsapp/whatsapp-types";

export type CreateWhatsAppInstanceInput = {
  instanceName: string;
  webhookUrl: string;
  webhookSecret: string;
};

export type WhatsAppInstanceInfo = {
  externalId: string | null;
  instanceName: string;
  phoneNumber: string | null;
  status: WhatsAppConnectionState;
};

export type WhatsAppInteractiveOption = {
  id: string;
  title: string;
};

export interface WhatsAppProvider {
  createInstance(input: CreateWhatsAppInstanceInput): Promise<WhatsAppInstanceInfo>;
  configureWebhook(input: CreateWhatsAppInstanceInput): Promise<void>;
  getConnectionStatus(instanceName: string): Promise<WhatsAppInstanceInfo>;
  getQrCode(instanceName: string): Promise<{ base64: string; expiresInSeconds: number }>;
  sendText(input: {
    instanceName: string;
    recipientPhone: string;
    text: string;
  }): Promise<{ externalMessageId: string }>;
  sendButtons(input: {
    instanceName: string;
    recipientPhone: string;
    text: string;
    options: WhatsAppInteractiveOption[];
  }): Promise<{ externalMessageId: string }>;
  sendList(input: {
    instanceName: string;
    recipientPhone: string;
    text: string;
    options: WhatsAppInteractiveOption[];
  }): Promise<{ externalMessageId: string }>;
  disconnect(instanceName: string): Promise<void>;
  deleteInstance(instanceName: string): Promise<void>;
  fetchInstanceInfo(instanceName: string): Promise<WhatsAppInstanceInfo>;
}
