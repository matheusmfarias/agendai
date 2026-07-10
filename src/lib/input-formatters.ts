export function onlyDigits(value: string | null | undefined) {
  return String(value ?? "").replace(/\D/g, "");
}

export function normalizeBrazilianPhone(value: string | null | undefined) {
  const digits = onlyDigits(value);
  if (digits.startsWith("55") && digits.length > 11) return digits.slice(2);
  return digits.slice(0, 11);
}

export function formatBrazilianPhone(value: string | null | undefined) {
  const digits = normalizeBrazilianPhone(value);

  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }

  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export function formatCep(value: string | null | undefined) {
  const digits = onlyDigits(value).slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

export function formatCpf(value: string | null | undefined) {
  const digits = onlyDigits(value).slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  }
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

export function formatCnpj(value: string | null | undefined) {
  const digits = onlyDigits(value).slice(0, 14);
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) {
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  }
  if (digits.length <= 12) {
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  }
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
}

export function formatCpfCnpj(
  value: string | null | undefined,
  type?: "CPF" | "CNPJ",
) {
  if (type === "CPF") return formatCpf(value);
  if (type === "CNPJ") return formatCnpj(value);

  const digits = onlyDigits(value);
  return digits.length <= 11 ? formatCpf(digits) : formatCnpj(digits);
}

export function normalizeDecimalInput(value: string | null | undefined) {
  return String(value ?? "")
    .replace(/[^\d,.]/g, "")
    .replace(/(,.*),/g, "$1");
}

export function formatDecimalInput(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return "";
  const amount = typeof value === "number" ? value : Number(String(value));
  if (!Number.isFinite(amount)) return String(value).replace(".", ",");

  return amount.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function parseBrazilianDecimal(value: unknown) {
  if (typeof value === "number") return value;
  if (typeof value !== "string") return Number.NaN;

  const cleaned = value.replace(/\s/g, "").replace("R$", "");
  const normalized = cleaned.includes(",")
    ? cleaned.replace(/\./g, "").replace(",", ".")
    : /^\d{1,3}(\.\d{3})+$/.test(cleaned)
      ? cleaned.replace(/\./g, "")
      : cleaned;
  const amount = Number(normalized);

  return Number.isFinite(amount) ? amount : Number.NaN;
}

export function formatIntegerInput(value: string | null | undefined) {
  return onlyDigits(value);
}
