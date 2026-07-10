import { Alert } from "@/components/ui/alert";
import type { FormActionState } from "@/types/form-state";

export function FormFeedback({ state }: { state: FormActionState }) {
  if (!state.message) {
    return null;
  }

  return (
    <Alert variant={state.success ? "success" : "destructive"}>
      {state.message}
    </Alert>
  );
}

export function FieldError({
  message,
}: {
  message?: string | string[];
}) {
  const text = Array.isArray(message) ? message[0] : message;

  return text ? <p className="text-sm text-destructive pt-2">{text}</p> : null;
}
