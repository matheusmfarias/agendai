import { describe, expect, it } from "vitest";

import {
  buildFinancialCashFlow,
  resolvedPaidAmountInCents,
  summarizeFinancialMovements,
} from "@/features/provider-financial/financial-cash-flow";
import type { FinancialEntry } from "@/features/provider-financial/financial-types";

function entry(
  overrides: Partial<FinancialEntry> & Pick<FinancialEntry, "id" | "date" | "type">,
): FinancialEntry {
  return {
    description: overrides.id,
    category: "Teste",
    method: "pix",
    status: "paid",
    amount: 100,
    paidAmount: 100,
    outstandingAmount: 0,
    ...overrides,
  };
}

describe("financial cash flow", () => {
  it("combines revenue and expense from the same day", () => {
    const cashFlow = buildFinancialCashFlow(
      [
        entry({ id: "revenue", date: "2026-07-02", type: "revenue", paidAmount: 150 }),
        entry({ id: "expense", date: "2026-07-02", type: "expense", paidAmount: 40 }),
      ],
      "2026-07-01",
      "2026-07-07",
    );

    expect(cashFlow.find((point) => point.key.startsWith("2026-07-02:"))).toMatchObject({
      revenue: 150,
      expenses: 40,
    });
  });

  it("keeps movement from a day previously removed by sampling", () => {
    const cashFlow = buildFinancialCashFlow(
      [entry({ id: "movement", date: "2026-07-02", type: "revenue", paidAmount: 75 })],
      "2026-07-01",
      "2026-07-20",
    );

    expect(cashFlow.some((point) => point.revenue === 75)).toBe(true);
  });

  it("groups periods longer than twelve days without discarding dates", () => {
    const cashFlow = buildFinancialCashFlow(
      [
        entry({ id: "first", date: "2026-07-03", type: "revenue", paidAmount: 20 }),
        entry({ id: "second", date: "2026-07-19", type: "expense", paidAmount: 10 }),
      ],
      "2026-07-01",
      "2026-07-20",
    );

    expect(cashFlow).toHaveLength(3);
    expect(cashFlow.reduce((total, point) => total + point.revenue, 0)).toBe(20);
    expect(cashFlow.reduce((total, point) => total + point.expenses, 0)).toBe(10);
  });

  it("uses the amount of a paid expense without payment rows", () => {
    expect(
      resolvedPaidAmountInCents({
        status: "PAID",
        amountInCents: 12_500,
        payments: [],
      }),
    ).toBe(12_500);
  });

  it("ignores canceled entries even if they contain a paid amount", () => {
    const canceled = entry({
      id: "canceled",
      date: "2026-07-02",
      type: "expense",
      status: "canceled",
      paidAmount: 200,
    });

    expect(summarizeFinancialMovements([canceled])).toEqual({
      revenue: 0,
      expenses: 0,
    });
  });

  it("keeps bucket sums equal to period totals", () => {
    const entries = [
      entry({ id: "revenue-a", date: "2026-01-02", type: "revenue", paidAmount: 300 }),
      entry({ id: "revenue-b", date: "2026-02-18", type: "revenue", paidAmount: 125 }),
      entry({ id: "refund", date: "2026-03-04", type: "refund", paidAmount: 25 }),
      entry({ id: "expense", date: "2026-04-29", type: "expense", paidAmount: 90 }),
    ];
    const totals = summarizeFinancialMovements(entries);
    const cashFlow = buildFinancialCashFlow(
      entries,
      "2026-01-01",
      "2026-07-31",
    );

    expect(cashFlow.reduce((total, point) => total + point.revenue, 0)).toBe(
      totals.revenue,
    );
    expect(cashFlow.reduce((total, point) => total + point.expenses, 0)).toBe(
      totals.expenses,
    );
  });
});
