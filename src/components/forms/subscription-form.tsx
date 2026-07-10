"use client";

import { useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle, Save } from "lucide-react";
import { useForm } from "react-hook-form";

import { FieldError, FormFeedback } from "@/components/forms/form-feedback";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { updateSubscriptionSchema } from "@/features/subscriptions/subscription-schemas";
import { setFormDataValue } from "@/lib/form-data";
import { normalizeDecimalInput } from "@/lib/input-formatters";
import type { FormActionState } from "@/types/form-state";

type PlanOption = {
  id: string;
  name: string;
  isActive: boolean;
};

type SubscriptionFormValues = {
  id: string;
  planId: string;
  status: "TRIAL" | "ACTIVE" | "PAST_DUE" | "SUSPENDED" | "CANCELED";
  billingCycle: "MONTHLY" | "ANNUAL";
  price: string;
  startsAt: string;
  expiresAt: string;
  lastPaymentAt: string;
  paymentMethod: string;
  internalNotes: string;
};

type SubscriptionFormProps = {
  plans: PlanOption[];
  defaultValues: SubscriptionFormValues;
  action: (
    previousState: FormActionState,
    formData: FormData,
  ) => Promise<FormActionState>;
};

const INITIAL_STATE: FormActionState = {};

export function SubscriptionForm({
  plans,
  defaultValues,
  action,
}: SubscriptionFormProps) {
  const [state, setState] = useState<FormActionState>(INITIAL_STATE);
  const [pending, startTransition] = useTransition();
  const form = useForm<SubscriptionFormValues>({
    resolver: zodResolver(updateSubscriptionSchema, undefined, {
      raw: true,
    }) as never,
    defaultValues,
  });

  function onSubmit(values: SubscriptionFormValues) {
    const formData = new FormData();
    Object.entries(values).forEach(([key, value]) =>
      setFormDataValue(formData, key, value),
    );

    startTransition(async () => {
      setState(await action(INITIAL_STATE, formData));
    });
  }

  const fieldError = (name: keyof SubscriptionFormValues) =>
    form.formState.errors[name]?.message?.toString() ??
    state.fieldErrors?.[name]?.[0];

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <FormFeedback state={state} />
      <input type="hidden" {...form.register("id")} />

      <div className="grid gap-5 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="planId">Plano</Label>
          <Select id="planId" {...form.register("planId")}>
            {plans.map((plan) => (
              <option key={plan.id} value={plan.id}>
                {plan.name}
                {plan.isActive ? "" : " (inativo)"}
              </option>
            ))}
          </Select>
          <FieldError message={fieldError("planId")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select id="status" {...form.register("status")}>
            <option value="TRIAL">Trial</option>
            <option value="ACTIVE">Ativa</option>
            <option value="PAST_DUE">Vencida</option>
            <option value="SUSPENDED">Suspensa</option>
            <option value="CANCELED">Cancelada</option>
          </Select>
          <FieldError message={fieldError("status")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="billingCycle">Ciclo</Label>
          <Select id="billingCycle" {...form.register("billingCycle")}>
            <option value="MONTHLY">Mensal</option>
            <option value="ANNUAL">Anual</option>
          </Select>
          <FieldError message={fieldError("billingCycle")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="price">Valor</Label>
          <Input
            id="price"
            inputMode="decimal"
            placeholder="0,00"
            {...form.register("price", {
              onChange: (event) => {
                event.target.value = normalizeDecimalInput(event.target.value);
              },
            })}
          />
          <FieldError message={fieldError("price")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="startsAt">Início</Label>
          <Input id="startsAt" type="date" {...form.register("startsAt")} />
          <FieldError message={fieldError("startsAt")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="expiresAt">Vencimento</Label>
          <Input id="expiresAt" type="date" {...form.register("expiresAt")} />
          <FieldError message={fieldError("expiresAt")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lastPaymentAt">Último pagamento</Label>
          <Input
            id="lastPaymentAt"
            type="date"
            {...form.register("lastPaymentAt")}
          />
          <FieldError message={fieldError("lastPaymentAt")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="paymentMethod">Forma de pagamento</Label>
          <Input id="paymentMethod" {...form.register("paymentMethod")} />
          <FieldError message={fieldError("paymentMethod")} />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="internalNotes">Observações internas</Label>
          <Textarea id="internalNotes" {...form.register("internalNotes")} />
          <FieldError message={fieldError("internalNotes")} />
        </div>
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? (
          <LoaderCircle className="size-4 animate-spin" />
        ) : (
          <Save className="size-4" />
        )}
        {pending ? "Salvando assinatura..." : "Salvar assinatura"}
      </Button>
    </form>
  );
}
