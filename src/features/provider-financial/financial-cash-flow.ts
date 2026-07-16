import type {
  FinancialEntry,
  FinancialSeriesPoint,
} from "@/features/provider-financial/financial-types";

type PersistedPaidEntry = {
  status: "PAID" | "PENDING" | "OVERDUE" | "CANCELED" | "REFUNDED";
  amountInCents: number;
  payments: Array<{ amountInCents: number }>;
};

export function resolvedPaidAmountInCents(entry: PersistedPaidEntry) {
  if (entry.status === "CANCELED") return 0;

  const paymentsTotal = entry.payments.reduce(
    (total, payment) => total + payment.amountInCents,
    0,
  );
  if (paymentsTotal > 0) return paymentsTotal;

  return entry.status === "PAID" ? entry.amountInCents : 0;
}

export function financialMovement(entry: FinancialEntry) {
  if (entry.status === "canceled") {
    return { revenue: 0, expenses: 0 };
  }

  if (entry.type === "revenue") {
    return { revenue: entry.paidAmount, expenses: 0 };
  }
  if (entry.type === "refund") {
    return { revenue: -entry.paidAmount, expenses: 0 };
  }
  if (entry.type === "expense") {
    return { revenue: 0, expenses: entry.paidAmount };
  }

  return { revenue: 0, expenses: 0 };
}

export function summarizeFinancialMovements(entries: FinancialEntry[]) {
  return entries.reduce(
    (summary, entry) => {
      const movement = financialMovement(entry);
      summary.revenue += movement.revenue;
      summary.expenses += movement.expenses;
      return summary;
    },
    { revenue: 0, expenses: 0 },
  );
}

function dateKeys(startDate: string, endDate: string) {
  const keys: string[] = [];
  const cursor = new Date(`${startDate}T12:00:00Z`);
  const end = new Date(`${endDate}T12:00:00Z`);

  while (cursor <= end) {
    keys.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return keys;
}

function shortDateLabel(dateKey: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
  })
    .format(new Date(`${dateKey}T12:00:00Z`))
    .replace(".", "");
}

function monthLabel(dateKey: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  })
    .format(new Date(`${dateKey}T12:00:00Z`))
    .replace(".", "");
}

type DateBucket = { start: string; end: string; days: string[] };

function buildDateBuckets(days: string[]): DateBucket[] {
  if (days.length > 180) {
    const months = new Map<string, string[]>();
    for (const day of days) {
      const month = day.slice(0, 7);
      months.set(month, [...(months.get(month) ?? []), day]);
    }
    return Array.from(months.values()).map((monthDays) => ({
      start: monthDays[0],
      end: monthDays[monthDays.length - 1],
      days: monthDays,
    }));
  }

  const bucketSize = days.length <= 14 ? 1 : days.length <= 62 ? 7 : 14;
  const buckets: DateBucket[] = [];
  for (let index = 0; index < days.length; index += bucketSize) {
    const bucketDays = days.slice(index, index + bucketSize);
    buckets.push({
      start: bucketDays[0],
      end: bucketDays[bucketDays.length - 1],
      days: bucketDays,
    });
  }
  return buckets;
}

function bucketLabel(bucket: DateBucket, monthly: boolean) {
  if (monthly) return monthLabel(bucket.start);
  if (bucket.start === bucket.end) return shortDateLabel(bucket.start);
  return `${shortDateLabel(bucket.start)} – ${shortDateLabel(bucket.end)}`;
}

export function buildFinancialCashFlow(
  entries: FinancialEntry[],
  startDate: string,
  endDate: string,
): FinancialSeriesPoint[] {
  const days = dateKeys(startDate, endDate);
  const entriesByDate = new Map<string, FinancialEntry[]>();
  for (const entry of entries) {
    entriesByDate.set(entry.date, [
      ...(entriesByDate.get(entry.date) ?? []),
      entry,
    ]);
  }

  const monthly = days.length > 180;
  return buildDateBuckets(days).map((bucket) => {
    const bucketEntries = bucket.days.flatMap(
      (day) => entriesByDate.get(day) ?? [],
    );
    const totals = summarizeFinancialMovements(bucketEntries);

    return {
      key: `${bucket.start}:${bucket.end}`,
      label: bucketLabel(bucket, monthly),
      revenue: totals.revenue,
      expenses: totals.expenses,
    };
  });
}
