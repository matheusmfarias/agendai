import { describe, expect, it } from "vitest";

import {
  getWeekdayLabel,
  WEEKDAY_LABELS,
} from "@/features/availability/availability-constants";

describe("availability constants", () => {
  it("mapeia os dias conforme o padrão weekday", () => {
    expect(WEEKDAY_LABELS).toHaveLength(7);
    expect(getWeekdayLabel(0)).toBe("Domingo");
    expect(getWeekdayLabel(1)).toBe("Segunda-feira");
    expect(getWeekdayLabel(6)).toBe("Sábado");
  });

  it("não deixa a coluna vazia para valor inválido", () => {
    expect(getWeekdayLabel(7)).toBe("Dia inválido");
  });
});
