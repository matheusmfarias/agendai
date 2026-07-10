import { describe, expect, it } from "vitest";

import {
  createAvailabilityRuleSchema,
  createCustomFieldSchema,
  createScheduleBlockSchema,
  createServiceSchema,
} from "@/features/provider/provider-schemas";

describe("provider schemas", () => {
  it("exige valor para preços fixos", () => {
    const result = createServiceSchema.safeParse({
      categoryId: crypto.randomUUID(),
      name: "Troca de óleo",
      description: "",
      durationMinutes: "30",
      priceType: "FIXED",
      priceValue: "",
      bookingMode: "DIRECT",
      requiresManualConfirmation: "false",
      internalNotes: "",
      position: "0",
      isActive: "true",
    });

    expect(result.success).toBe(false);
  });

  it("remove valor quando o preço é sob consulta", () => {
    const result = createServiceSchema.parse({
      categoryId: crypto.randomUUID(),
      name: "Diagnóstico",
      description: "",
      durationMinutes: "45",
      priceType: "ON_REQUEST",
      priceValue: "99",
      bookingMode: "REQUIRES_CONFIRMATION",
      requiresManualConfirmation: "true",
      internalNotes: "",
      position: "1",
      isActive: "true",
    });

    expect(result.priceValue).toBeNull();
  });

  it("exige opções para SELECT", () => {
    const result = createCustomFieldSchema.safeParse({
      serviceId: crypto.randomUUID(),
      label: "Modelo",
      key: "modelo",
      fieldType: "SELECT",
      options: "",
      isRequired: "true",
      position: "0",
      isActive: "true",
    });

    expect(result.success).toBe(false);
  });

  it("valida a ordem dos horários", () => {
    const result = createAvailabilityRuleSchema.safeParse({
      weekday: "1",
      startTime: "18:00",
      endTime: "08:00",
      slotIntervalMinutes: "30",
      isActive: "true",
    });

    expect(result.success).toBe(false);
  });

  it("valida a ordem do bloqueio", () => {
    const result = createScheduleBlockSchema.safeParse({
      startsAt: "2026-07-10T12:00",
      endsAt: "2026-07-10T11:00",
      reason: "Feriado",
    });

    expect(result.success).toBe(false);
  });
});
