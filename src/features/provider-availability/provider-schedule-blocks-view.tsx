"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarX2, Pencil, Plus, Search } from "lucide-react";

import { ProviderStatusForm } from "@/components/forms/provider-status-form";
import { ScheduleBlockForm } from "@/components/forms/schedule-block-form";
import { PageHeading } from "@/components/layout/page-heading";
import { PanelShell } from "@/components/layout/panel-shell";
import { SuccessAlert } from "@/components/layout/success-alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { formatDateTime } from "@/lib/formatters";
import type { FormActionState } from "@/types/form-state";

export type ScheduleBlockRow = {
  id: string;
  startsAt: string;
  endsAt: string;
  reason: string;
  createdByName: string;
};

type ScheduleBlockFormValues = {
  id?: string;
  startsAt: string;
  endsAt: string;
  reason: string;
};

type ProviderScheduleBlocksViewProps = {
  rows: ScheduleBlockRow[];
  selectedBlock: ScheduleBlockRow | null;
  panelMode: "none" | "create" | "edit";
  success?: string;
  createAction: (state: FormActionState, data: FormData) => Promise<FormActionState>;
  updateAction: (state: FormActionState, data: FormData) => Promise<FormActionState>;
  deleteAction: (state: FormActionState, data: FormData) => Promise<FormActionState>;
};

function blocksHref(params: Record<string, string | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }
  const query = search.toString();
  return query ? `/app/availability/blocks?${query}` : "/app/availability/blocks";
}

function normalizeSearch(value: string | null | undefined) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

function toDateTimeLocal(value: string) {
  const date = new Date(value);
  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function isFutureBlock(block: ScheduleBlockRow) {
  return new Date(block.endsAt).getTime() >= Date.now();
}

export function ProviderScheduleBlocksView({
  rows,
  selectedBlock,
  panelMode,
  success,
  createAction,
  updateAction,
  deleteAction,
}: ProviderScheduleBlocksViewProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");

  function navigate(href: string) {
    router.push(href, { scroll: false });
  }

  function closePanel() {
    router.push("/app/availability/blocks", { scroll: false });
  }

  const filtered = useMemo(() => {
    const normalizedQuery = normalizeSearch(query);
    if (!normalizedQuery) return rows;
    return rows.filter((block) =>
      [block.reason, block.createdByName, formatDateTime(new Date(block.startsAt))]
        .map(normalizeSearch)
        .some((value) => value.includes(normalizedQuery)),
    );
  }, [query, rows]);

  const activeBlocks = rows.filter(isFutureBlock).length;
  const createDefaults: ScheduleBlockFormValues = {
    startsAt: "",
    endsAt: "",
    reason: "",
  };
  const editDefaults: ScheduleBlockFormValues | null = selectedBlock
    ? {
        id: selectedBlock.id,
        startsAt: toDateTimeLocal(selectedBlock.startsAt),
        endsAt: toDateTimeLocal(selectedBlock.endsAt),
        reason: selectedBlock.reason,
      }
    : null;

  return (
    <>
      <PageHeading
        title="Bloqueios de agenda"
        description="Feche períodos específicos para impedir novos agendamentos no link público."
        actions={
          <>
            <Button asChild variant="outline">
              <Link href="/app/availability">Horários</Link>
            </Button>
            <Button type="button" onClick={() => navigate(blocksHref({ panel: "new" }))}>
              <Plus className="size-4" />
              Novo bloqueio
            </Button>
          </>
        }
      />
      <SuccessAlert code={success} context="block" />

      {rows.length ? (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Card className="py-2.5">
              <CardContent className="flex items-center gap-3 px-3">
                <span className="grid size-9 place-items-center rounded-full bg-primary/10 text-primary">
                  <CalendarX2 className="size-4" />
                </span>
                <div>
                  <p className="text-xl font-semibold leading-tight">{rows.length}</p>
                  <p className="text-xs text-muted-foreground">Bloqueios cadastrados</p>
                </div>
              </CardContent>
            </Card>
            <Card className="py-2.5">
              <CardContent className="flex items-center gap-3 px-3">
                <span className="grid size-9 place-items-center rounded-full bg-primary/10 text-primary">
                  <CalendarX2 className="size-4" />
                </span>
                <div>
                  <p className="text-xl font-semibold leading-tight">{activeBlocks}</p>
                  <p className="text-xs text-muted-foreground">Ainda bloqueando</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="overflow-hidden py-0">
            <div className="border-b border-border bg-muted/20 p-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Buscar por motivo, data ou responsável..."
                  className="h-10 pl-9"
                />
              </div>
            </div>
            <CardContent className="space-y-2.5 p-3">
              {filtered.length ? (
                filtered.map((block) => (
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
                        onClick={() => navigate(blocksHref({ blockId: block.id, mode: "edit" }))}
                        aria-label="Editar bloqueio"
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <ProviderStatusForm
                        id={block.id}
                        action={deleteAction}
                        deleteMode
                        destructive
                        returnTo="/app/availability/blocks"
                      />
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-border p-8 text-center">
                  <p className="font-semibold">Nenhum bloqueio encontrado</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Ajuste a busca para encontrar outro período.
                  </p>
                </div>
              )}
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
              onClick={() => navigate(blocksHref({ panel: "new" }))}
            >
              <Plus className="size-4" />
              Novo bloqueio
            </Button>
          }
        />
      )}

      {panelMode === "create" ? (
        <PanelShell
          title="Novo bloqueio"
          subtitle="Feche um período da agenda"
          onClose={closePanel}
        >
          <ScheduleBlockForm
            mode="create"
            action={createAction}
            defaultValues={createDefaults}
            returnTo="/app/availability/blocks"
          />
        </PanelShell>
      ) : null}

      {selectedBlock && editDefaults && panelMode === "edit" ? (
        <PanelShell
          title="Editar bloqueio"
          subtitle={selectedBlock.reason}
          onClose={closePanel}
        >
          <ScheduleBlockForm
            mode="edit"
            action={updateAction}
            defaultValues={editDefaults}
            returnTo="/app/availability/blocks"
          />
        </PanelShell>
      ) : null}
    </>
  );
}
