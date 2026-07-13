import { afterEach, describe, expect, it } from "vitest";

import { getWhatsAppConfig, WhatsAppConfigurationError } from "@/features/whatsapp/whatsapp-config";
import { normalizeBrazilianWhatsAppPhone } from "@/features/whatsapp/whatsapp-phone";
import { renderAppointmentConfirmedMessage } from "@/features/whatsapp/whatsapp-template";

describe("WhatsApp core", () => {
  afterEach(() => { delete process.env.WHATSAPP_GATEWAY_ENABLED; });

  it.each([
    ["(11) 98765-4321", "5511987654321"],
    ["+55 21 2345-6789", "552123456789"],
    ["31987654321", "5531987654321"],
  ])("normaliza telefone brasileiro sem inventar dígitos", (input, expected) => {
    expect(normalizeBrazilianWhatsAppPhone(input)).toBe(expected);
  });

  it.each(["", "119876543", "5511000000000", "1191234567", "2198765432"])(
    "rejeita telefone inválido ou ambíguo: %s",
    (input) => expect(normalizeBrazilianWhatsAppPhone(input)).toBeNull(),
  );

  it("renderiza somente o payload estruturado da confirmação", () => {
    const text = renderAppointmentConfirmedMessage({
      businessName: "Agendaí Studio", customerName: "Ana", serviceName: "Corte",
      bookingDate: "14/07/2026", bookingTime: "09:30", appointmentId: crypto.randomUUID(),
    });
    expect(text).toContain("Ana");
    expect(text).toContain("Corte");
    expect(text).not.toContain("appointmentId");
    expect(text.length).toBeLessThanOrEqual(1_200);
  });

  it("mantém a aplicação funcional com gateway desligado", () => {
    expect(getWhatsAppConfig({ ...process.env, WHATSAPP_GATEWAY_ENABLED: "false" }).enabled).toBe(false);
  });

  it("falha de forma controlada se gateway habilitado estiver incompleto", () => {
    expect(() => getWhatsAppConfig({
      ...process.env,
      WHATSAPP_GATEWAY_ENABLED: "true",
      EVOLUTION_API_URL: undefined,
      EVOLUTION_API_KEY: undefined,
      EVOLUTION_WEBHOOK_SECRET: undefined,
      AGENDAI_PUBLIC_URL: undefined,
      AGENDAI_QUEUE_REDIS_URL: undefined,
    })).toThrow(WhatsAppConfigurationError);
  });
});
