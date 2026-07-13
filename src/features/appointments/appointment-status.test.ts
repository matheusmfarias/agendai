import { describe, expect, it } from "vitest";

import {
  APPOINTMENT_STATUS_PRESENTATION,
  deriveTemporalAppointmentStatus,
} from "@/features/appointments/appointment-status";
import { APPOINTMENT_STATUS_TRANSITIONS } from "@/features/appointments/appointment-rules";

describe("appointment status presentation", () => {
  it("centralizes the existing customer temporal fallback", () => {
    expect(
      deriveTemporalAppointmentStatus({
        status: "CONFIRMED",
        endsAt: "2026-01-01T10:00:00Z",
        now: new Date("2026-01-02T10:00:00Z"),
      }),
    ).toBe("FINISHED");
  });

  it("does not turn canceled or no-show appointments into finished", () => {
    expect(
      deriveTemporalAppointmentStatus({
        status: "NO_SHOW",
        endsAt: "2026-01-01T10:00:00Z",
        now: new Date("2026-01-02T10:00:00Z"),
      }),
    ).toBe("NO_SHOW");
  });

  it("derives presentation transitions and agenda tones from the canonical policy", () => {
    expect(APPOINTMENT_STATUS_PRESENTATION.CONFIRMED.allowedTransitions).toBe(
      APPOINTMENT_STATUS_TRANSITIONS.CONFIRMED,
    );
    expect(APPOINTMENT_STATUS_PRESENTATION.REQUESTED.cardTone).toContain(
      "amber",
    );
    expect(APPOINTMENT_STATUS_PRESENTATION.CONFIRMED.cardTone).toContain(
      "emerald",
    );
    expect(APPOINTMENT_STATUS_PRESENTATION.IN_PROGRESS.cardTone).toContain(
      "blue",
    );
    expect(
      APPOINTMENT_STATUS_PRESENTATION.CANCELED_BY_PROVIDER.cardTone,
    ).toContain("red");
  });
});
