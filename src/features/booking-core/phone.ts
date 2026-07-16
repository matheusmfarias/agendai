const BRAZIL_COUNTRY_CODE = "55";

export function phoneDigits(value: string | null | undefined) {
  return String(value ?? "").replace(/\D/g, "");
}

/**
 * Canonical comparison/storage form for Brazilian customer phones.
 * It keeps DDD + subscriber number and removes a leading country code only
 * when the remaining national number has 10 or 11 digits.
 */
export function normalizeBrazilianCustomerPhone(
  value: string | null | undefined,
) {
  const digits = phoneDigits(value);
  const national =
    digits.startsWith(BRAZIL_COUNTRY_CODE) &&
    (digits.length === 12 || digits.length === 13)
      ? digits.slice(BRAZIL_COUNTRY_CODE.length)
      : digits;

  if (national.length !== 10 && national.length !== 11) return null;
  const ddd = Number(national.slice(0, 2));
  if (ddd < 11 || ddd > 99 || national[0] === "0" || national[1] === "0") {
    return null;
  }
  return national;
}

export function normalizeBrazilianPhoneForComparison(
  value: string | null | undefined,
) {
  return normalizeBrazilianCustomerPhone(value);
}

export function toBrazilianE164Phone(value: string | null | undefined) {
  const national = normalizeBrazilianCustomerPhone(value);
  return national ? `${BRAZIL_COUNTRY_CODE}${national}` : null;
}
