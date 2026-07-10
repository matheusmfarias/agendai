import { describe, expect, it } from "vitest";

import {
  calculateAppointmentEnd,
  canTransitionAppointmentStatus,
  intervalsOverlap,
  isWithinRecurringAvailability,
} from "@/features/appointments/appointment-rules";

describe("appointment rules", () => {
  it("calcula o fim pela duração do serviço", () => {
    const start = new Date("2026-07-06T11:00:00-03:00");
    expect(calculateAppointmentEnd(start, 60).toISOString()).toBe(
      "2026-07-06T15:00:00.000Z",
    );
  });

  it("detecta sobreposição sem bloquear horários adjacentes", () => {
    const existingStart = new Date("2026-07-06T10:00:00-03:00");
    const existingEnd = new Date("2026-07-06T11:00:00-03:00");
    expect(
      intervalsOverlap(
        new Date("2026-07-06T10:30:00-03:00"),
        new Date("2026-07-06T11:30:00-03:00"),
        existingStart,
        existingEnd,
      ),
    ).toBe(true);
    expect(
      intervalsOverlap(
        new Date("2026-07-06T11:00:00-03:00"),
        new Date("2026-07-06T12:00:00-03:00"),
        existingStart,
        existingEnd,
      ),
    ).toBe(false);
  });

  it("exige que o serviço caiba integralmente na faixa", () => {
    const rules = [{ weekday: 1, startMinutes: 480, endMinutes: 720 }];
    expect(
      isWithinRecurringAvailability(
        new Date("2026-07-06T11:00:00-03:00"),
        new Date("2026-07-06T12:00:00-03:00"),
        rules,
      ),
    ).toBe(true);
    expect(
      isWithinRecurringAvailability(
        new Date("2026-07-06T11:30:00-03:00"),
        new Date("2026-07-06T12:30:00-03:00"),
        rules,
      ),
    ).toBe(false);
  });

  it("valida as transições mínimas", () => {
    expect(canTransitionAppointmentStatus("CONFIRMED", "IN_PROGRESS")).toBe(true);
    expect(canTransitionAppointmentStatus("IN_PROGRESS", "FINISHED")).toBe(true);
    expect(canTransitionAppointmentStatus("FINISHED", "CONFIRMED")).toBe(false);
    expect(
      canTransitionAppointmentStatus("CANCELED_BY_PROVIDER", "IN_PROGRESS"),
    ).toBe(false);
  });
});
