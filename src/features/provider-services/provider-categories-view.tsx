"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, FolderTree, Pencil, Plus, Search, Tag } from "lucide-react";

import { ProviderStatusForm } from "@/components/forms/provider-status-form";
import { ServiceCategoryForm } from "@/components/forms/service-category-form";
import { PageHeading } from "@/components/layout/page-heading";
import { PanelShell } from "@/components/layout/panel-shell";
import { SuccessAlert } from "@/components/layout/success-alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { FormActionState } from "@/types/form-state";

export type CategoryListRow = {
  id: string;
  name: string;
  description: string | null;
  position: number;
  isActive: boolean;
  servicesCount: number;
};

type CategoryFormValues = {
  id?: string;
  name: string;
  description: string;
  position: number;
  isActive: boolean;
};

type ProviderCategoriesViewProps = {
  rows: CategoryListRow[];
  selectedCategory: CategoryListRow | null;
  panelMode: "none" | "create" | "edit";
  success?: string;
  createAction: (state: FormActionState, data: FormData) => Promise<FormActionState>;
  updateAction: (state: FormActionState, data: FormData) => Promise<FormActionState>;
  statusAction: (state: FormActionState, data: FormData) => Promise<FormActionState>;
};

function categoryHref(params: Record<string, string | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }
  const query = search.toString();
  return query ? `/app/services/categories?${query}` : "/app/services/categories";
}

function normalizeSearch(value: string | null | undefined) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

function MetricCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: typeof FolderTree;
}) {
  return (
    <Card className="border-border/70 bg-card/95 py-2.5 shadow-sm">
      <CardContent className="flex items-center gap-3 px-3.5">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
          <Icon className="size-4" />
        </span>
        <div className="min-w-0">
          <p className="text-xl font-semibold leading-tight">{value}</p>
          <p className="truncate text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export function ProviderCategoriesView({
  rows,
  selectedCategory,
  panelMode,
  success,
  createAction,
  updateAction,
  statusAction,
}: ProviderCategoriesViewProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");

  function navigate(href: string) {
    router.push(href, { scroll: false });
  }

  function closePanel() {
    router.push("/app/services/categories", { scroll: false });
  }

  const filtered = useMemo(() => {
    const normalizedQuery = normalizeSearch(query);
    return rows.filter((category) => {
      const matchesQuery =
        !normalizedQuery ||
        [category.name, category.description]
          .map(normalizeSearch)
          .some((value) => value.includes(normalizedQuery));
      const matchesFilter =
        filter === "all" ||
        (filter === "active" && category.isActive) ||
        (filter === "inactive" && !category.isActive) ||
        (filter === "withServices" && category.servicesCount > 0) ||
        (filter === "withoutServices" && category.servicesCount === 0);
      return matchesQuery && matchesFilter;
    });
  }, [filter, query, rows]);

  const createDefaults: CategoryFormValues = {
    name: "",
    description: "",
    position: rows.length,
    isActive: true,
  };
  const editDefaults: CategoryFormValues | null = selectedCategory
    ? {
        id: selectedCategory.id,
        name: selectedCategory.name,
        description: selectedCategory.description ?? "",
        position: selectedCategory.position,
        isActive: selectedCategory.isActive,
      }
    : null;

  return (
    <>
      <PageHeading
        title="Categorias"
        description="Agrupe serviços parecidos para facilitar a escolha do cliente no link público."
        actions={
          <>
            <Button asChild variant="outline">
              <Link href="/app/services">Serviços</Link>
            </Button>
            <Button type="button" onClick={() => navigate(categoryHref({ panel: "new" }))}>
              <Plus className="size-4" />
              Nova categoria
            </Button>
          </>
        }
      />
      <SuccessAlert code={success} context="category" />

      {rows.length ? (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <MetricCard icon={FolderTree} label="Categorias" value={rows.length} />
            <MetricCard icon={Tag} label="Categorias ativas" value={rows.filter((item) => item.isActive).length} />
            <MetricCard icon={Tag} label="Serviços agrupados" value={rows.reduce((total, item) => total + item.servicesCount, 0)} />
          </div>
          <Card className="overflow-hidden border-border/70 bg-card/95 py-0 shadow-sm">
            <div className="grid gap-3 border-b border-border/70 bg-card p-3 md:grid-cols-[1fr_14rem]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Buscar por categoria ou descrição..."
                  className="h-10 rounded-2xl border-border/70 bg-background/70 pl-9 shadow-none"
                />
              </div>
              <Select
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
                dropdownStrategy="absolute"
                className="h-10 rounded-2xl border-border/70 bg-background/70 shadow-none"
              >
                <option value="all">Todas</option>
                <option value="active">Ativas</option>
                <option value="inactive">Inativas</option>
                <option value="withServices">Com serviços</option>
                <option value="withoutServices">Sem serviços</option>
              </Select>
            </div>
            <CardContent className="p-0">
              {filtered.length ? (
                filtered.map((category) => (
                  <div
                    key={category.id}
                    className="grid gap-3 border-b border-border/70 bg-card px-4 py-4 transition-colors last:border-b-0 hover:bg-primary/[0.035] sm:grid-cols-[1fr_auto] sm:px-5"
                  >
                    <div className="min-w-0 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate font-semibold">{category.name}</h3>
                        {!category.isActive ? <Badge variant="outline">Inativa</Badge> : null}
                      </div>
                      <p className="line-clamp-1 text-sm text-muted-foreground">
                        {category.description || "Sem descrição cadastrada."}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {category.servicesCount} serviço(s) · ordem {category.position}
                      </p>
                    </div>
                    <div className="flex items-center justify-between gap-2 sm:justify-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate(categoryHref({ categoryId: category.id, mode: "edit" }))}
                        aria-label="Editar categoria"
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <ProviderStatusForm
                        id={category.id}
                        isActive={category.isActive}
                        action={statusAction}
                        destructive={false}
                        confirmMessage={
                          category.isActive
                            ? "Inativar esta categoria? Os serviços continuam preservados, mas a categoria deixa de aparecer no link público."
                            : undefined
                        }
                        returnTo="/app/services/categories"
                      />
                      <ArrowRight className="hidden size-4 text-muted-foreground sm:block" />
                    </div>
                  </div>
                ))
              ) : (
                <div className="m-3 rounded-2xl border border-dashed border-border p-8 text-center">
                  <p className="font-semibold">Nenhuma categoria encontrada</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Ajuste a busca ou limpe os filtros.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        <EmptyState
          icon="folder"
          title="Nenhuma categoria cadastrada"
          description="Crie categorias como Manutenção, Diagnóstico ou Serviços rápidos para organizar o catálogo."
          action={
            <Button
              type="button"
              onClick={() => navigate(categoryHref({ panel: "new" }))}
            >
              <Plus className="size-4" />
              Nova categoria
            </Button>
          }
        />
      )}

      {panelMode === "create" ? (
        <PanelShell
          title="Nova categoria"
          subtitle="Organize serviços parecidos"
          onClose={closePanel}
        >
          <ServiceCategoryForm
            mode="create"
            action={createAction}
            defaultValues={createDefaults}
            returnTo="/app/services/categories"
          />
        </PanelShell>
      ) : null}

      {selectedCategory && editDefaults && panelMode === "edit" ? (
        <PanelShell
          title="Editar categoria"
          subtitle={selectedCategory.name}
          onClose={closePanel}
        >
          <ServiceCategoryForm
            mode="edit"
            action={updateAction}
            defaultValues={editDefaults}
            returnTo="/app/services/categories"
          />
        </PanelShell>
      ) : null}
    </>
  );
}
