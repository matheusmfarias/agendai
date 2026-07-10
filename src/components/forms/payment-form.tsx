"use client";

import { useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle, Receipt } from "lucide-react";
import { useForm } from "react-hook-form";

import { FieldError, FormFeedback } from "@/components/forms/form-feedback";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { registerPaymentSchema } from "@/features/subscriptions/subscription-schemas";
import { setFormDataValue } from "@/lib/form-data";
import { normalizeDecimalInput } from "@/lib/input-formatters";
import type { FormActionState } from "@/types/form-state";

type PaymentFormValues = {
  id: string;
  paymentDate: string;
  paymentMethod: string;
  amountPaid: string;
  newExpiresAt: string;
  internalNotes: string;
};

type PaymentFormProps = {
  defaultValues: PaymentFormValues;
  action: (
    previousState: FormActionState,
    formData: FormData,
  ) => Promise<FormActionState>;
};

const INITIAL_STATE: FormActionState = {};

export function PaymentForm({ defaultValues, action }: PaymentFormProps) {
  const [state, setState] = useState<FormActionState>(INITIAL_STATE);
  const [pending, startTransition] = useTransition();
  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(registerPaymentSchema, undefined, {
      raw: true,
    }) as never,
    defaultValues,
  });

  function onSubmit(values: PaymentFormValues) {
    const formData = new FormData();
    Object.entries(values).forEach(([key, value]) =>
      setFormDataValue(formData, key, value),
    );

    startTransition(async () => {
      setState(await action(INITIAL_STATE, formData));
    });
  }

  const error = (name: keyof PaymentFormValues) =>
    form.formState.errors[name]?.message?.toString() ??
    state.fieldErrors?.[name]?.[0];

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
      <FormFeedback state={state} />
      <input type="hidden" {...form.register("id")} />
      <div className="grid gap-5 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="paymentDate">Data do pagamento</Label>
          <Input
            id="paymentDate"
            type="date"
            {...form.register("paymentDate")}
          />
          <FieldError message={error("paymentDate")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="paymentMethod">Forma de pagamento</Label>
          <Input id="paymentMethod" {...form.register("paymentMethod")} />
          <FieldError message={error("paymentMethod")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="amountPaid">Valor pago</Label>
          <Input
            id="amountPaid"
            inputMode="decimal"
            placeholder="0,00"
            {...form.register("amountPaid", {
              onChange: (event) => {
                event.target.value = normalizeDecimalInput(event.target.value);
              },
            })}
          />
          <FieldError message={error("amountPaid")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="newExpiresAt">Novo vencimento</Label>
          <Input
            id="newExpiresAt"
            type="date"
            {...form.register("newExpiresAt")}
          />
          <FieldError message={error("newExpiresAt")} />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="internalNotes">Observação interna</Label>
          <Textarea id="internalNotes" {...form.register("internalNotes")} />
          <FieldError message={error("internalNotes")} />
        </div>
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? (
          <LoaderCircle className="size-4 animate-spin" />
        ) : (
          <Receipt className="size-4" />
        )}
        {pending ? "Registrando..." : "Registrar pagamento"}
      </Button>
    </form>
  );
}
