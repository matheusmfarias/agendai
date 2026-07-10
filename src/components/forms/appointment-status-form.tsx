"use client";

import { useState, useTransition } from "react";
import { LoaderCircle } from "lucide-react";

import { FormFeedback } from "@/components/forms/form-feedback";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { APPOINTMENT_STATUS_LABELS } from "@/features/appointments/appointment-constants";
import type { AppointmentStatus } from "@/generated/prisma/client";
import { normalizeDecimalInput } from "@/lib/input-formatters";
import type { FormActionState } from "@/types/form-state";

export function AppointmentStatusForm({
  id,
  transitions,
  action,
  compact = false,
}: {
  id: string;
  transitions: AppointmentStatus[];
  action: (state: FormActionState, data: FormData) => Promise<FormActionState>;
  compact?: boolean;
}) {
  const [state, setState] = useState<FormActionState>({});
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<AppointmentStatus>(
    transitions[0] ?? "CONFIRMED",
  );
  const [finalPrice, setFinalPrice] = useState("");

  function submit() {
    if (
      status === "CANCELED_BY_PROVIDER" &&
      !window.confirm("Cancelar este agendamento? O horário será liberado na agenda.")
    ) {
      return;
    }
    const data = new FormData();
    data.set("id", id);
    data.set("status", status);
    data.set("finalPrice", finalPrice);
    startTransition(async () => setState(await action({}, data)));
  }

  if (!transitions.length) return null;

  return (
    <div className="space-y-4">
      <FormFeedback state={state} />
      <div
        className={
          compact
            ? "space-y-3"
            : "grid gap-4 sm:grid-cols-[1fr_180px_auto] sm:items-end"
        }
      >
        <div className="space-y-2">
          <Label htmlFor="appointment-status">Novo status</Label>
          <Select
            id="appointment-status"
            value={status}
            onChange={(event) =>
              setStatus(event.target.value as AppointmentStatus)
            }
          >
            {transitions.map((transition) => (
              <option key={transition} value={transition}>
                {APPOINTMENT_STATUS_LABELS[transition]}
              </option>
            ))}
          </Select>
        </div>
        {status === "FINISHED" ? (
          <div className="space-y-2">
            <Label htmlFor="finalPrice">Valor final</Label>
            <Input
              id="finalPrice"
              inputMode="decimal"
              placeholder="0,00"
              value={finalPrice}
              onChange={(event) =>
                setFinalPrice(normalizeDecimalInput(event.target.value))
              }
            />
          </div>
        ) : (
          compact ? null : <div />
        )}
        <Button
          type="button"
          className={compact ? "w-full" : undefined}
          disabled={pending}
          variant={
            status === "CANCELED_BY_PROVIDER" ? "destructive" : "default"
          }
          onClick={submit}
        >
          {pending ? <LoaderCircle className="size-4 animate-spin" /> : null}
          Atualizar status
        </Button>
      </div>
    </div>
  );
}
