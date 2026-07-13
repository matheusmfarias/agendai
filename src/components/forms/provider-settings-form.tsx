"use client";

import { useMemo, useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  BellRing,
  CalendarClock,
  Check,
  Copy,
  LoaderCircle,
  LockKeyhole,
  MapPin,
  MessageSquareText,
  Save,
  ShieldCheck,
  Store,
} from "lucide-react";
import { useForm, useWatch } from "react-hook-form";

import { FieldError, FormFeedback } from "@/components/forms/form-feedback";
import { AddressMapPreview } from "@/components/forms/address-map-preview";
import { ProviderLogoUpload } from "@/components/forms/provider-logo-upload";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { providerSettingsSchema } from "@/features/provider/provider-schemas";
import {
  formatBrazilianPhone,
  formatCep,
  formatIntegerInput,
} from "@/lib/input-formatters";
import { getProviderLogoFallbackText } from "@/lib/provider-brand";
import { cn } from "@/lib/utils";
import type { FormActionState } from "@/types/form-state";
import { NotificationSoundSettings } from "@/features/provider-notifications/components/provider-notification-center";

type ServiceLocation = "BUSINESS_ADDRESS" | "CUSTOMER_ADDRESS" | "BOTH";
type Timezone =
  | "America/Sao_Paulo"
  | "America/Manaus"
  | "America/Cuiaba"
  | "America/Rio_Branco";

type Values = {
  name: string;
  publicLinkActive: boolean;
  publicDisplayName: string;
  logoUrl: string;
  responsibleName: string;
  email: string;
  whatsapp: string;
  segment: string;
  city: string;
  state: string;
  postalCode: string;
  neighborhood: string;
  address: string;
  addressComplement: string;
  googleMapsUrl: string;
  serviceLocation: ServiceLocation;
  timezone: Timezone;
  locale: "pt-BR";
  currency: "BRL";
  weekStartsOn: number;
  timeFormat: "24H" | "12H";
  defaultAppointmentDuration: number;
  defaultSlotInterval: number;
  minBookingNoticeMinutes: number;
  maxBookingAdvanceDays: number;
  allowCustomerCancellation: boolean;
  allowCustomerRescheduling: boolean;
  cancellationNoticeHours: number;
  confirmationMessageTemplate: string;
  reminderMessageTemplate: string;
  cancellationMessageTemplate: string;
  enableAutomaticReminders: boolean;
  reminderLeadHours: number;
  description: string;
};

type SubscriptionInfo = {
  status: string;
  expiresAt: string | null;
  planName: string;
  publicLinkEnabled: boolean;
  whatsappEnabled: boolean;
} | null;

type AccountInfo = {
  responsibleName: string;
  email: string;
};

type TabId =
  | "public"
  | "location"
  | "booking"
  | "communication"
  | "notifications"
  | "subscription"
  | "account";

const TABS: {
  id: TabId;
  label: string;
  icon: typeof Store;
}[] = [
  { id: "public", label: "Perfil público", icon: Store },
  { id: "location", label: "Localização", icon: MapPin },
  { id: "booking", label: "Agendamento", icon: CalendarClock },
  { id: "communication", label: "Comunicação", icon: MessageSquareText },
  { id: "notifications", label: "Notificações", icon: BellRing },
  { id: "subscription", label: "Assinatura", icon: ShieldCheck },
  { id: "account", label: "Conta", icon: LockKeyhole },
];

const SERVICE_LOCATION_LABELS: Record<ServiceLocation, string> = {
  BUSINESS_ADDRESS: "No endereço do negócio",
  CUSTOMER_ADDRESS: "No endereço do cliente",
  BOTH: "No negócio ou no cliente",
};

function InfoBox({
  label,
  value,
  muted,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-background px-3 py-2.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn("mt-1 font-semibold", muted && "text-muted-foreground")}>
        {value}
      </p>
    </div>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
      <FieldError message={error} />
    </div>
  );
}

function CheckboxField({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex gap-3 rounded-xl border border-border bg-background px-3 py-3">
      <Checkbox
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5"
      />
      <span>
        <span className="block font-semibold">{label}</span>
        <span className="mt-1 block text-sm text-muted-foreground">
          {description}
        </span>
      </span>
    </label>
  );
}

function formatDate(value: string | null) {
  if (!value) return "Não informado";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

export function ProviderSettingsForm({
  defaultValues,
  action,
  tenantSlug,
  tenantStatus,
  subscription,
  account,
}: {
  defaultValues: Values;
  action: (state: FormActionState, data: FormData) => Promise<FormActionState>;
  tenantSlug: string;
  tenantStatus: string;
  subscription: SubscriptionInfo;
  account: AccountInfo;
}) {
  const [state, setState] = useState<FormActionState>({});
  const [pending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState<TabId>("public");
  const [copied, setCopied] = useState(false);
  const [selectedLogoFile, setSelectedLogoFile] = useState<File | null>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const form = useForm<Values>({
    resolver: zodResolver(providerSettingsSchema) as never,
    defaultValues,
  });
  const values = useWatch({ control: form.control });
  const error = (name: keyof Values) =>
    form.formState.errors[name]?.message?.toString() ??
    state.fieldErrors?.[name]?.[0];

  const publicPath = `/${tenantSlug}`;
  const publicDisplayName =
    values.publicDisplayName || values.name || defaultValues.name;
  const logoFallbackText = getProviderLogoFallbackText(publicDisplayName);
  const savedLogoUrl = defaultValues.logoUrl;
  const previewLogoUrl = logoPreviewUrl || savedLogoUrl;
  const publicLocation = [values.city, values.state].filter(Boolean).join("/");
  const publicLinkActive =
    values.publicLinkActive ?? defaultValues.publicLinkActive;
  const publicUrl = useMemo(() => {
    if (typeof window === "undefined") return publicPath;
    return `${window.location.origin}${publicPath}`;
  }, [publicPath]);

  function copyPublicLink() {
    navigator.clipboard?.writeText(publicUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  function onSubmit(values: Values) {
    const data = new FormData();
    const completeValues = Object.fromEntries(
      Object.entries(defaultValues).map(([key, defaultValue]) => {
        const currentValue = values[key as keyof Values];
        return [key, currentValue ?? defaultValue];
      }),
    ) as Values;

    Object.entries({ ...completeValues, googleMapsUrl: "" }).forEach(
      ([key, value]) => {
        data.set(key, String(value));
      },
    );
    if (selectedLogoFile) {
      data.set("logoFile", selectedLogoFile);
    }
    data.set("tenantSlug", tenantSlug);
    startTransition(async () => setState(await action({}, data)));
  }

  return (
    <form className="space-y-5" onSubmit={form.handleSubmit(onSubmit)}>
      <FormFeedback state={state} />

      <div className="grid gap-5 xl:grid-cols-[18rem_minmax(0,1fr)]">
        <aside className="space-y-3">
          <Card className="border-border/70 bg-card/95 py-0 shadow-sm">
            <CardContent className="p-2">
              <div className="flex gap-1 overflow-x-auto pb-1 xl:block xl:space-y-1 xl:pb-0">
                {TABS.map((tab) => {
                  const Icon = tab.icon;
                  const active = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={cn(
                        "flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition-colors xl:w-full",
                        active
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      )}
                    >
                      <Icon className="size-4" />
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-card/95 py-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                {savedLogoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={savedLogoUrl}
                    alt=""
                    className="size-11 shrink-0 rounded-full border border-border object-cover"
                  />
                ) : (
                  <div className="grid size-11 shrink-0 place-items-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                    {logoFallbackText}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="truncate font-semibold">{publicDisplayName}</p>
                  <p className="truncate text-sm text-muted-foreground">
                    {values.segment || "Segmento não informado"}
                  </p>
                  {publicLocation ? (
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      {publicLocation}
                    </p>
                  ) : null}
                </div>
              </div>
              <div className="mt-4 rounded-xl border border-border bg-background p-3">
                <p className="text-xs text-muted-foreground">Link público</p>
                <p className="mt-1 truncate text-sm font-semibold">
                  {publicPath}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-3 w-full"
                  onClick={copyPublicLink}
                >
                  {copied ? (
                    <Check className="size-4" />
                  ) : (
                    <Copy className="size-4" />
                  )}
                  {copied ? "Copiado" : "Copiar link"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </aside>

        <div className="space-y-4">
          {activeTab === "public" ? (
            <Card className="border-border/70 bg-card/95 shadow-sm">
              <CardContent className="space-y-6 p-5">
                <div>
                  <h2 className="text-lg font-semibold">Perfil público</h2>
                  <p className="text-sm text-muted-foreground">
                    Dados exibidos no link público, nos agendamentos e nas
                    mensagens.
                  </p>
                </div>

                <CheckboxField
                  label="Link público ativo"
                  description={
                    publicLinkActive
                      ? "Clientes conseguem acessar o link público e iniciar agendamentos."
                      : "O link público mostra a tela de agendamento indisponível."
                  }
                  checked={publicLinkActive}
                  onChange={(checked) =>
                    form.setValue("publicLinkActive", checked, {
                      shouldDirty: true,
                      shouldValidate: true,
                    })
                  }
                />

                <div className="grid gap-5 md:grid-cols-2">
                  <Field label="Nome do negócio" error={error("name")}>
                    <Input id="name" {...form.register("name")} />
                  </Field>
                  <Field
                    label="Nome público exibido"
                    error={error("publicDisplayName")}
                  >
                    <Input
                      id="publicDisplayName"
                      placeholder="Opcional, se quiser diferente do nome legal"
                      {...form.register("publicDisplayName")}
                    />
                  </Field>
                  <Field
                    label="Nome do responsável"
                    error={error("responsibleName")}
                  >
                    <Input
                      id="responsibleName"
                      {...form.register("responsibleName")}
                    />
                  </Field>
                  <Field label="Segmento" error={error("segment")}>
                    <Input id="segment" {...form.register("segment")} />
                  </Field>
                  <Field label="E-mail" error={error("email")}>
                    <Input
                      id="email"
                      type="email"
                      {...form.register("email")}
                    />
                  </Field>
                  <Field label="WhatsApp" error={error("whatsapp")}>
                    <Input
                      id="whatsapp"
                      placeholder="(11) 99999-9999"
                      {...form.register("whatsapp", {
                        onChange: (event) => {
                          event.target.value = formatBrazilianPhone(
                            event.target.value,
                          );
                        },
                      })}
                    />
                  </Field>
                </div>

                <div className="grid gap-4 rounded-xl border border-border bg-muted/25 p-4 md:grid-cols-[auto_minmax(0,1fr)] md:items-center">
                  {previewLogoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={previewLogoUrl}
                      alt=""
                      className="size-20 rounded-2xl border border-border bg-background object-cover"
                    />
                  ) : (
                    <div className="grid size-20 place-items-center rounded-2xl border border-dashed border-border bg-background text-lg font-bold text-primary">
                      {logoFallbackText}
                    </div>
                  )}
                  <div>
                    <p className="font-semibold">Logo pública e privada</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Essa imagem aparece no link público, confirmação de
                      agendamento e identificação interna do negócio.
                    </p>
                    <div className="mt-3">
                      <ProviderLogoUpload
                        hasLogo={Boolean(previewLogoUrl)}
                        onPreviewChange={(file, previewUrl) => {
                          setSelectedLogoFile(file);
                          setLogoPreviewUrl(previewUrl);
                        }}
                      />
                    </div>
                  </div>
                </div>

                <Field
                  label="Descrição do negócio"
                  error={error("description")}
                >
                  <Textarea
                    id="description"
                    rows={5}
                    placeholder="Conte o que você atende, como trabalha e o que o cliente precisa saber antes de agendar."
                    {...form.register("description")}
                  />
                </Field>
              </CardContent>
            </Card>
          ) : null}

          {activeTab === "location" ? (
            <Card className="border-border/70 bg-card/95 shadow-sm">
              <CardContent className="space-y-6 p-5">
                <div>
                  <h2 className="text-lg font-semibold">
                    Localização e atendimento
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Defina onde o serviço acontece e como o endereço aparece
                    para o cliente.
                  </p>
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <Field label="CEP" error={error("postalCode")}>
                    <Input
                      id="postalCode"
                      placeholder="00000-000"
                      {...form.register("postalCode", {
                        onChange: (event) => {
                          event.target.value = formatCep(event.target.value);
                        },
                      })}
                    />
                  </Field>
                  <Field label="Bairro" error={error("neighborhood")}>
                    <Input
                      id="neighborhood"
                      {...form.register("neighborhood")}
                    />
                  </Field>
                  <Field label="Cidade" error={error("city")}>
                    <Input id="city" {...form.register("city")} />
                  </Field>
                  <Field label="Estado (UF)" error={error("state")}>
                    <Input
                      id="state"
                      maxLength={2}
                      {...form.register("state")}
                    />
                  </Field>
                  <Field label="Endereço" error={error("address")}>
                    <Input id="address" {...form.register("address")} />
                  </Field>
                  <Field label="Complemento" error={error("addressComplement")}>
                    <Input
                      id="addressComplement"
                      {...form.register("addressComplement")}
                    />
                  </Field>
                  <Field label="Como atende" error={error("serviceLocation")}>
                    <Select
                      id="serviceLocation"
                      dropdownStrategy="absolute"
                      {...form.register("serviceLocation")}
                    >
                      <option value="BUSINESS_ADDRESS">
                        No endereço do negócio
                      </option>
                      <option value="CUSTOMER_ADDRESS">
                        No endereço do cliente
                      </option>
                      <option value="BOTH">No negócio ou no cliente</option>
                    </Select>
                  </Field>
                  <AddressMapPreview
                    address={values.address ?? defaultValues.address}
                    neighborhood={
                      values.neighborhood ?? defaultValues.neighborhood
                    }
                    city={values.city ?? defaultValues.city}
                    state={values.state ?? defaultValues.state}
                    postalCode={values.postalCode ?? defaultValues.postalCode}
                  />
                </div>

                <div className="rounded-xl border border-border bg-muted/25 p-4 text-sm text-muted-foreground">
                  Atendimento atual:{" "}
                  <strong className="text-foreground">
                    {
                      SERVICE_LOCATION_LABELS[
                        values.serviceLocation ?? defaultValues.serviceLocation
                      ]
                    }
                  </strong>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {activeTab === "booking" ? (
            <Card className="border-border/70 bg-card/95 shadow-sm">
              <CardContent className="space-y-6 p-5">
                <div>
                  <h2 className="text-lg font-semibold">
                    Preferências de agendamento
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Regras padrão usadas para experiência do cliente e próximas
                    automações.
                  </p>
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <Field label="Fuso horário" error={error("timezone")}>
                    <Select
                      id="timezone"
                      dropdownStrategy="absolute"
                      {...form.register("timezone")}
                    >
                      <option value="America/Sao_Paulo">Brasília (BRT)</option>
                      <option value="America/Manaus">Manaus (AMT)</option>
                      <option value="America/Cuiaba">Cuiabá (AMT)</option>
                      <option value="America/Rio_Branco">
                        Rio Branco (ACT)
                      </option>
                    </Select>
                  </Field>
                  <Field label="Semana começa em" error={error("weekStartsOn")}>
                    <Select
                      id="weekStartsOn"
                      dropdownStrategy="absolute"
                      {...form.register("weekStartsOn", {
                        valueAsNumber: true,
                      })}
                    >
                      <option value={1}>Segunda-feira</option>
                      <option value={0}>Domingo</option>
                    </Select>
                  </Field>
                  <Field
                    label="Duração padrão (min)"
                    error={error("defaultAppointmentDuration")}
                  >
                    <Input
                      id="defaultAppointmentDuration"
                      type="number"
                      min={5}
                      {...form.register("defaultAppointmentDuration", {
                        valueAsNumber: true,
                        onChange: (event) => {
                          event.target.value = formatIntegerInput(
                            event.target.value,
                          );
                        },
                      })}
                    />
                  </Field>
                  <Field
                    label="Intervalo padrão (min)"
                    error={error("defaultSlotInterval")}
                  >
                    <Input
                      id="defaultSlotInterval"
                      type="number"
                      min={5}
                      {...form.register("defaultSlotInterval", {
                        valueAsNumber: true,
                        onChange: (event) => {
                          event.target.value = formatIntegerInput(
                            event.target.value,
                          );
                        },
                      })}
                    />
                  </Field>
                  <Field
                    label="Antecedência mínima (min)"
                    error={error("minBookingNoticeMinutes")}
                  >
                    <Input
                      id="minBookingNoticeMinutes"
                      type="number"
                      min={0}
                      {...form.register("minBookingNoticeMinutes", {
                        valueAsNumber: true,
                        onChange: (event) => {
                          event.target.value = formatIntegerInput(
                            event.target.value,
                          );
                        },
                      })}
                    />
                  </Field>
                  <Field
                    label="Agenda aberta por (dias)"
                    error={error("maxBookingAdvanceDays")}
                  >
                    <Input
                      id="maxBookingAdvanceDays"
                      type="number"
                      min={1}
                      {...form.register("maxBookingAdvanceDays", {
                        valueAsNumber: true,
                        onChange: (event) => {
                          event.target.value = formatIntegerInput(
                            event.target.value,
                          );
                        },
                      })}
                    />
                  </Field>
                  <Field label="Formato de hora" error={error("timeFormat")}>
                    <Select
                      id="timeFormat"
                      dropdownStrategy="absolute"
                      {...form.register("timeFormat")}
                    >
                      <option value="24H">24 horas</option>
                      <option value="12H">12 horas</option>
                    </Select>
                  </Field>
                  <Field
                    label="Cancelamento com antecedência (h)"
                    error={error("cancellationNoticeHours")}
                  >
                    <Input
                      id="cancellationNoticeHours"
                      type="number"
                      min={0}
                      {...form.register("cancellationNoticeHours", {
                        valueAsNumber: true,
                        onChange: (event) => {
                          event.target.value = formatIntegerInput(
                            event.target.value,
                          );
                        },
                      })}
                    />
                  </Field>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <CheckboxField
                    label="Cliente pode cancelar"
                    description="Quando habilitado, a política permite cancelamento pelo cliente."
                    checked={
                      values.allowCustomerCancellation ??
                      defaultValues.allowCustomerCancellation
                    }
                    onChange={(checked) =>
                      form.setValue("allowCustomerCancellation", checked)
                    }
                  />
                  <CheckboxField
                    label="Cliente pode reagendar"
                    description="Quando habilitado, a política permite reagendamento pelo cliente."
                    checked={
                      values.allowCustomerRescheduling ??
                      defaultValues.allowCustomerRescheduling
                    }
                    onChange={(checked) =>
                      form.setValue("allowCustomerRescheduling", checked)
                    }
                  />
                </div>
              </CardContent>
            </Card>
          ) : null}

          {activeTab === "communication" ? (
            <Card className="border-border/70 bg-card/95 shadow-sm">
              <CardContent className="space-y-6 p-5">
                <div>
                  <h2 className="text-lg font-semibold">Comunicação</h2>
                  <p className="text-sm text-muted-foreground">
                    Modelos usados em confirmações, lembretes e cancelamentos.
                  </p>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <CheckboxField
                    label="Lembretes automáticos"
                    description="Prepara o negócio para envio automático quando o canal estiver ativo."
                    checked={
                      values.enableAutomaticReminders ??
                      defaultValues.enableAutomaticReminders
                    }
                    onChange={(checked) =>
                      form.setValue("enableAutomaticReminders", checked)
                    }
                  />
                  <Field
                    label="Enviar lembrete antes de (h)"
                    error={error("reminderLeadHours")}
                  >
                    <Input
                      id="reminderLeadHours"
                      type="number"
                      min={1}
                      {...form.register("reminderLeadHours", {
                        valueAsNumber: true,
                        onChange: (event) => {
                          event.target.value = formatIntegerInput(
                            event.target.value,
                          );
                        },
                      })}
                    />
                  </Field>
                </div>

                <Field
                  label="Mensagem de confirmação"
                  error={error("confirmationMessageTemplate")}
                >
                  <Textarea
                    id="confirmationMessageTemplate"
                    rows={4}
                    {...form.register("confirmationMessageTemplate")}
                  />
                </Field>
                <Field
                  label="Mensagem de lembrete"
                  error={error("reminderMessageTemplate")}
                >
                  <Textarea
                    id="reminderMessageTemplate"
                    rows={4}
                    {...form.register("reminderMessageTemplate")}
                  />
                </Field>
                <Field
                  label="Mensagem de cancelamento"
                  error={error("cancellationMessageTemplate")}
                >
                  <Textarea
                    id="cancellationMessageTemplate"
                    rows={4}
                    {...form.register("cancellationMessageTemplate")}
                  />
                </Field>

                <div className="rounded-xl border border-border bg-muted/25 p-4 text-sm text-muted-foreground">
                  Variáveis disponíveis: <code>{"{cliente}"}</code>,{" "}
                  <code>{"{serviço}"}</code>, <code>{"{data}"}</code>,{" "}
                  <code>{"{hora}"}</code>.
                </div>
              </CardContent>
            </Card>
          ) : null}

          {activeTab === "notifications" ? (
            <Card className="border-border/70 bg-card/95 shadow-sm">
              <CardContent className="space-y-6 p-5">
                <NotificationSoundSettings integrated />
              </CardContent>
            </Card>
          ) : null}

          {activeTab === "subscription" ? (
            <Card className="border-border/70 bg-card/95 shadow-sm">
              <CardContent className="space-y-6 p-5">
                <div>
                  <h2 className="text-lg font-semibold">Assinatura</h2>
                  <p className="text-sm text-muted-foreground">
                    Dados controlados pela plataforma. Alterações de plano ficam
                    com o administrador.
                  </p>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <InfoBox label="Status do prestador" value={tenantStatus} />
                  <InfoBox
                    label="Plano atual"
                    value={subscription?.planName ?? "Sem plano vinculado"}
                  />
                  <InfoBox
                    label="Status da assinatura"
                    value={subscription?.status ?? "Não informado"}
                  />
                  <InfoBox
                    label="Vencimento"
                    value={formatDate(subscription?.expiresAt ?? null)}
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  <Badge
                    variant={
                      subscription?.publicLinkEnabled ? "success" : "outline"
                    }
                  >
                    Link público{" "}
                    {subscription?.publicLinkEnabled ? "liberado" : "bloqueado"}
                  </Badge>
                  <Badge
                    variant={
                      subscription?.whatsappEnabled ? "success" : "outline"
                    }
                  >
                    WhatsApp{" "}
                    {subscription?.whatsappEnabled ? "liberado" : "bloqueado"}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {activeTab === "account" ? (
            <Card className="border-border/70 bg-card/95 shadow-sm">
              <CardContent className="space-y-6 p-5">
                <div>
                  <h2 className="text-lg font-semibold">Conta e segurança</h2>
                  <p className="text-sm text-muted-foreground">
                    Informações do usuário responsável por este acesso.
                  </p>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <InfoBox
                    label="Usuário responsável"
                    value={account.responsibleName}
                  />
                  <InfoBox label="E-mail de acesso" value={account.email} />
                  <InfoBox label="Idioma" value="Português (Brasil)" />
                  <InfoBox label="Moeda" value="Real brasileiro (BRL)" />
                </div>

                <div className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                  Alteração de senha e gestão de equipe serão centralizadas aqui
                  quando o módulo multiusuário do prestador for liberado.
                </div>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>

      {activeTab !== "notifications" ? (
        <div className="sticky bottom-0 z-10 flex justify-end border-t border-border bg-background/90 py-3 backdrop-blur">
          <Button type="submit" disabled={pending}>
            {pending ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" />
            )}

            {pending ? "Salvando configurações..." : "Salvar configurações"}
          </Button>
        </div>
      ) : null}

      <input type="hidden" value="pt-BR" {...form.register("locale")} />
      <input type="hidden" value="BRL" {...form.register("currency")} />
      <input type="hidden" {...form.register("logoUrl")} />
    </form>
  );
}
