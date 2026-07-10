"use client";

import { useActionState, useState, useTransition } from "react";
import { ArrowLeft, Eye, EyeOff, LoaderCircle, X } from "lucide-react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  identifyPublicCustomerEmailAction,
  loginPublicCustomerAction,
  registerPublicCustomerAction,
  type PublicCustomerEmailState,
} from "@/features/public-booking/public-customer-auth";
import { formatBrazilianPhone } from "@/lib/input-formatters";
import type { FormActionState } from "@/types/form-state";

type Step = "email" | "login" | "register";

interface PublicCustomerAuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  redirectTo: string;
}

function FieldError({ message }: { message?: string }) {
  return message ? <p className="text-sm text-destructive">{message}</p> : null;
}

export function PublicCustomerAuthModal({
  open,
  onOpenChange,
  redirectTo,
}: PublicCustomerAuthModalProps) {
  const [step, setStep] = useState<Step>("email");
  const [emailState, setEmailState] = useState<PublicCustomerEmailState>({
    status: "idle",
  });
  const [emailPending, startEmailTransition] = useTransition();
  const [loginState, loginAction, loginPending] = useActionState<
    FormActionState,
    FormData
  >(loginPublicCustomerAction, {});
  const [registerState, registerAction, registerPending] = useActionState<
    FormActionState,
    FormData
  >(registerPublicCustomerAction, {});
  const [showPassword, setShowPassword] = useState(false);

  const email = emailState.email ?? "";
  const passwordType = showPassword ? "text" : "password";

  if (!open) return null;

  function closeModal() {
    setStep("email");
    setEmailState({ status: "idle" });
    setShowPassword(false);
    onOpenChange(false);
  }

  function handleEmailSubmit(formData: FormData) {
    startEmailTransition(async () => {
      const result = await identifyPublicCustomerEmailAction(formData);
      setEmailState(result);

      if (result.status === "existing") setStep("login");
      if (result.status === "new") setStep("register");
    });
  }

  function goBack() {
    if (step === "email") {
      closeModal();
      return;
    }

    setStep("email");
    setShowPassword(false);
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-background/96 backdrop-blur-sm sm:grid sm:place-items-center sm:bg-foreground/20 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="public-customer-auth-title"
    >
      <div className="relative flex min-h-dvh w-full flex-col bg-background px-7 py-7 sm:min-h-0 sm:max-w-md sm:rounded-3xl sm:border sm:px-8 sm:py-8 sm:shadow-xl">
        <div className="mb-8 flex items-center justify-between">
          <button
            type="button"
            onClick={goBack}
            className="-ml-2 grid size-10 place-items-center rounded-full text-foreground transition-colors hover:bg-muted"
            aria-label={step === "email" ? "Fechar" : "Voltar"}
          >
            <ArrowLeft className="size-5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={closeModal}
            className="-mr-2 hidden size-10 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:grid"
            aria-label="Fechar"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>

        {step === "email" ? (
          <form action={handleEmailSubmit} className="flex flex-1 flex-col">
            <div className="text-center">
              <h2
                id="public-customer-auth-title"
                className="text-3xl font-bold tracking-tight text-foreground"
              >
                Começar
              </h2>
              <p className="mx-auto mt-7 max-w-xs text-sm leading-relaxed text-muted-foreground">
                Crie uma conta ou faça login para agendar e gerenciar seus
                agendamentos.
              </p>
            </div>

            <div className="mt-10 space-y-2">
              <Label htmlFor="customer-auth-email" className="sr-only">
                Endereço de e-mail
              </Label>
              <Input
                id="customer-auth-email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="Endereço de e-mail"
                className="h-14 rounded-lg px-4 text-base"
                required
              />
              <FieldError message={emailState.fieldErrors?.email?.[0]} />
              {emailState.message ? (
                <Alert variant="destructive">{emailState.message}</Alert>
              ) : null}
            </div>

            <div className="mt-auto pt-10">
              <Button
                type="submit"
                disabled={emailPending}
                className="h-12 w-full rounded-lg text-base"
              >
                {emailPending ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : null}
                Continuar
              </Button>
            </div>
          </form>
        ) : null}

        {step === "login" ? (
          <form action={loginAction} className="flex flex-1 flex-col">
            <input type="hidden" name="redirectTo" value={redirectTo} />
            <input type="hidden" name="email" value={email} />

            <div className="pt-10 text-center">
              <h2
                id="public-customer-auth-title"
                className="text-3xl font-bold tracking-tight text-foreground"
              >
                Bem-vindo novamente
              </h2>
              <p className="mx-auto mt-8 max-w-xs text-sm leading-relaxed text-muted-foreground">
                Digite sua senha para entrar como{" "}
                <span className="font-bold text-foreground">{email}</span>
              </p>
            </div>

            <div className="mt-12 space-y-2">
              {loginState.message ? (
                <Alert variant="destructive">{loginState.message}</Alert>
              ) : null}

              <Label htmlFor="customer-login-password" className="sr-only">
                Senha
              </Label>
              <div className="relative">
                <Input
                  id="customer-login-password"
                  name="password"
                  type={passwordType}
                  autoComplete="current-password"
                  placeholder="Senha"
                  className="h-14 rounded-lg pr-12 text-base"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  className="absolute right-3 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showPassword ? (
                    <EyeOff className="size-4" aria-hidden="true" />
                  ) : (
                    <Eye className="size-4" aria-hidden="true" />
                  )}
                </button>
              </div>
              <FieldError message={loginState.fieldErrors?.password?.[0]} />
            </div>

            <div className="mt-auto pt-10">
              <Button
                type="submit"
                disabled={loginPending}
                className="h-12 w-full rounded-lg text-base"
              >
                {loginPending ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : null}
                Continuar
              </Button>
            </div>
          </form>
        ) : null}

        {step === "register" ? (
          <form action={registerAction} className="flex flex-1 flex-col">
            <input type="hidden" name="redirectTo" value={redirectTo} />
            <input type="hidden" name="email" value={email} />

            <div>
              <h2
                id="public-customer-auth-title"
                className="text-3xl font-bold tracking-tight text-foreground"
              >
                Inscrever-se
              </h2>
              <p className="mt-7 text-xl font-bold text-foreground">
                Crie sua conta no AgendaZap
              </p>
            </div>

            <div className="mt-8 space-y-4">
              {registerState.message ? (
                <Alert variant="destructive">{registerState.message}</Alert>
              ) : null}

              <Input
                value={email}
                readOnly
                className="h-14 rounded-lg bg-muted px-4 text-base text-muted-foreground"
                aria-label="Endereço de e-mail"
              />

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="customer-first-name" className="sr-only">
                    Nome
                  </Label>
                  <Input
                    id="customer-first-name"
                    name="firstName"
                    placeholder="Nome"
                    className="h-14 rounded-lg px-4 text-base"
                    required
                  />
                  <FieldError
                    message={registerState.fieldErrors?.firstName?.[0]}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customer-last-name" className="sr-only">
                    Sobrenome
                  </Label>
                  <Input
                    id="customer-last-name"
                    name="lastName"
                    placeholder="Sobrenome"
                    className="h-14 rounded-lg px-4 text-base"
                    required
                  />
                  <FieldError
                    message={registerState.fieldErrors?.lastName?.[0]}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="customer-phone" className="sr-only">
                  Número de telefone
                </Label>
                <Input
                  id="customer-phone"
                  name="phone"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="Número de telefone"
                  className="h-14 rounded-lg px-4 text-base"
                  onChange={(event) => {
                    event.target.value = formatBrazilianPhone(
                      event.target.value,
                    );
                  }}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Usaremos seu telefone apenas para identificar seu cadastro no
                  agendamento.
                </p>
                <FieldError message={registerState.fieldErrors?.phone?.[0]} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="customer-register-password" className="sr-only">
                  Senha
                </Label>
                <div className="relative">
                  <Input
                    id="customer-register-password"
                    name="password"
                    type={passwordType}
                    autoComplete="new-password"
                    placeholder="Senha"
                    className="h-14 rounded-lg pr-12 text-base"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    className="absolute right-3 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full text-muted-foreground hover:text-foreground"
                    aria-label={
                      showPassword ? "Ocultar senha" : "Mostrar senha"
                    }
                  >
                    {showPassword ? (
                      <EyeOff className="size-4" aria-hidden="true" />
                    ) : (
                      <Eye className="size-4" aria-hidden="true" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">
                  A senha deve ter pelo menos 8 caracteres.
                </p>
                <FieldError
                  message={registerState.fieldErrors?.password?.[0]}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="customer-confirm-password" className="sr-only">
                  Confirmar senha
                </Label>
                <Input
                  id="customer-confirm-password"
                  name="confirmPassword"
                  type={passwordType}
                  autoComplete="new-password"
                  placeholder="Confirmar senha"
                  className="h-14 rounded-lg px-4 text-base"
                  required
                />
                <FieldError
                  message={registerState.fieldErrors?.confirmPassword?.[0]}
                />
              </div>
            </div>

            <div className="mt-auto pt-8">
              <Button
                type="submit"
                disabled={registerPending}
                className="h-12 w-full rounded-lg text-base"
              >
                {registerPending ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : null}
                Criar conta
              </Button>
              <p className="mt-4 text-center text-xs leading-relaxed text-muted-foreground">
                Ao continuar, você cria uma conta de cliente para acompanhar
                seus agendamentos.
              </p>
            </div>
          </form>
        ) : null}
      </div>
    </div>
  );
}
