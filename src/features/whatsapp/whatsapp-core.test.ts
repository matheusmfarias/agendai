import { afterEach, describe, expect, it } from "vitest";

import { getWhatsAppConfig, WhatsAppConfigurationError } from "@/features/whatsapp/whatsapp-config";
import { normalizeBrazilianWhatsAppPhone } from "@/features/whatsapp/whatsapp-phone";
import {
  renderAppointmentConfirmedMessage,
  renderAppointmentCanceledMessage,
  renderAppointmentCompletedMessage,
  renderAppointmentReminderMessage,
  renderAppointmentRequestedMessage,
} from "@/features/whatsapp/whatsapp-template";
import { whatsappPreferenceSchema } from "@/features/whatsapp/whatsapp-schemas";

describe("WhatsApp core", () => {
  afterEach(() => { delete process.env.WHATSAPP_GATEWAY_ENABLED; });

  it.each([
    ["(11) 98765-4321", "5511987654321"],
    ["+55 21 2345-6789", "552123456789"],
    ["31987654321", "5531987654321"],
    ["5591884991", "555591884991"],
    ["55991884991", "5555991884991"],
  ])("normaliza telefone brasileiro sem inventar dígitos", (input, expected) => {
    expect(normalizeBrazilianWhatsAppPhone(input)).toBe(expected);
  });

  it.each(["", "119876543", "5511000000000", "1101234567", "1111111111"])(
    "rejeita telefone inválido ou ambíguo: %s",
    (input) => expect(normalizeBrazilianWhatsAppPhone(input)).toBeNull(),
  );

  it("ignora template legado e mantém a confirmação padronizada", () => {
    const text = renderAppointmentConfirmedMessage({
      businessName: "Agendaí Studio", customerName: "Ana", serviceName: "Corte",
      bookingDate: "14/07/2026", bookingTime: "09:30", appointmentId: crypto.randomUUID(),
      messageTemplate: "Olá, {cliente}: {serviço} em {data} às {hora}.",
    });
    expect(text).toContain("Ana");
    expect(text).toContain("Corte");
    expect(text).toContain("Seu agendamento foi confirmado");
    expect(text).not.toContain("OlÃ¡, Ana: Corte");
    expect(text).not.toContain("appointmentId");
    expect(text.length).toBeLessThanOrEqual(1_200);
  });

  it("mantém compatibilidade com confirmações já persistidas sem template", () => {
    expect(
      renderAppointmentConfirmedMessage({
        businessName: "Agendaí Studio",
        customerName: "Ana",
        serviceName: "Corte",
        bookingDate: "14/07/2026",
        bookingTime: "09:30",
        appointmentId: crypto.randomUUID(),
      }),
    ).toContain("Seu agendamento foi confirmado");
  });

  it.each([
    [
      renderAppointmentReminderMessage,
      "Olá, Ana! Passando para lembrar do seu agendamento de Corte em 14/07/2026 às 09:30.",
    ],
    [
      renderAppointmentCanceledMessage,
      "Olá, Ana. Seu agendamento de Corte em 14/07/2026 às 09:30 foi cancelado.",
    ],
  ])("ignora configuração antiga e usa o texto fixo", (render, expected) => {
    expect(
      render({
        businessName: "Agendaí Studio",
        customerName: "Ana",
        serviceName: "Corte",
        bookingDate: "14/07/2026",
        bookingTime: "09:30",
        appointmentId: crypto.randomUUID(),
        messageTemplate: "Texto personalizado que não deve ser usado.",
      }),
    ).toBe(expected);
  });

  it("renderiza a solicitação pendente sem expor o identificador", () => {
    const text = renderAppointmentRequestedMessage({
      businessName: "Agendaí Studio",
      customerName: "Ana",
      serviceName: "Corte",
      professionalName: "Bia",
      bookingDate: "14/07/2026",
      bookingTime: "09:30",
      appointmentId: crypto.randomUUID(),
    });
    expect(text).toContain("Recebemos sua solicitação de agendamento");
    expect(text).toContain("Profissional: Bia");
    expect(text).toContain("ainda precisa confirmar esse horário");
    expect(text).not.toContain("appointmentId");
    expect(text.length).toBeLessThanOrEqual(1_200);
  });

  it("renderiza a conclusão manual sem expor o identificador", () => {
    const text = renderAppointmentCompletedMessage({
      businessName: "Agendaí Studio",
      customerName: "Ana",
      serviceName: "Corte",
      professionalName: "Bia",
      bookingDate: "14/07/2026",
      bookingTime: "09:30",
      appointmentId: crypto.randomUUID(),
    });
    expect(text).toContain("Seu atendimento foi concluído");
    expect(text).toContain("Profissional: Bia");
    expect(text).not.toContain("appointmentId");
  });

  it("aceita a preferência APPOINTMENT_REQUESTED na API", () => {
    expect(
      whatsappPreferenceSchema.parse({ sendAppointmentRequested: false }),
    ).toEqual({ sendAppointmentRequested: false });
  });

  it("aceita a preferência APPOINTMENT_COMPLETED na API", () => {
    expect(
      whatsappPreferenceSchema.parse({ sendAppointmentCompleted: false }),
    ).toEqual({ sendAppointmentCompleted: false });
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
