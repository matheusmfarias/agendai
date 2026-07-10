import { describe, expect, it } from "vitest";

import {
  createFinancialEntrySchema,
  financialFiltersSchema,
  parseMoneyToCents,
  refundFinancialEntrySchema,
  registerFinancialPaymentSchema,
  updateFinancialSettingsSchema,
} from "@/features/provider-financial/financial-schemas";

describe("financial schemas", () => {
  it("converts Brazilian money strings to cents", () => {
    expect(parseMoneyToCents("R$ 1.234,56")).toBe(123456);
    expect(parseMoneyToCents("98,70")).toBe(9870);
  });

  it("parses a valid financial entry form payload", () => {
    const parsed = createFinancialEntrySchema.parse({
      type: "REVENUE",
      status: "PAID",
      description: "Troca de óleo",
      amount: "180,50",
      entryDate: "2026-07-08",
      paymentMethod: "PIX",
      customerId: "",
      serviceId: "",
      appointmentId: "",
    });

    expect(parsed.amount).toBe(18050);
    expect(parsed.entryDate).toBeInstanceOf(Date);
    expect(parsed.customerId).toBeUndefined();
  });

  it("rejects zero or invalid amounts", () => {
    const parsed = createFinancialEntrySchema.safeParse({
      type: "EXPENSE",
      status: "PAID",
      description: "Compra de insumos",
      amount: "0,00",
      entryDate: "2026-07-08",
    });

    expect(parsed.success).toBe(false);
  });

  it("parses custom period filters", () => {
    const parsed = financialFiltersSchema.parse({
      period: "custom",
      startDate: "2026-07-01",
      endDate: "2026-07-31",
      status: "paid",
      method: "pix",
      q: "Maria",
    });

    expect(parsed.period).toBe("custom");
    expect(parsed.startDate).toBe("2026-07-01");
    expect(parsed.status).toBe("paid");
  });

  it("parses persisted financial settings", () => {
    const parsed = updateFinancialSettingsSchema.parse({
      currency: "BRL",
      acceptedMethods: ["pix", "cash"],
      revenueCategories: "Atendimento, Produtos",
      expenseCategories: "Insumos, Marketing",
      manualControl: "on",
      payAtLocation: "on",
      requireCheckout: "false",
      allowPartialPayments: "on",
      defaultDueDays: "3",
      reminderTemplate:
        "Olá, {cliente}! Seu pagamento de {valor} referente a {serviço} está pendente.",
    });

    expect(parsed.acceptedMethods).toEqual(["pix", "cash"]);
    expect(parsed.revenueCategories).toEqual(["Atendimento", "Produtos"]);
    expect(parsed.defaultDueDays).toBe(3);
    expect(parsed.allowPartialPayments).toBe(true);
  });

  it("parses a partial payment payload", () => {
    const parsed = registerFinancialPaymentSchema.parse({
      id: crypto.randomUUID(),
      amount: "50,00",
      paidAt: "2026-07-08",
      paymentMethod: "PIX",
      notes: "Pagamento parcial",
    });

    expect(parsed.amount).toBe(5000);
    expect(parsed.paidAt).toBeInstanceOf(Date);
  });

  it("parses a refund payload", () => {
    const parsed = refundFinancialEntrySchema.parse({
      id: crypto.randomUUID(),
      amount: "25,00",
      reason: "Cliente reembolsado",
    });

    expect(parsed.amount).toBe(2500);
  });
});
