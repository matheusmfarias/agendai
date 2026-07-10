"use client";

import { usePathname, useRouter } from "next/navigation";
import { useActionState, useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  CheckCircle2,
  Download,
  Eye,
  FileSpreadsheet,
  Filter,
  MessageCircle,
  Plus,
  RefreshCw,
  Search,
  Settings,
  SlidersHorizontal,
  WalletCards,
  X,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldError, FormFeedback } from "@/components/forms/form-feedback";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TableContainer } from "@/components/ui/table-container";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import {
  FINANCIAL_METHOD_LABELS,
  FINANCIAL_STATUS_LABELS,
  FINANCIAL_TYPE_LABELS,
  type FinancialEntry,
  type FinancialAction,
  type FinancialMethod,
  type FinancialOption,
  type FinancialPeriodKey,
  type FinancialStatus,
  type FinancialViewData,
} from "./financial-types";
import {
  DEFAULT_FILTERS,
  FORM_METHOD_OPTIONS,
  FORM_STATUS_OPTIONS,
  FORM_TYPE_OPTIONS,
  PERIOD_LABELS,
  SHOW_DEV_STATE_SWITCHER,
  STATUS_BADGE_VARIANT,
  TABS,
  TYPE_TO_FORM_VALUE,
  METHOD_TO_FORM_VALUE,
  STATUS_TO_FORM_VALUE,
  dateInputValue,
  filtersFromServer,
  filtersToSearchParams,
  formatMetricValue,
  metricById,
  moneyInputValue,
  signedAmount,
  todayInputValue,
  uniqueValues,
  type FinancialFilters,
  type FinancialTab,
  type FinancialViewState,
} from "./financial-view-helpers";
import type { FinancialFilterInput } from "./financial-schemas";

function matchesFilters(entry: FinancialEntry, filters: FinancialFilters) {
  const query = filters.query.trim().toLowerCase();
  const queryMatch = query
    ? [
        entry.description,
        entry.customer,
        entry.service,
        entry.category,
        entry.appointmentId,
        FINANCIAL_METHOD_LABELS[entry.method],
      ]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(query))
    : true;

  return (
    queryMatch &&
    (filters.status === "all" || entry.status === filters.status) &&
    (filters.method === "all" || entry.method === filters.method) &&
    (filters.type === "all" || entry.type === filters.type) &&
    (filters.service === "all" || entry.service === filters.service) &&
    (filters.category === "all" || entry.category === filters.category)
  );
}

function filterPendingPayments(entries: FinancialEntry[], filters: FinancialFilters) {
  const filtered = entries.filter((entry) => {
    const query = filters.query.trim().toLowerCase();
    const queryMatch = query
      ? [entry.customer, entry.service, entry.description, entry.appointmentId]
          .filter(Boolean)
          .some((value) => value!.toLowerCase().includes(query))
      : true;

    return (
      queryMatch &&
      (filters.pendingView === "all" || entry.status === filters.pendingView) &&
      (filters.service === "all" || entry.service === filters.service)
    );
  });

  return [...filtered].sort((first, second) => {
    if (filters.pendingSort === "highest") return second.amount - first.amount;
    if (filters.pendingSort === "lowest") return first.amount - second.amount;
    if (first.status !== second.status) {
      if (first.status === "overdue") return -1;
      if (second.status === "overdue") return 1;
    }
    if (first.amount !== second.amount) return second.amount - first.amount;
    return (first.dueDate ?? first.date).localeCompare(second.dueDate ?? second.date);
  });
}

export function ProviderFinancialView({
  data,
  customers,
  services: serviceOptions,
  initialFilters,
  createAction,
  updateAction,
  cancelAction,
  registerPaymentAction,
  refundAction,
  checkoutAction,
  updateSettingsAction,
}: {
  data: FinancialViewData;
  customers: FinancialOption[];
  services: FinancialOption[];
  initialFilters: FinancialFilterInput;
  createAction: FinancialAction;
  updateAction: FinancialAction;
  cancelAction: FinancialAction;
  registerPaymentAction: FinancialAction;
  refundAction: FinancialAction;
  checkoutAction: FinancialAction;
  updateSettingsAction: FinancialAction;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [activeTab, setActiveTab] = useState<FinancialTab>("summary");
  const [filters, setFilters] = useState<FinancialFilters>(() =>
    filtersFromServer(initialFilters),
  );
  const [viewState, setViewState] = useState<FinancialViewState>("ready");
  const [addOpen, setAddOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<FinancialEntry | null>(null);
  const [editingEntry, setEditingEntry] = useState<FinancialEntry | null>(null);

  const services = useMemo(
    () => uniqueValues(data.transactions.map((entry) => entry.service)),
    [data.transactions],
  );
  const categories = useMemo(
    () => uniqueValues(data.transactions.map((entry) => entry.category)),
    [data.transactions],
  );
  const filteredTransactions = useMemo(
    () => data.transactions.filter((entry) => matchesFilters(entry, filters)),
    [data.transactions, filters],
  );
  const filteredPendingPayments = useMemo(
    () => filterPendingPayments(data.pendingPayments, filters),
    [data.pendingPayments, filters],
  );

  const noResults = viewState === "ready" && filteredTransactions.length === 0;

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      router.replace(`${pathname}?${filtersToSearchParams(filters)}`, {
        scroll: false,
      });
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [filters, pathname, router]);

  return (
    <div className="mx-auto max-w-[1400px] space-y-4">
      <FinancialHeader
        activeTab={activeTab}
        onAdd={() => setAddOpen(true)}
        onExport={() => {
          if (activeTab !== "settings") setActiveTab("reports");
        }}
        exportHref={`/api/provider/financial/export?${filtersToSearchParams(filters)}&view=${activeTab}`}
        onConfigure={() => setActiveTab("settings")}
      />

      <FinancialTabs activeTab={activeTab} onChange={setActiveTab} />

      <FinancialFiltersBar
        activeTab={activeTab}
        filters={filters}
        services={services}
        onChange={setFilters}
        onOpenAdvanced={() => setFiltersOpen(true)}
      />

      {SHOW_DEV_STATE_SWITCHER ? (
        <StateSwitcher state={viewState} onChange={setViewState} />
      ) : null}

      {viewState === "loading" ? (
        <FinancialSkeleton />
      ) : viewState === "error" ? (
        <FinancialErrorState onRetry={() => setViewState("ready")} />
      ) : viewState === "empty" ? (
        <FinancialEmptyState activeTab={activeTab} onAdd={() => setAddOpen(true)} />
      ) : (
        <>
          {activeTab === "summary" ? (
            <SummaryTab
              data={data}
              entries={filteredTransactions}
              noResults={noResults}
              onClearFilters={() => setFilters(DEFAULT_FILTERS)}
              onSelectEntry={setSelectedEntry}
              onMarkPaid={setSelectedEntry}
              onOpenTransactions={() => setActiveTab("transactions")}
              onOpenPending={() => setActiveTab("pending")}
            />
          ) : null}

          {activeTab === "transactions" ? (
            <TransactionsTab
              entries={filteredTransactions}
              expenses={data.expenses}
              noResults={noResults}
              onClearFilters={() => setFilters(DEFAULT_FILTERS)}
              onSelectEntry={setSelectedEntry}
            />
          ) : null}

          {activeTab === "pending" ? (
            <PendingTab
              entries={filteredPendingPayments}
              onSelectEntry={setSelectedEntry}
              onMarkPaid={setSelectedEntry}
            />
          ) : null}

          {activeTab === "reports" ? (
            <ReportsTab
              data={data}
              exportQuery={filtersToSearchParams(filters)}
            />
          ) : null}
          {activeTab === "settings" ? (
            <SettingsTab data={data} action={updateSettingsAction} />
          ) : null}
        </>
      )}

      <button
        type="button"
        onClick={() => setAddOpen(true)}
        className="fixed bottom-5 right-5 z-40 grid size-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-xl transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 md:hidden"
        aria-label="Adicionar lançamento"
      >
        <Plus className="size-6" />
      </button>

      {addOpen ? (
        <AddFinancialEntryPanel
          customers={customers}
          services={serviceOptions}
          action={createAction}
          onClose={() => setAddOpen(false)}
        />
      ) : null}
      {editingEntry ? (
        <AddFinancialEntryPanel
          customers={customers}
          services={serviceOptions}
          action={updateAction}
          entry={editingEntry}
          onClose={() => setEditingEntry(null)}
        />
      ) : null}
      {selectedEntry ? (
        <FinancialEntryDetailsPanel
          entry={selectedEntry}
          cancelAction={cancelAction}
          registerPaymentAction={registerPaymentAction}
          refundAction={refundAction}
          checkoutAction={checkoutAction}
          onEdit={() => {
            setEditingEntry(selectedEntry);
            setSelectedEntry(null);
          }}
          onClose={() => setSelectedEntry(null)}
        />
      ) : null}
      {filtersOpen ? (
        <AdvancedFiltersPanel
          filters={filters}
          services={services}
          categories={categories}
          onChange={setFilters}
          onClose={() => setFiltersOpen(false)}
        />
      ) : null}
    </div>
  );
}

function FinancialHeader({
  activeTab,
  onAdd,
  onExport,
  exportHref,
  onConfigure,
}: {
  activeTab: FinancialTab;
  onAdd: () => void;
  onExport: () => void;
  exportHref: string;
  onConfigure: () => void;
}) {
  const exportLabel: Record<FinancialTab, string> = {
    summary: "Exportar resumo",
    transactions: "Exportar lançamentos",
    pending: "Exportar pendências",
    reports: "Exportar relatório",
    settings: "Exportar relatório",
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-3 shadow-sm sm:p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
            <WalletCards className="size-4" />
          </span>
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight">Financeiro</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Receitas, pendências e despesas em uma visão simples para o dia a dia.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap sm:justify-end">
          <Button type="button" onClick={onAdd}>
            <Plus className="size-4" />
            Adicionar lançamento
          </Button>
          {activeTab !== "settings" ? (
            <Button variant="outline" asChild>
              <a href={exportHref} onClick={onExport}>
                <Download className="size-4" />
                {exportLabel[activeTab]}
              </a>
            </Button>
          ) : null}
          <Button
            type="button"
            variant={activeTab === "settings" ? "default" : "ghost"}
            onClick={onConfigure}
            aria-pressed={activeTab === "settings"}
          >
            <Settings className="size-4" />
            Configurar
          </Button>
        </div>
      </div>
    </div>
  );
}

function FinancialTabs({
  activeTab,
  onChange,
}: {
  activeTab: FinancialTab;
  onChange: (tab: FinancialTab) => void;
}) {
  return (
    <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <div
        role="tablist"
        aria-label="Seções do financeiro"
        className="inline-flex min-w-max rounded-xl border border-border bg-card p-1 shadow-sm"
      >
        {TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.value}
            onClick={() => onChange(tab.value)}
            className={cn(
              "h-9 rounded-lg px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30",
              activeTab === tab.value
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function FinancialFiltersBar({
  activeTab,
  filters,
  services,
  onChange,
  onOpenAdvanced,
}: {
  activeTab: FinancialTab;
  filters: FinancialFilters;
  services: string[];
  onChange: (filters: FinancialFilters) => void;
  onOpenAdvanced: () => void;
}) {
  if (activeTab === "settings") return null;

  const showSearch = activeTab === "summary" || activeTab === "transactions" || activeTab === "pending";
  const showServiceSelect = activeTab === "transactions";
  const showTypeSelect = activeTab === "transactions";
  const showPendingFilters = activeTab === "pending";
  const showAdvanced = activeTab === "summary" || activeTab === "transactions" || activeTab === "pending";

  return (
    <div className="space-y-3 rounded-2xl border border-border bg-card p-3 shadow-sm">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {(Object.keys(PERIOD_LABELS) as FinancialPeriodKey[]).map((period) => (
          <button
            key={period}
            type="button"
            onClick={() =>
              onChange({
                ...filters,
                period,
                ...(period !== "custom"
                  ? { startDate: undefined, endDate: undefined }
                  : {}),
              })
            }
            className={cn(
              "h-9 shrink-0 rounded-full border px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30",
              filters.period === period
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background text-muted-foreground hover:text-foreground",
            )}
          >
            {PERIOD_LABELS[period]}
          </button>
        ))}
      </div>

      {filters.period === "custom" ? (
        <div className="grid gap-2 sm:grid-cols-2 lg:max-w-lg">
          <label className="space-y-1">
            <span className="px-1 text-xs font-medium text-muted-foreground">
              Início
            </span>
            <Input
              type="date"
              value={filters.startDate ?? ""}
              onChange={(event) =>
                onChange({ ...filters, startDate: event.currentTarget.value })
              }
              aria-label="Data inicial"
            />
          </label>
          <label className="space-y-1">
            <span className="px-1 text-xs font-medium text-muted-foreground">
              Fim
            </span>
            <Input
              type="date"
              value={filters.endDate ?? ""}
              onChange={(event) =>
                onChange({ ...filters, endDate: event.currentTarget.value })
              }
              aria-label="Data final"
            />
          </label>
        </div>
      ) : null}

      {activeTab === "reports" ? null : (
        <div
          className={cn(
            "grid gap-2",
            activeTab === "transactions"
              ? "md:grid-cols-[minmax(0,1fr)_minmax(190px,220px)_minmax(170px,190px)_auto]"
              : activeTab === "pending"
                ? "md:grid-cols-[minmax(0,1fr)_minmax(150px,170px)_minmax(160px,180px)_auto]"
                : "md:grid-cols-[minmax(0,1fr)_auto]",
          )}
        >
          {showSearch ? (
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={filters.query}
                onChange={(event) =>
                  onChange({ ...filters, query: event.target.value })
                }
                className="pl-9"
                placeholder={
                  activeTab === "pending"
                    ? "Buscar cliente ou serviço"
                    : "Buscar cliente, serviço ou lançamento"
                }
              />
            </div>
          ) : null}

          {showServiceSelect ? (
            <div className="hidden md:block">
              <Select
                value={filters.service}
                onChange={(event) =>
                  onChange({ ...filters, service: event.currentTarget.value })
                }
              >
                <option value="all">Todos os serviços</option>
                {services.map((service) => (
                  <option key={service} value={service}>
                    {service}
                  </option>
                ))}
              </Select>
            </div>
          ) : null}

          {showTypeSelect ? (
            <div className="hidden md:block">
              <Select
                value={filters.type}
                onChange={(event) =>
                  onChange({
                    ...filters,
                    type: event.currentTarget.value as FinancialFilters["type"],
                  })
                }
              >
                <option value="all">Todos os tipos</option>
                {Object.entries(FINANCIAL_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </div>
          ) : null}

          {showPendingFilters ? (
            <>
              <Select
                value={filters.pendingView}
                onChange={(event) =>
                  onChange({
                    ...filters,
                    pendingView: event.currentTarget.value as FinancialFilters["pendingView"],
                  })
                }
              >
                <option value="all">Todas</option>
                <option value="overdue">Vencidas</option>
                <option value="pending">Pendentes</option>
              </Select>
              <Select
                value={filters.pendingSort}
                onChange={(event) =>
                  onChange({
                    ...filters,
                    pendingSort: event.currentTarget.value as FinancialFilters["pendingSort"],
                  })
                }
              >
                <option value="priority">Prioridade</option>
                <option value="highest">Maior valor</option>
                <option value="lowest">Menor valor</option>
              </Select>
            </>
          ) : null}

          {showAdvanced ? (
            <Button type="button" variant="outline" onClick={onOpenAdvanced}>
              <SlidersHorizontal className="size-4" />
              Filtros
            </Button>
          ) : null}
        </div>
      )}

      {activeTab === "reports" ? (
        <p className="px-1 text-xs text-muted-foreground">
          Relatórios usam o período selecionado acima.
        </p>
      ) : null}

      <div className="sr-only">
        <div>
          <Select
            value={filters.service}
            onChange={(event) =>
              onChange({ ...filters, service: event.currentTarget.value })
            }
          >
            <option value="all">Todos os serviços</option>
            {services.map((service) => (
              <option key={service} value={service}>
                {service}
              </option>
            ))}
          </Select>
        </div>
      </div>
    </div>
  );
}

function SummaryTab({
  data,
  entries,
  noResults,
  onClearFilters,
  onSelectEntry,
  onMarkPaid,
  onOpenTransactions,
  onOpenPending,
}: {
  data: FinancialViewData;
  entries: FinancialEntry[];
  noResults: boolean;
  onClearFilters: () => void;
  onSelectEntry: (entry: FinancialEntry) => void;
  onMarkPaid: (entry: FinancialEntry) => void;
  onOpenTransactions: () => void;
  onOpenPending: () => void;
}) {
  const latestEntries = entries.slice(0, 4);

  return (
    <div className="space-y-4">
      <PrimaryMetrics data={data} />

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        <CashFlowCard data={data} />
        <div className="space-y-4">
          <PendingPayments
            entries={data.pendingPayments.slice(0, 3)}
            compact
            onSelectEntry={onSelectEntry}
            onMarkPaid={onMarkPaid}
            actionLabel="Ver pendências"
            onAction={onOpenPending}
          />
          <PaymentMethods data={data} />
          <RecommendedActions data={data} onOpenPending={onOpenPending} />
        </div>
      </div>

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <TransactionsSection
          title="Últimos lançamentos"
          description="Movimentações recentes do período filtrado."
          entries={latestEntries}
          noResults={noResults}
          onClearFilters={onClearFilters}
          onSelectEntry={onSelectEntry}
          compact
          actionLabel="Ver todos"
          onAction={onOpenTransactions}
        />
        <SecondaryMetrics data={data} />
      </div>
    </div>
  );
}

function TransactionsTab({
  entries,
  expenses,
  noResults,
  onClearFilters,
  onSelectEntry,
}: {
  entries: FinancialEntry[];
  expenses: FinancialEntry[];
  noResults: boolean;
  onClearFilters: () => void;
  onSelectEntry: (entry: FinancialEntry) => void;
}) {
  return (
    <div className="space-y-4">
      <TransactionsSection
        title="Lançamentos"
        description="Extrato do período com receitas, despesas, estornos e ajustes."
        entries={entries}
        noResults={noResults}
        onClearFilters={onClearFilters}
        onSelectEntry={onSelectEntry}
      />
      <ExpensesSection entries={expenses} onSelectEntry={onSelectEntry} />
    </div>
  );
}

function PendingTab({
  entries,
  onSelectEntry,
  onMarkPaid,
}: {
  entries: FinancialEntry[];
  onSelectEntry: (entry: FinancialEntry) => void;
  onMarkPaid: (entry: FinancialEntry) => void;
}) {
  return (
    <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
      <PendingPayments
        entries={entries}
        onSelectEntry={onSelectEntry}
        onMarkPaid={onMarkPaid}
      />
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Prioridade de cobrança</CardTitle>
          <p className="text-sm text-muted-foreground">
            Vencidos primeiro, depois maiores valores e próximos vencimentos.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background p-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{entry.customer}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDate(entry.dueDate)} · {entry.appointmentId}
                </p>
              </div>
              <p className="shrink-0 font-semibold">{formatCurrency(entry.amount)}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function ReportsTab({
  data,
  exportQuery,
}: {
  data: FinancialViewData;
  exportQuery: string;
}) {
  return (
    <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(340px,0.7fr)]">
      <ReportsGrid data={data} exportQuery={exportQuery} />
      <div className="space-y-4">
        <ServiceRevenueRanking data={data} />
        <TopCustomersRanking data={data} />
      </div>
    </div>
  );
}

function SettingsTab({
  data,
  action,
}: {
  data: FinancialViewData;
  action: FinancialAction;
}) {
  return <FinancialSettingsCard data={data} action={action} />;
}

function PrimaryMetrics({ data }: { data: FinancialViewData }) {
  const metrics = ["revenue", "receivable", "expenses", "profit"]
    .map((id) => metricById(data, id))
    .filter(Boolean);

  return (
    <section aria-label="Resumo financeiro" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric) => (
        <Card key={metric!.id} className="gap-2 rounded-xl py-3">
          <CardContent className="px-4">
            <p className="text-sm font-medium text-muted-foreground">
              {metric!.id === "revenue" ? "Receita recebida" : metric!.label}
            </p>
            <p className="mt-2 text-2xl font-semibold tracking-tight">
              {formatMetricValue(metric!.value, metric!.valueKind)}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
              <span>{metric!.helper}</span>
              <span
                className={cn(
                  "font-medium",
                  metric!.trendTone === "up" && "text-success",
                  metric!.trendTone === "down" && "text-destructive",
                )}
              >
                {metric!.trend}
              </span>
            </div>
          </CardContent>
        </Card>
      ))}
    </section>
  );
}

function SecondaryMetrics({ data }: { data: FinancialViewData }) {
  const metrics = ["ticket", "paid-appointments", "delinquency"]
    .map((id) => metricById(data, id))
    .filter(Boolean);

  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle>Análise rápida</CardTitle>
        <p className="text-sm text-muted-foreground">
          Indicadores úteis sem competir com o dinheiro do período.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {metrics.map((metric) => (
          <div
            key={metric!.id}
            className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background p-3"
          >
            <div>
              <p className="text-sm font-semibold">{metric!.label}</p>
              <p className="text-xs text-muted-foreground">{metric!.trend}</p>
            </div>
            <p className="text-sm font-semibold">
              {formatMetricValue(metric!.value, metric!.valueKind)}
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function CashFlowCard({ data }: { data: FinancialViewData }) {
  const maxValue = Math.max(
    ...data.cashFlow.flatMap((point) => [point.revenue, point.expenses]),
  );
  const received = metricById(data, "revenue")?.value ?? 0;
  const expenses = metricById(data, "expenses")?.value ?? 0;
  const profit = received - expenses;

  return (
    <Card className="rounded-2xl">
      <CardHeader className="flex-row items-start justify-between gap-3">
        <div>
          <CardTitle>Fluxo financeiro</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Entradas e saídas por dia no período selecionado.
          </p>
        </div>
        <div className="hidden items-center gap-3 text-xs text-muted-foreground sm:flex">
          <span className="inline-flex items-center gap-1">
            <span className="size-2 rounded-full bg-primary" />
            Receita
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="size-2 rounded-full bg-destructive/70" />
            Despesas
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <CompactAmount label="Entradas" value={received} tone="success" />
          <CompactAmount label="Saídas" value={expenses} tone="destructive" />
          <CompactAmount label="Saldo estimado" value={profit} tone="primary" />
        </div>

        <p className="text-sm text-muted-foreground">
          No período, as entradas somam {formatCurrency(received)} e as despesas
          somam {formatCurrency(expenses)}, com saldo estimado de{" "}
          {formatCurrency(profit)}.
        </p>

        <div
          className="h-44 rounded-xl border border-border bg-background p-4"
          aria-label="Gráfico de receita e despesas por período"
        >
          <div className="flex h-full items-end gap-2">
            {data.cashFlow.map((point) => (
              <div
                key={point.label}
                className="flex min-w-0 flex-1 flex-col items-center gap-2"
              >
                <div className="flex h-28 w-full items-end justify-center gap-1">
                  <span
                    className="w-full max-w-5 rounded-t-md bg-primary"
                    style={{
                      height: `${Math.max(8, (point.revenue / maxValue) * 100)}%`,
                    }}
                    title={`Receita ${point.label}: ${formatCurrency(point.revenue)}`}
                  />
                  <span
                    className="w-full max-w-5 rounded-t-md bg-destructive/70"
                    style={{
                      height: `${Math.max(8, (point.expenses / maxValue) * 100)}%`,
                    }}
                    title={`Despesas ${point.label}: ${formatCurrency(point.expenses)}`}
                  />
                </div>
                <span className="truncate text-[11px] text-muted-foreground">
                  {point.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CompactAmount({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "success" | "destructive" | "primary";
}) {
  return (
    <div className="rounded-xl border border-border bg-muted/35 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-1 text-lg font-semibold",
          tone === "success" && "text-success",
          tone === "destructive" && "text-destructive",
          tone === "primary" && "text-primary",
        )}
      >
        {formatCurrency(value)}
      </p>
    </div>
  );
}

function TransactionsSection({
  title,
  description,
  entries,
  noResults,
  onClearFilters,
  onSelectEntry,
  compact = false,
  actionLabel,
  onAction,
}: {
  title: string;
  description: string;
  entries: FinancialEntry[];
  noResults: boolean;
  onClearFilters: () => void;
  onSelectEntry: (entry: FinancialEntry) => void;
  compact?: boolean;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <Card className="rounded-2xl">
      <CardHeader className="flex-row items-start justify-between gap-3">
        <div>
          <CardTitle>{title}</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          <p className="mt-3 text-sm text-muted-foreground">
            {entries.length} {entries.length === 1 ? "lançamento" : "lançamentos"} no período
          </p>
        </div>
        {actionLabel && onAction ? (
          <Button type="button" variant="outline" size="sm" onClick={onAction}>
            {actionLabel}
          </Button>
        ) : null}
      </CardHeader>
      <CardContent>
        {noResults ? (
          <NoResultsState onClear={onClearFilters} />
        ) : (
          <>
            <div className="space-y-3 md:hidden">
              {entries.map((entry) => (
                <TransactionMobileCard
                  key={entry.id}
                  entry={entry}
                  onSelect={() => onSelectEntry(entry)}
                />
              ))}
            </div>
            <div className="hidden md:block">
              <TableContainer>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Descrição</TableHead>
                      {!compact ? <TableHead>Tipo</TableHead> : null}
                      <TableHead className="hidden lg:table-cell">Cliente</TableHead>
                      <TableHead className="hidden xl:table-cell">Método</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {entries.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell className="whitespace-nowrap">
                          {formatDate(entry.date)}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{entry.description}</p>
                            <p className="text-xs text-muted-foreground">
                              {entry.service ?? entry.category}
                            </p>
                          </div>
                        </TableCell>
                        {!compact ? (
                          <TableCell>
                            <Badge variant="outline">
                              {FINANCIAL_TYPE_LABELS[entry.type]}
                            </Badge>
                          </TableCell>
                        ) : null}
                        <TableCell className="hidden lg:table-cell">
                          {entry.customer ?? "Não informado"}
                        </TableCell>
                        <TableCell className="hidden xl:table-cell">
                          {FINANCIAL_METHOD_LABELS[entry.method]}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={entry.status} />
                        </TableCell>
                        <TableCell
                          className={cn(
                            "text-right font-semibold",
                            entry.type === "expense" || entry.type === "refund"
                              ? "text-destructive"
                              : "text-success",
                          )}
                        >
                          {signedAmount(entry)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => onSelectEntry(entry)}
                          >
                            <Eye className="size-4" />
                            Ver
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function TransactionMobileCard({
  entry,
  onSelect,
}: {
  entry: FinancialEntry;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="w-full rounded-xl border border-border bg-background p-4 text-left shadow-sm transition-colors hover:bg-muted/50"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-semibold">{entry.description}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {formatDate(entry.date)} · {FINANCIAL_TYPE_LABELS[entry.type]}
            {entry.customer ? ` · ${entry.customer}` : ` · ${entry.category}`}
          </p>
        </div>
        <StatusBadge status={entry.status} />
      </div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <span className="text-xs text-muted-foreground">
          {FINANCIAL_METHOD_LABELS[entry.method]} · tocar para ver
        </span>
        <span
          className={cn(
            "font-semibold",
            entry.type === "expense" || entry.type === "refund"
              ? "text-destructive"
              : "text-success",
          )}
        >
          {signedAmount(entry)}
        </span>
      </div>
    </button>
  );
}

function StatusBadge({ status }: { status: FinancialStatus }) {
  return (
    <Badge variant={STATUS_BADGE_VARIANT[status]}>
      {FINANCIAL_STATUS_LABELS[status]}
    </Badge>
  );
}

function PendingPayments({
  entries,
  onSelectEntry,
  onMarkPaid,
  compact = false,
  actionLabel,
  onAction,
}: {
  entries: FinancialEntry[];
  onSelectEntry: (entry: FinancialEntry) => void;
  onMarkPaid: (entry: FinancialEntry) => void;
  compact?: boolean;
  actionLabel?: string;
  onAction?: () => void;
}) {
  if (!entries.length) {
    return (
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Nenhum pagamento pendente</CardTitle>
          <p className="text-sm text-muted-foreground">
            Quando houver valores a receber, eles aparecerão aqui para cobrança.
          </p>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="rounded-2xl">
      <CardHeader className="flex-row items-start justify-between gap-3">
        <div>
          <CardTitle>Pagamentos pendentes</CardTitle>
          <p className="text-sm text-muted-foreground">
            Vencidos primeiro, com cobrança rápida.
          </p>
        </div>
        {actionLabel && onAction ? (
          <Button type="button" variant="outline" size="sm" onClick={onAction}>
            {actionLabel}
          </Button>
        ) : null}
      </CardHeader>
      <CardContent
        className={cn(
          "space-y-3 overflow-y-auto pr-2",
          compact ? "max-h-[24rem]" : "max-h-[34rem]",
        )}
      >
        {entries.map((entry) => (
          <div
            key={entry.id}
            className="rounded-xl border border-border bg-background p-3 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{entry.customer}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {entry.service} · vencimento {formatDate(entry.dueDate)}
                </p>
              </div>
              <StatusBadge status={entry.status} />
            </div>
            <div className="mt-3 flex items-end justify-between gap-3">
              <div>
                <p className="text-xs text-muted-foreground">Em aberto</p>
                <p className="text-lg font-semibold">
                  {formatCurrency(entry.outstandingAmount)}
                </p>
              </div>
              {entry.appointmentId ? (
                <p
                  className="max-w-[11rem] truncate rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground"
                  title={entry.appointmentId}
                >
                  {entry.appointmentId}
                </p>
              ) : null}
            </div>
            <div className={cn("mt-3 grid gap-2", compact ? "grid-cols-2" : "grid-cols-3")}>
              {entry.source === "appointment" ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onSelectEntry(entry)}
                >
                  <CheckCircle2 className="size-4" />
                  Checkout
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onMarkPaid(entry)}
                >
                  <CheckCircle2 className="size-4" />
                  Pago
                </Button>
              )}
              <Button
                type="button"
                size="sm"
                title={`Olá, ${entry.customer}! Passando para lembrar do pagamento pendente referente ao serviço ${entry.service}, no valor de ${formatCurrency(entry.amount)}. Qualquer dúvida, fico à disposição.`}
              >
                <MessageCircle className="size-4" />
                Cobrar
              </Button>
              {!compact ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onSelectEntry(entry)}
                >
                  <Eye className="size-4" />
                  Ver
                </Button>
              ) : null}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function PaymentMethods({ data }: { data: FinancialViewData }) {
  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle>Métodos de pagamento</CardTitle>
        <p className="text-sm text-muted-foreground">
          Participação no recebimento do período.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {data.paymentMethods.map((method) => (
          <div key={method.method} className="space-y-1">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="font-medium">{method.label}</span>
              <span className="text-muted-foreground">
                {method.percentage}% · {formatCurrency(method.amount)}
              </span>
            </div>
            <div className="h-2 rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${method.percentage}%` }}
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function RecommendedActions({
  data,
  onOpenPending,
}: {
  data: FinancialViewData;
  onOpenPending: () => void;
}) {
  const overdueCount = data.pendingPayments.filter(
    (entry) => entry.status === "overdue",
  ).length;
  const recentExpenses = data.expenses.length;
  const pendingCount = data.pendingPayments.length;

  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle>Ações recomendadas</CardTitle>
        <p className="text-sm text-muted-foreground">
          Próximos passos para fechar o período com menos pendências.
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        <RecommendedActionRow
          title={`Cobrar ${overdueCount} pagamentos vencidos`}
          detail="Priorize clientes com vencimento mais antigo."
          onClick={onOpenPending}
        />
        <RecommendedActionRow
          title={`Conferir ${recentExpenses} despesas recentes`}
          detail="Veja se todos os custos do período foram lançados."
        />
        <RecommendedActionRow
          title={`Registrar pagamento de ${pendingCount} pendências`}
          detail="Dê baixa quando o cliente confirmar o pagamento."
          onClick={onOpenPending}
        />
      </CardContent>
    </Card>
  );
}

function RecommendedActionRow({
  title,
  detail,
  onClick,
}: {
  title: string;
  detail: string;
  onClick?: () => void;
}) {
  const Comp = onClick ? "button" : "div";

  return (
    <Comp
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "block w-full rounded-xl border border-border bg-background p-3 text-left",
        onClick && "transition-colors hover:bg-muted/50",
      )}
    >
      <p className="text-sm font-semibold">{title}</p>
      <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
    </Comp>
  );
}

function ServiceRevenueRanking({ data }: { data: FinancialViewData }) {
  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle>Serviços mais rentáveis</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {data.serviceRevenue.map((item, index) => (
          <RankingRow
            key={item.service}
            index={index}
            title={item.service}
            value={formatCurrency(item.revenue)}
            detail={`${item.appointments} agendamentos · ticket ${formatCurrency(item.averageTicket)}`}
          />
        ))}
      </CardContent>
    </Card>
  );
}

function TopCustomersRanking({ data }: { data: FinancialViewData }) {
  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle>Clientes com maior faturamento</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {data.topCustomers.map((customer, index) => (
          <RankingRow
            key={customer.name}
            index={index}
            title={customer.name}
            value={formatCurrency(customer.total)}
            detail={`${customer.appointments} agendamentos · último atendimento ${formatDate(customer.lastVisit)}`}
          />
        ))}
      </CardContent>
    </Card>
  );
}

function RankingRow({
  index,
  title,
  value,
  detail,
}: {
  index: number;
  title: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-background p-3">
      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
        {index + 1}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{title}</p>
        <p className="text-xs text-muted-foreground">{detail}</p>
      </div>
      <p className="shrink-0 text-sm font-semibold">{value}</p>
    </div>
  );
}

function ExpensesSection({
  entries,
  onSelectEntry,
}: {
  entries: FinancialEntry[];
  onSelectEntry: (entry: FinancialEntry) => void;
}) {
  if (!entries.length) return null;

  return (
    <Card className="rounded-2xl">
      <CardHeader className="pb-3">
        <CardTitle>Despesas do período</CardTitle>
        <p className="mt-1 text-sm text-muted-foreground">
          Custos lançados no período filtrado.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {entries.map((entry) => (
          <div
            key={entry.id}
            className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background p-3"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{entry.description}</p>
              <p className="text-xs text-muted-foreground">
                {entry.category} · {formatDate(entry.date)}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="font-semibold text-destructive">
                -{formatCurrency(entry.amount)}
              </p>
              <div className="mt-1 flex justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onSelectEntry(entry)}
                >
                  Ver
                </Button>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function ReportsGrid({
  data,
  exportQuery,
}: {
  data: FinancialViewData;
  exportQuery: string;
}) {
  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle>Relatórios</CardTitle>
        <p className="text-sm text-muted-foreground">
          Exporte análises do período com os filtros selecionados.
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {data.reports.map((report) => (
            <div
              key={report.id}
              className="rounded-xl border border-border bg-background p-4"
            >
              <div className="flex items-start gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                  <FileSpreadsheet className="size-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{report.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {report.description}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(["csv", "xls", "pdf"] as const).map((format) => (
                      <a
                        key={format}
                        href={`/api/provider/financial/export?${exportQuery}&report=${report.id}&format=${format}`}
                        className="rounded-full border border-border px-2.5 py-1 text-xs font-semibold text-primary transition-colors hover:bg-primary/10"
                      >
                        {format === "xls"
                          ? "Excel"
                          : format === "pdf"
                            ? "PDF"
                            : "CSV"}
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          Os arquivos respeitam período, busca e filtros aplicados.
        </p>
      </CardContent>
    </Card>
  );
}

function FinancialSettingsCard({
  data,
  action,
}: {
  data: FinancialViewData;
  action: FinancialAction;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(action, {});
  const acceptedMethods = new Set(data.settings.acceptedMethods);

  useEffect(() => {
    if (!state.success) return;
    router.refresh();
  }, [router, state.success]);

  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle>Configurações financeiras</CardTitle>
        <p className="text-sm text-muted-foreground">
          Preferências que controlam cobrança, vencimento e relatórios.
        </p>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-5">
          <input type="hidden" name="currency" value="BRL" />
          <FormFeedback state={state} />
        <div className="grid gap-3 md:grid-cols-2">
          <SettingPill label="Moeda" value={data.settings.currency} />
          <SettingPill
            label="Controle de pagamento"
            value={data.settings.manualControl ? "Controle manual ativo" : "Automático"}
          />
          <SettingPill
            label="Pagamento no local"
            value={data.settings.payAtLocation ? "Permitido" : "Desativado"}
          />
          <SettingPill
            label="Checkout obrigatório"
            value={data.settings.requireCheckout ? "Ativo" : "Opcional"}
          />
        </div>
        <div className="rounded-xl border border-border bg-background p-4">
          <p className="text-sm font-semibold">Métodos aceitos</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {(Object.entries(FINANCIAL_METHOD_LABELS) as Array<
              [FinancialMethod, string]
            >).map(([method, label]) => (
              <label
                key={method}
                className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm"
              >
                <input
                  type="checkbox"
                  name="acceptedMethods"
                  value={method}
                  defaultChecked={acceptedMethods.has(method)}
                  className="size-4 accent-primary"
                />
                {label}
              </label>
            ))}
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Categorias de receita">
            <Input
              name="revenueCategories"
              defaultValue={data.settings.revenueCategories.join(", ")}
            />
          </Field>
          <Field label="Categorias de despesa">
            <Input
              name="expenseCategories"
              defaultValue={data.settings.expenseCategories.join(", ")}
            />
          </Field>
          <Field label="Prazo padrão de vencimento">
            <Input
              name="defaultDueDays"
              type="number"
              min="0"
              max="90"
              defaultValue={data.settings.defaultDueDays}
            />
          </Field>
          <div className="space-y-2">
            <Label>Regras</Label>
            <div className="space-y-2 rounded-xl border border-border bg-background p-3">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="manualControl"
                  defaultChecked={data.settings.manualControl}
                  className="size-4 accent-primary"
                />
                Controle manual de pagamentos
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="payAtLocation"
                  defaultChecked={data.settings.payAtLocation}
                  className="size-4 accent-primary"
                />
                Permitir pagamento no local
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="requireCheckout"
                  defaultChecked={data.settings.requireCheckout}
                  className="size-4 accent-primary"
                />
                Exigir checkout para finalizar atendimento
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="allowPartialPayments"
                  defaultChecked={data.settings.allowPartialPayments}
                  className="size-4 accent-primary"
                />
                Permitir pagamentos parciais
              </label>
            </div>
          </div>
        </div>
        <Field label="Mensagem padrão de cobrança">
          <Textarea
            name="reminderTemplate"
            defaultValue={data.settings.reminderTemplate}
          />
        </Field>
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando..." : "Salvar configurações"}
        </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function SettingPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-background p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  );
}

function PanelShell({
  title,
  description,
  children,
  onClose,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[80] flex items-end bg-foreground/30 sm:items-stretch sm:justify-end"
      role="dialog"
      aria-modal="true"
      aria-labelledby="financial-panel-title"
    >
      <aside className="flex max-h-[92dvh] w-full flex-col rounded-t-3xl border border-border bg-background shadow-2xl sm:h-full sm:max-h-none sm:w-[30rem] sm:rounded-none sm:border-y-0 sm:border-r-0">
        <div className="flex items-center gap-3 border-b border-border px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Fechar"
          >
            <X className="size-5" />
          </button>
          <div>
            <h2 id="financial-panel-title" className="text-lg font-semibold">
              {title}
            </h2>
            {description ? (
              <p className="mt-1 text-sm text-muted-foreground">{description}</p>
            ) : null}
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-5">{children}</div>
      </aside>
    </div>
  );
}

function AddFinancialEntryPanel({
  customers,
  services,
  action,
  entry,
  onClose,
}: {
  customers: FinancialOption[];
  services: FinancialOption[];
  action: FinancialAction;
  entry?: FinancialEntry;
  onClose: () => void;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(action, {});
  const isEditing = Boolean(entry);

  useEffect(() => {
    if (!state.success) return;
    onClose();
    router.refresh();
  }, [onClose, router, state.success]);

  return (
    <PanelShell
      title={isEditing ? "Editar lançamento" : "Adicionar lançamento"}
      description={
        isEditing
          ? "Atualize os dados do lançamento com trilha de auditoria."
          : "Registre uma receita, despesa ou ajuste manual."
      }
      onClose={onClose}
    >
      <form action={formAction} className="space-y-5">
        {entry ? <input type="hidden" name="id" value={entry.id} /> : null}
        <FormFeedback state={state} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Tipo">
            <Select
              name="type"
              defaultValue={entry ? TYPE_TO_FORM_VALUE[entry.type] : "REVENUE"}
              required
            >
              {FORM_TYPE_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
            <FieldError message={state.fieldErrors?.type} />
          </Field>
          <Field label="Valor">
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                R$
              </span>
              <Input
                name="amount"
                inputMode="decimal"
                placeholder="0,00"
                defaultValue={moneyInputValue(entry?.amount)}
                className="pl-9"
                required
              />
            </div>
            <FieldError message={state.fieldErrors?.amount} />
          </Field>
          <Field label="Data">
            <Input
              name="entryDate"
              type="date"
              defaultValue={dateInputValue(entry?.date)}
              required
            />
            <FieldError message={state.fieldErrors?.entryDate} />
          </Field>
          <Field label="Status">
            <Select
              name="status"
              defaultValue={entry ? STATUS_TO_FORM_VALUE[entry.status] : "PAID"}
              required
            >
              {FORM_STATUS_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
            <FieldError message={state.fieldErrors?.status} />
          </Field>
        </div>
        <Field label="Descrição">
          <Input
            name="description"
            placeholder="Ex: Troca de óleo"
            defaultValue={entry?.description}
            required
          />
          <FieldError message={state.fieldErrors?.description} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Categoria">
            <Input
              name="category"
              placeholder="Produtos, comissão..."
              defaultValue={entry?.category === "Sem categoria" ? "" : entry?.category}
            />
            <FieldError message={state.fieldErrors?.category} />
          </Field>
          <Field label="Método de pagamento">
            <Select
              name="paymentMethod"
              defaultValue={entry ? METHOD_TO_FORM_VALUE[entry.method] : "PIX"}
            >
              {FORM_METHOD_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
            <FieldError message={state.fieldErrors?.paymentMethod} />
          </Field>
          <Field label="Cliente opcional">
            <Select name="customerId" defaultValue={entry?.customerId ?? ""}>
              <option value="">Sem cliente vinculado</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                </option>
              ))}
            </Select>
            <FieldError message={state.fieldErrors?.customerId} />
          </Field>
          <Field label="Serviço opcional">
            <Select name="serviceId" defaultValue={entry?.serviceId ?? ""}>
              <option value="">Sem serviço vinculado</option>
              {services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name}
                </option>
              ))}
            </Select>
            <FieldError message={state.fieldErrors?.serviceId} />
          </Field>
          <Field label="Vencimento opcional">
            <Input name="dueDate" type="date" defaultValue={entry?.dueDate} />
            <FieldError message={state.fieldErrors?.dueDate} />
          </Field>
          <Field label="Agendamento opcional">
            <Input
              name="appointmentId"
              placeholder="UUID do agendamento"
              defaultValue={entry?.appointmentId}
            />
            <FieldError message={state.fieldErrors?.appointmentId} />
          </Field>
        </div>
        <Field label="Observações">
          <Textarea
            name="notes"
            placeholder="Informações internas sobre este lançamento"
            defaultValue={entry?.notes}
          />
          <FieldError message={state.fieldErrors?.notes} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={pending}>
            {pending
              ? "Salvando..."
              : isEditing
                ? "Salvar alterações"
                : "Salvar lançamento"}
          </Button>
        </div>
      </form>
    </PanelShell>
  );
}

function FinancialEntryDetailsPanel({
  entry,
  cancelAction,
  registerPaymentAction,
  refundAction,
  checkoutAction,
  onEdit,
  onClose,
}: {
  entry: FinancialEntry;
  cancelAction: FinancialAction;
  registerPaymentAction: FinancialAction;
  refundAction: FinancialAction;
  checkoutAction: FinancialAction;
  onEdit: () => void;
  onClose: () => void;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(registerPaymentAction, {});
  const [cancelState, cancelFormAction, cancelPending] = useActionState(
    cancelAction,
    {},
  );
  const [refundState, refundFormAction, refundPending] = useActionState(
    refundAction,
    {},
  );
  const [checkoutState, checkoutFormAction, checkoutPending] = useActionState(
    checkoutAction,
    {},
  );
  const reminderText = encodeURIComponent(
    `Olá${entry.customer ? `, ${entry.customer}` : ""}! Lembrete do pagamento pendente de ${formatCurrency(entry.amount)} referente a ${entry.service ?? entry.description}.`,
  );
  const canMutate = entry.source !== "appointment" && entry.status !== "canceled";

  useEffect(() => {
    if (
      !state.success &&
      !checkoutState.success &&
      !cancelState.success &&
      !refundState.success
    ) {
      return;
    }
    router.refresh();
  }, [
    cancelState.success,
    checkoutState.success,
    refundState.success,
    router,
    state.success,
  ]);

  return (
    <PanelShell title="Detalhe do lançamento" onClose={onClose}>
      <div className="space-y-5">
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                {FINANCIAL_TYPE_LABELS[entry.type]}
              </p>
              <h3 className="mt-1 text-xl font-semibold">{entry.description}</h3>
            </div>
            <StatusBadge status={entry.status} />
          </div>
          <p className="mt-4 text-2xl font-semibold">
            {formatCurrency(entry.amount)}
          </p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <CompactAmount
              label="Recebido"
              value={entry.paidAmount}
              tone="success"
            />
            <CompactAmount
              label="Em aberto"
              value={entry.outstandingAmount}
              tone={entry.outstandingAmount > 0 ? "destructive" : "primary"}
            />
          </div>
        </div>
        <DetailGrid entry={entry} />
        {canMutate ? (
          <Button type="button" variant="outline" className="w-full" onClick={onEdit}>
            Editar lançamento
          </Button>
        ) : null}
        <div className="rounded-xl border border-border bg-background p-4">
          <p className="text-sm font-semibold">Histórico</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Criado em {formatDate(entry.date)}.{" "}
            {entry.notes ?? "Nenhuma observação registrada para este lançamento."}
          </p>
        </div>
        <div className="grid gap-2">
          {entry.source === "appointment" ? (
            <CheckoutFromFinancialForm
              entry={entry}
              state={checkoutState}
              action={checkoutFormAction}
              pending={checkoutPending}
            />
          ) : entry.outstandingAmount > 0 && entry.status !== "canceled" ? (
            <form action={formAction} className="rounded-xl border border-border bg-background p-4">
              <input type="hidden" name="id" value={entry.id} />
              <FormFeedback state={state} />
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Data do pagamento">
                  <Input
                    name="paidAt"
                    type="date"
                    defaultValue={todayInputValue()}
                  />
                </Field>
                <Field label="Valor recebido">
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                      R$
                    </span>
                    <Input
                      name="amount"
                      inputMode="decimal"
                      defaultValue={moneyInputValue(entry.outstandingAmount)}
                      className="pl-9"
                      required
                    />
                  </div>
                  <FieldError message={state.fieldErrors?.amount} />
                </Field>
                <Field label="Método">
                  <Select
                    name="paymentMethod"
                    defaultValue={METHOD_TO_FORM_VALUE[entry.method]}
                  >
                    {FORM_METHOD_OPTIONS.map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
              <Field label="Observação do pagamento">
                <Input
                  name="notes"
                  placeholder="Ex: pagamento parcial, pix confirmado..."
                />
              </Field>
              <Button
                type="submit"
                variant="outline"
                className="mt-2 w-full"
              disabled={
                pending ||
                entry.outstandingAmount <= 0 ||
                state.success
              }
              >
                <CheckCircle2 className="size-4" />
                {pending
                  ? "Registrando..."
                  : state.success
                    ? "Pago registrado"
                    : "Registrar pagamento"}
              </Button>
            </form>
          ) : null}
          {entry.payments?.length ? (
            <div className="rounded-xl border border-border bg-background p-4">
              <p className="text-sm font-semibold">Pagamentos registrados</p>
              <div className="mt-3 space-y-2">
                {entry.payments.map((payment) => (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between gap-3 rounded-lg bg-muted/50 px-3 py-2 text-sm"
                  >
                    <span>
                      {formatDate(payment.paidAt)} ·{" "}
                      {FINANCIAL_METHOD_LABELS[payment.method]}
                    </span>
                    <span className="font-semibold">
                      {formatCurrency(payment.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          <Button type="button" variant="outline" asChild>
            <a
              href={`https://wa.me/?text=${reminderText}`}
              target="_blank"
              rel="noopener noreferrer"
            >
            <MessageCircle className="size-4" />
            Enviar lembrete pelo WhatsApp
            </a>
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={!entry.appointmentId}
            title={
              entry.appointmentId
                ? "Preparado para abrir o agendamento relacionado"
                : "Este lançamento não tem agendamento relacionado"
            }
          >
            Abrir agendamento relacionado
          </Button>
          {canMutate && entry.type === "revenue" && entry.paidAmount > 0 ? (
            <form action={refundFormAction} className="rounded-xl border border-border bg-background p-4">
              <input type="hidden" name="id" value={entry.id} />
              <FormFeedback state={refundState} />
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Valor do estorno">
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                      R$
                    </span>
                    <Input
                      name="amount"
                      inputMode="decimal"
                      defaultValue={moneyInputValue(entry.paidAmount)}
                      className="pl-9"
                      required
                    />
                  </div>
                  <FieldError message={refundState.fieldErrors?.amount} />
                </Field>
                <Field label="Motivo do estorno">
                  <Input
                    name="reason"
                    placeholder="Ex: cliente reembolsado"
                    required
                  />
                  <FieldError message={refundState.fieldErrors?.reason} />
                </Field>
              </div>
              <Button
                type="submit"
                variant="outline"
                className="mt-3 w-full"
                disabled={refundPending || refundState.success}
              >
                {refundPending ? "Estornando..." : "Registrar estorno"}
              </Button>
            </form>
          ) : null}
          {canMutate ? (
            <form action={cancelFormAction} className="rounded-xl border border-destructive/25 bg-destructive/5 p-4">
              <input type="hidden" name="id" value={entry.id} />
              <FormFeedback state={cancelState} />
              <Field label="Motivo do cancelamento">
                <Textarea
                  name="reason"
                  placeholder="Ex: lançamento duplicado ou valor registrado por engano"
                  required
                />
              </Field>
              <Button
                type="submit"
                variant="destructive"
                className="mt-3 w-full"
                disabled={cancelPending || cancelState.success}
              >
                {cancelPending ? "Cancelando..." : "Cancelar lançamento"}
              </Button>
            </form>
          ) : null}
        </div>
      </div>
    </PanelShell>
  );
}

function DetailGrid({ entry }: { entry: FinancialEntry }) {
  const items = [
    ["Data", formatDate(entry.date)],
    ["Vencimento", entry.dueDate ? formatDate(entry.dueDate) : "Não informado"],
    ["Cliente", entry.customer ?? "Não informado"],
    ["Serviço", entry.service ?? "Não vinculado"],
    ["Categoria", entry.category],
    ["Método", FINANCIAL_METHOD_LABELS[entry.method]],
    ["Agendamento", entry.appointmentId ?? "Não vinculado"],
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {items.map(([label, value]) => (
        <div key={label} className="rounded-xl border border-border bg-background p-3">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="mt-1 text-sm font-semibold">{value}</p>
        </div>
      ))}
    </div>
  );
}

function CheckoutFromFinancialForm({
  entry,
  state,
  action,
  pending,
}: {
  entry: FinancialEntry;
  state: { message?: string; fieldErrors?: Record<string, string[] | undefined>; success?: boolean };
  action: (data: FormData) => void;
  pending: boolean;
}) {
  const amount = entry.amount.toFixed(2);

  return (
    <form action={action} className="rounded-xl border border-border bg-background p-4">
      <input type="hidden" name="id" value={entry.appointmentId ?? entry.id} />
      <FormFeedback state={state} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Método">
          <Select name="paymentMethod" defaultValue="PIX" required>
            {FORM_METHOD_OPTIONS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
          <FieldError message={state.fieldErrors?.paymentMethod} />
        </Field>
        <Field label="Valor">
          <Input
            name="amount"
            type="number"
            min="0"
            step="0.01"
            defaultValue={amount}
            required
          />
          <FieldError message={state.fieldErrors?.amount} />
        </Field>
        <Field label="Gorjeta">
          <Input name="tip" type="number" min="0" step="0.01" defaultValue="0" />
          <FieldError message={state.fieldErrors?.tip} />
        </Field>
        <Field label="Desconto">
          <Input
            name="discount"
            type="number"
            min="0"
            step="0.01"
            defaultValue="0"
          />
          <FieldError message={state.fieldErrors?.discount} />
        </Field>
      </div>
      <Button
        type="submit"
        variant="outline"
        className="mt-4 w-full"
        disabled={pending || state.success}
      >
        <CheckCircle2 className="size-4" />
        {pending
          ? "Confirmando..."
          : state.success
            ? "Checkout concluído"
            : "Confirmar checkout"}
      </Button>
    </form>
  );
}

function AdvancedFiltersPanel({
  filters,
  services,
  categories,
  onChange,
  onClose,
}: {
  filters: FinancialFilters;
  services: string[];
  categories: string[];
  onChange: (filters: FinancialFilters) => void;
  onClose: () => void;
}) {
  return (
    <PanelShell title="Filtros avançados" onClose={onClose}>
      <div className="space-y-4">
        <Field label="Status do pagamento">
          <Select
            value={filters.status}
            onChange={(event) =>
              onChange({
                ...filters,
                status: event.currentTarget.value as FinancialFilters["status"],
              })
            }
          >
            <option value="all">Todos os status</option>
            {Object.entries(FINANCIAL_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Método de pagamento">
          <Select
            value={filters.method}
            onChange={(event) =>
              onChange({
                ...filters,
                method: event.currentTarget.value as FinancialFilters["method"],
              })
            }
          >
            <option value="all">Todos os métodos</option>
            {Object.entries(FINANCIAL_METHOD_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Tipo de lançamento">
          <Select
            value={filters.type}
            onChange={(event) =>
              onChange({
                ...filters,
                type: event.currentTarget.value as FinancialFilters["type"],
              })
            }
          >
            <option value="all">Todos os tipos</option>
            {Object.entries(FINANCIAL_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Categoria de serviço">
          <Select
            value={filters.category}
            onChange={(event) =>
              onChange({ ...filters, category: event.currentTarget.value })
            }
          >
            <option value="all">Todas as categorias</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Serviço">
          <Select
            value={filters.service}
            onChange={(event) =>
              onChange({ ...filters, service: event.currentTarget.value })
            }
          >
            <option value="all">Todos os serviços</option>
            {services.map((service) => (
              <option key={service} value={service}>
                {service}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Profissional">
          <Select
            value={filters.professional}
            onChange={(event) =>
              onChange({ ...filters, professional: event.currentTarget.value })
            }
          >
            <option value="all">Todos os profissionais</option>
            <option value="marcos">Marcos Silva</option>
            <option value="ana">Ana Paula</option>
          </Select>
        </Field>
        <Button
          type="button"
          variant="outline"
          onClick={() => onChange(DEFAULT_FILTERS)}
        >
          <RefreshCw className="size-4" />
          Limpar filtros
        </Button>
      </div>
    </PanelShell>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function NoResultsState({ onClear }: { onClear: () => void }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-background p-8 text-center">
      <Filter className="mx-auto mb-3 size-8 text-muted-foreground" />
      <p className="font-semibold">Nenhum lançamento encontrado</p>
      <p className="mt-1 text-sm text-muted-foreground">
        Nenhum lançamento encontrado para os filtros selecionados.
      </p>
      <Button type="button" variant="outline" className="mt-4" onClick={onClear}>
        Limpar filtros
      </Button>
    </div>
  );
}

function FinancialEmptyState({
  activeTab,
  onAdd,
}: {
  activeTab: FinancialTab;
  onAdd: () => void;
}) {
  const content: Record<FinancialTab, { title: string; description: string }> = {
    summary: {
      title: "Nenhum lançamento financeiro ainda",
      description:
        "Quando receitas e despesas forem registradas, o resumo financeiro aparecerá aqui.",
    },
    transactions: {
      title: "Nenhum lançamento registrado",
      description:
        "Adicione receitas, despesas ou ajustes para montar seu extrato financeiro.",
    },
    pending: {
      title: "Nenhum pagamento pendente",
      description: "Quando houver valores a receber, eles aparecerão aqui.",
    },
    reports: {
      title: "Relatórios aparecerão quando houver dados",
      description:
        "As exportações serão úteis assim que houver lançamentos no financeiro.",
    },
    settings: {
      title: "Configurações financeiras",
      description: "As preferências financeiras ficam disponíveis nesta aba.",
    },
  };

  return (
    <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center shadow-sm">
      <BarChart3 className="mx-auto mb-4 size-10 text-primary" />
      <h2 className="text-lg font-semibold">{content[activeTab].title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
        {content[activeTab].description}
      </p>
      {activeTab !== "settings" ? (
        <Button type="button" className="mt-5" onClick={onAdd}>
          <Plus className="size-4" />
          Adicionar primeiro lançamento
        </Button>
      ) : null}
    </div>
  );
}

function FinancialErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center">
      <p className="font-semibold text-destructive">
        Não foi possível carregar o financeiro
      </p>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
        Verifique sua conexão e tente carregar os dados novamente.
      </p>
      <Button type="button" className="mt-5" onClick={onRetry}>
        Tentar novamente
      </Button>
    </div>
  );
}

function StateSwitcher({
  state,
  onChange,
}: {
  state: FinancialViewState;
  onChange: (state: FinancialViewState) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-dashed border-border bg-muted/35 px-3 py-2 text-xs text-muted-foreground">
      <span className="font-medium text-foreground">Estados da UI:</span>
      {(["ready", "loading", "empty", "error"] as FinancialViewState[]).map(
        (item) => (
          <button
            key={item}
            type="button"
            onClick={() => onChange(item)}
            className={cn(
              "rounded-full px-2.5 py-1 font-medium transition-colors",
              state === item
                ? "bg-primary text-primary-foreground"
                : "bg-background hover:text-foreground",
            )}
          >
            {item === "ready"
              ? "Com dados"
              : item === "loading"
                ? "Carregando"
                : item === "empty"
                  ? "Vazio"
                  : "Erro"}
          </button>
        ),
      )}
    </div>
  );
}

export function FinancialSkeleton() {
  return (
    <div className="mx-auto max-w-[1400px] space-y-4">
      <div className="h-28 animate-pulse rounded-2xl bg-muted" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-28 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        <div className="h-96 animate-pulse rounded-2xl bg-muted" />
        <div className="space-y-4">
          <div className="h-72 animate-pulse rounded-2xl bg-muted" />
          <div className="h-56 animate-pulse rounded-2xl bg-muted" />
        </div>
      </div>
    </div>
  );
}
