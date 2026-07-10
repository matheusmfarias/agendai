"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Camera, LoaderCircle, Mail, Phone, Save, UserRound } from "lucide-react";
import { useForm } from "react-hook-form";

import { FieldError, FormFeedback } from "@/components/forms/form-feedback";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  formatCustomerPhone,
  normalizeCustomerPhone,
} from "@/features/customers/customer-normalization";
import {
  createCustomerSchema,
  updateCustomerSchema,
} from "@/features/customers/customer-schemas";
import type { FormActionState } from "@/types/form-state";

type Values = {
  id?: string;
  name: string;
  phone: string;
  email: string;
  notes: string;
  isActive: boolean;
  avatarUrl?: string | null;
};

function initials(name: string) {
  const parts = name.split(" ").filter(Boolean);
  return (parts[0]?.[0] ?? "?") + (parts[1]?.[0] ?? "");
}

function avatarSrc(value: string) {
  if (value.startsWith("blob:")) return value;
  return `${value}${value.includes("?") ? "&" : "?"}v=${encodeURIComponent(value)}`;
}

export function CustomerForm({
  mode,
  defaultValues,
  action,
  returnTo,
}: {
  mode: "create" | "edit";
  defaultValues: Values;
  action: (state: FormActionState, data: FormData) => Promise<FormActionState>;
  returnTo?: string;
}) {
  const [state, setState] = useState<FormActionState>({});
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const form = useForm<Values>({
    resolver: zodResolver(
      mode === "create" ? createCustomerSchema : updateCustomerSchema,
    ) as never,
    defaultValues,
  });
  const error = (name: keyof Values) =>
    form.formState.errors[name]?.message?.toString() ??
    state.fieldErrors?.[name]?.[0];
  // eslint-disable-next-line react-hooks/incompatible-library
  const customerName = form.watch("name");
  const avatarUrl = previewUrl ?? defaultValues.avatarUrl;

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function onSubmit(values: Values) {
    if (pending) return;
    const data = new FormData(formRef.current ?? undefined);
    Object.entries(values).forEach(([key, value]) => {
      if (key === "avatarUrl") return;
      data.set(
        key,
        key === "phone" ? normalizeCustomerPhone(String(value)) : String(value),
      );
    });
    if (returnTo) data.set("returnTo", returnTo);
    startTransition(async () => setState(await action({}, data)));
  }

  return (
    <form
      ref={formRef}
      className="space-y-5"
      onSubmit={form.handleSubmit(onSubmit)}
      encType="multipart/form-data"
    >
      <FormFeedback state={state} />
      {defaultValues.id ? <input type="hidden" {...form.register("id")} /> : null}

      <div className="rounded-3xl border border-border bg-card p-5 shadow-sm">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
          <div className="relative shrink-0">
            <div className="grid size-24 place-items-center overflow-hidden rounded-full bg-primary/10 text-2xl font-bold uppercase text-primary ring-4 ring-background shadow-sm">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarSrc(avatarUrl)}
                  alt={customerName || "Foto do cliente"}
                  className="size-full object-cover"
                />
              ) : customerName ? (
                initials(customerName)
              ) : (
                <UserRound className="size-9" />
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              id="avatar"
              name="avatar"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                const nextUrl = URL.createObjectURL(file);
                setPreviewUrl((current) => {
                  if (current) URL.revokeObjectURL(current);
                  return nextUrl;
                });
              }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute -bottom-1 -right-1 grid size-9 place-items-center rounded-full border border-border bg-background text-foreground shadow-md transition-colors hover:bg-muted"
              aria-label="Enviar foto do cliente"
            >
              <Camera className="size-4" />
            </button>
          </div>

          <div className="min-w-0 flex-1 text-center sm:text-left">
            <h3 className="text-xl font-semibold">
              {mode === "create" ? "Novo cliente" : "Dados do cliente"}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Foto, contato e notas internas em um cadastro rápido.
            </p>
            <p className="mt-3 text-xs text-muted-foreground">
              JPG, PNG ou WebP até 2 MB.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-border bg-card p-5 shadow-sm">
        <div className="grid gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome completo</Label>
            <Input
              id="name"
              placeholder="Ex.: Maria Oliveira"
              {...form.register("name")}
            />
            <FieldError message={error("name")} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="phone" className="flex items-center gap-2">
                <Phone className="size-4 text-muted-foreground" />
                Telefone
              </Label>
            <Input
              id="phone"
              placeholder="(11) 99999-9999"
              {...form.register("phone", {
                onChange: (event) => {
                  event.target.value = formatCustomerPhone(event.target.value);
                },
              })}
            />
              <FieldError message={error("phone")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="size-4 text-muted-foreground" />
                E-mail
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="cliente@email.com"
                {...form.register("email")}
              />
              <FieldError message={error("email")} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notas internas</Label>
            <Textarea
              id="notes"
              rows={4}
              placeholder="Preferências, restrições ou detalhes importantes..."
              {...form.register("notes")}
            />
            <FieldError message={error("notes")} />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-3xl border border-border bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <label className="flex items-start gap-3 text-sm">
          <Checkbox className="mt-0.5" {...form.register("isActive")} />
          <span>
            <span className="block font-medium">Cliente ativo</span>
            <span className="text-xs text-muted-foreground">
              Disponível para agendamentos manuais.
            </span>
          </span>
        </label>

        <Button type="submit" disabled={pending} className="sm:min-w-44">
          {pending ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : (
            <Save className="size-4" />
          )}
          {pending
            ? mode === "create"
              ? "Cadastrando..."
              : "Salvando..."
            : mode === "create"
              ? "Cadastrar cliente"
              : "Salvar alterações"}
        </Button>
      </div>
    </form>
  );
}
