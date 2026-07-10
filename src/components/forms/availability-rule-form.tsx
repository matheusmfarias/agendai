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
import { OperationFormSection } from "@/features/provider-operations/operation-form-section";
import { HelpCallout } from "@/features/provider-operations/help-callout";
import { WEEKDAY_LABELS } from "@/features/availability/availability-constants";
import { createAvailabilityRuleSchema, updateAvailabilityRuleSchema } from "@/features/provider/provider-schemas";
import type { FormActionState } from "@/types/form-state";

const TIME_OPTIONS = Array.from({ length: 24 * 12 }, (_, index) => {
  const totalMinutes = index * 5;
  const hour = Math.floor(totalMinutes / 60);
  const minute = totalMinutes % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
});

type Values = {
  id?: string;
  weekday: number;
  startTime: string;
  endTime: string;
  slotIntervalMinutes: number;
  isActive: boolean;
};

export function AvailabilityRuleForm({
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
    resolver: zodResolver(mode === "create" ? createAvailabilityRuleSchema : updateAvailabilityRuleSchema) as never,
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
      {defaultValues.id ? <input type="hidden" {...form.register("id")} /> : null}

      <OperationFormSection
        title="Faixa de horário"
        description="Defina o dia e o período em que os clientes podem encontrar horários disponíveis."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="weekday">Dia da semana</Label>
            <Select
              id="weekday"
              defaultValue={String(defaultValues.weekday)}
              {...form.register("weekday", { valueAsNumber: true })}
            >
              {WEEKDAY_LABELS.map((label, index) => <option key={label} value={index}>{label}</option>)}
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="startTime">Hora inicial</Label>
            <Select
              id="startTime"
              defaultValue={defaultValues.startTime}
              required
              {...form.register("startTime")}
            >
              {TIME_OPTIONS.map((time) => (
                <option key={time} value={time}>
                  {time}
                </option>
              ))}
            </Select>
            <FieldError message={error("startTime")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="endTime">Hora final</Label>
            <Select
              id="endTime"
              defaultValue={defaultValues.endTime}
              required
              {...form.register("endTime")}
            >
              {TIME_OPTIONS.map((time) => (
                <option key={time} value={time}>
                  {time}
                </option>
              ))}
            </Select>
            <FieldError message={error("endTime")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="slotIntervalMinutes">Intervalo entre horários</Label>
            <Input id="slotIntervalMinutes" type="number" min="1" {...form.register("slotIntervalMinutes", { valueAsNumber: true })} />
            <FieldError message={error("slotIntervalMinutes")} />
          </div>
        </div>
      </OperationFormSection>

      <HelpCallout>
        Com intervalo de 30 minutos, o cliente verá opções como 09:00, 09:30 e 10:00 no link público e WhatsApp.
      </HelpCallout>

      <label className="flex items-center gap-3 rounded-2xl border p-3.5 text-sm">
        <Checkbox {...form.register("isActive")} />
        Horário ativo
      </label>
      <Button type="submit" disabled={pending} className="w-full sm:w-auto">
        {pending ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />}
        {pending
          ? mode === "create" ? "Criando horário..." : "Salvando horário..."
          : mode === "create" ? "Criar horário" : "Salvar alterações"}
      </Button>
    </form>
  );
}
