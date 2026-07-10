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
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createCustomFieldSchema, updateCustomFieldSchema } from "@/features/provider/provider-schemas";
import type { FormActionState } from "@/types/form-state";

type Values = {
  id?: string;
  serviceId: string;
  label: string;
  key: string;
  fieldType: "TEXT" | "TEXTAREA" | "NUMBER" | "DATE" | "BOOLEAN" | "SELECT";
  options: string;
  isRequired: boolean;
  position: number;
  isActive: boolean;
};

function slugifyKey(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

export function CustomFieldForm({
  mode,
  defaultValues,
  action,
  returnTo,
}: {
  mode: "create" | "edit";
  defaultValues: Values;
  action: (state: FormActionState, data: FormData) => Promise<FormActionState>;
  returnTo?: string;
}) {
  const [state, setState] = useState<FormActionState>({});
  const [pending, startTransition] = useTransition();
  const form = useForm<Values>({
    resolver: zodResolver(mode === "create" ? createCustomFieldSchema : updateCustomFieldSchema) as never,
    defaultValues,
  });
  // React Hook Form exposes function-bearing objects that React Compiler skips.
  // eslint-disable-next-line react-hooks/incompatible-library
  const fieldType = form.watch("fieldType");
  const error = (name: keyof Values) =>
    form.formState.errors[name]?.message?.toString() ?? state.fieldErrors?.[name]?.[0];

  function onSubmit(values: Values) {
    if (pending) return;
    const data = new FormData();
    Object.entries(values).forEach(([key, value]) => data.set(key, String(value)));
    if (returnTo) data.set("returnTo", returnTo);
    startTransition(async () => setState(await action({}, data)));
  }

  return (
    <form className="space-y-5" onSubmit={form.handleSubmit(onSubmit)}>
      <FormFeedback state={state} />
      <input type="hidden" {...form.register("serviceId")} />
      {defaultValues.id ? <input type="hidden" {...form.register("id")} /> : null}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="label">Rótulo</Label>
          <Input
            id="label"
            {...form.register("label", {
              onBlur: (event) => {
                if (!form.getValues("key")) form.setValue("key", slugifyKey(event.target.value));
              },
            })}
          />
          <FieldError message={error("label")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="key">Chave</Label>
          <Input id="key" {...form.register("key")} />
          <FieldError message={error("key")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="fieldType">Tipo</Label>
          <Select id="fieldType" {...form.register("fieldType")}>
            <option value="TEXT">Texto</option>
            <option value="TEXTAREA">Texto longo</option>
            <option value="NUMBER">Número</option>
            <option value="DATE">Data</option>
            <option value="BOOLEAN">Sim/Não</option>
            <option value="SELECT">Seleção</option>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="position">Ordem</Label>
          <Input id="position" type="number" min="0" {...form.register("position", { valueAsNumber: true })} />
        </div>
        {fieldType === "SELECT" ? (
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="options">Opções (uma por linha)</Label>
            <Textarea id="options" rows={5} {...form.register("options")} />
            <FieldError message={error("options")} />
          </div>
        ) : null}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex items-center gap-3 rounded-2xl border p-3.5 text-sm">
          <Checkbox {...form.register("isRequired")} />
          Campo obrigatório
        </label>
        <label className="flex items-center gap-3 rounded-2xl border p-3.5 text-sm">
          <Checkbox {...form.register("isActive")} />
          Campo ativo
        </label>
      </div>
      <Button type="submit" disabled={pending} className="w-full sm:w-auto">
        {pending ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />}
        {pending ? "Salvando campo..." : "Salvar campo"}
      </Button>
    </form>
  );
}
