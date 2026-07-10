"use client";

import { useActionState } from "react";
import { LoaderCircle, MessageCircle } from "lucide-react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createPublicBookingAction } from "@/features/public-booking/public-booking-action";
import type { FormActionState } from "@/types/form-state";

type PublicCustomField = {
  id: string;
  label: string;
  fieldType: "TEXT" | "TEXTAREA" | "NUMBER" | "DATE" | "BOOLEAN" | "SELECT";
  options: unknown;
  isRequired: boolean;
};

interface PublicBookingReviewFormProps {
  tenantSlug: string;
  serviceId: string;
  startsAt: string;
  customFields: PublicCustomField[];
  totalLabel: string;
}

function FieldError({ message }: { message?: string }) {
  return message ? (
    <p className="text-sm text-destructive">{message}</p>
  ) : null;
}

function optionStrings(options: unknown) {
  return Array.isArray(options)
    ? options.filter((option): option is string => typeof option === "string")
    : [];
}

export function PublicBookingReviewForm({
  tenantSlug,
  serviceId,
  startsAt,
  customFields,
  totalLabel,
}: PublicBookingReviewFormProps) {
  const [state, formAction, pending] = useActionState<FormActionState, FormData>(
    createPublicBookingAction,
    {},
  );
  const error = (name: string) => state.fieldErrors?.[name]?.[0];

  return (
    <form action={formAction} className="space-y-5 pb-28">
      {state.message ? (
        <Alert variant="destructive">{state.message}</Alert>
      ) : null}

      <input type="hidden" name="tenantSlug" value={tenantSlug} />
      <input type="hidden" name="serviceId" value={serviceId} />
      <input type="hidden" name="startsAt" value={startsAt} />

      {customFields.length ? (
        <section className="space-y-4 rounded-2xl border bg-card px-4 py-4">
          <p className="text-sm font-semibold text-foreground">
            Informações para o atendimento
          </p>
          {customFields.map((field) => {
            const name = `custom_${field.id}`;
            return (
              <div key={field.id} className="space-y-2">
                <Label htmlFor={name}>
                  {field.label}
                  {field.isRequired ? (
                    <span className="text-destructive"> *</span>
                  ) : null}
                </Label>
                {field.fieldType === "TEXTAREA" ? (
                  <Textarea id={name} name={name} required={field.isRequired} />
                ) : field.fieldType === "SELECT" ? (
                  <Select id={name} name={name} required={field.isRequired}>
                    <option value="">Selecione</option>
                    {optionStrings(field.options).map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </Select>
                ) : field.fieldType === "BOOLEAN" ? (
                  <label className="flex items-center gap-3 rounded-lg border bg-card p-3 text-sm">
                    <input type="checkbox" name={name} value="Sim" />
                    Sim
                  </label>
                ) : (
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
                    required={field.isRequired}
                  />
                )}
                <FieldError message={error(name)} />
              </div>
            );
          })}
        </section>
      ) : null}

      <div className="relative">
        <MessageCircle
          className="pointer-events-none absolute left-4 top-4 size-5 text-muted-foreground"
          aria-hidden="true"
        />
        <Textarea
          id="customerNotes"
          name="customerNotes"
          placeholder="Deixe uma nota (opcional)"
          className="min-h-14 rounded-xl py-4 pl-12"
        />
        <FieldError message={error("customerNotes")} />
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 px-5 py-5 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur">
        <div className="mx-auto flex max-w-2xl flex-col gap-4">
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Total a pagar</p>
            <p className="text-3xl font-bold tracking-tight text-foreground">
              {totalLabel}
            </p>
          </div>
          <Button
            type="submit"
            disabled={pending}
            className="h-12 w-full rounded-lg text-base shadow-lg shadow-primary/20"
          >
            {pending ? <LoaderCircle className="size-4 animate-spin" /> : null}
            Confirmar e reservar
          </Button>
        </div>
      </div>
    </form>
  );
}
