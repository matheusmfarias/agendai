import { describe, expect, it } from "vitest";

import { PROVIDER_SETTINGS_TABS } from "@/components/forms/provider-settings-form";
import { providerSettingsSchema } from "@/features/provider/provider-schemas";

const validSettings = {
  name: "Studio Agendaí",
  publicLinkActive: true,
  publicDisplayName: "Studio Agendaí",
  logoUrl: "",
  responsibleName: "Ana Silva",
  email: "ana@example.com",
  whatsapp: "11987654321",
  segment: "Beleza",
  city: "São Paulo",
  state: "SP",
  postalCode: "",
  neighborhood: "",
  address: "",
  addressComplement: "",
  googleMapsUrl: "",
  serviceLocation: "BUSINESS_ADDRESS",
  timezone: "America/Sao_Paulo",
  locale: "pt-BR",
  currency: "BRL",
  weekStartsOn: 1,
  timeFormat: "24H",
  defaultAppointmentDuration: 60,
  defaultSlotInterval: 30,
  minBookingNoticeMinutes: 60,
  maxBookingAdvanceDays: 30,
  allowCustomerCancellation: true,
  allowCustomerRescheduling: true,
  cancellationNoticeHours: 24,
  description: "",
};

describe("provider settings MVP", () => {
  it("does not expose the Communication tab", () => {
    expect(PROVIDER_SETTINGS_TABS.map((tab) => tab.id)).not.toContain(
      "communication",
    );
    expect(PROVIDER_SETTINGS_TABS.map((tab) => tab.label)).not.toContain(
      "Comunicação",
    );
  });

  it("strips legacy communication fields from a manual submission", () => {
    const parsed = providerSettingsSchema.parse({
      ...validSettings,
      confirmationMessageTemplate: "Mensagem personalizada.",
      reminderMessageTemplate: "Mensagem personalizada.",
      cancellationMessageTemplate: "Mensagem personalizada.",
      enableAutomaticReminders: true,
      reminderLeadHours: 1,
    });

    expect(parsed).not.toHaveProperty("confirmationMessageTemplate");
    expect(parsed).not.toHaveProperty("reminderMessageTemplate");
    expect(parsed).not.toHaveProperty("cancellationMessageTemplate");
    expect(parsed).not.toHaveProperty("enableAutomaticReminders");
    expect(parsed).not.toHaveProperty("reminderLeadHours");
  });
});
