"use client";

import { useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarClock, LoaderCircle } from "lucide-react";
import { useForm } from "react-hook-form";

import { FieldError, FormFeedback } from "@/components/forms/form-feedback";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { changeExpirationSchema } from "@/features/subscriptions/subscription-schemas";
import { setFormDataValue } from "@/lib/form-data";
import type { FormActionState } from "@/types/form-state";

type ExpirationFormValues = {
  id: string;
  expiresAt: string;
  reason: string;
};

type ExpirationFormProps = {
  defaultValues: ExpirationFormValues;
  action: (
    previousState: FormActionState,
    formData: FormData,
  ) => Promise<FormActionState>;
};

const INITIAL_STATE: FormActionState = {};

export function ExpirationForm({
  defaultValues,
  action,
}: ExpirationFormProps) {
  const [state, setState] = useState<FormActionState>(INITIAL_STATE);
  const [pending, startTransition] = useTransition();
  const form = useForm<ExpirationFormValues>({
    resolver: zodResolver(changeExpirationSchema, undefined, {
      raw: true,
    }) as never,
    defaultValues,
  });

  function onSubmit(values: ExpirationFormValues) {
    const formData = new FormData();
    Object.entries(values).forEach(([key, value]) =>
      setFormDataValue(formData, key, value),
    );

    startTransition(async () => {
      setState(await action(INITIAL_STATE, formData));
    });
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
      <FormFeedback state={state} />
      <input type="hidden" {...form.register("id")} />
      <div className="space-y-2">
        <Label htmlFor="expiresAt">Nova data de vencimento</Label>
        <Input id="expiresAt" type="date" {...form.register("expiresAt")} />
        <FieldError
          message={
            form.formState.errors.expiresAt?.message ??
            state.fieldErrors?.expiresAt?.[0]
          }
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="reason">Motivo/observação interna</Label>
        <Textarea id="reason" {...form.register("reason")} />
        <FieldError
          message={
            form.formState.errors.reason?.message ??
            state.fieldErrors?.reason?.[0]
          }
        />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? (
          <LoaderCircle className="size-4 animate-spin" />
        ) : (
          <CalendarClock className="size-4" />
        )}
        {pending ? "Alterando..." : "Alterar vencimento"}
      </Button>
    </form>
  );
}
