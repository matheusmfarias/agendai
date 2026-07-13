"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarClock,
  CalendarX2,
  Clock3,
  Pencil,
  Plus,
  Search,
} from "lucide-react";

import { AvailabilityRuleForm } from "@/components/forms/availability-rule-form";
import { ProviderStatusForm } from "@/components/forms/provider-status-form";
import { ScheduleBlockForm } from "@/components/forms/schedule-block-form";
import { PageHeading } from "@/components/layout/page-heading";
import {
  MetricCard as ModuleMetricCard,
  ModulePage,
  ModuleTabs,
  ModuleToolbar,
} from "@/components/layout/module-page";
import { PanelShell } from "@/components/layout/panel-shell";
import { SuccessAlert } from "@/components/layout/success-alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { getWeekdayLabel } from "@/features/availability/availability-constants";
import { formatDateTime } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import type { FormActionState } from "@/types/form-state";

export type AvailabilityRuleRow = {
  id: string;
  weekday: number;
  startTime: string;
  endTime: string;
  slotIntervalMinutes: number;
  isActive: boolean;
};

export type ScheduleBlockRow = {
  id: string;
  startsAt: string;
  endsAt: string;
  reason: string;
  createdByName: string;
};

type AvailabilityFormValues = {
  id?: string;
  weekday: number;
  startTime: string;
  endTime: string;
  slotIntervalMinutes: number;
  isActive: boolean;
};

type ScheduleBlockFormValues = {
  id?: string;
  startsAt: string;
  endsAt: string;
  reason: string;
};

type AvailabilityTab = "availability" | "blocks";

type ProviderAvailabilityViewProps = {
  rows: AvailabilityRuleRow[];
  blocks: ScheduleBlockRow[];
  selectedRule: AvailabilityRuleRow | null;
  selectedBlock: ScheduleBlockRow | null;
  activeTab: AvailabilityTab;
  panelMode: "none" | "create" | "edit" | "block-create" | "block-edit";
  defaultSlotInterval: number;
  success?: string;
  createAction: (state: FormActionState, data: FormData) => Promise<FormActionState>;
  updateAction: (state: FormActionState, data: FormData) => Promise<FormActionState>;
  statusAction: (state: FormActionState, data: FormData) => Promise<FormActionState>;
  createBlockAction: (state: FormActionState, data: FormData) => Promise<FormActionState>;
  updateBlockAction: (state: FormActionState, data: FormData) => Promise<FormActionState>;
  deleteBlockAction: (state: FormActionState, data: FormData) => Promise<FormActionState>;
};

type AvailabilityDayGroup = {
  weekday: number;
  label: string;
  rules: AvailabilityRuleRow[];
};

function availabilityHref(params: Record<string, string | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }
  const query = search.toString();
  return query ? `/app/availability?${query}` : "/app/availability";
}

function tabHref(tab: AvailabilityTab) {
  return tab === "blocks" ? "/app/availability?tab=blocks" : "/app/availability";
}

function normalizeSearch(value: string | null | undefined) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

function sortAvailabilityRules(
  first: AvailabilityRuleRow,
  second: AvailabilityRuleRow,
) {
  return (
    first.weekday - second.weekday ||
    first.startTime.localeCompare(second.startTime) ||
    first.endTime.localeCompare(second.endTime)
  );
}

function groupRulesByDay(rows: AvailabilityRuleRow[]): AvailabilityDayGroup[] {
  const groups = new Map<number, AvailabilityRuleRow[]>();

  for (const rule of [...rows].sort(sortAvailabilityRules)) {
    groups.set(rule.weekday, [...(groups.get(rule.weekday) ?? []), rule]);
  }

  return Array.from(groups.entries()).map(([weekday, rules]) => ({
    weekday,
    label: getWeekdayLabel(weekday),
    rules,
  }));
}

function toDateTimeLocal(value: string) {
  const date = new Date(value);
  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function isFutureBlock(block: ScheduleBlockRow) {
  return new Date(block.endsAt).getTime() >= Date.now();
}

function MetricCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number | string;
  icon: typeof Clock3;
}) {
  return <ModuleMetricCard label={label} value={value} icon={<Icon className="size-4" />} tone="primary" />;
}

function TabButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant={active ? "default" : "ghost"}
      size="sm"
      className={cn("rounded-xl", !active && "text-muted-foreground")}
      onClick={onClick}
    >
      {label}
    </Button>
  );
}

function AvailabilityDayGroups({
  groups,
  onNavigate,
  statusAction,
}: {
  groups: AvailabilityDayGroup[];
  onNavigate: (href: string) => void;
  statusAction: ProviderAvailabilityViewProps["statusAction"];
}) {
  if (!groups.length) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-8 text-center">
        <p className="font-semibold">Nenhum horário encontrado</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Ajuste a busca ou limpe os filtros.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {groups.map((group) => {
        const activeCount = group.rules.filter((rule) => rule.isActive).length;

        return (
          <section
            key={group.weekday}
            className="overflow-hidden rounded-2xl border border-border bg-card"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/70 bg-muted/20 px-4 py-3">
              <div>
                <h3 className="font-semibold leading-tight">{group.label}</h3>
                <p className="text-xs text-muted-foreground">
                  {group.rules.length} faixa(s) - {activeCount} ativa(s)
                </p>
              </div>
              {activeCount === 0 ? (
                <Badge variant="outline">Sem faixas ativas</Badge>
              ) : null}
            </div>

            <div className="divide-y divide-border/70">
              {group.rules.map((rule) => (
                <div
                  key={rule.id}
                  className="grid gap-3 px-4 py-3 transition-colors hover:bg-primary/[0.035] sm:grid-cols-[1fr_auto] sm:items-center"
                >
                  <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
                    <p className="text-sm font-semibold">
                      {rule.startTime} às {rule.endTime}
                    </p>
                    <span className="text-xs text-muted-foreground">
                      intervalo de {rule.slotIntervalMinutes} min
                    </span>
                    {!rule.isActive ? (
                      <Badge variant="outline">Inativo</Badge>
                    ) : null}
                  </div>

                  <div className="flex items-center justify-between gap-2 sm:justify-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        onNavigate(
                          availabilityHref({ ruleId: rule.id, mode: "edit" }),
                        )
                      }
                      aria-label="Editar horário"
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <ProviderStatusForm
                      id={rule.id}
                      isActive={rule.isActive}
                      action={statusAction}
                      destructive={false}
                      confirmMessage={
                        rule.isActive
                          ? "Inativar este horário? Ele deixará de gerar opções no link público, mas poderá ser reativado depois."
                          : undefined
                      }
                      returnTo="/app/availability"
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function ScheduleBlockList({
  blocks,
  onNavigate,
  deleteAction,
}: {
  blocks: ScheduleBlockRow[];
  onNavigate: (href: string) => void;
  deleteAction: ProviderAvailabilityViewProps["deleteBlockAction"];
}) {
  if (!blocks.length) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-8 text-center">
        <p className="font-semibold">Nenhum bloqueio encontrado</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Ajuste a busca para encontrar outro período.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {blocks.map((block) => (
        <div
          key={block.id}
          className="grid gap-3 rounded-2xl border border-border bg-card p-4 sm:grid-cols-[1fr_auto]"
        >
          <div className="min-w-0 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-semibold">{block.reason}</h3>
              <Badge variant={isFutureBlock(block) ? "warning" : "outline"}>
                {isFutureBlock(block) ? "Bloqueando" : "Encerrado"}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {formatDateTime(new Date(block.startsAt))} até {formatDateTime(new Date(block.endsAt))}
            </p>
            <p className="text-xs text-muted-foreground">
              Criado por {block.createdByName}
            </p>
          </div>

          <div className="flex items-center justify-between gap-2 sm:justify-end">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() =>
                onNavigate(
                  availabilityHref({
                    tab: "blocks",
                    blockId: block.id,
                    mode: "edit",
                  }),
                )
              }
              aria-label="Editar bloqueio"
            >
              <Pencil className="size-4" />
            </Button>
            <ProviderStatusForm
              id={block.id}
              action={deleteAction}
              deleteMode
              destructive
              returnTo={tabHref("blocks")}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ProviderAvailabilityView({
  rows,
  blocks,
  selectedRule,
  selectedBlock,
  activeTab,
  panelMode,
  defaultSlotInterval,
  success,
  createAction,
  updateAction,
  statusAction,
  createBlockAction,
  updateBlockAction,
  deleteBlockAction,
}: ProviderAvailabilityViewProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [blockQuery, setBlockQuery] = useState("");

  function navigate(href: string) {
    router.push(href, { scroll: false });
  }

  function closePanel() {
    router.push(tabHref(activeTab), { scroll: false });
  }

  const filtered = useMemo(() => {
    const normalizedQuery = normalizeSearch(query);
    return rows.filter((rule) => {
      const matchesQuery =
        !normalizedQuery ||
        normalizeSearch(getWeekdayLabel(rule.weekday)).includes(normalizedQuery) ||
        `${rule.startTime} ${rule.endTime}`.includes(normalizedQuery);
      const matchesFilter =
        filter === "all" ||
        (filter === "active" && rule.isActive) ||
        (filter === "inactive" && !rule.isActive);
      return matchesQuery && matchesFilter;
    });
  }, [filter, query, rows]);
  const groupedRules = useMemo(() => groupRulesByDay(filtered), [filtered]);

  const filteredBlocks = useMemo(() => {
    const normalizedQuery = normalizeSearch(blockQuery);
    if (!normalizedQuery) return blocks;
    return blocks.filter((block) =>
      [block.reason, block.createdByName, formatDateTime(new Date(block.startsAt))]
        .map(normalizeSearch)
        .some((value) => value.includes(normalizedQuery)),
    );
  }, [blockQuery, blocks]);

  const activeRules = rows.filter((rule) => rule.isActive).length;
  const daysCovered = new Set(
    rows.filter((rule) => rule.isActive).map((rule) => rule.weekday),
  ).size;
  const activeBlocks = blocks.filter(isFutureBlock).length;

  const createDefaults: AvailabilityFormValues = {
    weekday: 1,
    startTime: "08:00",
    endTime: "18:00",
      slotIntervalMinutes: defaultSlotInterval,
    isActive: true,
  };
  const editDefaults: AvailabilityFormValues | null = selectedRule
    ? {
        id: selectedRule.id,
        weekday: selectedRule.weekday,
        startTime: selectedRule.startTime,
        endTime: selectedRule.endTime,
        slotIntervalMinutes: selectedRule.slotIntervalMinutes,
        isActive: selectedRule.isActive,
      }
    : null;
  const createBlockDefaults: ScheduleBlockFormValues = {
    startsAt: "",
    endsAt: "",
    reason: "",
  };
  const editBlockDefaults: ScheduleBlockFormValues | null = selectedBlock
    ? {
        id: selectedBlock.id,
        startsAt: toDateTimeLocal(selectedBlock.startsAt),
        endsAt: toDateTimeLocal(selectedBlock.endsAt),
        reason: selectedBlock.reason,
      }
    : null;
  const successContext = success?.startsWith("block-")
    ? "block"
    : "availability";

  return (
    <ModulePage>
      <PageHeading
        title="Horários"
        description="Defina atendimento semanal e bloqueios pontuais no mesmo lugar."
        actions={
          activeTab === "blocks" ? (
            <Button
              type="button"
              onClick={() =>
                navigate(availabilityHref({ tab: "blocks", panel: "block-new" }))
              }
            >
              <Plus className="size-4" />
              Novo bloqueio
            </Button>
          ) : (
            <Button
              type="button"
              onClick={() => navigate(availabilityHref({ panel: "new" }))}
            >
              <Plus className="size-4" />
              Novo horário
            </Button>
          )
        }
      />
      <SuccessAlert code={success} context={successContext} />

      <ModuleTabs label="Seções de horários" className="mb-4">
        <TabButton
          active={activeTab === "availability"}
          label="Atendimento"
          onClick={() => navigate(tabHref("availability"))}
        />
        <TabButton
          active={activeTab === "blocks"}
          label="Bloqueios"
          onClick={() => navigate(tabHref("blocks"))}
        />
      </ModuleTabs>

      {activeTab === "availability" ? (
        rows.length ? (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <MetricCard icon={Clock3} label="Faixas cadastradas" value={rows.length} />
              <MetricCard icon={CalendarClock} label="Faixas ativas" value={activeRules} />
              <MetricCard icon={CalendarClock} label="Dias atendidos" value={daysCovered} />
            </div>

            <Card className="overflow-hidden border-border/70 bg-card/95 py-0 shadow-sm">
              <ModuleToolbar className="grid gap-3 rounded-none border-x-0 border-t-0 shadow-none md:grid-cols-[1fr_12rem]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Buscar por dia ou horário..."
                    className="h-10 rounded-2xl border-border/70 bg-background/70 pl-9 shadow-none"
                  />
                </div>
                <Select
                  value={filter}
                  onChange={(event) => setFilter(event.target.value)}
                  dropdownStrategy="absolute"
                  className="h-10 rounded-2xl border-border/70 bg-background/70 shadow-none"
                >
                  <option value="all">Todos</option>
                  <option value="active">Ativos</option>
                  <option value="inactive">Inativos</option>
                </Select>
              </ModuleToolbar>

              <CardContent className="p-3">
                <AvailabilityDayGroups
                  groups={groupedRules}
                  onNavigate={navigate}
                  statusAction={statusAction}
                />
              </CardContent>
            </Card>
          </div>
        ) : (
          <EmptyState
            icon="clock"
            title="Nenhum horário configurado"
            description="Cadastre suas faixas de atendimento para liberar opções no link público e WhatsApp."
            action={
              <Button
                type="button"
                onClick={() => navigate(availabilityHref({ panel: "new" }))}
              >
                <Plus className="size-4" />
                Novo horário
              </Button>
            }
          />
        )
      ) : blocks.length ? (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <MetricCard icon={CalendarX2} label="Bloqueios cadastrados" value={blocks.length} />
            <MetricCard icon={CalendarX2} label="Ainda bloqueando" value={activeBlocks} />
          </div>

          <Card className="overflow-hidden border-border/70 bg-card/95 py-0 shadow-sm">
            <ModuleToolbar className="rounded-none border-x-0 border-t-0 shadow-none">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={blockQuery}
                  onChange={(event) => setBlockQuery(event.target.value)}
                  placeholder="Buscar por motivo, data ou responsável..."
                  className="h-10 rounded-2xl border-border/70 bg-background/70 pl-9 shadow-none"
                />
              </div>
            </ModuleToolbar>
            <CardContent className="p-3">
              <ScheduleBlockList
                blocks={filteredBlocks}
                onNavigate={navigate}
                deleteAction={deleteBlockAction}
              />
            </CardContent>
          </Card>
        </div>
      ) : (
        <EmptyState
          icon="calendar"
          title="Nenhum bloqueio cadastrado"
          description="Use bloqueios para fechar folgas, feriados ou compromissos específicos."
          action={
            <Button
              type="button"
              onClick={() =>
                navigate(availabilityHref({ tab: "blocks", panel: "block-new" }))
              }
            >
              <Plus className="size-4" />
              Novo bloqueio
            </Button>
          }
        />
      )}

      {panelMode === "create" ? (
        <PanelShell
          title="Novo horário"
          subtitle="Crie uma faixa semanal de atendimento"
          onClose={closePanel}
        >
          <AvailabilityRuleForm
            mode="create"
            action={createAction}
            defaultValues={createDefaults}
            returnTo="/app/availability"
          />
        </PanelShell>
      ) : null}

      {selectedRule && editDefaults && panelMode === "edit" ? (
        <PanelShell
          title="Editar horário"
          subtitle={`${getWeekdayLabel(selectedRule.weekday)} - ${selectedRule.startTime} às ${selectedRule.endTime}`}
          onClose={closePanel}
        >
          <AvailabilityRuleForm
            mode="edit"
            action={updateAction}
            defaultValues={editDefaults}
            returnTo="/app/availability"
          />
        </PanelShell>
      ) : null}

      {panelMode === "block-create" ? (
        <PanelShell
          title="Novo bloqueio"
          subtitle="Feche um período da agenda"
          onClose={closePanel}
        >
          <ScheduleBlockForm
            mode="create"
            action={createBlockAction}
            defaultValues={createBlockDefaults}
            returnTo={tabHref("blocks")}
          />
        </PanelShell>
      ) : null}

      {selectedBlock && editBlockDefaults && panelMode === "block-edit" ? (
        <PanelShell
          title="Editar bloqueio"
          subtitle={selectedBlock.reason}
          onClose={closePanel}
        >
          <ScheduleBlockForm
            mode="edit"
            action={updateBlockAction}
            defaultValues={editBlockDefaults}
            returnTo={tabHref("blocks")}
          />
        </PanelShell>
      ) : null}
    </ModulePage>
  );
}
