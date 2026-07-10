import { describe, expect, it } from "vitest";

import {
  getSegmentTemplate,
  listSegmentTemplates,
} from "@/features/segment-templates/segment-template-service";
import { getTemplateByKey } from "@/features/segment-templates/segment-template-definitions";

// ---------------------------------------------------------------------------
// Template availability
// ---------------------------------------------------------------------------

describe("listSegmentTemplates", () => {
  it("returns all 6 templates", () => {
    const templates = listSegmentTemplates();
    expect(templates).toHaveLength(6);
  });
});

describe("getSegmentTemplate", () => {
  it("returns mechanic template", () => {
    const t = getSegmentTemplate("mechanic");
    expect(t).toBeDefined();
    expect(t!.key).toBe("mechanic");
    expect(t!.name).toBe("Mecânica");
  });

  it("returns barbershop template", () => {
    const t = getSegmentTemplate("barbershop");
    expect(t).toBeDefined();
    expect(t!.key).toBe("barbershop");
    expect(t!.name).toBe("Barbearia");
  });

  it("returns manicure template", () => {
    const t = getSegmentTemplate("manicure");
    expect(t).toBeDefined();
    expect(t!.key).toBe("manicure");
    expect(t!.name).toBe("Manicure");
  });

  it("returns beauty template", () => {
    const t = getSegmentTemplate("beauty");
    expect(t).toBeDefined();
    expect(t!.key).toBe("beauty");
    expect(t!.name).toBe("Estética");
  });

  it("returns technical_assistance template", () => {
    const t = getSegmentTemplate("technical_assistance");
    expect(t).toBeDefined();
    expect(t!.key).toBe("technical_assistance");
    expect(t!.name).toBe("Assistência técnica");
  });

  it("returns clinic_simple template", () => {
    const t = getSegmentTemplate("clinic_simple");
    expect(t).toBeDefined();
    expect(t!.key).toBe("clinic_simple");
    expect(t!.name).toBe("Clínica/consultório simples");
  });

  it("returns undefined for invalid key", () => {
    const t = getTemplateByKey("nonexistent");
    expect(t).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Template structure
// ---------------------------------------------------------------------------

describe("template structure", () => {
  it("mechanic has 3 categories", () => {
    const t = getSegmentTemplate("mechanic")!;
    expect(t.categories).toHaveLength(3);
  });

  it("mechanic categories have expected names", () => {
    const t = getSegmentTemplate("mechanic")!;
    const names = t.categories.map((c) => c.name);
    expect(names).toContain("Diagnóstico");
    expect(names).toContain("Manutenção");
    expect(names).toContain("Serviços rápidos");
  });

  it("barbershop has 3 categories", () => {
    const t = getSegmentTemplate("barbershop")!;
    expect(t.categories).toHaveLength(3);
  });

  it("manicure has 4 categories", () => {
    const t = getSegmentTemplate("manicure")!;
    expect(t.categories).toHaveLength(4);
  });

  it("beauty has 4 categories", () => {
    const t = getSegmentTemplate("beauty")!;
    expect(t.categories).toHaveLength(4);
  });

  it("technical_assistance has 3 categories", () => {
    const t = getSegmentTemplate("technical_assistance")!;
    expect(t.categories).toHaveLength(3);
  });

  it("clinic_simple has 3 categories", () => {
    const t = getSegmentTemplate("clinic_simple")!;
    expect(t.categories).toHaveLength(3);
  });

  it("all templates have at least one service per category", () => {
    const templates = listSegmentTemplates();
    for (const t of templates) {
      for (const cat of t.categories) {
        expect(cat.services.length).toBeGreaterThan(0);
      }
    }
  });

  it("all templates have availability rules", () => {
    const templates = listSegmentTemplates();
    for (const t of templates) {
      expect(t.availability).toBeDefined();
      expect(t.availability!.length).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// Template service values (prices, durations, booking modes)
// ---------------------------------------------------------------------------

describe("mechanic template services", () => {
  const t = getSegmentTemplate("mechanic")!;

  it("diagnóstico veicular requires confirmation", () => {
    const svc = t.categories
      .flatMap((c) => c.services)
      .find((s) => s.name === "Diagnóstico veicular")!;
    expect(svc.bookingMode).toBe("REQUIRES_CONFIRMATION");
    expect(svc.priceType).toBe("STARTING_AT");
  });

  it("troca de óleo is direct booking", () => {
    const svc = t.categories
      .flatMap((c) => c.services)
      .find((s) => s.name === "Troca de óleo")!;
    expect(svc.bookingMode).toBe("DIRECT");
    expect(svc.priceType).toBe("STARTING_AT");
  });

  it("alinhamento e balanceamento has fixed price", () => {
    const svc = t.categories
      .flatMap((c) => c.services)
      .find((s) => s.name === "Alinhamento e balanceamento")!;
    expect(svc.priceType).toBe("FIXED");
  });

  it("veículo diagnosis has custom fields", () => {
    const svc = t.categories
      .flatMap((c) => c.services)
      .find((s) => s.name === "Diagnóstico veicular")!;
    const keys = svc.customFields!.map((cf) => cf.key);
    expect(keys).toContain("placa_veiculo");
    expect(keys).toContain("modelo_veiculo");
    expect(keys).toContain("ano_veiculo");
  });
});

describe("barbershop template services", () => {
  const t = getSegmentTemplate("barbershop")!;

  it("all main services are DIRECT booking", () => {
    const services = t.categories.flatMap((c) => c.services);
    for (const svc of services) {
      expect(svc.bookingMode).toBe("DIRECT");
    }
  });

  it("all services are FIXED price", () => {
    const services = t.categories.flatMap((c) => c.services);
    for (const svc of services) {
      expect(svc.priceType).toBe("FIXED");
    }
  });

  it("corte + barba combo is in Combos category", () => {
    const combos = t.categories.find((c) => c.name === "Combos")!;
    expect(combos.services.some((s) => s.name === "Corte + barba")).toBe(true);
  });
});

describe("beauty template services", () => {
  const t = getSegmentTemplate("beauty")!;

  it("avaliação estética has HIDDEN price type", () => {
    const svc = t.categories
      .flatMap((c) => c.services)
      .find((s) => s.name === "Avaliação estética")!;
    expect(svc.priceType).toBe("HIDDEN");
  });

  it("services that are sensitive require confirmation", () => {
    const svc = t.categories
      .flatMap((c) => c.services)
      .find((s) => s.name === "Procedimento corporal")!;
    expect(svc.bookingMode).toBe("REQUIRES_CONFIRMATION");
  });
});

describe("clinic_simple template services", () => {
  const t = getSegmentTemplate("clinic_simple")!;

  it("primeira consulta requires confirmation", () => {
    const svc = t.categories
      .flatMap((c) => c.services)
      .find((s) => s.name === "Primeira consulta")!;
    expect(svc.bookingMode).toBe("REQUIRES_CONFIRMATION");
  });

  it("teleatendimento has contact preference custom field", () => {
    const svc = t.categories
      .flatMap((c) => c.services)
      .find((s) => s.name === "Teleatendimento")!;
    const cf = svc.customFields!.find((f) => f.key === "preferencia_contato")!;
    expect(cf).toBeDefined();
    expect(cf.fieldType).toBe("SELECT");
  });
});

// ---------------------------------------------------------------------------
// Availability rules
// ---------------------------------------------------------------------------

describe("default availability", () => {
  const t = getSegmentTemplate("mechanic")!;

  it("has 11 availability rules (Mon–Fri 2 slots each + Sat 1)", () => {
    expect(t.availability).toHaveLength(11);
  });

  it("weekdays range from 1 (Monday) to 6 (Saturday)", () => {
    const weekdays = t.availability!.map((r) => r.weekday);
    for (const wd of weekdays) {
      expect(wd).toBeGreaterThanOrEqual(1);
      expect(wd).toBeLessThanOrEqual(6);
    }
  });

  it("no Sunday availability", () => {
    const sunday = t.availability!.filter((r) => r.weekday === 0);
    expect(sunday).toHaveLength(0);
  });

  it("all slots have 30 minute intervals", () => {
    for (const r of t.availability!) {
      expect(r.slotIntervalMinutes).toBe(30);
    }
  });

  it("morning slots start at 08:00", () => {
    const morningSlots = t.availability!.filter((r) => r.startTime === "08:00");
    expect(morningSlots.length).toBeGreaterThan(0);
  });

  it("afternoon slots start at 13:30", () => {
    const afternoonSlots = t.availability!.filter(
      (r) => r.startTime === "13:30",
    );
    expect(afternoonSlots.length).toBeGreaterThan(0);
  });
});
