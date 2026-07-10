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
import { OperationFormSection } from "@/features/provider-operations/operation-form-section";
import { createServiceCategorySchema, updateServiceCategorySchema } from "@/features/provider/provider-schemas";
import type { FormActionState } from "@/types/form-state";

type Values = { id?: string; name: string; description: string; position: number; isActive: boolean };

export function ServiceCategoryForm({
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
    resolver: zodResolver(mode === "create" ? createServiceCategorySchema : updateServiceCategorySchema) as never,
    defaultValues,
  });
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

      <OperationFormSection
        title="Dados da categoria"
        description="As categorias agrupam serviços parecidos e ajudam o cliente a navegar no link público."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="name">Nome da categoria</Label>
            <Input id="name" {...form.register("name")} />
            <FieldError message={error("name")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="position">Ordem de exibição</Label>
            <Input id="position" type="number" min="0" {...form.register("position", { valueAsNumber: true })} />
            <FieldError message={error("position")} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea id="description" {...form.register("description")} />
            <FieldError message={error("description")} />
          </div>
        </div>
      </OperationFormSection>

      <label className="flex items-center gap-3 rounded-2xl border p-3.5 text-sm">
        <Checkbox {...form.register("isActive")} />
        Categoria ativa
      </label>
      <Button type="submit" disabled={pending} className="w-full sm:w-auto">
        {pending ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />}
        {pending
          ? mode === "create" ? "Criando categoria..." : "Salvando categoria..."
          : mode === "create" ? "Criar categoria" : "Salvar alterações"}
      </Button>
    </form>
  );
}
