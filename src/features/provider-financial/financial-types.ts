import type { FormActionState } from "@/types/form-state";

export type FinancialPeriodKey =
  | "today"
  | "7d"
  | "30d"
  | "this-month"
  | "last-month"
  | "custom";

export type FinancialFilterState = {
  period: FinancialPeriodKey;
  startDate?: string;
  endDate?: string;
  q?: string;
  status?: FinancialStatus;
  method?: FinancialMethod;
  type?: FinancialEntryType;
  service?: string;
  category?: string;
};

export type FinancialStatus =
  | "paid"
  | "pending"
  | "overdue"
  | "canceled"
  | "refunded";

export type FinancialMethod =
  | "pix"
  | "cash"
  | "credit-card"
  | "debit-card"
  | "transfer"
  | "other";

export type FinancialEntryType =
  | "revenue"
  | "expense"
  | "refund"
  | "adjustment";

export type FinancialMetric = {
  id: string;
  label: string;
  value: number;
  valueKind: "currency" | "number" | "percent";
  helper: string;
  trend: string;
  trendTone: "up" | "down" | "neutral";
};

export type FinancialSeriesPoint = {
  key: string;
  label: string;
  revenue: number;
  expenses: number;
};

export type ServiceRevenue = {
  service: string;
  revenue: number;
  appointments: number;
  averageTicket: number;
};

export type PaymentMethodSummary = {
  method: FinancialMethod;
  label: string;
  amount: number;
  percentage: number;
};

export type PaymentStatusSummary = {
  status: FinancialStatus;
  label: string;
  count: number;
  amount: number;
};

export type TopCustomer = {
  name: string;
  total: number;
  appointments: number;
  lastVisit: string;
};

export type FinancialEntry = {
  id: string;
  date: string;
  dueDate?: string;
  type: FinancialEntryType;
  description: string;
  customerId?: string;
  customer?: string;
  serviceId?: string;
  service?: string;
  category: string;
  method: FinancialMethod;
  status: FinancialStatus;
  amount: number;
  paidAmount: number;
  outstandingAmount: number;
  appointmentId?: string;
  notes?: string;
  source?: "financial-entry" | "appointment";
  payments?: FinancialPayment[];
};

export type FinancialPayment = {
  id: string;
  amount: number;
  paidAt: string;
  method: FinancialMethod;
  notes?: string;
};

export type FinancialReport = {
  id: string;
  title: string;
  description: string;
  format: "CSV" | "PDF" | "Excel";
};

export type FinancialSettings = {
  currency: string;
  acceptedMethods: FinancialMethod[];
  revenueCategories: string[];
  expenseCategories: string[];
  manualControl: boolean;
  payAtLocation: boolean;
  requireCheckout: boolean;
  allowPartialPayments: boolean;
  defaultDueDays: number;
  reminderTemplate: string;
};

export type FinancialViewData = {
  metrics: FinancialMetric[];
  cashFlow: FinancialSeriesPoint[];
  serviceRevenue: ServiceRevenue[];
  paymentMethods: PaymentMethodSummary[];
  paymentStatuses: PaymentStatusSummary[];
  topCustomers: TopCustomer[];
  transactions: FinancialEntry[];
  pendingPayments: FinancialEntry[];
  expenses: FinancialEntry[];
  reports: FinancialReport[];
  settings: FinancialSettings;
};

export type FinancialOption = {
  id: string;
  name: string;
};

export type FinancialAction = (
  state: FormActionState,
  data: FormData,
) => Promise<FormActionState>;

export const FINANCIAL_STATUS_LABELS: Record<FinancialStatus, string> = {
  paid: "Pago",
  pending: "Pendente",
  overdue: "Vencido",
  canceled: "Cancelado",
  refunded: "Reembolsado",
};

export const FINANCIAL_METHOD_LABELS: Record<FinancialMethod, string> = {
  pix: "Pix",
  cash: "Dinheiro",
  "credit-card": "Cartão de crédito",
  "debit-card": "Cartão de débito",
  transfer: "Transferência",
  other: "Outro",
};

export const FINANCIAL_METHOD_DB_VALUES: Record<FinancialMethod, string> = {
  pix: "PIX",
  cash: "CASH",
  "credit-card": "CREDIT_CARD",
  "debit-card": "DEBIT_CARD",
  transfer: "BANK_TRANSFER",
  other: "OTHER",
};

export const FINANCIAL_TYPE_LABELS: Record<FinancialEntryType, string> = {
  revenue: "Receita",
  expense: "Despesa",
  refund: "Estorno",
  adjustment: "Ajuste manual",
};

export const FINANCIAL_REPORTS: FinancialReport[] = [
  {
    id: "monthly",
    title: "Relatório mensal",
    description: "Receita, despesas e lucro por mês.",
    format: "CSV",
  },
  {
    id: "service",
    title: "Relatório por serviço",
    description: "Ranking por faturamento e ticket médio.",
    format: "CSV",
  },
  {
    id: "customer",
    title: "Relatório por cliente",
    description: "Clientes que mais compraram no período.",
    format: "CSV",
  },
  {
    id: "pending",
    title: "Pagamentos pendentes",
    description: "Valores pendentes e vencidos para cobrança.",
    format: "CSV",
  },
  {
    id: "expenses",
    title: "Relatório de despesas",
    description: "Custos agrupados por categoria.",
    format: "CSV",
  },
  {
    id: "methods",
    title: "Métodos de pagamento",
    description: "Participação de Pix, cartão e dinheiro.",
    format: "CSV",
  },
];

export const DEFAULT_FINANCIAL_SETTINGS: FinancialSettings = {
  currency: "BRL",
  acceptedMethods: [
    "pix",
    "cash",
    "credit-card",
    "debit-card",
    "transfer",
  ],
  revenueCategories: ["Atendimento", "Produtos", "Ajuste manual"],
  expenseCategories: ["Insumos", "Comissões", "Aluguel", "Marketing", "Outros"],
  manualControl: true,
  payAtLocation: true,
  requireCheckout: false,
  allowPartialPayments: false,
  defaultDueDays: 2,
  reminderTemplate:
    "Olá, {cliente}! Lembrete do pagamento pendente de {valor} referente a {serviço}.",
};
