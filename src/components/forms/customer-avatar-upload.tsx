"use client";

import { useRef } from "react";
import { useActionState } from "react";
import { Camera, LoaderCircle } from "lucide-react";

import { FormFeedback } from "@/components/forms/form-feedback";
import type { FormActionState } from "@/types/form-state";

export function CustomerAvatarUpload({
  action,
  hasAvatar,
}: {
  action: (
    state: FormActionState,
    formData: FormData,
  ) => Promise<FormActionState>;
  hasAvatar: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form ref={formRef} action={formAction}>
      <FormFeedback state={state} />
      <input
        type="file"
        id="avatar"
        name="avatar"
        accept="image/jpeg,image/png,image/webp"
        required
        disabled={pending}
        className="sr-only"
        onChange={() => formRef.current?.requestSubmit()}
      />
      <label
        htmlFor="avatar"
        className={`grid size-9 cursor-pointer place-items-center rounded-full border bg-background text-foreground shadow-md transition-colors hover:bg-muted ${
          pending ? "pointer-events-none opacity-70" : ""
        }`}
        title={hasAvatar ? "Alterar foto" : "Enviar foto"}
      >
        {pending ? (
          <LoaderCircle className="size-4 animate-spin" />
        ) : (
          <Camera className="size-4" />
        )}
        <span className="sr-only">
          {pending
            ? "Enviando foto..."
            : hasAvatar
              ? "Alterar foto"
              : "Enviar foto"}
        </span>
      </label>
    </form>
  );
}
