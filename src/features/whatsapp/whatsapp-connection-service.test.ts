import { beforeEach, describe, expect, it, vi } from "vitest";

const { connection, audit, prismaMock } = vi.hoisted(() => {
  const connectionClient = { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() };
  const auditClient = { create: vi.fn() };
  return {
    connection: connectionClient,
    audit: auditClient,
    prismaMock: {
      whatsAppConnection: connectionClient,
      $transaction: vi.fn(async (callback: (tx: { whatsAppConnection: typeof connectionClient; auditLog: typeof auditClient }) => Promise<unknown>) => callback({ whatsAppConnection: connectionClient, auditLog: auditClient })),
    },
  };
});
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/features/whatsapp/whatsapp-config", () => ({
  getWhatsAppConfig: () => ({ enabled: true, publicUrl: "http://localhost:3000", webhookSecret: "s".repeat(32) }),
}));

import type {
  CreateWhatsAppInstanceInput,
  WhatsAppInstanceInfo,
  WhatsAppProvider,
} from "@/features/whatsapp/contracts/whatsapp-provider";
import { createWhatsAppConnection } from "@/features/whatsapp/whatsapp-connection-service";
import { WhatsAppError } from "@/features/whatsapp/whatsapp-errors";

function provider(): WhatsAppProvider {
  return {
    createInstance: vi.fn(
      async (input: CreateWhatsAppInstanceInput): Promise<WhatsAppInstanceInfo> => ({
        externalId: "remote",
        instanceName: input.instanceName,
        phoneNumber: null,
        status: "AWAITING_QR",
      }),
    ),
    getConnectionStatus: vi.fn(), getQrCode: vi.fn(), sendText: vi.fn(), disconnect: vi.fn(), deleteInstance: vi.fn(), fetchInstanceInfo: vi.fn(),
  };
}

describe("WhatsApp connection service", () => {
  const actor = { tenantId: crypto.randomUUID(), userId: crypto.randomUUID() };
  beforeEach(() => {
    vi.clearAllMocks();
    connection.findUnique.mockResolvedValue(null);
    connection.create.mockImplementation(async ({ data }) => ({ id: crypto.randomUUID(), phoneNumber: null, enabled: false, sendAppointmentConfirmation: false, connectedAt: null, lastHealthyAt: null, lastErrorCode: null, ...data }));
    audit.create.mockResolvedValue({});
  });
  it("cria nome estável e não usa slug ou tenantId puro", async () => {
    const firstProvider = provider();
    const result = await createWhatsAppConnection(actor, firstProvider);
    const instanceName = vi.mocked(firstProvider.createInstance).mock.calls[0]?.[0].instanceName;
    expect(result.status).toBe("CONNECTING");
    expect(instanceName).toMatch(/^agendai_[a-f0-9]{36}$/);
    expect(instanceName).not.toContain(actor.tenantId);
  });
  it("reutiliza registro local sem chamar provider", async () => {
    connection.findUnique.mockResolvedValue({ id: crypto.randomUUID(), status: "CONNECTED", phoneNumber: "5511999999999", enabled: true, sendAppointmentConfirmation: true, connectedAt: null, lastHealthyAt: null, lastErrorCode: null });
    const mockProvider = provider();
    await createWhatsAppConnection(actor, mockProvider);
    expect(mockProvider.createInstance).not.toHaveBeenCalled();
  });
  it("recupera instância remota determinística após conflito", async () => {
    const mockProvider = provider();
    vi.mocked(mockProvider.createInstance).mockRejectedValue(new WhatsAppError("WHATSAPP_PROVIDER_CONFLICT", "exists"));
    vi.mocked(mockProvider.fetchInstanceInfo).mockResolvedValue({ externalId: "remote", instanceName: "agendai_existing", phoneNumber: null, status: "DISCONNECTED" });
    await createWhatsAppConnection(actor, mockProvider);
    expect(mockProvider.fetchInstanceInfo).toHaveBeenCalledOnce();
    expect(mockProvider.deleteInstance).not.toHaveBeenCalled();
  });
});
