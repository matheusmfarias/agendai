"use client";

import { useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { KeyRound, LoaderCircle, UserPlus } from "lucide-react";
import { useForm } from "react-hook-form";

import { FieldError, FormFeedback } from "@/components/forms/form-feedback";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  provisionTenantOwnerSchema,
  resetTenantOwnerPasswordSchema,
} from "@/features/tenants/tenant-schemas";
import { setFormDataValue } from "@/lib/form-data";
import type { FormActionState } from "@/types/form-state";

type CreateOwnerValues = {
  tenantId: string;
  ownerName: string;
  ownerEmail: string;
  initialPassword: string;
  confirmInitialPassword: string;
};

type ResetPasswordValues = {
  tenantId: string;
  userId: string;
  newPassword: string;
  confirmNewPassword: string;
};

type TenantOwnerAccessFormProps =
  | {
      mode: "create";
      defaultValues: CreateOwnerValues;
      action: (
        previousState: FormActionState,
        formData: FormData,
      ) => Promise<FormActionState>;
    }
  | {
      mode: "reset";
      defaultValues: ResetPasswordValues;
      action: (
        previousState: FormActionState,
        formData: FormData,
      ) => Promise<FormActionState>;
    };

const INITIAL_STATE: FormActionState = {};

export function TenantOwnerAccessForm(props: TenantOwnerAccessFormProps) {
  const [state, setState] = useState<FormActionState>(INITIAL_STATE);
  const [pending, startTransition] = useTransition();

  if (props.mode === "create") {
    return (
      <CreateOwnerForm
        {...props}
        state={state}
        pending={pending}
        submit={(formData) =>
          startTransition(async () => {
            setState(await props.action(INITIAL_STATE, formData));
          })
        }
      />
    );
  }

  return (
    <ResetPasswordForm
      {...props}
      state={state}
      pending={pending}
      submit={(formData) =>
        startTransition(async () => {
          setState(await props.action(INITIAL_STATE, formData));
        })
      }
    />
  );
}

type SharedFormProps = {
  state: FormActionState;
  pending: boolean;
  submit: (formData: FormData) => void;
};

function CreateOwnerForm({
  defaultValues,
  state,
  pending,
  submit,
}: Extract<TenantOwnerAccessFormProps, { mode: "create" }> &
  SharedFormProps) {
  const form = useForm<CreateOwnerValues>({
    resolver: zodResolver(provisionTenantOwnerSchema, undefined, {
      raw: true,
    }) as never,
    defaultValues,
  });

  return (
    <form
      onSubmit={form.handleSubmit((values) => {
        const formData = new FormData();
        Object.entries(values).forEach(([key, value]) =>
          setFormDataValue(formData, key, value),
        );
        submit(formData);
      })}
      className="space-y-5"
    >
      <FormFeedback state={state} />
      <input type="hidden" {...form.register("tenantId")} />
      <div className="grid gap-5 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="ownerName">Nome do usuário responsável</Label>
          <Input id="ownerName" {...form.register("ownerName")} />
          <FieldError
            message={
              form.formState.errors.ownerName?.message ??
              state.fieldErrors?.ownerName?.[0]
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ownerEmail">E-mail de login</Label>
          <Input
            id="ownerEmail"
            type="email"
            autoComplete="off"
            {...form.register("ownerEmail")}
          />
          <FieldError
            message={
              form.formState.errors.ownerEmail?.message ??
              state.fieldErrors?.ownerEmail?.[0]
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="initialPassword">Senha inicial</Label>
          <Input
            id="initialPassword"
            type="password"
            autoComplete="new-password"
            {...form.register("initialPassword")}
          />
          <FieldError
            message={
              form.formState.errors.initialPassword?.message ??
              state.fieldErrors?.initialPassword?.[0]
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirmInitialPassword">Confirmar senha</Label>
          <Input
            id="confirmInitialPassword"
            type="password"
            autoComplete="new-password"
            {...form.register("confirmInitialPassword")}
          />
          <FieldError
            message={
              form.formState.errors.confirmInitialPassword?.message ??
              state.fieldErrors?.confirmInitialPassword?.[0]
            }
          />
        </div>
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? (
          <LoaderCircle className="size-4 animate-spin" />
        ) : (
          <UserPlus className="size-4" />
        )}
        {pending ? "Criando..." : "Criar acesso do responsável"}
      </Button>
    </form>
  );
}

function ResetPasswordForm({
  defaultValues,
  state,
  pending,
  submit,
}: Extract<TenantOwnerAccessFormProps, { mode: "reset" }> &
  SharedFormProps) {
  const form = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetTenantOwnerPasswordSchema, undefined, {
      raw: true,
    }) as never,
    defaultValues,
  });

  return (
    <form
      onSubmit={form.handleSubmit((values) => {
        const formData = new FormData();
        Object.entries(values).forEach(([key, value]) =>
          setFormDataValue(formData, key, value),
        );
        submit(formData);
      })}
      className="space-y-5"
    >
      <FormFeedback state={state} />
      <input type="hidden" {...form.register("tenantId")} />
      <input type="hidden" {...form.register("userId")} />
      <div className="grid gap-5 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="newPassword">Nova senha</Label>
          <Input
            id="newPassword"
            type="password"
            autoComplete="new-password"
            {...form.register("newPassword")}
          />
          <FieldError
            message={
              form.formState.errors.newPassword?.message ??
              state.fieldErrors?.newPassword?.[0]
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirmNewPassword">Confirmar nova senha</Label>
          <Input
            id="confirmNewPassword"
            type="password"
            autoComplete="new-password"
            {...form.register("confirmNewPassword")}
          />
          <FieldError
            message={
              form.formState.errors.confirmNewPassword?.message ??
              state.fieldErrors?.confirmNewPassword?.[0]
            }
          />
        </div>
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? (
          <LoaderCircle className="size-4 animate-spin" />
        ) : (
          <KeyRound className="size-4" />
        )}
        {pending ? "Redefinindo..." : "Redefinir senha"}
      </Button>
    </form>
  );
}
