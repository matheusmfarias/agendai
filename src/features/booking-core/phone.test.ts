import { describe, expect, it } from "vitest";

import {
  normalizeBrazilianCustomerPhone,
  toBrazilianE164Phone,
} from "@/features/booking-core/phone";

describe("Brazilian phone normalization", () => {
  it.each([
    "+55 (11) 99999-9999",
    "55 11 99999 9999",
    "(11) 99999-9999",
    "11999999999",
  ])("normalizes %s to the same customer key", (value) => {
    expect(normalizeBrazilianCustomerPhone(value)).toBe("11999999999");
  });

  it("keeps the country code only in the E.164 transport form", () => {
    expect(toBrazilianE164Phone("(11) 99999-9999")).toBe("5511999999999");
  });

  it.each([
    ["555591884991", "5591884991"],
    ["5555991884991", "55991884991"],
    ["5591884991", "5591884991"],
    ["55991884991", "55991884991"],
  ])("keeps %s in the canonical national form", (input, expected) => {
    expect(normalizeBrazilianCustomerPhone(input)).toBe(expected);
  });

  it.each(["0012345678", "1012345678", "551012345678"])(
    "rejects an invalid DDD: %s",
    (input) => expect(normalizeBrazilianCustomerPhone(input)).toBeNull(),
  );

  it("rejects incomplete numbers instead of truncating them", () => {
    expect(normalizeBrazilianCustomerPhone("99999-9999")).toBeNull();
  });
});
