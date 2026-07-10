"use client";

import { useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle } from "lucide-react";
import { useForm } from "react-hook-form";

import { FormFeedback } from "@/components/forms/form-feedback";
import { Button } from "@/components/ui/button";
import { changeSubscriptionStatusSchema } from "@/features/subscriptions/subscription-schemas";
import { changeTenantStatusSchema } from "@/features/tenants/tenant-schemas";
import type { FormActionState } from "@/types/form-state";

type StatusActionFormProps = {
  id: string;
  status: "ACTIVE" | "SUSPENDED" | "CANCELED";
  label: string;
  confirmation: string;
  variant?: "default" | "outline" | "destructive";
  kind: "tenant" | "subscription";
  action: (
    previousState: FormActionState,
    formData: FormData,
  ) => Promise<FormActionState>;
};

const INITIAL_STATE: FormActionState = {};

export function StatusActionForm({
  id,
  status,
  label,
  confirmation,
  variant = "outline",
  kind,
  action,
}: StatusActionFormProps) {
  const [state, setState] = useState<FormActionState>(INITIAL_STATE);
  const [pending, startTransition] = useTransition();
  const schema =
    kind === "tenant"
      ? changeTenantStatusSchema
      : changeSubscriptionStatusSchema;
  const form = useForm<{
    id: string;
    status: "ACTIVE" | "SUSPENDED" | "CANCELED";
  }>({
    resolver: zodResolver(schema),
    defaultValues: { id, status },
  });

  function onSubmit(values: {
    id: string;
    status: "ACTIVE" | "SUSPENDED" | "CANCELED";
  }) {
    if (!window.confirm(confirmation)) {
      return;
    }

    const formData = new FormData();
    formData.set("id", values.id);
    formData.set("status", values.status);

    startTransition(async () => {
      setState(await action(INITIAL_STATE, formData));
    });
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <FormFeedback state={state} />
      <Button type="submit" variant={variant} size="sm" disabled={pending}>
        {pending ? <LoaderCircle className="size-4 animate-spin" /> : null}
        {label}
      </Button>
    </form>
  );
}
