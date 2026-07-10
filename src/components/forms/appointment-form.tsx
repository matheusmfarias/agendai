"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { addMinutes, format } from "date-fns";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ChevronRightIcon,
  LoaderCircle,
  Save,
} from "lucide-react";
import { type Resolver, useForm } from "react-hook-form";

import { FieldError, FormFeedback } from "@/components/forms/form-feedback";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  createAppointmentSchema,
  updateAppointmentSchema,
} from "@/features/appointments/appointment-schemas";
import { APPOINTMENT_STATUS_LABELS } from "@/features/appointments/appointment-constants";
import type { AppointmentStatus } from "@/generated/prisma/client";
import {
  TIME_OPTIONS,
  addMonths,
  formatDayLabel,
  formatMonthTitle,
  formatServicePrice,
  getMonthDays,
  joinDateTimeLocal,
  servicePriceAmount,
  splitDateTimeLocal,
  toDateInputValue,
} from "@/components/forms/appointment-form-helpers";
import { formatCurrency } from "@/lib/formatters";
import { normalizeDecimalInput } from "@/lib/input-formatters";
import type { FormActionState } from "@/types/form-state";

type Values = {
  id?: string;
  customerId: string;
  serviceId: string;
  startsAt: string;
  status?: AppointmentStatus;
  customerNotes: string;
  internalNotes: string;
  estimatedPrice: string;
  finalPrice?: string;
  durationMinutesOverride?: string;
  allowOutsideAvailability: boolean;
  allowConcurrentAppointment: boolean;
};

type ServiceOption = {
  id: string;
  name: string;
  durationMinutes: number;
  priceType: "FIXED" | "STARTING_AT" | "ON_REQUEST" | "HIDDEN";
  priceValue: string | null;
  categoryName: string;
  categoryActive: boolean;
  customFields: {
    id: string;
    label: string;
    fieldType: "TEXT" | "TEXTAREA" | "NUMBER" | "DATE" | "BOOLEAN" | "SELECT";
    options: string[];
    isRequired: boolean;
  }[];
};

type AppointmentTab = "appointment" | "info";

function getAppointmentResolver(mode: "create" | "edit"): Resolver<Values> {
  if (mode === "create") {
    return zodResolver(createAppointmentSchema, undefined, {
      raw: true,
    }) as Resolver<Values>;
  }

  return zodResolver(updateAppointmentSchema, undefined, {
    raw: true,
  }) as Resolver<Values>;
}

function CalendarPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [visibleMonth, setVisibleMonth] = useState(
    value || toDateInputValue(new Date()),
  );
  const today = toDateInputValue(new Date());
  const monthDays = getMonthDays(visibleMonth);

  return (
    <details className="group rounded-xl border border-border bg-card">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground">
            <CalendarDays className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold capitalize">
              {formatDayLabel(value)}
            </p>
            <p className="text-xs text-muted-foreground">
              Toque para alterar a data
            </p>
          </div>
        </div>
        <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-90" />
      </summary>

      <div className="border-t border-border p-4">
        <div className="mb-3 flex items-center justify-between">
          <button
            type="button"
            className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            onClick={() => setVisibleMonth(addMonths(visibleMonth, -1))}
            aria-label="Mês anterior"
          >
            <ChevronLeft className="size-4" />
          </button>
          <p className="font-semibold capitalize">{formatMonthTitle(visibleMonth)}</p>
          <button
            type="button"
            className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            onClick={() => setVisibleMonth(addMonths(visibleMonth, 1))}
            aria-label="Próximo mês"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
          {["D", "S", "T", "Q", "Q", "S", "S"].map((day, index) => (
            <span key={`${day}-${index}`} className="py-1">
              {day}
            </span>
          ))}
        </div>

        <div className="mt-1 grid grid-cols-7 gap-1 text-center text-sm">
          {monthDays.map((day) => (
            <button
              key={day.value}
              type="button"
              onClick={() => onChange(day.value)}
              className={`rounded-full py-1.5 transition-colors hover:bg-muted ${
                day.value === value
                  ? "bg-primary text-primary-foreground hover:bg-primary"
                  : day.value === today
                    ? "font-semibold text-rose-600 ring-1 ring-rose-200 hover:bg-rose-50"
                    : day.muted
                      ? "text-muted-foreground/50"
                      : "text-foreground"
              }`}
            >
              {day.label}
            </button>
          ))}
        </div>
      </div>
    </details>
  );
}

export function AppointmentForm({
  mode,
  customers,
  services,
  defaultValues,
  customFieldValues = {},
  action,
  onDiscard,
  returnTo,
  lockSchedule = false,
  statusOptions,
}: {
  mode: "create" | "edit";
  customers: { id: string; name: string; phone: string }[];
  services: ServiceOption[];
  defaultValues: Values;
  customFieldValues?: Record<string, string>;
  action: (state: FormActionState, data: FormData) => Promise<FormActionState>;
  onDiscard?: () => void;
  returnTo?: string;
  lockSchedule?: boolean;
  statusOptions?: AppointmentStatus[];
}) {
  const [state, setState] = useState<FormActionState>({});
  const [activeTab, setActiveTab] = useState<AppointmentTab>("appointment");
  const [extraServiceIds, setExtraServiceIds] = useState<string[]>([]);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [customInputValues, setCustomInputValues] =
    useState<Record<string, string>>(customFieldValues);
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const form = useForm<Values>({
    resolver: getAppointmentResolver(mode),
    defaultValues,
  });
  const serviceField = form.register("serviceId");

  // React Hook Form exposes function-bearing objects that React Compiler skips.
  // eslint-disable-next-line react-hooks/incompatible-library
  const serviceId = form.watch("serviceId");
  const startsAt = form.watch("startsAt");
  const startsAtParts = splitDateTimeLocal(startsAt);
  const service = services.find((item) => item.id === serviceId);
  const extraServices = extraServiceIds
    .map((id) => services.find((item) => item.id === id))
    .filter((item): item is ServiceOption => Boolean(item));
  const selectedServices = [service, ...extraServices].filter(
    (item): item is ServiceOption => Boolean(item),
  );
  const totalDurationMinutes =
    (service?.durationMinutes ?? 0) +
    extraServices.reduce((total, item) => total + item.durationMinutes, 0);
  const totalPrice = [service, ...extraServices].reduce(
    (total, item) => total + servicePriceAmount(item),
    0,
  );
  const totalPriceValue = totalPrice > 0 ? totalPrice.toFixed(2) : "";
  const canAddExtraService =
    mode === "create" &&
    services.some(
      (item) => item.id !== serviceId && !extraServiceIds.includes(item.id),
    );
  const previousServiceId = useRef(serviceId);
  const previousExtraServiceIds = useRef(extraServiceIds.join("|"));
  const calculatedEnd =
    service && startsAt && totalDurationMinutes > 0
      ? format(
          addMinutes(new Date(startsAt), totalDurationMinutes),
          "dd/MM/yyyy HH:mm",
        )
      : "Selecione o serviço e o início";
  const totalLabel = totalPriceValue
    ? formatCurrency(totalPriceValue)
    : "R$ 0,00";
  const error = (name: keyof Values) =>
    form.formState.errors[name]?.message?.toString() ??
    state.fieldErrors?.[name]?.[0];
  const visibleStatusOptions =
    statusOptions ??
    (Object.keys(APPOINTMENT_STATUS_LABELS) as AppointmentStatus[]);
  const customFields = selectedServices.flatMap((item) => item.customFields);

  useEffect(() => {
    const nextExtraServiceIds = extraServiceIds.join("|");
    if (
      previousServiceId.current === serviceId &&
      previousExtraServiceIds.current === nextExtraServiceIds
    ) {
      return;
    }

    previousServiceId.current = serviceId;
    previousExtraServiceIds.current = nextExtraServiceIds;
    form.setValue("estimatedPrice", totalPriceValue, {
      shouldDirty: true,
      shouldValidate: true,
    });
  }, [extraServiceIds, form, serviceId, totalPriceValue]);

  function setDate(nextDate: string) {
    form.setValue(
      "startsAt",
      joinDateTimeLocal(nextDate, startsAtParts.time),
      { shouldDirty: true, shouldValidate: true },
    );
  }

  function addExtraService() {
    const selectedIds = new Set([serviceId, ...extraServiceIds]);
    const nextService = services.find((item) => !selectedIds.has(item.id));
    if (!nextService) return;
    setExtraServiceIds((current) => [...current, nextService.id]);
  }

  function updatePrimaryService(nextServiceId: string) {
    form.setValue("serviceId", nextServiceId, {
      shouldDirty: true,
      shouldValidate: true,
    });
    setExtraServiceIds((current) =>
      current.filter((id) => id !== nextServiceId),
    );
  }

  function removePrimaryService() {
    const [nextPrimaryServiceId, ...remainingExtraServiceIds] = extraServiceIds;

    form.setValue("serviceId", nextPrimaryServiceId ?? "", {
      shouldDirty: true,
      shouldValidate: true,
    });
    setExtraServiceIds(remainingExtraServiceIds);
  }

  function updateExtraService(index: number, nextServiceId: string) {
    setExtraServiceIds((current) =>
      current.map((id, itemIndex) =>
        itemIndex === index ? nextServiceId : id,
      ),
    );
  }

  function removeExtraService(index: number) {
    setExtraServiceIds((current) =>
      current.filter((_, itemIndex) => itemIndex !== index),
    );
  }

  function resetLocalState() {
    setState({});
    setActiveTab("appointment");
    setExtraServiceIds([]);
    setShowDiscardConfirm(false);
    setCustomInputValues(customFieldValues);
    form.reset(defaultValues);
  }

  function requestDiscard() {
    if (onDiscard) {
      onDiscard();
      return;
    }
    setShowDiscardConfirm(true);
  }

  function confirmDiscard() {
    resetLocalState();
    onDiscard?.();
  }

  function onSubmit(values: Values) {
    const data = new FormData();
    Object.entries(values).forEach(([key, value]) => {
      if (value === undefined) return;
      data.set(key, String(value));
    });
    data.set("extraServiceIds", extraServiceIds.join(","));
    if (returnTo) {
      data.set("returnTo", returnTo);
    }
    for (const field of customFields) {
      data.set(`custom_${field.id}`, customInputValues[field.id] ?? "");
    }
    if (totalDurationMinutes > 0) {
      data.set("durationMinutesOverride", String(totalDurationMinutes));
    }
    if (extraServices.length) {
      const extraSummary = [
        "Serviços adicionais:",
        ...extraServices.map(
          (item) =>
            `- ${item.name} (${item.durationMinutes} min, ${formatServicePrice(item)})`,
        ),
      ].join("\n");
      data.set(
        "internalNotes",
        [values.internalNotes?.trim(), extraSummary].filter(Boolean).join("\n\n"),
      );
    }
    startTransition(async () => setState(await action({}, data)));
  }

  function renderCustomField(field: ServiceOption["customFields"][number]) {
    const name = `custom_${field.id}`;
    const value = customInputValues[field.id] ?? "";
    const label = (
      <>
        {field.label}
        {field.isRequired ? <span className="text-destructive"> *</span> : null}
      </>
    );
    const fieldError = state.fieldErrors?.[name]?.[0];

    if (field.fieldType === "TEXTAREA") {
      return (
        <div key={field.id} className="space-y-2">
          <Label htmlFor={name}>{label}</Label>
          <Textarea
            id={name}
            name={name}
            value={value}
            onChange={(event) =>
              setCustomInputValues((current) => ({
                ...current,
                [field.id]: event.target.value,
              }))
            }
          />
          <FieldError message={fieldError} />
        </div>
      );
    }

    if (field.fieldType === "BOOLEAN") {
      return (
        <div key={field.id}>
          <label className="flex items-center gap-3 rounded-xl border p-4 text-sm">
            <Checkbox
              name={name}
              value="true"
              checked={value === "true" || value === "on"}
              onChange={(event) =>
                setCustomInputValues((current) => ({
                  ...current,
                  [field.id]: event.target.checked ? "true" : "",
                }))
              }
            />
            <span>{label}</span>
          </label>
          <FieldError message={fieldError} />
        </div>
      );
    }

    if (field.fieldType === "SELECT") {
      return (
        <div key={field.id} className="space-y-2">
          <Label htmlFor={name}>{label}</Label>
          <Select
            id={name}
            name={name}
            value={value}
            onChange={(event) =>
              setCustomInputValues((current) => ({
                ...current,
                [field.id]: event.target.value,
              }))
            }
          >
            <option value="">Selecione</option>
            {field.options.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </Select>
          <FieldError message={fieldError} />
        </div>
      );
    }

    return (
      <div key={field.id} className="space-y-2">
        <Label htmlFor={name}>{label}</Label>
        <Input
          id={name}
          name={name}
          type={
            field.fieldType === "NUMBER"
              ? "number"
              : field.fieldType === "DATE"
                ? "date"
                : "text"
          }
          value={value}
          onChange={(event) =>
            setCustomInputValues((current) => ({
              ...current,
              [field.id]: event.target.value,
            }))
          }
        />
        <FieldError message={fieldError} />
      </div>
    );
  }

  return (
    <form
      ref={formRef}
      className="flex h-full min-h-0 w-full flex-col overflow-hidden"
      onSubmit={form.handleSubmit(onSubmit)}
    >
      {defaultValues.id ? <input type="hidden" {...form.register("id")} /> : null}
      <input type="hidden" {...form.register("startsAt")} />

      <div className="shrink-0 space-y-5 px-1 pb-5">
        {service && !service.categoryActive ? (
          <Alert className="border-amber-200 bg-amber-50 text-amber-800">
            A categoria &ldquo;{service.categoryName}&rdquo; está inativa. O
            agendamento manual continua permitido porque o serviço está ativo.
          </Alert>
        ) : null}

        <div className="rounded-2xl border border-dashed border-border p-4">
          <Label htmlFor="customerId" className="mb-2">
            Cliente
          </Label>
          <Select
            id="customerId"
            defaultValue={defaultValues.customerId}
            {...form.register("customerId")}
          >
            <option value="">Selecione um cliente para este serviço</option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.name} · {customer.phone}
              </option>
            ))}
          </Select>
          <FieldError message={error("customerId")} />
        </div>

        <div className="border-b border-border">
          <div className="flex gap-6">
            <button
              type="button"
              className={`border-b-2 px-0 pb-3 text-xs font-semibold uppercase tracking-wide cursor-pointer ${
                activeTab === "appointment"
                  ? "border-foreground text-foreground"
                  : "border-transparent text-muted-foreground"
              }`}
              onClick={() => setActiveTab("appointment")}
            >
              Agendamento
            </button>
            <button
              type="button"
              className={`border-b-2 px-0 pb-3 text-xs font-semibold uppercase tracking-wide cursor-pointer ${
                activeTab === "info"
                  ? "border-foreground text-foreground"
                  : "border-transparent text-muted-foreground"
              }`}
              onClick={() => setActiveTab("info")}
            >
              Informações
            </button>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-1 pb-5">
        {activeTab === "appointment" ? (
          <div className="space-y-5">
            {lockSchedule ? (
              <div className="rounded-2xl border border-border p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Data e horário
                </p>
                <p className="mt-2 text-sm font-semibold capitalize">
                  {formatDayLabel(startsAtParts.date)}
                </p>
                <p className="text-sm text-muted-foreground">
                  {startsAtParts.time} - {calculatedEnd}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Atendimento finalizado não permite alteração de data ou hora.
                </p>
              </div>
            ) : (
              <CalendarPicker value={startsAtParts.date} onChange={setDate} />
            )}

            <div className="rounded-xl border-border">
              <Label htmlFor="serviceId" className="mb-2">
                Serviço
              </Label>
              <div className="space-y-3">
                <div className="relative rounded-xl border border-border/80 p-3">
                  <div>
                    <Select
                      id="serviceId"
                      value={serviceId}
                      {...serviceField}
                      onChange={(event) =>
                        updatePrimaryService(event.target.value)
                      }
                    >
                <option value="">Selecione um serviço</option>
                {services
                  .filter(
                    (item) =>
                      item.id === serviceId ||
                      !extraServiceIds.includes(item.id),
                  )
                  .map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} · {item.durationMinutes} min
                  </option>
                ))}
                    </Select>
                  </div>

              {service ? (
                <div className="mt-3 rounded-xl bg-muted/30 p-3">
                  <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">
                      {service.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {service.durationMinutes} min
                    </p>
                  </div>
                  <p
                    className={`max-w-[48%] shrink-0 text-right font-semibold ${
                      service.priceType === "STARTING_AT"
                        ? "text-xs leading-snug"
                        : "text-sm"
                    }`}
                  >
                    {formatServicePrice(service)}
                  </p>
                  </div>
                  <button
                    type="button"
                    className="mt-2 text-xs font-medium text-muted-foreground transition-colors hover:text-destructive"
                    onClick={removePrimaryService}
                  >
                    Remover serviço
                  </button>
                </div>
              ) : null}
                </div>

              {extraServiceIds.map((extraServiceId, index) => {
                const extraService = services.find(
                  (item) => item.id === extraServiceId,
                );
                const unavailableIds = new Set([
                  serviceId,
                  ...extraServiceIds.filter((_, itemIndex) => itemIndex !== index),
                ]);

                return (
                  <div
                    key={`${extraServiceId}-${index}`}
                    className="rounded-xl border border-border/80 p-3"
                  >
                    <div>
                      <Select
                        aria-label={`Serviço ${index + 2}`}
                        value={extraServiceId}
                        onChange={(event) =>
                          updateExtraService(index, event.target.value)
                        }
                      >
                        {services
                          .filter(
                            (item) =>
                              item.id === extraServiceId ||
                              !unavailableIds.has(item.id),
                          )
                          .map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.name} · {item.durationMinutes} min
                            </option>
                          ))}
                      </Select>
                    </div>

                    {extraService ? (
                      <div className="mt-3 rounded-xl bg-muted/30 p-3">
                        <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">
                            {extraService.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {extraService.durationMinutes} min
                          </p>
                        </div>
                        <p
                          className={`max-w-[48%] shrink-0 text-right font-semibold ${
                            extraService.priceType === "STARTING_AT"
                              ? "text-xs leading-snug"
                              : "text-sm"
                          }`}
                        >
                          {formatServicePrice(extraService)}
                        </p>
                        </div>
                        <button
                          type="button"
                          className="mt-2 text-xs font-medium text-muted-foreground transition-colors hover:text-destructive"
                          onClick={() => removeExtraService(index)}
                        >
                          Remover serviço
                        </button>
                      </div>
                    ) : null}
                  </div>
                );
              })}
              </div>

              {canAddExtraService ? (
                <Button
                  type="button"
                  variant="outline"
                  className="mt-3 w-full justify-center"
                  onClick={addExtraService}
                >
                  Adicionar outro serviço
                </Button>
              ) : null}

              <FieldError message={error("serviceId")} />
            </div>

            {!lockSchedule ? (
              <>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Início</Label>
                <Select
                  value={startsAtParts.time}
                  onChange={(event) => {
                    form.setValue(
                      "startsAt",
                      joinDateTimeLocal(
                        startsAtParts.date,
                        event.target.value,
                      ),
                      { shouldDirty: true, shouldValidate: true },
                    );
                  }}
                >
                  <option value="">Selecione o horário</option>
                  {TIME_OPTIONS.map((time) => (
                    <option key={time} value={time}>
                      {time}
                    </option>
                  ))}
                </Select>
                <FieldError message={error("startsAt")} />
              </div>

              <div className="space-y-2">
                <Label>Fim</Label>
                <div className="flex h-11 items-center rounded-xl border bg-muted/40 px-3 text-sm">
                  {calculatedEnd}
                </div>
              </div>
            </div>

            <label className="flex items-center gap-3 rounded-xl border p-4 text-sm">
              <Checkbox {...form.register("allowOutsideAvailability")} />
              Permitir fora do horário cadastrado
            </label>

            {mode === "create" ? (
              <label className="flex items-start gap-3 rounded-xl border p-4 text-sm">
                <Checkbox
                  className="mt-0.5"
                  {...form.register("allowConcurrentAppointment")}
                />
                <span>
                  <span className="block font-medium">
                    Permitir agendamento simultâneo
                  </span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    Permite salvar este agendamento mesmo se já existir outro no
                    mesmo horário.
                  </span>
                </span>
              </label>
            ) : null}
              </>
            ) : null}
          </div>
        ) : (
          <div className="space-y-5">
            <div className="space-y-3">
              <div>
                <p className="text-sm font-semibold">
                  Campos dos serviços
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Informações específicas de cada serviço selecionado.
                </p>
              </div>

              {selectedServices.length ? (
                <div className="space-y-3">
                  {selectedServices.map((item, index) => (
                    <div
                      key={item.id}
                      className="space-y-4 rounded-2xl border border-border p-4"
                    >
                      <div>
                        <p className="text-sm font-semibold">
                          {index + 1}. {item.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {item.durationMinutes} min
                        </p>
                      </div>

                      {item.customFields.length ? (
                        <div className="space-y-4">
                          {item.customFields.map((field) =>
                            renderCustomField(field),
                          )}
                        </div>
                      ) : (
                        <p className="rounded-xl border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">
                          Este serviço não possui campos personalizados.
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="rounded-xl border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">
                  Selecione ao menos um serviço para ver os campos personalizados.
                </p>
              )}
            </div>

            {mode === "create" ? (
              <div className="space-y-2">
                <Label htmlFor="status">Status inicial</Label>
                <Select
                  id="status"
                  defaultValue={defaultValues.status}
                  {...form.register("status")}
                >
                  <option value="CONFIRMED">Confirmado</option>
                  <option value="REQUESTED">Solicitado</option>
                  <option value="WAITING_INFO">Aguardando informações</option>
                </Select>
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  id="status"
                  defaultValue={defaultValues.status}
                  {...form.register("status")}
                >
                  {visibleStatusOptions.map(
                    (value) => (
                      <option key={value} value={value}>
                        {APPOINTMENT_STATUS_LABELS[value]}
                      </option>
                    ),
                  )}
                </Select>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="estimatedPrice">Valor estimado</Label>
                <Input
                  id="estimatedPrice"
                  inputMode="decimal"
                  placeholder="0,00"
                  {...form.register("estimatedPrice", {
                    onChange: (event) => {
                      event.target.value = normalizeDecimalInput(
                        event.target.value,
                      );
                    },
                  })}
                />
                <FieldError message={error("estimatedPrice")} />
              </div>

              {mode === "edit" ? (
                <div className="space-y-2">
                  <Label htmlFor="finalPrice">Valor final</Label>
                  <Input
                    id="finalPrice"
                    inputMode="decimal"
                    placeholder="0,00"
                    {...form.register("finalPrice", {
                      onChange: (event) => {
                        event.target.value = normalizeDecimalInput(
                          event.target.value,
                        );
                      },
                    })}
                  />
                  <FieldError message={error("finalPrice")} />
                </div>
              ) : null}
            </div>
            <p className="text-xs text-muted-foreground">
              Use estes campos quando o atendimento durar mais, tiver serviços adicionais ou o valor combinado mudar.
            </p>

            <div className="space-y-2">
              <Label htmlFor="customerNotes">Mensagem para o cliente</Label>
              <Textarea id="customerNotes" {...form.register("customerNotes")} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="internalNotes">Nota interna</Label>
              <Textarea id="internalNotes" {...form.register("internalNotes")} />
            </div>
          </div>
        )}
      </div>

      <div className="shrink-0 space-y-4 border-t border-border bg-background px-1 pt-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="text-2xl font-semibold">{totalLabel}</p>
          </div>
          <div className="border-l border-border pl-4 text-right">
            <p className="text-xs text-muted-foreground">A ser pago</p>
            <p className="text-2xl font-semibold">{totalLabel}</p>
          </div>
        </div>

        <FormFeedback state={state} />

        <div className="grid grid-cols-2 gap-3">
          <Button type="button" variant="outline" onClick={requestDiscard}>
            Descartar
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" />
            )}
            {pending ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </div>

      {showDiscardConfirm ? (
        <div
          className="fixed inset-0 z-[60] grid place-items-center bg-black/40 px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="discard-appointment-title"
        >
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-5 shadow-2xl">
            <h3
              id="discard-appointment-title"
              className="text-lg font-semibold tracking-tight"
            >
              Descartar agendamento?
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              As informações preenchidas neste painel serão removidas e o
              agendamento não será salvo.
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowDiscardConfirm(false)}
              >
                Continuar editando
              </Button>
              <Button type="button" onClick={confirmDiscard}>
                Sim, descartar
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </form>
  );
}
