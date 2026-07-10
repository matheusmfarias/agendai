"use client";

import { useState, useTransition } from "react";
import { LoaderCircle } from "lucide-react";

import { FormFeedback } from "@/components/forms/form-feedback";
import { Button } from "@/components/ui/button";
import type { FormActionState } from "@/types/form-state";

export function ProviderStatusForm({
  id,
  serviceId,
  isActive,
  action,
  destructive = false,
  deleteMode = false,
  confirmMessage,
  returnTo,
}: {
  id: string;
  serviceId?: string;
  isActive?: boolean;
  action: (state: FormActionState, data: FormData) => Promise<FormActionState>;
  destructive?: boolean;
  deleteMode?: boolean;
  confirmMessage?: string;
  returnTo?: string;
}) {
  const [state, setState] = useState<FormActionState>({});
  const [pending, startTransition] = useTransition();

  function submit() {
    if (
      deleteMode &&
      !window.confirm(
        "Remover este bloqueio? O período ficará disponível para novos agendamentos.",
      )
    ) {
      return;
    }
    if (confirmMessage && !window.confirm(confirmMessage)) return;

    const data = new FormData();
    data.set("id", id);
    if (serviceId) data.set("serviceId", serviceId);
    if (isActive !== undefined) data.set("isActive", String(!isActive));
    if (returnTo) data.set("returnTo", returnTo);
    startTransition(async () => setState(await action({}, data)));
  }

  return (
    <div>
      <FormFeedback state={state} />
      <Button
        type="button"
        size="sm"
        variant={destructive ? "destructive" : "outline"}
        disabled={pending}
        onClick={submit}
      >
        {pending ? <LoaderCircle className="size-4 animate-spin" /> : null}
        {deleteMode ? "Remover" : isActive ? "Inativar" : "Ativar"}
      </Button>
    </div>
  );
}
