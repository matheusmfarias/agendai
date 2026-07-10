"use client";

import { useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle, Save } from "lucide-react";
import { useForm } from "react-hook-form";

import { FieldError, FormFeedback } from "@/components/forms/form-feedback";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  createPlanSchema,
  updatePlanSchema,
} from "@/features/plans/plan-schemas";
import { normalizeDecimalInput } from "@/lib/input-formatters";
import type { FormActionState } from "@/types/form-state";

type PlanFormValues = {
  id?: string;
  name: string;
  description: string;
  monthlyPrice: string;
  annualPrice: string;
  whatsappEnabled: boolean;
  publicLinkEnabled: boolean;
  isActive: boolean;
};

type PlanFormProps = {
  mode: "create" | "edit";
  defaultValues: PlanFormValues;
  action: (
    previousState: FormActionState,
    formData: FormData,
  ) => Promise<FormActionState>;
};

const INITIAL_STATE: FormActionState = {};

export function PlanForm({ mode, defaultValues, action }: PlanFormProps) {
  const schema = mode === "create" ? createPlanSchema : updatePlanSchema;
  const [state, setState] = useState<FormActionState>(INITIAL_STATE);
  const [pending, startTransition] = useTransition();
  const form = useForm<PlanFormValues>({
    resolver: zodResolver(schema) as never,
    defaultValues,
  });

  function onSubmit(values: PlanFormValues) {
    const formData = new FormData();
    Object.entries(values).forEach(([key, value]) => {
      formData.set(key, String(value));
    });

    startTransition(async () => {
      setState(await action(INITIAL_STATE, formData));
    });
  }

  const fieldError = (name: keyof PlanFormValues) =>
    form.formState.errors[name]?.message?.toString() ??
    state.fieldErrors?.[name]?.[0];

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <FormFeedback state={state} />
      {defaultValues.id ? (
        <input type="hidden" {...form.register("id")} />
      ) : null}

      <div className="grid gap-5 md:grid-cols-2">
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="name">Nome</Label>
          <Input id="name" {...form.register("name")} />
          <FieldError message={fieldError("name")} />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="description">Descrição</Label>
          <Textarea id="description" {...form.register("description")} />
          <FieldError message={fieldError("description")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="monthlyPrice">Valor mensal</Label>
          <Input
            id="monthlyPrice"
            inputMode="decimal"
            placeholder="0,00"
            {...form.register("monthlyPrice", {
              onChange: (event) => {
                event.target.value = normalizeDecimalInput(event.target.value);
              },
            })}
          />
          <FieldError message={fieldError("monthlyPrice")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="annualPrice">Valor anual</Label>
          <Input
            id="annualPrice"
            inputMode="decimal"
            placeholder="0,00"
            {...form.register("annualPrice", {
              onChange: (event) => {
                event.target.value = normalizeDecimalInput(event.target.value);
              },
            })}
          />
          <FieldError message={fieldError("annualPrice")} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          ["whatsappEnabled", "WhatsApp habilitado"],
          ["publicLinkEnabled", "Link público habilitado"],
          ["isActive", "Plano ativo"],
        ].map(([name, label]) => (
          <label
            key={name}
            className="flex items-center gap-3 rounded-lg border p-4 text-sm"
          >
            <Checkbox
              {...form.register(name as keyof PlanFormValues)}
            />
            {label}
          </label>
        ))}
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? (
          <LoaderCircle className="size-4 animate-spin" />
        ) : (
          <Save className="size-4" />
        )}
        {pending ? "Salvando plano..." : "Salvar plano"}
      </Button>
    </form>
  );
}
