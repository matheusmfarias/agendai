"use client";

import { useState, useTransition } from "react";
import { LoaderCircle, Save } from "lucide-react";

import { FieldError, FormFeedback } from "@/components/forms/form-feedback";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatBrazilianPhone } from "@/lib/input-formatters";
import type { FormActionState } from "@/types/form-state";

type Values = {
  name: string;
  phone: string;
};

export function CustomerProfileForm({
  defaultValues,
  action,
}: {
  defaultValues: Values & { email: string };
  action: (state: FormActionState, data: FormData) => Promise<FormActionState>;
}) {
  const [state, setState] = useState<FormActionState>({});
  const [pending, startTransition] = useTransition();
  const [formValues, setFormValues] = useState({
    name: defaultValues.name,
    phone: defaultValues.phone ?? "",
  });

  const error = (name: string) => state.fieldErrors?.[name]?.[0];

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData();
    data.set("name", formValues.name);
    data.set("phone", formValues.phone);
    startTransition(async () => setState(await action({}, data)));
  }

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <FormFeedback state={state} />

      <div className="space-y-2">
        <Label htmlFor="name">Nome</Label>
        <Input
          id="name"
          value={formValues.name}
          onChange={(e) => setFormValues((v) => ({ ...v, name: e.target.value }))}
          required
        />
        <FieldError message={error("name")} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">E-mail</Label>
        <Input
          id="email"
          value={defaultValues.email}
          disabled
          className="bg-muted/50 text-muted-foreground"
        />
        <p className="text-xs text-muted-foreground">
          O e-mail usado para login não pode ser alterado.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">Telefone</Label>
        <Input
          id="phone"
          value={formValues.phone}
          onChange={(e) =>
            setFormValues((v) => ({
              ...v,
              phone: formatBrazilianPhone(e.target.value),
            }))
          }
          required
          placeholder="(11) 99999-9999"
        />
        <FieldError message={error("phone")} />
      </div>

      <Button type="submit" disabled={pending} className="rounded-full">
        {pending ? (
          <LoaderCircle className="size-4 animate-spin" />
        ) : (
          <Save className="size-4" />
        )}
        {pending ? "Salvando..." : "Salvar alterações"}
      </Button>
    </form>
  );
}
