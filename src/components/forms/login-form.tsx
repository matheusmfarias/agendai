"use client";

import { useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle, LogIn } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import {
  loginAction,
  type LoginActionState,
} from "@/features/auth/auth-actions";
import { loginSchema } from "@/features/auth/auth-schemas";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const INITIAL_STATE: LoginActionState = {};
type LoginFormInput = z.input<typeof loginSchema>;

export function LoginForm() {
  const [state, setState] = useState<LoginActionState>(INITIAL_STATE);
  const [pending, startTransition] = useTransition();
  const form = useForm<LoginFormInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  function onSubmit(values: LoginFormInput) {
    const formData = new FormData();
    formData.set("email", values.email);
    formData.set("password", values.password);

    startTransition(async () => {
      const result = await loginAction(INITIAL_STATE, formData);
      setState(result);
    });
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="email">E-mail</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="voce@exemplo.com"
          aria-describedby={
            form.formState.errors.email || state.fieldErrors?.email
              ? "email-error"
              : undefined
          }
          {...form.register("email")}
          required
        />
        {(form.formState.errors.email || state.fieldErrors?.email) && (
          <p id="email-error" className="text-sm text-destructive">
            {form.formState.errors.email?.message ??
              state.fieldErrors?.email?.[0]}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Senha</Label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          aria-describedby={
            form.formState.errors.password || state.fieldErrors?.password
              ? "password-error"
              : undefined
          }
          {...form.register("password")}
          required
        />
        {(form.formState.errors.password || state.fieldErrors?.password) && (
          <p id="password-error" className="text-sm text-destructive">
            {form.formState.errors.password?.message ??
              state.fieldErrors?.password?.[0]}
          </p>
        )}
      </div>

      {state.message ? (
        <Alert variant="destructive">{state.message}</Alert>
      ) : null}

      <Button className="w-full" type="submit" disabled={pending}>
        {pending ? (
          <LoaderCircle className="size-4 animate-spin" />
        ) : (
          <LogIn className="size-4" />
        )}
        {pending ? "Entrando..." : "Entrar"}
      </Button>
    </form>
  );
}
