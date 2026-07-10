import type {
  FinancialEntryStatus as DbFinancialEntryStatus,
  FinancialEntryType as DbFinancialEntryType,
  FinancialPaymentMethod as DbFinancialPaymentMethod,
  Prisma,
} from "@/generated/prisma/client";
import {
  DEFAULT_FINANCIAL_SETTINGS,
  FINANCIAL_METHOD_LABELS,
  FINANCIAL_REPORTS,
  FINANCIAL_STATUS_LABELS,
  type FinancialSettings,
  type FinancialEntry,
  type FinancialEntryType,
  type FinancialMethod,
  type FinancialPeriodKey,
  type FinancialStatus,
  type FinancialViewData,
} from "@/features/provider-financial/financial-types";
import type { FinancialFilterInput } from "@/features/provider-financial/financial-schemas";
import { prisma } from "@/lib/prisma";

const STATUS_FROM_DB: Record<DbFinancialEntryStatus, FinancialStatus> = {
  PAID: "paid",
  PENDING: "pending",
  OVERDUE: "overdue",
  CANCELED: "canceled",
  REFUNDED: "refunded",
};

const STATUS_TO_DB: Record<FinancialStatus, DbFinancialEntryStatus> = {
  paid: "PAID",
  pending: "PENDING",
  overdue: "OVERDUE",
  canceled: "CANCELED",
  refunded: "REFUNDED",
};

const TYPE_FROM_DB: Record<DbFinancialEntryType, FinancialEntryType> = {
  REVENUE: "revenue",
  EXPENSE: "expense",
  REFUND: "refund",
  ADJUSTMENT: "adjustment",
};

const TYPE_TO_DB: Record<FinancialEntryType, DbFinancialEntryType> = {
  revenue: "REVENUE",
  expense: "EXPENSE",
  refund: "REFUND",
  adjustment: "ADJUSTMENT",
};

const METHOD_FROM_DB: Record<DbFinancialPaymentMethod, FinancialMethod> = {
  PIX: "pix",
  CASH: "cash",
  CREDIT_CARD: "credit-card",
  DEBIT_CARD: "debit-card",
  BANK_TRANSFER: "transfer",
  OTHER: "other",
};

const METHOD_TO_DB: Record<FinancialMethod, DbFinancialPaymentMethod> = {
  pix: "PIX",
  cash: "CASH",
  "credit-card": "CREDIT_CARD",
  "debit-card": "DEBIT_CARD",
  transfer: "BANK_TRANSFER",
  other: "OTHER",
};

const FINANCIAL_INCLUDE = {
  customer: { select: { name: true } },
  service: { select: { name: true } },
  appointment: { select: { id: true } },
  payments: { orderBy: { paidAt: "desc" as const } },
} satisfies Prisma.FinancialEntryInclude;

type FinancialEntryWithRelations = Prisma.FinancialEntryGetPayload<{
  include: typeof FINANCIAL_INCLUDE;
}>;

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function localDateKey(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function localLabel(dateKey: string) {
  const date = new Date(`${dateKey}T12:00:00-03:00`);
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "short",
  })
    .format(date)
    .replace(".", "");
}

function startOfLocalMonth(date: Date) {
  const [year, month] = localDateKey(date).split("-").map(Number);
  return new Date(`${year}-${String(month).padStart(2, "0")}-01T00:00:00-03:00`);
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function addMonths(date: Date, months: number) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

function dateFromInput(value: string, boundary: "start" | "end") {
  return new Date(
    `${value}T${boundary === "start" ? "00:00:00.000" : "23:59:59.999"}-03:00`,
  );
}

export function financialDateRange(
  period: FinancialPeriodKey,
  startDate?: string,
  endDate?: string,
) {
  if (period === "custom" && startDate && endDate) {
    return {
      gte: dateFromInput(startDate, "start"),
      lte: dateFromInput(endDate, "end"),
    };
  }

  const now = new Date();
  const todayKey = localDateKey(now);
  const todayStart = new Date(`${todayKey}T00:00:00-03:00`);
  const todayEnd = new Date(`${todayKey}T23:59:59.999-03:00`);

  if (period === "today") return { gte: todayStart, lte: todayEnd };
  if (period === "7d") return { gte: addDays(todayStart, -6), lte: todayEnd };
  if (period === "30d") return { gte: addDays(todayStart, -29), lte: todayEnd };
  if (period === "last-month") {
    const current = startOfLocalMonth(now);
    const previous = addMonths(current, -1);
    return { gte: previous, lte: addDays(current, -1) };
  }

  const start = startOfLocalMonth(now);
  return { gte: start, lte: addDays(addMonths(start, 1), -1) };
}

function centsToMoney(cents: number) {
  return cents / 100;
}

function paidAmountInCents(entry: FinancialEntryWithRelations) {
  return entry.payments.reduce(
    (total, payment) => total + payment.amountInCents,
    0,
  );
}

function effectiveStatus(entry: FinancialEntryWithRelations): FinancialStatus {
  const status = STATUS_FROM_DB[entry.status];
  const paidAmount = paidAmountInCents(entry);

  if (status === "canceled" || status === "refunded") return status;
  if (paidAmount >= entry.amountInCents) return "paid";
  if (
    (status === "pending" || paidAmount > 0) &&
    entry.dueDate &&
    entry.dueDate < new Date(`${localDateKey(new Date())}T00:00:00-03:00`)
  ) {
    return "overdue";
  }
  return status;
}

function toViewEntry(entry: FinancialEntryWithRelations): FinancialEntry {
  const method = entry.paymentMethod ? METHOD_FROM_DB[entry.paymentMethod] : "other";
  const paidCents = paidAmountInCents(entry);

  return {
    id: entry.id,
    date: toIsoDate(entry.entryDate),
    dueDate: entry.dueDate ? toIsoDate(entry.dueDate) : undefined,
    type: TYPE_FROM_DB[entry.type],
    description: entry.description,
    customerId: entry.customerId ?? undefined,
    customer: entry.customer?.name,
    serviceId: entry.serviceId ?? undefined,
    service: entry.service?.name,
    category: entry.category ?? "Sem categoria",
    method,
    status: effectiveStatus(entry),
    amount: centsToMoney(entry.amountInCents),
    paidAmount: centsToMoney(paidCents),
    outstandingAmount: centsToMoney(Math.max(0, entry.amountInCents - paidCents)),
    appointmentId: entry.appointment?.id,
    notes: entry.notes ?? undefined,
    source: "financial-entry",
    payments: entry.payments.map((payment) => ({
      id: payment.id,
      amount: centsToMoney(payment.amountInCents),
      paidAt: toIsoDate(payment.paidAt),
      method: METHOD_FROM_DB[payment.paymentMethod],
      notes: payment.notes ?? undefined,
    })),
  };
}

function decimalToMoney(value: Prisma.Decimal | null | undefined) {
  return value ? Number(value) : 0;
}

function whereForFilters(
  tenantId: string,
  filters: FinancialFilterInput,
): Prisma.FinancialEntryWhereInput {
  const query = filters.q?.trim();

  return {
    tenantId,
    entryDate: financialDateRange(filters.period, filters.startDate, filters.endDate),
    ...(filters.status ? { status: STATUS_TO_DB[filters.status] } : {}),
    ...(filters.method ? { paymentMethod: METHOD_TO_DB[filters.method] } : {}),
    ...(filters.type ? { type: TYPE_TO_DB[filters.type] } : {}),
    ...(filters.service && filters.service !== "all"
      ? { service: { name: filters.service } }
      : {}),
    ...(filters.category && filters.category !== "all"
      ? { category: filters.category }
      : {}),
    ...(query
      ? {
          OR: [
            { description: { contains: query, mode: "insensitive" } },
            { category: { contains: query, mode: "insensitive" } },
            { customer: { name: { contains: query, mode: "insensitive" } } },
            { service: { name: { contains: query, mode: "insensitive" } } },
          ],
        }
      : {}),
  };
}

export async function listFinancialEntries(
  tenantId: string,
  filters: FinancialFilterInput,
) {
  const entries = await prisma.financialEntry.findMany({
    where: whereForFilters(tenantId, filters),
    orderBy: [{ entryDate: "desc" }, { createdAt: "desc" }],
    include: FINANCIAL_INCLUDE,
  });

  return entries.map(toViewEntry);
}

export async function getFinancialEntry(tenantId: string, id: string) {
  const entry = await prisma.financialEntry.findFirst({
    where: { tenantId, id },
    include: FINANCIAL_INCLUDE,
  });

  return entry ? toViewEntry(entry) : null;
}

export async function getPendingPayments(
  tenantId: string,
  filters: FinancialFilterInput,
) {
  const range = financialDateRange(filters.period, filters.startDate, filters.endDate);
  const [entries, appointmentsWithoutCheckout] = await Promise.all([
    prisma.financialEntry.findMany({
      where: {
        tenantId,
        type: "REVENUE",
        status: { in: ["PENDING", "OVERDUE"] },
        OR: [{ entryDate: range }, { dueDate: range }],
      },
      include: FINANCIAL_INCLUDE,
    }),
    prisma.appointment.findMany({
      where: {
        tenantId,
        startsAt: range,
        status: {
          notIn: ["CANCELED_BY_CUSTOMER", "CANCELED_BY_PROVIDER", "NO_SHOW"],
        },
        events: { none: { eventType: "CHECKOUT_COMPLETED" } },
      },
      orderBy: { startsAt: "asc" },
      include: {
        customer: { select: { name: true } },
        service: { select: { name: true, priceValue: true } },
      },
    }),
  ]);
  const existingAppointmentIds = new Set(
    entries.map((entry) => entry.appointmentId).filter(Boolean),
  );
  const today = new Date(`${localDateKey(new Date())}T00:00:00-03:00`);
  const appointmentEntries: FinancialEntry[] = appointmentsWithoutCheckout
    .filter((appointment) => !existingAppointmentIds.has(appointment.id))
    .map((appointment) => ({
      id: `appointment-pending-${appointment.id}`,
      date: toIsoDate(appointment.startsAt),
      dueDate: toIsoDate(appointment.startsAt),
      type: "revenue",
      description: `Checkout pendente - ${appointment.service.name}`,
      customerId: appointment.customerId,
      customer: appointment.customer.name,
      serviceId: appointment.serviceId,
      service: appointment.service.name,
      category: "Atendimento",
      method: "other",
      status: appointment.startsAt < today ? "overdue" : "pending",
      amount: decimalToMoney(appointment.finalPrice) ||
        decimalToMoney(appointment.estimatedPrice) ||
        decimalToMoney(appointment.service.priceValue),
      paidAmount: 0,
      outstandingAmount: decimalToMoney(appointment.finalPrice) ||
        decimalToMoney(appointment.estimatedPrice) ||
        decimalToMoney(appointment.service.priceValue),
      appointmentId: appointment.id,
      notes: "Agendamento sem checkout realizado.",
      source: "appointment",
      payments: [],
    }));

  return [...entries.map(toViewEntry), ...appointmentEntries].sort((first, second) =>
    (first.dueDate ?? first.date).localeCompare(second.dueDate ?? second.date),
  );
}

function sumPaid(entries: FinancialEntry[], predicate: (entry: FinancialEntry) => boolean) {
  return entries.reduce(
    (total, entry) => total + (predicate(entry) ? entry.paidAmount : 0),
    0,
  );
}

function uniqueCount(entries: FinancialEntry[], key: keyof FinancialEntry) {
  return new Set(entries.map((entry) => entry[key]).filter(Boolean)).size;
}

function buildCashFlow(entries: FinancialEntry[], filters: FinancialFilterInput) {
  const range = financialDateRange(
    filters.period,
    filters.startDate,
    filters.endDate,
  );
  const days: string[] = [];
  for (let cursor = new Date(range.gte); cursor <= range.lte; cursor = addDays(cursor, 1)) {
    days.push(localDateKey(cursor));
  }
  const relevantDays = days.length > 12 ? days.filter((_, index) => index % 3 === 0) : days;

  return relevantDays.map((day) => {
    const dayEntries = entries.filter((entry) => entry.date === day);
    return {
      label: localLabel(day),
      revenue: sumPaid(dayEntries, (entry) => entry.type === "revenue"),
      expenses: sumPaid(dayEntries, (entry) => entry.type === "expense"),
    };
  });
}

function normalizeStringList(value: unknown, fallback: string[]) {
  if (!Array.isArray(value)) return fallback;
  const values = value.filter(
    (item): item is string => typeof item === "string" && item.trim().length > 0,
  );
  return values.length ? values : fallback;
}

function normalizeMethodList(value: unknown): FinancialMethod[] {
  const allowed = new Set<FinancialMethod>([
    "pix",
    "cash",
    "credit-card",
    "debit-card",
    "transfer",
    "other",
  ]);

  if (!Array.isArray(value)) return DEFAULT_FINANCIAL_SETTINGS.acceptedMethods;

  const values = value.filter(
    (item): item is FinancialMethod =>
      typeof item === "string" && allowed.has(item as FinancialMethod),
  );

  return values.length ? values : DEFAULT_FINANCIAL_SETTINGS.acceptedMethods;
}

export async function getFinancialSettings(
  tenantId: string,
): Promise<FinancialSettings> {
  const settings = await prisma.financialSettings.findUnique({
    where: { tenantId },
  });

  if (!settings) return DEFAULT_FINANCIAL_SETTINGS;

  return {
    currency: settings.currency,
    acceptedMethods: normalizeMethodList(settings.acceptedMethods),
    revenueCategories: normalizeStringList(
      settings.revenueCategories,
      DEFAULT_FINANCIAL_SETTINGS.revenueCategories,
    ),
    expenseCategories: normalizeStringList(
      settings.expenseCategories,
      DEFAULT_FINANCIAL_SETTINGS.expenseCategories,
    ),
    manualControl: settings.manualControl,
    payAtLocation: settings.payAtLocation,
    requireCheckout: settings.requireCheckout,
    allowPartialPayments: settings.allowPartialPayments,
    defaultDueDays: settings.defaultDueDays,
    reminderTemplate: settings.reminderTemplate,
  };
}

function buildServiceRevenue(entries: FinancialEntry[]) {
  const grouped = new Map<string, { revenue: number; appointments: number }>();
  entries
    .filter((entry) => entry.type === "revenue" && entry.paidAmount > 0)
    .forEach((entry) => {
      const key = entry.service ?? "Sem serviço vinculado";
      const current = grouped.get(key) ?? { revenue: 0, appointments: 0 };
      current.revenue += entry.paidAmount;
      current.appointments += 1;
      grouped.set(key, current);
    });

  return Array.from(grouped.entries())
    .map(([service, item]) => ({
      service,
      revenue: item.revenue,
      appointments: item.appointments,
      averageTicket: item.appointments ? item.revenue / item.appointments : 0,
    }))
    .sort((first, second) => second.revenue - first.revenue)
    .slice(0, 5);
}

function buildTopCustomers(entries: FinancialEntry[]) {
  const grouped = new Map<string, { total: number; appointments: number; lastVisit: string }>();
  entries
    .filter((entry) => entry.type === "revenue" && entry.paidAmount > 0 && entry.customer)
    .forEach((entry) => {
      const key = entry.customer!;
      const current = grouped.get(key) ?? {
        total: 0,
        appointments: 0,
        lastVisit: entry.date,
      };
      current.total += entry.paidAmount;
      current.appointments += 1;
      current.lastVisit = entry.date > current.lastVisit ? entry.date : current.lastVisit;
      grouped.set(key, current);
    });

  return Array.from(grouped.entries())
    .map(([name, item]) => ({ name, ...item }))
    .sort((first, second) => second.total - first.total)
    .slice(0, 5);
}

function buildPaymentMethods(entries: FinancialEntry[]) {
  const paidRevenue = entries.filter(
    (entry) => entry.type === "revenue" && entry.paidAmount > 0,
  );
  const total = paidRevenue.reduce((current, entry) => current + entry.paidAmount, 0);
  const grouped = new Map<FinancialMethod, number>();
  paidRevenue.forEach((entry) => {
    grouped.set(entry.method, (grouped.get(entry.method) ?? 0) + entry.paidAmount);
  });

  return Array.from(grouped.entries())
    .map(([method, amount]) => ({
      method,
      label: FINANCIAL_METHOD_LABELS[method],
      amount,
      percentage: total ? Math.round((amount / total) * 100) : 0,
    }))
    .sort((first, second) => second.amount - first.amount);
}

function buildPaymentStatuses(entries: FinancialEntry[]) {
  return (Object.keys(FINANCIAL_STATUS_LABELS) as FinancialStatus[]).map((status) => {
    const statusEntries = entries.filter((entry) => entry.status === status);
    return {
      status,
      label: FINANCIAL_STATUS_LABELS[status],
      count: statusEntries.length,
      amount: statusEntries.reduce(
        (current, entry) => current + entry.outstandingAmount,
        0,
      ),
    };
  });
}

export async function getFinancialDashboardData(
  tenantId: string,
  filters: FinancialFilterInput,
): Promise<FinancialViewData> {
  const [transactions, pendingPayments, settings] = await Promise.all([
    listFinancialEntries(tenantId, filters),
    getPendingPayments(tenantId, filters),
    getFinancialSettings(tenantId),
  ]);
  const expenses = transactions.filter((entry) => entry.type === "expense");
  const grossRevenue = sumPaid(
    transactions,
    (entry) => entry.type === "revenue",
  );
  const refundedTotal = sumPaid(transactions, (entry) => entry.type === "refund");
  const revenue = grossRevenue - refundedTotal;
  const receivable = pendingPayments.reduce(
    (total, entry) => total + entry.outstandingAmount,
    0,
  );
  const expenseTotal = sumPaid(expenses, () => true);
  const paidRevenue = transactions.filter(
    (entry) => entry.type === "revenue" && entry.paidAmount > 0,
  );
  const overdueCount = pendingPayments.filter((entry) => entry.status === "overdue").length;
  const delinquencyBase = paidRevenue.length + pendingPayments.length;

  return {
    metrics: [
      {
        id: "revenue",
        label: "Receita recebida",
        value: revenue,
        valueKind: "currency",
        helper: "Entradas pagas no período",
        trend: `${paidRevenue.length} recebimentos`,
        trendTone: "up",
      },
      {
        id: "receivable",
        label: "A receber",
        value: receivable,
        valueKind: "currency",
        helper: `${pendingPayments.length} pendências abertas`,
        trend: `${overdueCount} vencidos`,
        trendTone: overdueCount ? "down" : "neutral",
      },
      {
        id: "ticket",
        label: "Ticket médio",
        value: paidRevenue.length ? revenue / paidRevenue.length : 0,
        valueKind: "currency",
        helper: "Por lançamento pago",
        trend: `${uniqueCount(paidRevenue, "customer")} clientes`,
        trendTone: "neutral",
      },
      {
        id: "paid-appointments",
        label: "Agendamentos pagos",
        value: uniqueCount(paidRevenue, "appointmentId"),
        valueKind: "number",
        helper: "Com vínculo de agendamento",
        trend: `${paidRevenue.length} lançamentos pagos`,
        trendTone: "neutral",
      },
      {
        id: "expenses",
        label: "Despesas",
        value: expenseTotal,
        valueKind: "currency",
        helper: "Custos pagos no período",
        trend: `${expenses.length} lançamentos`,
        trendTone: "neutral",
      },
      {
        id: "profit",
        label: "Lucro estimado",
        value: revenue - expenseTotal,
        valueKind: "currency",
        helper: "Receita recebida menos despesas",
        trend: revenue >= expenseTotal ? "positivo" : "negativo",
        trendTone: revenue >= expenseTotal ? "up" : "down",
      },
      {
        id: "delinquency",
        label: "Inadimplência",
        value: delinquencyBase ? Math.round((overdueCount / delinquencyBase) * 1000) / 10 : 0,
        valueKind: "percent",
        helper: "Vencidos sobre recebíveis",
        trend: `${overdueCount} vencidos`,
        trendTone: overdueCount ? "down" : "up",
      },
    ],
    cashFlow: buildCashFlow(transactions, filters),
    serviceRevenue: buildServiceRevenue(transactions),
    paymentMethods: buildPaymentMethods(transactions),
    paymentStatuses: buildPaymentStatuses(transactions),
    topCustomers: buildTopCustomers(transactions),
    transactions,
    pendingPayments,
    expenses,
    reports: FINANCIAL_REPORTS,
    settings,
  };
}
