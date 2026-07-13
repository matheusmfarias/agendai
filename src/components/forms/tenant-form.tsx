"use client";

import { useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle, Save } from "lucide-react";
import { useForm } from "react-hook-form";

import { AddressMapPreview } from "@/components/forms/address-map-preview";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FieldError, FormFeedback } from "@/components/forms/form-feedback";
import {
  createTenantSchema,
  updateTenantSchema,
} from "@/features/tenants/tenant-schemas";
import { setFormDataValue } from "@/lib/form-data";
import {
  formatBrazilianPhone,
  formatCep,
  formatCpfCnpj,
  formatIntegerInput,
} from "@/lib/input-formatters";
import type { FormActionState } from "@/types/form-state";

type PlanOption = {
  id: string;
  name: string;
  monthlyPrice: string;
  annualPrice: string;
};

type TenantFormValues = {
  id?: string;
  name: string;
  slug: string;
  documentType?: "CPF" | "CNPJ";
  documentNumber?: string;
  publicDisplayName?: string;
  responsibleName: string;
  email: string;
  whatsapp: string;
  segment: string;
  city: string;
  state: string;
  postalCode?: string;
  neighborhood?: string;
  address?: string;
  addressComplement?: string;
  googleMapsUrl?: string;
  serviceLocation: "BUSINESS_ADDRESS" | "CUSTOMER_ADDRESS" | "BOTH";
  timezone: "America/Sao_Paulo" | "America/Manaus" | "America/Cuiaba" | "America/Rio_Branco";
  defaultAppointmentDuration: number;
  defaultSlotInterval: number;
  minBookingNoticeMinutes: number;
  maxBookingAdvanceDays: number;
  description?: string;
  status: "ACTIVE" | "SUSPENDED" | "CANCELED";
  planId?: string;
  billingCycle?: "MONTHLY" | "ANNUAL";
  expiresAt?: string;
  ownerName?: string;
  ownerEmail?: string;
  initialPassword?: string;
  confirmInitialPassword?: string;
};

type TenantFormProps = {
  mode: "create" | "edit";
  plans?: PlanOption[];
  defaultValues: TenantFormValues;
  action: (
    previousState: FormActionState,
    formData: FormData,
  ) => Promise<FormActionState>;
};

const INITIAL_STATE: FormActionState = {};

export function TenantForm({
  mode,
  plans = [],
  defaultValues,
  action,
}: TenantFormProps) {
  const schema = mode === "create" ? createTenantSchema : updateTenantSchema;
  const [state, setState] = useState<FormActionState>(INITIAL_STATE);
  const [pending, startTransition] = useTransition();
  const form = useForm<TenantFormValues>({
    resolver: zodResolver(schema as never, undefined, { raw: true }) as never,
    defaultValues,
  });

  function onSubmit(values: TenantFormValues) {
    const formData = new FormData();
    Object.entries({ ...values, googleMapsUrl: "" }).forEach(([key, value]) => {
      setFormDataValue(formData, key, value);
    });

    startTransition(async () => {
      setState(await action(INITIAL_STATE, formData));
    });
  }

  const fieldError = (name: keyof TenantFormValues) =>
    form.formState.errors[name]?.message?.toString() ??
    state.fieldErrors?.[name]?.[0];
  // eslint-disable-next-line react-hooks/incompatible-library
  const documentType = form.watch("documentType");
  const mapAddress = form.watch([
    "address",
    "neighborhood",
    "city",
    "state",
    "postalCode",
  ]);

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <FormFeedback state={state} />

      {defaultValues.id ? (
        <input type="hidden" {...form.register("id")} />
      ) : null}

      <div className="grid gap-5 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Nome do negócio</Label>
          <Input id="name" {...form.register("name")} />
          <FieldError message={fieldError("name")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="slug">Slug</Label>
          <Input id="slug" placeholder="meu-negocio" {...form.register("slug")} />
          <FieldError message={fieldError("slug")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="publicDisplayName">Nome público exibido</Label>
          <Input
            id="publicDisplayName"
            placeholder="Opcional, se for diferente do nome do negocio"
            {...form.register("publicDisplayName")}
          />
          <FieldError message={fieldError("publicDisplayName")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="documentType">Tipo de documento</Label>
          <Select id="documentType" {...form.register("documentType")}>
            <option value="CNPJ">CNPJ</option>
            <option value="CPF">CPF</option>
          </Select>
          <FieldError message={fieldError("documentType")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="documentNumber">CNPJ/CPF</Label>
          <Input
            id="documentNumber"
            placeholder="00.000.000/0000-00"
            {...form.register("documentNumber", {
              onChange: (event) => {
                event.target.value = formatCpfCnpj(
                  event.target.value,
                  documentType,
                );
              },
            })}
          />
          <FieldError message={fieldError("documentNumber")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="responsibleName">Responsável</Label>
          <Input id="responsibleName" {...form.register("responsibleName")} />
          <FieldError message={fieldError("responsibleName")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">E-mail</Label>
          <Input id="email" type="email" {...form.register("email")} />
          <FieldError message={fieldError("email")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="whatsapp">WhatsApp</Label>
          <Input
            id="whatsapp"
            placeholder="(11) 99999-9999"
            {...form.register("whatsapp", {
              onChange: (event) => {
                event.target.value = formatBrazilianPhone(event.target.value);
              },
            })}
          />
          <FieldError message={fieldError("whatsapp")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="segment">Segmento</Label>
          <Input id="segment" {...form.register("segment")} />
          <FieldError message={fieldError("segment")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="city">Cidade</Label>
          <Input id="city" {...form.register("city")} />
          <FieldError message={fieldError("city")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="state">Estado (UF)</Label>
          <Input id="state" maxLength={2} {...form.register("state")} />
          <FieldError message={fieldError("state")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select id="status" {...form.register("status")}>
            <option value="ACTIVE">Ativo</option>
            <option value="SUSPENDED">Suspenso</option>
            <option value="CANCELED">Cancelado</option>
          </Select>
          <FieldError message={fieldError("status")} />
        </div>
      </div>

      <fieldset className="grid gap-5 rounded-lg border p-4 md:grid-cols-2">
        <legend className="px-2 text-sm font-medium">Perfil público</legend>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="description">Descrição do negócio</Label>
          <Textarea
            id="description"
            rows={4}
            placeholder="Resumo que aparece no link público e ajuda o cliente a entender o atendimento."
            {...form.register("description")}
          />
          <FieldError message={fieldError("description")} />
        </div>
      </fieldset>

      <fieldset className="grid gap-5 rounded-lg border p-4 md:grid-cols-2">
        <legend className="px-2 text-sm font-medium">
          Localizacao e atendimento
        </legend>
        <div className="space-y-2">
          <Label htmlFor="postalCode">CEP</Label>
          <Input
            id="postalCode"
            placeholder="00000-000"
            {...form.register("postalCode", {
              onChange: (event) => {
                event.target.value = formatCep(event.target.value);
              },
            })}
          />
          <FieldError message={fieldError("postalCode")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="neighborhood">Bairro</Label>
          <Input id="neighborhood" {...form.register("neighborhood")} />
          <FieldError message={fieldError("neighborhood")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="address">Endereco</Label>
          <Input id="address" {...form.register("address")} />
          <FieldError message={fieldError("address")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="addressComplement">Complemento</Label>
          <Input
            id="addressComplement"
            {...form.register("addressComplement")}
          />
          <FieldError message={fieldError("addressComplement")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="serviceLocation">Como atende</Label>
          <Select id="serviceLocation" {...form.register("serviceLocation")}>
            <option value="BUSINESS_ADDRESS">No endereco do negocio</option>
            <option value="CUSTOMER_ADDRESS">No endereco do cliente</option>
            <option value="BOTH">No negocio ou no cliente</option>
          </Select>
          <FieldError message={fieldError("serviceLocation")} />
        </div>
        <AddressMapPreview
          address={mapAddress[0]}
          neighborhood={mapAddress[1]}
          city={mapAddress[2]}
          state={mapAddress[3]}
          postalCode={mapAddress[4]}
        />
      </fieldset>

      <fieldset className="grid gap-5 rounded-lg border p-4 md:grid-cols-2">
        <legend className="px-2 text-sm font-medium">Regras padrao</legend>
        <div className="space-y-2">
          <Label htmlFor="timezone">Fuso horário</Label>
          <Select id="timezone" {...form.register("timezone")}>
            <option value="America/Sao_Paulo">Brasilia (BRT)</option>
            <option value="America/Manaus">Manaus (AMT)</option>
            <option value="America/Cuiaba">Cuiaba (AMT)</option>
            <option value="America/Rio_Branco">Rio Branco (ACT)</option>
          </Select>
          <FieldError message={fieldError("timezone")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="defaultAppointmentDuration">
            Duracao padrao (min)
          </Label>
          <Input
            id="defaultAppointmentDuration"
            type="number"
            min={5}
            {...form.register("defaultAppointmentDuration", {
              valueAsNumber: true,
              onChange: (event) => {
                event.target.value = formatIntegerInput(event.target.value);
              },
            })}
          />
          <FieldError message={fieldError("defaultAppointmentDuration")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="defaultSlotInterval">Intervalo padrao (min)</Label>
          <Input
            id="defaultSlotInterval"
            type="number"
            min={5}
            {...form.register("defaultSlotInterval", {
              valueAsNumber: true,
              onChange: (event) => {
                event.target.value = formatIntegerInput(event.target.value);
              },
            })}
          />
          <FieldError message={fieldError("defaultSlotInterval")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="minBookingNoticeMinutes">
            Antecedencia minima (min)
          </Label>
          <Input
            id="minBookingNoticeMinutes"
            type="number"
            min={0}
            {...form.register("minBookingNoticeMinutes", {
              valueAsNumber: true,
              onChange: (event) => {
                event.target.value = formatIntegerInput(event.target.value);
              },
            })}
          />
          <FieldError message={fieldError("minBookingNoticeMinutes")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="maxBookingAdvanceDays">Agenda aberta por (dias)</Label>
          <Input
            id="maxBookingAdvanceDays"
            type="number"
            min={1}
            {...form.register("maxBookingAdvanceDays", {
              valueAsNumber: true,
              onChange: (event) => {
                event.target.value = formatIntegerInput(event.target.value);
              },
            })}
          />
          <FieldError message={fieldError("maxBookingAdvanceDays")} />
        </div>
      </fieldset>

      {mode === "create" ? (
        <>
          <fieldset className="grid gap-5 rounded-lg border p-4 md:grid-cols-2">
            <legend className="px-2 text-sm font-medium">
              Acesso do responsável
            </legend>
            <div className="space-y-2">
              <Label htmlFor="ownerName">
                Nome do usuário responsável
              </Label>
              <Input id="ownerName" {...form.register("ownerName")} />
              <FieldError message={fieldError("ownerName")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ownerEmail">
                E-mail de login do responsável
              </Label>
              <Input
                id="ownerEmail"
                type="email"
                autoComplete="off"
                {...form.register("ownerEmail")}
              />
              <FieldError message={fieldError("ownerEmail")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="initialPassword">Senha inicial</Label>
              <Input
                id="initialPassword"
                type="password"
                autoComplete="new-password"
                {...form.register("initialPassword")}
              />
              <FieldError message={fieldError("initialPassword")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmInitialPassword">
                Confirmar senha
              </Label>
              <Input
                id="confirmInitialPassword"
                type="password"
                autoComplete="new-password"
                {...form.register("confirmInitialPassword")}
              />
              <FieldError message={fieldError("confirmInitialPassword")} />
            </div>
          </fieldset>

          <fieldset className="grid gap-5 rounded-lg border p-4 md:grid-cols-3">
            <legend className="px-2 text-sm font-medium">
              Assinatura inicial
            </legend>
            <div className="space-y-2">
              <Label htmlFor="planId">Plano</Label>
              <Select id="planId" {...form.register("planId")}>
                <option value="">Selecione</option>
                {plans.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.name}
                  </option>
                ))}
              </Select>
              <FieldError message={fieldError("planId")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="billingCycle">Ciclo</Label>
              <Select id="billingCycle" {...form.register("billingCycle")}>
                <option value="MONTHLY">Mensal</option>
                <option value="ANNUAL">Anual</option>
              </Select>
              <FieldError message={fieldError("billingCycle")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expiresAt">Vencimento</Label>
              <Input
                id="expiresAt"
                type="date"
                {...form.register("expiresAt")}
              />
              <FieldError message={fieldError("expiresAt")} />
            </div>
          </fieldset>
        </>
      ) : null}

      <Button type="submit" disabled={pending}>
        {pending ? (
          <LoaderCircle className="size-4 animate-spin" />
        ) : (
          <Save className="size-4" />
        )}
        {pending ? "Salvando prestador..." : "Salvar prestador"}
      </Button>
    </form>
  );
}
