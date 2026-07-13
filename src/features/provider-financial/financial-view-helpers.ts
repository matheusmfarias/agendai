import type { FinancialFilterInput } from "@/features/provider-financial/financial-schemas";
import { formatCurrency } from "@/lib/formatters";
import type {
  FinancialEntry,
  FinancialEntryType,
  FinancialFilterState,
  FinancialMetric,
  FinancialMethod,
  FinancialPeriodKey,
  FinancialStatus,
  FinancialViewData,
} from "@/features/provider-financial/financial-types";

export type FinancialViewState = "ready" | "loading" | "empty" | "error";
export type FinancialTab =
  | "summary"
  | "transactions"
  | "pending"
  | "reports"
  | "settings";

export type FinancialFilters = {
  period: FinancialPeriodKey;
  startDate?: string;
  endDate?: string;
  status: "all" | FinancialStatus;
  method: "all" | FinancialMethod;
  type: "all" | FinancialEntryType;
  service: "all" | string;
  category: "all" | string;
  professional: "all" | string;
  query: string;
  pendingView: "all" | "overdue" | "pending";
  pendingSort: "priority" | "highest" | "lowest";
};

export const SHOW_DEV_STATE_SWITCHER = false;

export const TABS: Array<{ value: FinancialTab; label: string }> = [
  { value: "summary", label: "Resumo" },
  { value: "transactions", label: "Lançamentos" },
  { value: "pending", label: "Pendências" },
  { value: "reports", label: "Relatórios" },
];

export const PERIOD_LABELS: Record<FinancialPeriodKey, string> = {
  today: "Hoje",
  "7d": "7 dias",
  "30d": "30 dias",
  "this-month": "Este mês",
  "last-month": "Mês passado",
  custom: "Personalizado",
};

export const STATUS_BADGE_VARIANT: Record<
  FinancialStatus,
  "success" | "warning" | "destructive" | "secondary" | "info"
> = {
  paid: "success",
  pending: "warning",
  overdue: "destructive",
  canceled: "secondary",
  refunded: "info",
};

export const FORM_TYPE_OPTIONS = [
  ["REVENUE", "Receita"],
  ["EXPENSE", "Despesa"],
  ["REFUND", "Estorno"],
  ["ADJUSTMENT", "Ajuste manual"],
] as const;

export const FORM_STATUS_OPTIONS = [
  ["PAID", "Pago"],
  ["PENDING", "Pendente"],
  ["OVERDUE", "Vencido"],
  ["CANCELED", "Cancelado"],
  ["REFUNDED", "Reembolsado"],
] as const;

export const FORM_METHOD_OPTIONS = [
  ["PIX", "Pix"],
  ["CASH", "Dinheiro"],
  ["CREDIT_CARD", "Cartao de credito"],
  ["DEBIT_CARD", "Cartao de debito"],
  ["BANK_TRANSFER", "Transferencia"],
  ["OTHER", "Outro"],
] as const;

export const TYPE_TO_FORM_VALUE: Record<FinancialEntryType, (typeof FORM_TYPE_OPTIONS)[number][0]> = {
  revenue: "REVENUE",
  expense: "EXPENSE",
  refund: "REFUND",
  adjustment: "ADJUSTMENT",
};

export const STATUS_TO_FORM_VALUE: Record<FinancialStatus, (typeof FORM_STATUS_OPTIONS)[number][0]> = {
  paid: "PAID",
  pending: "PENDING",
  overdue: "OVERDUE",
  canceled: "CANCELED",
  refunded: "REFUNDED",
};

export const METHOD_TO_FORM_VALUE: Record<FinancialMethod, (typeof FORM_METHOD_OPTIONS)[number][0]> = {
  pix: "PIX",
  cash: "CASH",
  "credit-card": "CREDIT_CARD",
  "debit-card": "DEBIT_CARD",
  transfer: "BANK_TRANSFER",
  other: "OTHER",
};

export const DEFAULT_FILTERS: FinancialFilters = {
  period: "this-month",
  startDate: undefined,
  endDate: undefined,
  status: "all",
  method: "all",
  type: "all",
  service: "all",
  category: "all",
  professional: "all",
  query: "",
  pendingView: "all",
  pendingSort: "priority",
};

export function filtersFromServer(
  filters: FinancialFilterInput,
): FinancialFilters {
  return {
    ...DEFAULT_FILTERS,
    period: filters.period,
    startDate: filters.startDate,
    endDate: filters.endDate,
    query: filters.q ?? "",
    status: filters.status ?? "all",
    method: filters.method ?? "all",
    type: filters.type ?? "all",
    service: filters.service ?? "all",
    category: filters.category ?? "all",
  };
}

export function filtersToSearchParams(filters: FinancialFilters) {
  const params = new URLSearchParams();
  params.set("period", filters.period);

  const values: FinancialFilterState = {
    period: filters.period,
    startDate: filters.period === "custom" ? filters.startDate : undefined,
    endDate: filters.period === "custom" ? filters.endDate : undefined,
    q: filters.query || undefined,
    status: filters.status === "all" ? undefined : filters.status,
    method: filters.method === "all" ? undefined : filters.method,
    type: filters.type === "all" ? undefined : filters.type,
    service: filters.service === "all" ? undefined : filters.service,
    category: filters.category === "all" ? undefined : filters.category,
  };

  Object.entries(values).forEach(([key, value]) => {
    if (key !== "period" && value) params.set(key, value);
  });

  return params.toString();
}

export function uniqueValues(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(values.map((value) => value?.trim()).filter(Boolean) as string[]),
  ).sort((first, second) => first.localeCompare(second, "pt-BR"));
}

export function metricById(data: FinancialViewData, id: string) {
  return data.metrics.find((metric) => metric.id === id);
}

export function formatMetricValue(
  value: FinancialMetric["value"],
  valueKind: FinancialMetric["valueKind"],
) {
  if (valueKind === "currency") return formatCurrency(value);
  if (valueKind === "percent") return `${value.toFixed(1).replace(".", ",")}%`;
  return new Intl.NumberFormat("pt-BR").format(value);
}

export function signedAmount(entry: FinancialEntry) {
  const sign = entry.type === "expense" || entry.type === "refund" ? "-" : "+";
  return `${sign} ${formatCurrency(entry.amount)}`;
}

export function moneyInputValue(value?: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "";
  return value.toFixed(2).replace(".", ",");
}

export function dateInputValue(value?: string) {
  if (!value) return "";
  return value.slice(0, 10);
}

export function todayInputValue() {
  return dateInputValue(new Date().toISOString());
}
