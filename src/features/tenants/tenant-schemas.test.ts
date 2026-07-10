import { describe, expect, it } from "vitest";

import { createTenantSchema } from "@/features/tenants/tenant-schemas";

const validTenant = {
  name: "Oficina Central",
  slug: "oficina-central",
  documentType: "CNPJ",
  documentNumber: "12.345.678/0001-90",
  responsibleName: "Maria",
  email: "maria@example.com",
  whatsapp: "11999999999",
  segment: "Mecânica",
  city: "São Paulo",
  state: "sp",
  publicDisplayName: "Oficina Central",
  postalCode: "01001000",
  neighborhood: "Centro",
  address: "Rua Central, 100",
  addressComplement: "",
  googleMapsUrl: "",
  serviceLocation: "BUSINESS_ADDRESS",
  timezone: "America/Sao_Paulo",
  defaultAppointmentDuration: 30,
  defaultSlotInterval: 30,
  minBookingNoticeMinutes: 120,
  maxBookingAdvanceDays: 30,
  description: "Oficina mecanica com agendamento.",
  status: "ACTIVE",
  planId: "1f4b5ef8-fba5-4dc4-b331-3a5717e544c5",
  billingCycle: "MONTHLY",
  expiresAt: "2026-08-01",
  ownerName: "Maria",
  ownerEmail: "maria.login@example.com",
  initialPassword: "senha-inicial",
  confirmInitialPassword: "senha-inicial",
};

describe("createTenantSchema", () => {
  it("normaliza a UF e aceita um cadastro válido", () => {
    const result = createTenantSchema.parse(validTenant);
    expect(result.state).toBe("SP");
    expect(result.expiresAt.toISOString()).toContain("2026-08-01");
  });

  it("rejeita slug fora do padrão", () => {
    const result = createTenantSchema.safeParse({
      ...validTenant,
      slug: "Oficina Central",
    });
    expect(result.success).toBe(false);
  });

  it("rejeita confirmação de senha diferente", () => {
    const result = createTenantSchema.safeParse({
      ...validTenant,
      confirmInitialPassword: "senha-diferente",
    });
    expect(result.success).toBe(false);
  });
});
