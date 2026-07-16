import { describe, expect, it } from "vitest";

import { formatPublicBookingDate } from "@/features/public-booking/public-booking-date-time";

const timezone = "America/Sao_Paulo";

describe("formatPublicBookingDate", () => {
  it("omits the year when the appointment is in the current year", () => {
    expect(
      formatPublicBookingDate(
        new Date("2026-07-17T12:00:00Z"),
        timezone,
        new Date("2026-01-10T12:00:00Z"),
      ),
    ).toBe("Sexta-feira, 17 de julho");
  });

  it("includes the year when the appointment is in another year", () => {
    expect(
      formatPublicBookingDate(
        new Date("2027-07-17T12:00:00Z"),
        timezone,
        new Date("2026-12-10T12:00:00Z"),
      ),
    ).toBe("Sábado, 17 de julho de 2027");
  });
});
