"use client";

import { useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle, Save } from "lucide-react";
import { useForm } from "react-hook-form";

import { FieldError, FormFeedback } from "@/components/forms/form-feedback";
import { Button } from "@/components/ui/button";
import { CalendarDatePicker } from "@/components/ui/calendar-date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  createScheduleBlockSchema,
  updateScheduleBlockSchema,
} from "@/features/provider/provider-schemas";
import type { FormActionState } from "@/types/form-state";

const TIME_OPTIONS = Array.from({ length: 24 * 12 }, (_, index) => {
  const totalMinutes = index * 5;
  const hour = Math.floor(totalMinutes / 60);
  const minute = totalMinutes % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
});

type Values = {
  id?: string;
  startsAt: string;
  endsAt: string;
  reason: string;
};

function splitDateTimeLocal(value: string) {
  const [date = "", time = ""] = value.split("T");
  return {
    date,
    time: time.slice(0, 5),
  };
}

function joinDateTimeLocal(date: string, time: string) {
  if (!date || !time) return "";
  return `${date}T${time}`;
}

export function ScheduleBlockForm({
  mode = "create",
  defaultValues = { startsAt: "", endsAt: "", reason: "" },
  action,
  returnTo,
}: {
  mode?: "create" | "edit";
  defaultValues?: Values;
  action: (state: FormActionState, data: FormData) => Promise<FormActionState>;
  returnTo?: string;
}) {
  const [state, setState] = useState<FormActionState>({});
  const [pending, startTransition] = useTransition();
  const initialStart = splitDateTimeLocal(defaultValues.startsAt);
  const initialEnd = splitDateTimeLocal(defaultValues.endsAt);
  const [startDate, setStartDate] = useState(initialStart.date);
  const [startTime, setStartTime] = useState(initialStart.time);
  const [endDate, setEndDate] = useState(initialEnd.date);
  const [endTime, setEndTime] = useState(initialEnd.time);
  const form = useForm<Values>({
    resolver: zodResolver(
      mode === "create" ? createScheduleBlockSchema : updateScheduleBlockSchema,
    ) as never,
    defaultValues,
  });
  const error = (name: keyof Values) =>
    form.formState.errors[name]?.message?.toString() ??
    state.fieldErrors?.[name]?.[0];

  function setStart(nextDate: string, nextTime: string) {
    setStartDate(nextDate);
    setStartTime(nextTime);
    form.setValue("startsAt", joinDateTimeLocal(nextDate, nextTime), {
      shouldDirty: true,
      shouldValidate: true,
    });
  }

  function setEnd(nextDate: string, nextTime: string) {
    setEndDate(nextDate);
    setEndTime(nextTime);
    form.setValue("endsAt", joinDateTimeLocal(nextDate, nextTime), {
      shouldDirty: true,
      shouldValidate: true,
    });
  }

  function onSubmit(values: Values) {
    if (pending) return;
    const data = new FormData();
    Object.entries(values).forEach(([key, value]) => {
      if (value !== undefined) data.set(key, String(value));
    });
    if (returnTo) data.set("returnTo", returnTo);
    startTransition(async () => setState(await action({}, data)));
  }

  return (
    <form className="space-y-5" onSubmit={form.handleSubmit(onSubmit)}>
      <FormFeedback state={state} />
      {defaultValues.id ? <input type="hidden" {...form.register("id")} /> : null}
      <input type="hidden" {...form.register("startsAt")} />
      <input type="hidden" {...form.register("endsAt")} />

      <div className="grid gap-4">
        <div className="space-y-2">
          <Label>Data de início</Label>
          <CalendarDatePicker
            value={startDate}
            onChange={(value) => setStart(value, startTime)}
          />
          <FieldError message={error("startsAt")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="startsAtTime">Hora inicial</Label>
          <Select
            id="startsAtTime"
            value={startTime}
            required
            onChange={(event) => setStart(startDate, event.target.value)}
          >
            <option value="" disabled>
              Selecione
            </option>
            {TIME_OPTIONS.map((time) => (
              <option key={time} value={time}>
                {time}
              </option>
            ))}
          </Select>
          <FieldError message={error("startsAt")} />
        </div>
        <div className="space-y-2">
          <Label>Data de fim</Label>
          <CalendarDatePicker
            value={endDate}
            onChange={(value) => setEnd(value, endTime)}
          />
          <FieldError message={error("endsAt")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="endsAtTime">Hora final</Label>
          <Select
            id="endsAtTime"
            value={endTime}
            required
            onChange={(event) => setEnd(endDate, event.target.value)}
          >
            <option value="" disabled>
              Selecione
            </option>
            {TIME_OPTIONS.map((time) => (
              <option key={time} value={time}>
                {time}
              </option>
            ))}
          </Select>
          <FieldError message={error("endsAt")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="reason">Motivo</Label>
          <Input
            id="reason"
            placeholder="Ex.: folga, feriado, compromisso"
            {...form.register("reason")}
          />
          <FieldError message={error("reason")} />
        </div>
      </div>

      <Button type="submit" disabled={pending} className="w-full sm:w-auto">
        {pending ? (
          <LoaderCircle className="size-4 animate-spin" />
        ) : (
          <Save className="size-4" />
        )}
        {pending
          ? mode === "create"
            ? "Criando bloqueio..."
            : "Salvando bloqueio..."
          : mode === "create"
            ? "Criar bloqueio"
            : "Salvar bloqueio"}
      </Button>
    </form>
  );
}
