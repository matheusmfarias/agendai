"use client";

import { useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle, Save } from "lucide-react";
import { useForm } from "react-hook-form";
import type { Resolver } from "react-hook-form";

import { FieldError, FormFeedback } from "@/components/forms/form-feedback";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { HelpCallout } from "@/features/provider-operations/help-callout";
import { OperationFormSection } from "@/features/provider-operations/operation-form-section";
import {
  BOOKING_MODE_HELP,
  BOOKING_MODE_LABELS,
  PRICE_TYPE_LABELS,
} from "@/features/provider-operations/shared-label-constants";
import { createServiceSchema, updateServiceSchema } from "@/features/provider/provider-schemas";
import {
  formatIntegerInput,
  normalizeDecimalInput,
} from "@/lib/input-formatters";
import type { FormActionState } from "@/types/form-state";

type Values = {
  id?: string;
  categoryId: string;
  name: string;
  description: string;
  durationMinutes: number;
  priceType: "FIXED" | "STARTING_AT" | "ON_REQUEST" | "HIDDEN";
  priceValue: string;
  bookingMode: "DIRECT" | "REQUIRES_CONFIRMATION" | "INFORMATIONAL";
  requiresManualConfirmation: boolean;
  internalNotes: string;
  position: number;
  isActive: boolean;
};

export function ServiceForm({
  mode,
  categories,
  defaultValues,
  action,
  returnTo,
}: {
  mode: "create" | "edit";
  categories: { id: string; name: string; isActive: boolean }[];
  defaultValues: Values;
  action: (state: FormActionState, data: FormData) => Promise<FormActionState>;
  returnTo?: string;
}) {
  const [state, setState] = useState<FormActionState>({});
  const [pending, startTransition] = useTransition();
  const schema = mode === "create" ? createServiceSchema : updateServiceSchema;
  const baseResolver = zodResolver(schema) as unknown as Resolver<Values>;
  const resolver: Resolver<Values> = async (values, context, options) =>
    baseResolver(
      {
        ...values,
        priceValue:
          values.priceType === "ON_REQUEST" || values.priceType === "HIDDEN"
            ? ""
            : values.priceValue,
      },
      context,
      options,
    );
  const form = useForm<Values>({
    resolver,
    defaultValues,
  });
  // React Hook Form exposes function-bearing objects that React Compiler skips.
  // eslint-disable-next-line react-hooks/incompatible-library
  const priceType = form.watch("priceType");
  const bookingMode = form.watch("bookingMode");
  const error = (name: keyof Values) =>
    form.formState.errors[name]?.message?.toString() ?? state.fieldErrors?.[name]?.[0];

  function onSubmit(values: Values) {
    if (pending) return;
    const normalizedValues = {
      ...values,
      requiresManualConfirmation: values.bookingMode === "REQUIRES_CONFIRMATION",
      priceValue:
        values.priceType === "ON_REQUEST" || values.priceType === "HIDDEN"
          ? ""
          : values.priceValue,
    };
    const data = new FormData();
    Object.entries(normalizedValues).forEach(([key, value]) =>
      data.set(key, String(value)),
    );
    if (returnTo) data.set("returnTo", returnTo);
    startTransition(async () => setState(await action({}, data)));
  }

  return (
    <form className="space-y-5" onSubmit={form.handleSubmit(onSubmit)}>
      <FormFeedback state={state} />

      {/* ---- Identificação do serviço ---- */}
      <OperationFormSection
        title="Identificação do serviço"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="name">Nome do serviço</Label>
            <Input id="name" {...form.register("name")} />
            <FieldError message={error("name")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="categoryId">Categoria</Label>
            <Select id="categoryId" {...form.register("categoryId")}>
              <option value="">Selecione</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}{category.isActive ? "" : " (inativa)"}
                </option>
              ))}
            </Select>
            <FieldError message={error("categoryId")} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="description">Descrição do serviço</Label>
            <Textarea id="description" {...form.register("description")} />
            <FieldError message={error("description")} />
          </div>
        </div>
      </OperationFormSection>

      {/* ---- Tempo e preço ---- */}
      <OperationFormSection
        title="Tempo e preço"
        description="Duração do atendimento e como o valor será exibido."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="durationMinutes">Duração em minutos</Label>
            <Input
              id="durationMinutes"
              inputMode="numeric"
              {...form.register("durationMinutes", {
                valueAsNumber: true,
                onChange: (event) => {
                  event.target.value = formatIntegerInput(event.target.value);
                },
              })}
            />
            <FieldError message={error("durationMinutes")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="position">Ordem de exibição</Label>
            <Input
              id="position"
              inputMode="numeric"
              {...form.register("position", {
                valueAsNumber: true,
                onChange: (event) => {
                  event.target.value = formatIntegerInput(event.target.value);
                },
              })}
            />
            <FieldError message={error("position")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="priceType">Tipo de preço</Label>
            <Select id="priceType" {...form.register("priceType")}>
              {Object.entries(PRICE_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
            <FieldError message={error("priceType")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="priceValue">Valor</Label>
            <Input
              id="priceValue"
              inputMode="decimal"
              placeholder="0,00"
              disabled={priceType === "ON_REQUEST" || priceType === "HIDDEN"}
              {...form.register("priceValue", {
                onChange: (event) => {
                  event.target.value = normalizeDecimalInput(event.target.value);
                },
              })}
            />
            <FieldError message={error("priceValue")} />
          </div>
        </div>
      </OperationFormSection>

      {/* ---- Como o cliente agenda ---- */}
      <OperationFormSection
        title="Como o cliente agenda"
        description="Escolha se o agendamento é imediato, precisa de confirmação ou é apenas informativo."
      >
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="bookingMode">Modo de agendamento</Label>
            <Select id="bookingMode" {...form.register("bookingMode")}>
              {Object.entries(BOOKING_MODE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
            <FieldError message={error("bookingMode")} />
          </div>
          {bookingMode ? (
            <HelpCallout>
              {BOOKING_MODE_LABELS[bookingMode]}: {BOOKING_MODE_HELP[bookingMode]}
            </HelpCallout>
          ) : null}
        </div>
      </OperationFormSection>

      {/* ---- Informações adicionais ---- */}
      <OperationFormSection
        title="Informações adicionais"
        description="Anotações internas que não aparecem para o cliente e controle de disponibilidade."
      >
        <div className="grid gap-4">
          <div className="space-y-2">
            <Label htmlFor="internalNotes">Observações internas</Label>
            <Textarea id="internalNotes" {...form.register("internalNotes")} />
          </div>
        </div>
      </OperationFormSection>

      {/* ---- Disponibilidade ---- */}
      <label className="flex items-center gap-3 rounded-2xl border p-3.5 text-sm">
        <Checkbox {...form.register("isActive")} />
        Serviço ativo
      </label>

      <Button type="submit" disabled={pending} className="w-full sm:w-auto">
        {pending ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />}
        {pending
          ? mode === "create" ? "Cadastrando serviço..." : "Salvando serviço..."
          : mode === "create" ? "Cadastrar serviço" : "Salvar alterações"}
      </Button>
    </form>
  );
}
