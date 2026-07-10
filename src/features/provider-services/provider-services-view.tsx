"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Pencil,
  Plus,
  Search,
} from "lucide-react";

import { CustomFieldForm } from "@/components/forms/custom-field-form";
import { ProviderStatusForm } from "@/components/forms/provider-status-form";
import { ServiceCategoryForm } from "@/components/forms/service-category-form";
import { ServiceForm } from "@/components/forms/service-form";
import { PanelShell } from "@/components/layout/panel-shell";
import { SuccessAlert } from "@/components/layout/success-alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { APPOINTMENT_STATUS_LABELS } from "@/features/appointments/appointment-constants";
import {
  BOOKING_MODE_LABELS,
  PRICE_TYPE_LABELS,
} from "@/features/provider-operations/shared-label-constants";
import {
  SERVICE_SUCCESS_CODES,
  serviceSuccessContext,
} from "@/features/provider-services/service-success";
import type {
  AppointmentStatus,
  BookingMode,
  CustomFieldType,
  PriceType,
} from "@/generated/prisma/client";
import { formatCurrency } from "@/lib/formatters";
import { formatDecimalInput } from "@/lib/input-formatters";
import { cn } from "@/lib/utils";
import type { FormActionState } from "@/types/form-state";

export type ServiceListRow = {
  id: string;
  name: string;
  description: string | null;
  categoryId: string;
  categoryName: string;
  categoryActive: boolean;
  durationMinutes: number;
  priceType: PriceType;
  priceValue: string | null;
  bookingMode: BookingMode;
  requiresManualConfirmation: boolean;
  internalNotes: string | null;
  position: number;
  isActive: boolean;
  customFieldsCount: number;
  appointmentsCount: number;
};

export type ServiceCategoryRow = {
  id: string;
  name: string;
  description: string | null;
  position: number;
  isActive: boolean;
  servicesCount: number;
};

export type ServiceCustomField = {
  id: string;
  label: string;
  key: string;
  fieldType: CustomFieldType;
  options: string;
  isRequired: boolean;
  position: number;
  isActive: boolean;
};

export type ServiceDetail = ServiceListRow & {
  customFields: ServiceCustomField[];
  recentAppointments: {
    id: string;
    startsAt: string;
    status: AppointmentStatus;
    customer: { name: string };
  }[];
};

type ServiceFormValues = {
  id?: string;
  categoryId: string;
  name: string;
  description: string;
  durationMinutes: number;
  priceType: PriceType;
  priceValue: string;
  bookingMode: BookingMode;
  requiresManualConfirmation: boolean;
  internalNotes: string;
  position: number;
  isActive: boolean;
};

type CategoryFormValues = {
  id?: string;
  name: string;
  description: string;
  position: number;
  isActive: boolean;
};

type ProviderServicesViewProps = {
  rows: ServiceListRow[];
  categories: ServiceCategoryRow[];
  selectedService: ServiceDetail | null;
  selectedField: ServiceCustomField | null;
  selectedCategory: ServiceCategoryRow | null;
  defaultAppointmentDuration: number;
  panelMode:
    | "none"
    | "create"
    | "detail"
    | "edit"
    | "field-create"
    | "field-edit"
    | "category-create"
    | "category-edit";
  success?: string;
  createAction: (state: FormActionState, data: FormData) => Promise<FormActionState>;
  updateAction: (state: FormActionState, data: FormData) => Promise<FormActionState>;
  statusAction: (state: FormActionState, data: FormData) => Promise<FormActionState>;
  createFieldAction: (state: FormActionState, data: FormData) => Promise<FormActionState>;
  updateFieldAction: (state: FormActionState, data: FormData) => Promise<FormActionState>;
  fieldStatusAction: (state: FormActionState, data: FormData) => Promise<FormActionState>;
  createCategoryAction: (state: FormActionState, data: FormData) => Promise<FormActionState>;
  updateCategoryAction: (state: FormActionState, data: FormData) => Promise<FormActionState>;
};

const FIELD_LABELS: Record<CustomFieldType, string> = {
  TEXT: "Texto",
  TEXTAREA: "Texto longo",
  NUMBER: "Número",
  DATE: "Data",
  BOOLEAN: "Sim/Não",
  SELECT: "Seleção",
};

function serviceHref(params: Record<string, string | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }
  const query = search.toString();
  return query ? `/app/services?${query}` : "/app/services";
}

function normalizeSearch(value: string | null | undefined) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

function catalogPriceLabel(service: Pick<ServiceListRow, "priceType" | "priceValue">) {
  if (service.priceType === "HIDDEN") return "Preço oculto";
  if (!service.priceValue) return PRICE_TYPE_LABELS[service.priceType];
  if (service.priceType === "FIXED") return formatCurrency(service.priceValue);
  return `A partir de ${formatCurrency(service.priceValue)}`;
}

function priceLabel(service: Pick<ServiceListRow, "priceType" | "priceValue">) {
  if (service.priceType === "HIDDEN") return "Preço oculto";
  if (!service.priceValue) return PRICE_TYPE_LABELS[service.priceType];
  return `${PRICE_TYPE_LABELS[service.priceType]} · ${formatCurrency(service.priceValue)}`;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function questionLabel(count: number) {
  if (count === 0) return "Nenhuma pergunta adicional";
  if (count === 1) return "1 pergunta antes do agendamento";
  return `${count} perguntas antes do agendamento`;
}

function bookingBadgeLabel(service: ServiceListRow) {
  if (
    service.requiresManualConfirmation ||
    service.bookingMode === "REQUIRES_CONFIRMATION"
  ) {
    return "Confirmação manual";
  }

  if (service.bookingMode === "INFORMATIONAL") return "Informativo";
  return "Confirmação automática";
}

function MetricChip({
  value,
  label,
}: {
  value: number | string;
  label: string;
}) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card px-4 py-3 shadow-sm">
      <span className="block text-2xl font-semibold leading-none tracking-tight">
        {value}
      </span>
      <span className="mt-1 block text-sm text-muted-foreground">{label}</span>
    </div>
  );
}

function CategoryButton({
  active,
  label,
  count,
  muted,
  onClick,
}: {
  active: boolean;
  label: string;
  count: number;
  muted?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full shrink-0 items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors",
        active
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:bg-primary/[0.045] hover:text-foreground",
      )}
    >
      <span className={cn("min-w-0 truncate font-semibold", muted && !active && "text-muted-foreground")}>
        {label}
      </span>
      <span
        className={cn(
          "rounded-full px-2 py-0.5 text-xs font-semibold",
          active ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground",
        )}
      >
        {count}
      </span>
    </button>
  );
}

function ServiceCatalogCard({
  service,
  onEdit,
}: {
  service: ServiceListRow;
  onEdit: () => void;
  onFields: () => void;
  onMore: () => void;
}) {
  return (
    <article className="group rounded-2xl border border-border bg-card p-4 transition-colors hover:bg-primary/[0.035] md:min-h-[13rem]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-base font-semibold leading-tight">
              {service.name}
            </h3>
            <Badge variant={service.isActive ? "success" : "outline"}>
              {service.isActive ? "Ativo" : "Inativo"}
            </Badge>
            {!service.categoryActive ? (
              <Badge variant="warning">Categoria inativa</Badge>
            ) : null}
          </div>
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <span>{service.categoryName}</span>
            <span>·</span>
            <span>{service.durationMinutes} min</span>
            <span>·</span>
            <span>{catalogPriceLabel(service)}</span>
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Badge variant={bookingBadgeLabel(service) === "Confirmação manual" ? "warning" : "outline"}>
          {bookingBadgeLabel(service)}
        </Badge>
        <Badge variant="outline">{questionLabel(service.customFieldsCount)}</Badge>
      </div>

      {service.description ? (
        <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">
          {service.description}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border/70 pt-3">
        <Button type="button" size="sm" variant="outline" onClick={onEdit}>
          <Pencil className="size-4" />
          Editar
        </Button>
      </div>
    </article>
  );
}

function ServiceDetailPanel({
  service,
  onEdit,
  onNewField,
  onEditField,
  statusAction,
  fieldStatusAction,
}: {
  service: ServiceDetail;
  onEdit: () => void;
  onNewField: () => void;
  onEditField: (fieldId: string) => void;
  statusAction: ProviderServicesViewProps["statusAction"];
  fieldStatusAction: ProviderServicesViewProps["fieldStatusAction"];
}) {
  return (
    <div className="space-y-5">
      <div className="rounded-3xl bg-gradient-to-br from-primary/12 via-primary/5 to-transparent p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-xl font-semibold">{service.name}</h3>
              <Badge variant={service.isActive ? "success" : "outline"}>
                {service.isActive ? "Ativo" : "Inativo"}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {service.categoryName} · {service.durationMinutes} min · {priceLabel(service)}
            </p>
          </div>
          <Button type="button" size="sm" onClick={onEdit}>
            <Pencil className="size-4" />
            Editar
          </Button>
        </div>
        <p className="mt-4 whitespace-pre-wrap text-sm text-muted-foreground">
          {service.description || "Sem descrição pública cadastrada."}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Card className="py-3">
          <CardContent className="px-4">
            <p className="text-xs text-muted-foreground">Duração</p>
            <p className="font-semibold">{service.durationMinutes} min</p>
          </CardContent>
        </Card>
        <Card className="py-3">
          <CardContent className="px-4">
            <p className="text-xs text-muted-foreground">Preço</p>
            <p className="font-semibold">{catalogPriceLabel(service)}</p>
          </CardContent>
        </Card>
        <Card className="py-3">
          <CardContent className="px-4">
            <p className="text-xs text-muted-foreground">Agendamento</p>
            <p className="font-semibold">{BOOKING_MODE_LABELS[service.bookingMode]}</p>
          </CardContent>
        </Card>
        <Card className="py-3">
          <CardContent className="px-4">
            <p className="text-xs text-muted-foreground">Perguntas</p>
            <p className="font-semibold">{questionLabel(service.customFields.length)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="rounded-3xl border border-border p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-semibold">Perguntas antes do agendamento</p>
            <p className="text-sm text-muted-foreground">
              Use para coletar placa, observações, preferências ou dados do atendimento.
            </p>
          </div>
          <Button type="button" size="sm" onClick={onNewField}>
            <Plus className="size-4" />
            Nova pergunta
          </Button>
        </div>
        {service.customFields.length ? (
          <div className="mt-4 max-h-[22rem] space-y-2 overflow-y-auto pr-1">
            {service.customFields.map((field) => (
              <div key={field.id} className="rounded-2xl border border-border p-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">{field.label}</p>
                      {!field.isActive ? <Badge variant="outline">Inativo</Badge> : null}
                      {field.isRequired ? <Badge variant="info">Obrigatório</Badge> : null}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {FIELD_LABELS[field.fieldType]} · chave: <code>{field.key}</code>
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => onEditField(field.id)}
                      aria-label="Editar pergunta"
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <ProviderStatusForm
                      id={field.id}
                      serviceId={service.id}
                      isActive={field.isActive}
                      action={fieldStatusAction}
                      returnTo={serviceHref({ serviceId: service.id })}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
            Nenhuma pergunta adicional cadastrada para este serviço.
          </p>
        )}
      </div>

      <div className="rounded-3xl border border-border p-4">
        <p className="mb-3 font-semibold">Status do serviço</p>
        <p className="mb-3 text-sm text-muted-foreground">
          {service.isActive
            ? "Serviço ativo aparece no link público e pode ser usado em agendamentos."
            : "Serviço inativo preserva histórico, mas não aparece para novos agendamentos públicos."}
        </p>
        <ProviderStatusForm
          id={service.id}
          isActive={service.isActive}
          action={statusAction}
          destructive={service.isActive}
          confirmMessage={
            service.isActive
              ? "Inativar este serviço? Ele deixará de aparecer para novos agendamentos públicos, mas o histórico será preservado."
              : undefined
          }
          returnTo={serviceHref({ serviceId: service.id })}
        />
      </div>

      {service.recentAppointments.length ? (
        <div className="rounded-3xl border border-border p-4">
          <p className="mb-3 font-semibold">Agendamentos recentes</p>
          <div className="space-y-2">
            {service.recentAppointments.map((appointment) => (
              <Link
                key={appointment.id}
                href={`/app/appointments?appointmentId=${appointment.id}`}
                className="flex items-center justify-between gap-3 rounded-2xl border border-border p-3 transition-colors hover:bg-muted/35"
              >
                <div>
                  <p className="font-semibold">{appointment.customer.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatDateTime(appointment.startsAt)}
                  </p>
                </div>
                <Badge variant="outline">
                  {APPOINTMENT_STATUS_LABELS[appointment.status]}
                </Badge>
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function ProviderServicesView({
  rows,
  categories,
  selectedService,
  selectedField,
  selectedCategory,
  defaultAppointmentDuration,
  panelMode,
  success,
  createAction,
  updateAction,
  statusAction,
  createFieldAction,
  updateFieldAction,
  fieldStatusAction,
  createCategoryAction,
  updateCategoryAction,
}: ProviderServicesViewProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("all");

  function navigate(href: string) {
    router.push(href, { scroll: false });
  }

  function closePanel() {
    router.push("/app/services", { scroll: false });
  }

  const rowsByCategory = useMemo(() => {
    const grouped = new Map<string, ServiceListRow[]>();
    for (const service of rows) {
      grouped.set(service.categoryId, [...(grouped.get(service.categoryId) ?? []), service]);
    }
    return grouped;
  }, [rows]);

  const filtered = useMemo(() => {
    const normalizedQuery = normalizeSearch(query);
    return rows.filter((service) => {
      const matchesCategory =
        selectedCategoryId === "all" || service.categoryId === selectedCategoryId;
      const matchesQuery =
        !normalizedQuery ||
        [
          service.name,
          service.categoryName,
          service.description,
          catalogPriceLabel(service),
        ]
          .map(normalizeSearch)
          .some((value) => value.includes(normalizedQuery));

      return matchesCategory && matchesQuery;
    });
  }, [query, rows, selectedCategoryId]);

  const activeCategory =
    selectedCategoryId === "all"
      ? null
      : categories.find((category) => category.id === selectedCategoryId) ?? null;
  const activeCategoryName = activeCategory?.name ?? "Todos os serviços";
  const categoryOptions = categories.map(({ id, name, isActive }) => ({
    id,
    name,
    isActive,
  }));

  const createDefaults: ServiceFormValues = {
    categoryId:
      (activeCategory?.isActive ? activeCategory.id : undefined) ??
      categories.find((item) => item.isActive)?.id ??
      categories[0]?.id ??
      "",
    name: "",
    description: "",
    durationMinutes: defaultAppointmentDuration,
    priceType: "FIXED",
    priceValue: "",
    bookingMode: "DIRECT",
    requiresManualConfirmation: false,
    internalNotes: "",
    position: 0,
    isActive: true,
  };
  const editDefaults: ServiceFormValues | null = selectedService
    ? {
        id: selectedService.id,
        categoryId: selectedService.categoryId,
        name: selectedService.name,
        description: selectedService.description ?? "",
        durationMinutes: selectedService.durationMinutes,
        priceType: selectedService.priceType,
        priceValue: formatDecimalInput(selectedService.priceValue),
        bookingMode: selectedService.bookingMode,
        requiresManualConfirmation: selectedService.requiresManualConfirmation,
        internalNotes: selectedService.internalNotes ?? "",
        position: selectedService.position,
        isActive: selectedService.isActive,
      }
    : null;
  const fieldDefaults = selectedService
    ? {
        serviceId: selectedService.id,
        label: "",
        key: "",
        fieldType: "TEXT" as const,
        options: "",
        isRequired: false,
        position: selectedService.customFields.length,
        isActive: true,
      }
    : null;
  const editFieldDefaults =
    selectedService && selectedField
      ? { ...selectedField, serviceId: selectedService.id }
      : null;
  const createCategoryDefaults: CategoryFormValues = {
    name: "",
    description: "",
    position: categories.length,
    isActive: true,
  };
  const editCategoryDefaults: CategoryFormValues | null = selectedCategory
    ? {
        id: selectedCategory.id,
        name: selectedCategory.name,
        description: selectedCategory.description ?? "",
        position: selectedCategory.position,
        isActive: selectedCategory.isActive,
      }
    : null;

  const emptySearch = query.trim().length > 0;
  const totalQuestions = rows.reduce(
    (total, service) => total + service.customFieldsCount,
    0,
  );
  const justCreatedCategory = success === SERVICE_SUCCESS_CODES.categoryCreated;
  const hasServices = rows.length > 0;

  return (
    <>
      <div className="mb-5 space-y-4">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Catálogo de serviços
            </h1>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
              Gerencie os serviços, categorias, preços e informações solicitadas antes do agendamento.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {categories.length ? (
            <Button type="button" onClick={() => navigate(serviceHref({ panel: categories.length ? "new" : "category" }))}>
              <Plus className="size-4" />
              Novo serviço
            </Button>
            ) : (
              <Button
                type="button"
                onClick={() => navigate(serviceHref({ panel: "category" }))}
              >
                <Plus className="size-4" />
                Nova categoria
              </Button>
            )}
          </div>
        </div>

        <div className="hidden">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar serviço, categoria ou descrição..."
            className="h-11 rounded-2xl border-border/70 bg-card pl-9 shadow-sm"
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricChip value={rows.length} label="serviços" />
          <MetricChip value={rows.filter((item) => item.isActive).length} label="ativos" />
          <MetricChip value={categories.length} label="categorias" />
          <MetricChip value={totalQuestions} label="perguntas pré-agendamento" />
        </div>
      </div>

      <SuccessAlert code={success} context={serviceSuccessContext(success)} />

      {rows.length || categories.length ? (
        <div className="grid gap-4 xl:grid-cols-[18rem_minmax(0,1fr)]">
          <aside className="hidden xl:block">
            <Card className="sticky top-6 overflow-hidden border-border/70 bg-card/95 py-0 shadow-sm">
              <CardContent className="p-3">
                <div className="mb-3 px-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Categorias
                  </p>
                </div>
                <div className="space-y-2">
                  <CategoryButton
                    active={selectedCategoryId === "all"}
                    label="Todos os serviços"
                    count={rows.length}
                    onClick={() => setSelectedCategoryId("all")}
                  />
                  {categories.map((category) => (
                    <div key={category.id} className="group/category relative">
                      <CategoryButton
                        active={selectedCategoryId === category.id}
                        label={category.name}
                        count={rowsByCategory.get(category.id)?.length ?? 0}
                        muted={!category.isActive}
                        onClick={() => setSelectedCategoryId(category.id)}
                      />
                      <button
                        type="button"
                        onClick={() =>
                          navigate(serviceHref({ categoryId: category.id, mode: "edit" }))
                        }
                        className="absolute right-12 top-1/2 hidden size-7 -translate-y-1/2 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-background hover:text-primary group-hover/category:grid"
                        aria-label={`Editar categoria ${category.name}`}
                      >
                        <Pencil className="size-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => navigate(serviceHref({ panel: "category" }))}
                  className="mt-4 w-full rounded-xl border border-dashed border-primary/25 px-3 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-primary/5"
                >
                  + Nova categoria
                </button>
              </CardContent>
            </Card>
          </aside>

          <div className="space-y-4">
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 xl:hidden">
              <button
                type="button"
                onClick={() => setSelectedCategoryId("all")}
                className={cn(
                  "shrink-0 rounded-full border px-4 py-2 text-sm font-semibold",
                  selectedCategoryId === "all"
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-foreground",
                )}
              >
                Todos ({rows.length})
              </button>
              {categories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => setSelectedCategoryId(category.id)}
                  className={cn(
                    "shrink-0 rounded-full border px-4 py-2 text-sm font-semibold",
                    selectedCategoryId === category.id
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-foreground",
                    !category.isActive && selectedCategoryId !== category.id && "text-muted-foreground",
                  )}
                >
                  {category.name} ({rowsByCategory.get(category.id)?.length ?? 0})
                </button>
              ))}
              <button
                type="button"
                onClick={() => navigate(serviceHref({ panel: "category" }))}
                className="shrink-0 rounded-full border border-dashed border-border bg-card px-4 py-2 text-sm font-semibold text-primary"
              >
                +
              </button>
            </div>

            <Card className="flex flex-col overflow-hidden border-border/70 bg-card/95 py-0 shadow-sm xl:h-[calc(100dvh-15.5rem)] xl:min-h-[32rem]">
              <div className="shrink-0 border-b border-border/70 bg-card/95 px-4 py-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="font-semibold">{activeCategoryName}</h2>
                    <p className="text-sm text-muted-foreground">
                      {filtered.length} serviço(s) encontrado(s)
                    </p>
                  </div>
                  {activeCategory ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        navigate(serviceHref({ categoryId: activeCategory.id, mode: "edit" }))
                      }
                    >
                      <Pencil className="size-4" />
                      Editar categoria
                    </Button>
                  ) : null}
                </div>
                {hasServices ? (
                <div className="relative mt-4">
                  <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Buscar serviço, categoria ou descrição..."
                    className="h-11 rounded-xl border-border/70 bg-background pl-9 shadow-sm"
                  />
                </div>
                ) : null}
              </div>

              <CardContent className="grid content-start gap-3 overflow-y-auto p-3 sm:p-4 md:grid-cols-2 xl:min-h-0 xl:flex-1">
                {filtered.length ? (
                  filtered.map((service) => (
                    <ServiceCatalogCard
                      key={service.id}
                      service={service}
                      onEdit={() =>
                        navigate(serviceHref({ serviceId: service.id, mode: "edit" }))
                      }
                      onFields={() => navigate(serviceHref({ serviceId: service.id }))}
                      onMore={() => navigate(serviceHref({ serviceId: service.id }))}
                    />
                  ))
                ) : emptySearch ? (
                  <div className="rounded-2xl border border-dashed border-border p-8 text-center md:col-span-2">
                    <p className="font-semibold">Nenhum resultado encontrado</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Tente buscar por outro nome, categoria ou preço.
                    </p>
                  </div>
                ) : activeCategory ? (
                  <div className="rounded-2xl border border-dashed border-border p-8 text-center md:col-span-2">
                    <p className="font-semibold">Nenhum serviço nesta categoria</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Adicione um serviço ou mova serviços existentes para esta categoria.
                    </p>
                    <Button
                      type="button"
                      className="mt-4"
                      onClick={() => navigate(serviceHref({ panel: "new" }))}
                    >
                      <Plus className="size-4" />
                      Novo serviço
                    </Button>
                  </div>
                ) : (
                  <div className="md:col-span-2">
                    <EmptyState
                      icon="boxes"
                      title={
                        justCreatedCategory
                          ? "Categoria pronta para receber servicos"
                          : "Nenhum servico cadastrado"
                      }
                      description={
                        justCreatedCategory
                          ? "Agora cadastre o primeiro servico desta categoria para que clientes possam encontrar horarios no link publico."
                          : "Crie seu primeiro servico para comecar a receber agendamentos pelo link publico."
                      }
                      action={
                        <Button
                          type="button"
                          onClick={() => navigate(serviceHref({ panel: "new" }))}
                        >
                          <Plus className="size-4" />
                          Criar primeiro servico
                        </Button>
                      }
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        <EmptyState
          icon="boxes"
          title="Nenhuma categoria cadastrada"
          description="Crie uma categoria para organizar seus servicos. Depois disso, voce podera cadastrar o primeiro servico."
          action={
            <Button
              type="button"
              onClick={() => navigate(serviceHref({ panel: "category" }))}
            >
              <Plus className="size-4" />
              Criar categoria
            </Button>
          }
        />
      )}

      {panelMode === "create" ? (
        <PanelShell
          title="Novo serviço"
          onClose={closePanel}
        >
          {categoryOptions.length ? (
            <ServiceForm
              mode="create"
              categories={categoryOptions}
              action={createAction}
              defaultValues={createDefaults}
              returnTo="/app/services"
            />
          ) : (
            <p className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
              Crie uma categoria antes de cadastrar serviços.
            </p>
          )}
        </PanelShell>
      ) : null}

      {panelMode === "category-create" ? (
        <PanelShell
          title="Nova categoria"
          subtitle="Organize serviços parecidos no mesmo catálogo"
          onClose={closePanel}
        >
          <ServiceCategoryForm
            mode="create"
            action={createCategoryAction}
            defaultValues={createCategoryDefaults}
            returnTo="/app/services"
          />
        </PanelShell>
      ) : null}

      {selectedCategory && editCategoryDefaults && panelMode === "category-edit" ? (
        <PanelShell
          title="Editar categoria"
          subtitle={selectedCategory.name}
          onClose={closePanel}
        >
          <div className="mb-4 rounded-2xl border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
            Serviços dessa categoria continuarão cadastrados, mas a categoria não aparecerá no link público quando estiver inativa.
          </div>
          <ServiceCategoryForm
            mode="edit"
            action={updateCategoryAction}
            defaultValues={editCategoryDefaults}
            returnTo="/app/services"
          />
        </PanelShell>
      ) : null}

      {selectedService && panelMode === "detail" ? (
        <PanelShell
          title={selectedService.name}
          subtitle={`${selectedService.categoryName} · ${selectedService.durationMinutes} min`}
          onClose={closePanel}
        >
          <ServiceDetailPanel
            service={selectedService}
            onEdit={() => navigate(serviceHref({ serviceId: selectedService.id, mode: "edit" }))}
            onNewField={() => navigate(serviceHref({ serviceId: selectedService.id, field: "new" }))}
            onEditField={(fieldId) =>
              navigate(serviceHref({ serviceId: selectedService.id, fieldId }))
            }
            statusAction={statusAction}
            fieldStatusAction={fieldStatusAction}
          />
        </PanelShell>
      ) : null}

      {selectedService && editDefaults && panelMode === "edit" ? (
        <PanelShell
          title="Editar serviço"
          subtitle={selectedService.name}
          onClose={() => navigate(serviceHref({ serviceId: selectedService.id }))}
        >
          <ServiceForm
            mode="edit"
            categories={categoryOptions}
            action={updateAction}
            defaultValues={editDefaults}
            returnTo={serviceHref({ serviceId: selectedService.id })}
          />
        </PanelShell>
      ) : null}

      {selectedService && fieldDefaults && panelMode === "field-create" ? (
        <PanelShell
          title="Nova pergunta"
          subtitle={selectedService.name}
          onClose={() => navigate(serviceHref({ serviceId: selectedService.id }))}
        >
          <CustomFieldForm
            mode="create"
            action={createFieldAction}
            defaultValues={fieldDefaults}
            returnTo={serviceHref({ serviceId: selectedService.id })}
          />
        </PanelShell>
      ) : null}

      {selectedService && editFieldDefaults && panelMode === "field-edit" ? (
        <PanelShell
          title="Editar pergunta"
          subtitle={selectedService.name}
          onClose={() => navigate(serviceHref({ serviceId: selectedService.id }))}
        >
          <CustomFieldForm
            mode="edit"
            action={updateFieldAction}
            defaultValues={editFieldDefaults}
            returnTo={serviceHref({ serviceId: selectedService.id })}
          />
        </PanelShell>
      ) : null}
    </>
  );
}
