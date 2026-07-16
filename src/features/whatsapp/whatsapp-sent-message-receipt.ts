type ReceiptClient = {
  whatsAppSentMessageReceipt: {
    createMany(args: {
      data: {
        tenantId: string;
        connectionId: string;
        externalMessageId: string;
        source: string;
      };
      skipDuplicates: true;
    }): Promise<{ count: number }>;
  };
};

export function recordWhatsAppSentMessage(
  client: ReceiptClient,
  input: {
    tenantId: string;
    connectionId: string;
    externalMessageId: string;
    source: "TRANSACTIONAL" | "CONVERSATIONAL" | "FALLBACK" | "TEST";
  },
) {
  return client.whatsAppSentMessageReceipt.createMany({
    data: input,
    skipDuplicates: true,
  });
}
