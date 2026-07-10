import { describe, expect, it } from "vitest";

import {
  dateAtMinutesInTimezone,
  getDateTimeValueInTimezone,
  parseLocalDateTimeInTimezone,
} from "@/features/booking-core/timezone";

describe("booking timezone helpers", () => {
  it("converts local booking time in Sao Paulo", () => {
    const date = parseLocalDateTimeInTimezone(
      "2026-07-09T09:30",
      "America/Sao_Paulo",
    );

    expect(date?.toISOString()).toBe("2026-07-09T12:30:00.000Z");
    expect(getDateTimeValueInTimezone(date!, "America/Sao_Paulo")).toBe(
      "2026-07-09T09:30",
    );
  });

  it("converts local booking time in Manaus", () => {
    const date = dateAtMinutesInTimezone(
      "2026-07-09",
      9 * 60 + 30,
      "America/Manaus",
    );

    expect(date.toISOString()).toBe("2026-07-09T13:30:00.000Z");
    expect(getDateTimeValueInTimezone(date, "America/Manaus")).toBe(
      "2026-07-09T09:30",
    );
  });
});
