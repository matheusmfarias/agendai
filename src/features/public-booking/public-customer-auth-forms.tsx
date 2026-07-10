"use client";

import { useActionState } from "react";
import { LogIn, UserPlus } from "lucide-react";

import {
  loginPublicCustomerAction,
  registerPublicCustomerAction,
} from "@/features/public-booking/public-customer-auth";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatBrazilianPhone } from "@/lib/input-formatters";
import type { FormActionState } from "@/types/form-state";

function FieldError({ message }: { message?: string }) {
  return message ? <p className="text-sm text-destructive">{message}</p> : null;
}

export function PublicCustomerAuthForms({ redirectTo }: { redirectTo: string }) {
  const [loginState, loginAction, loginPending] = useActionState<
    FormActionState,
    FormData
  >(loginPublicCustomerAction, {});
  const [registerState, registerAction, registerPending] = useActionState<
    FormActionState,
    FormData
  >(registerPublicCustomerAction, {});

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Login */}
      <Card>
        <CardHeader>
          <CardTitle>Já tem conta?</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={loginAction} className="space-y-4">
            {loginState.message ? (
              <Alert variant="destructive">{loginState.message}</Alert>
            ) : null}
            <input type="hidden" name="redirectTo" value={redirectTo} />
            <div className="space-y-2">
              <Label htmlFor="customer-login-email">E-mail</Label>
              <Input
                id="customer-login-email"
                name="email"
                type="email"
                autoComplete="email"
                required
              />
              <FieldError message={loginState.fieldErrors?.email?.[0]} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customer-login-password">Senha</Label>
              <Input
                id="customer-login-password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
              />
              <FieldError message={loginState.fieldErrors?.password?.[0]} />
            </div>
            <Button type="submit" className="w-full" disabled={loginPending}>
              <LogIn className="size-4" />
              Entrar
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Register */}
      <Card>
        <CardHeader>
          <CardTitle>Não tem conta?</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={registerAction} className="space-y-4">
            {registerState.message ? (
              <Alert variant="destructive">{registerState.message}</Alert>
            ) : null}
            <input type="hidden" name="redirectTo" value={redirectTo} />
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="customer-first-name">Nome</Label>
                <Input id="customer-first-name" name="firstName" required />
                <FieldError message={registerState.fieldErrors?.firstName?.[0]} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customer-last-name">Sobrenome</Label>
                <Input id="customer-last-name" name="lastName" required />
                <FieldError
                  message={registerState.fieldErrors?.lastName?.[0]}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="customer-register-email">E-mail</Label>
              <Input
                id="customer-register-email"
                name="email"
                type="email"
                autoComplete="email"
                required
              />
              <FieldError message={registerState.fieldErrors?.email?.[0]} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customer-phone">Telefone/WhatsApp</Label>
              <Input
                id="customer-phone"
                name="phone"
                placeholder="(11) 99999-9999"
                onChange={(event) => {
                  event.target.value = formatBrazilianPhone(event.target.value);
                }}
                required
              />
              <FieldError message={registerState.fieldErrors?.phone?.[0]} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="customer-register-password">Senha</Label>
                <Input
                  id="customer-register-password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                />
                <FieldError
                  message={registerState.fieldErrors?.password?.[0]}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customer-confirm-password">Confirmar senha</Label>
                <Input
                  id="customer-confirm-password"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                />
                <FieldError
                  message={registerState.fieldErrors?.confirmPassword?.[0]}
                />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={registerPending}>
              <UserPlus className="size-4" />
              Criar conta
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
