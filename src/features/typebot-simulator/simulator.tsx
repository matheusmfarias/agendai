"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, RotateCcw, XCircle } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Alert } from "@/components/ui/alert";

import {
  createSimulatorAppointment,
  fetchBusiness,
  fetchServiceDetail,
  fetchServices,
  fetchSlots,
  identifySimulatorCustomer,
  loadTenants,
  type TenantOption,
} from "@/features/typebot-simulator/simulator-actions";
import { formatBrazilianPhone } from "@/lib/input-formatters";
import type {
  SimulatorState,
  StepLog,
} from "@/features/typebot-simulator/simulator-types";

const STEP_LABELS: Record<SimulatorState["step"], string> = {
  tenant: "Prestador",
  customer: "Cliente",
  services: "Serviços",
  "service-detail": "Detalhe",
  slots: "Horários",
  "custom-fields": "Campos",
  confirm: "Confirmar",
  result: "Resultado",
};

const ALL_STEPS: SimulatorState["step"][] = [
  "tenant",
  "customer",
  "services",
  "service-detail",
  "slots",
  "custom-fields",
  "confirm",
  "result",
];

function statusMessage(status: string): string {
  switch (status) {
    case "CONFIRMED":
      return "Agendamento confirmado com sucesso.";
    case "REQUESTED":
      return "Solicitação recebida. Aguardando confirmação do prestador.";
    default:
      return "Agendamento registrado.";
  }
}

export function TypebotSimulator() {
  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------
  const [tenants, setTenants] = useState<TenantOption[]>([]);
  const [state, setState] = useState<SimulatorState>({
    step: "tenant",
    tenantSlug: "",
    tenantId: "",
    tenantName: "",
    tenantAvailable: false,
    tenantUnavailableReason: "",
    business: null,
    customerPhone: "",
    customerName: "",
    customerEmail: "",
    customerId: "",
    sessionId: "",
    services: [],
    selectedServiceId: "",
    selectedServiceName: "",
    serviceDetail: null,
    customFields: [],
    slots: [],
    selectedSlotStartsAt: "",
    selectedSlotLabel: "",
    customFieldValues: {},
    appointmentId: "",
    appointmentStatus: "",
    appointmentMessage: "",
    appointmentStartsAt: "",
    appointmentEndsAt: "",
    error: null,
    logs: [],
    customerNotes: "Simulação via painel admin",
  });
  const [busy, setBusy] = useState(false);

  // ---------------------------------------------------------------------------
  // Load tenants on mount
  // ---------------------------------------------------------------------------
  useEffect(() => {
    loadTenants()
      .then(setTenants)
      .catch((e) => {
        console.error("Erro ao carregar tenants", e);
      });
  }, []);

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------
  const setPartial = useCallback(
    (partial: Partial<SimulatorState>) =>
      setState((prev) => ({ ...prev, error: null, ...partial })),
    [],
  );

  const addLog = useCallback((log: StepLog) => {
    setState((prev) => ({ ...prev, logs: [...prev.logs, log] }));
  }, []);

  const setError = useCallback(
    (error: { code: string; message: string } | null) =>
      setState((prev) => ({ ...prev, error })),
    [],
  );

  const goToStep = useCallback(
    (step: SimulatorState["step"]) =>
      setState((prev) => ({ ...prev, step, error: null })),
    [],
  );

  // ---------------------------------------------------------------------------
  // Step actions
  // ---------------------------------------------------------------------------
  const handleSelectTenant = async (slug: string) => {
    setBusy(true);
    const t = tenants.find((x) => x.slug === slug);
    if (!t) {
      setBusy(false);
      return;
    }
    const result = await fetchBusiness(slug);
    addLog(result.log);

    if (result.ok && result.business) {
      setPartial({
        tenantSlug: slug,
        tenantId: result.business.id,
        tenantName: result.business.name,
        tenantAvailable: true,
        business: result.business,
        step: "customer",
      });
    } else {
      setPartial({
        tenantSlug: slug,
        tenantId: t.id,
        tenantName: t.name,
        tenantAvailable: false,
        tenantUnavailableReason: result.error?.message ?? "Indisponível",
      });
    }
    setBusy(false);
  };

  const handleIdentify = async () => {
    setBusy(true);
    const result = await identifySimulatorCustomer(
      state.tenantSlug,
      state.customerPhone,
      state.customerName,
      state.customerEmail || undefined,
    );
    addLog(result.log);
    if (result.ok && result.customer && result.session) {
      setPartial({
        customerId: result.customer.id,
        sessionId: result.session.id,
        step: "services",
      });
    } else {
      setError(
        result.error ?? {
          code: "UNKNOWN",
          message: "Erro ao identificar cliente.",
        },
      );
    }
    setBusy(false);
  };

  const handleFetchServices = async () => {
    setBusy(true);
    const result = await fetchServices(state.tenantSlug);
    addLog(result.log);
    if (result.ok && result.services) {
      setPartial({ services: result.services, error: null });
    } else {
      setError(
        result.error ?? {
          code: "UNKNOWN",
          message: "Erro ao listar serviços.",
        },
      );
    }
    setBusy(false);
  };

  const handleSelectService = (serviceId: string, serviceName: string) => {
    setPartial({
      selectedServiceId: serviceId,
      selectedServiceName: serviceName,
    });
  };

  const handleFetchServiceDetail = async () => {
    setBusy(true);
    const result = await fetchServiceDetail(
      state.tenantSlug,
      state.selectedServiceId,
    );
    addLog(result.log);
    if (result.ok && result.service) {
      setPartial({
        serviceDetail: result.service,
        customFields: result.service.customFields,
        step: "service-detail",
        error: null,
      });
    } else {
      setError(
        result.error ?? {
          code: "UNKNOWN",
          message: "Erro ao buscar detalhes.",
        },
      );
    }
    setBusy(false);
  };

  const handleFetchSlots = async () => {
    setBusy(true);
    const result = await fetchSlots(
      state.tenantSlug,
      state.selectedServiceId,
    );
    addLog(result.log);
    if (result.ok && result.slots) {
      setPartial({ slots: result.slots, step: "slots", error: null });
    } else {
      setError(
        result.error ?? {
          code: "UNKNOWN",
          message: "Erro ao buscar horários.",
        },
      );
    }
    setBusy(false);
  };

  const handleSelectSlot = (startsAt: string, label: string) => {
    setPartial({ selectedSlotStartsAt: startsAt, selectedSlotLabel: label });
  };

  const handleGoToCustomFields = () => {
    if (state.customFields.length) {
      setPartial({ step: "custom-fields" });
    } else {
      setPartial({ step: "confirm" });
    }
  };

  const handleCreate = async () => {
    setBusy(true);
    const customValues = state.customFields.map((field) => ({
      customFieldId: field.id,
      value: state.customFieldValues[field.id] ?? "",
    }));
    const result = await createSimulatorAppointment(
      state.tenantSlug,
      state.sessionId,
      state.customerId,
      state.selectedServiceId,
      state.selectedSlotStartsAt,
      customValues.filter((cv) => cv.value !== ""),
      state.customerNotes,
    );
    addLog(result.log);
    if (result.ok && result.appointment) {
      setPartial({
        appointmentId: result.appointment.id,
        appointmentStatus: result.appointment.status,
        appointmentMessage: statusMessage(result.appointment.status),
        step: "result",
        error: null,
      });
    } else {
      setError(
        result.error ?? {
          code: "UNKNOWN",
          message: "Erro ao criar agendamento.",
        },
      );
    }
    setBusy(false);
  };

  const handleReset = () => {
    setState({
      step: "tenant",
      tenantSlug: "",
      tenantId: "",
      tenantName: "",
      tenantAvailable: false,
      tenantUnavailableReason: "",
      business: null,
      customerPhone: "",
      customerName: "",
      customerEmail: "",
      customerId: "",
      sessionId: "",
      services: [],
      selectedServiceId: "",
      selectedServiceName: "",
      serviceDetail: null,
      customFields: [],
      slots: [],
      selectedSlotStartsAt: "",
      selectedSlotLabel: "",
      customFieldValues: {},
      appointmentId: "",
      appointmentStatus: "",
      appointmentMessage: "",
      appointmentStartsAt: "",
      appointmentEndsAt: "",
      error: null,
      logs: [],
      customerNotes: "Simulação via painel admin",
    });
  };

  // ---------------------------------------------------------------------------
  // Derived
  // ---------------------------------------------------------------------------
  const stepIndex = ALL_STEPS.indexOf(state.step);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="space-y-6">
      {/* Step indicator */}
      <div className="flex flex-wrap items-center gap-2">
        {ALL_STEPS.map((s, idx) => {
          const isCurrent = idx === stepIndex;
          const isDone = ALL_STEPS.indexOf(state.step) > idx;
          return (
            <div key={s} className="flex items-center gap-1">
              <div
                className={`flex size-6 items-center justify-center rounded-full text-xs font-medium ${
                  isCurrent
                    ? "bg-primary text-primary-foreground"
                    : isDone
                      ? "bg-primary/20 text-primary"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {isDone ? <CheckCircle2 className="size-4" /> : idx + 1}
              </div>
              <span
                className={`text-xs ${isCurrent ? "font-medium text-foreground" : "text-muted-foreground"}`}
              >
                {STEP_LABELS[s]}
              </span>
              {idx < ALL_STEPS.length - 1 && (
                <span className="text-xs text-muted-foreground/50">›</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Error banner */}
      {state.error && (
        <Alert variant="destructive">
          <div className="flex items-start gap-2">
            <XCircle className="mt-0.5 size-4 shrink-0" />
            <div>
              <p className="font-medium">Erro: {state.error.code}</p>
              <p>{state.error.message}</p>
            </div>
          </div>
        </Alert>
      )}

      {/* Step content */}
      {state.step === "tenant" && (
        <Card>
          <CardHeader>
            <CardTitle>Selecione o prestador</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {tenants.map((t) => (
              <div
                key={t.id}
                className={`cursor-pointer rounded-lg border p-4 transition-colors hover:border-primary ${
                  state.tenantSlug === t.slug
                    ? "border-primary bg-primary/5"
                    : ""
                } ${!t.whatsappEnabled ? "opacity-60" : ""}`}
                onClick={() => handleSelectTenant(t.slug)}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium">{t.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {t.slug} · {t.planName}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge
                      variant={
                        t.status === "ACTIVE" ? "default" : "destructive"
                      }
                    >
                      {t.status === "ACTIVE" ? "Ativo" : t.status}
                    </Badge>
                    <Badge
                      variant={
                        t.subscriptionStatus === "ACTIVE" ||
                        t.subscriptionStatus === "TRIAL"
                          ? "default"
                          : "secondary"
                      }
                    >
                      {t.subscriptionStatus}
                    </Badge>
                    {!t.whatsappEnabled && (
                      <Badge variant="secondary">WhatsApp desabilitado</Badge>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {state.tenantSlug && !state.tenantAvailable && (
              <Alert variant="destructive" className="mt-4">
                <div>
                  <p className="font-medium">Indisponível</p>
                  <p>
                    Este tenant não está disponível para atendimento via
                    Typebot/WhatsApp.
                    {state.tenantUnavailableReason &&
                      ` (${state.tenantUnavailableReason})`}
                  </p>
                </div>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {state.step === "customer" && (
        <Card>
          <CardHeader>
            <CardTitle>
              Dados do cliente — {state.tenantName} ({state.tenantSlug})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="phone">Telefone (com DDD) *</Label>
                <Input
                  id="phone"
                  placeholder="(11) 99999-9999"
                  value={state.customerPhone}
                  onChange={(e) =>
                    setPartial({
                      customerPhone: formatBrazilianPhone(e.target.value),
                    })
                  }
                />
              </div>
              <div>
                <Label htmlFor="name">Nome *</Label>
                <Input
                  id="name"
                  placeholder="João Silva"
                  value={state.customerName}
                  onChange={(e) =>
                    setPartial({ customerName: e.target.value })
                  }
                />
              </div>
            </div>
            <div>
              <Label htmlFor="email">E-mail (opcional)</Label>
              <Input
                id="email"
                type="email"
                placeholder="joao@email.com"
                value={state.customerEmail}
                onChange={(e) =>
                  setPartial({ customerEmail: e.target.value })
                }
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => goToStep("tenant")}>
                Voltar
              </Button>
              <Button
                onClick={handleIdentify}
                disabled={busy || !state.customerPhone || !state.customerName}
              >
                {busy ? "Identificando..." : "Identificar cliente"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {state.step === "services" && (
        <Card>
          <CardHeader>
            <CardTitle>Serviços — {state.tenantName}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {!state.services.length && (
              <div className="flex justify-center">
                <Button onClick={handleFetchServices} disabled={busy}>
                  {busy ? "Carregando..." : "Buscar serviços"}
                </Button>
              </div>
            )}

            {state.services.map((svc) => (
              <div
                key={svc.id}
                className={`cursor-pointer rounded-lg border p-4 transition-colors hover:border-primary ${
                  state.selectedServiceId === svc.id
                    ? "border-primary bg-primary/5"
                    : ""
                }`}
                onClick={() => handleSelectService(svc.id, svc.name)}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium">
                      {svc.number}. {svc.name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {svc.category} · {svc.durationMinutes} min
                      {svc.priceText ? ` · ${svc.priceText}` : ""}
                    </p>
                  </div>
                  <Badge variant="outline">{svc.bookingMode}</Badge>
                </div>
              </div>
            ))}

            {state.services.length > 0 && (
              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={() => goToStep("customer")}>
                  Voltar
                </Button>
                <Button
                  onClick={handleFetchServiceDetail}
                  disabled={busy || !state.selectedServiceId}
                >
                  {busy ? "Carregando..." : "Ver detalhe do serviço"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {state.step === "service-detail" && state.serviceDetail && (
        <Card>
          <CardHeader>
            <CardTitle>Detalhe do serviço</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <dl className="grid grid-cols-2 gap-2 text-sm">
              <dt className="text-muted-foreground">Nome</dt>
              <dd className="font-medium">{state.serviceDetail.name}</dd>
              <dt className="text-muted-foreground">Categoria</dt>
              <dd>{state.serviceDetail.category.name}</dd>
              <dt className="text-muted-foreground">Duração</dt>
              <dd>{state.serviceDetail.durationMinutes} min</dd>
              <dt className="text-muted-foreground">Preço</dt>
              <dd>{state.serviceDetail.priceText ?? "—"}</dd>
              <dt className="text-muted-foreground">Modo</dt>
              <dd>
                <Badge variant="outline">
                  {state.serviceDetail.bookingMode}
                </Badge>
              </dd>
            </dl>

            {state.serviceDetail.description && (
              <p className="text-sm text-muted-foreground">
                {state.serviceDetail.description}
              </p>
            )}

            {state.customFields.length > 0 && (
              <div>
                <p className="mb-2 text-sm font-medium">
                  Campos personalizados:
                </p>
                <div className="rounded border p-3">
                  {state.customFields.map((field) => (
                    <div
                      key={field.id}
                      className="flex items-center gap-2 py-1 text-sm"
                    >
                      <Badge
                        variant={field.required ? "default" : "secondary"}
                      >
                        {field.type}
                      </Badge>
                      <span>
                        {field.label}
                        {field.required && " *"}
                      </span>
                      {field.type === "SELECT" &&
                        field.options.length > 0 && (
                          <span className="text-xs text-muted-foreground">
                            ({field.options.join(", ")})
                          </span>
                        )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => goToStep("services")}>
                Voltar
              </Button>
              <Button onClick={handleFetchSlots} disabled={busy}>
                {busy ? "Carregando..." : "Buscar horários"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {state.step === "slots" && (
        <Card>
          <CardHeader>
            <CardTitle>
              Horários disponíveis — {state.selectedServiceName}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {state.slots.map((slot) => (
              <div
                key={slot.startsAt}
                className={`cursor-pointer rounded-lg border p-4 transition-colors hover:border-primary ${
                  state.selectedSlotStartsAt === slot.startsAt
                    ? "border-primary bg-primary/5"
                    : ""
                }`}
                onClick={() => handleSelectSlot(slot.startsAt, slot.label)}
              >
                <p className="font-medium">
                  {slot.number}. {slot.label}
                </p>
              </div>
            ))}

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => goToStep("service-detail")}
              >
                Voltar
              </Button>
              <Button
                onClick={handleGoToCustomFields}
                disabled={!state.selectedSlotStartsAt}
              >
                Continuar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {state.step === "custom-fields" && (
        <Card>
          <CardHeader>
            <CardTitle>Campos personalizados</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {state.customFields.map((field) => (
              <div key={field.id}>
                <Label htmlFor={`field-${field.id}`}>
                  {field.label}
                  {field.required && " *"}
                </Label>
                {field.type === "SELECT" ? (
                  <Select
                    id={`field-${field.id}`}
                    value={state.customFieldValues[field.id] ?? ""}
                    onChange={(e) =>
                      setPartial({
                        customFieldValues: {
                          ...state.customFieldValues,
                          [field.id]: e.target.value,
                        },
                      })
                    }
                  >
                    <option value="">Selecione...</option>
                    {field.options.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </Select>
                ) : field.type === "BOOLEAN" ? (
                  <Select
                    id={`field-${field.id}`}
                    value={state.customFieldValues[field.id] ?? ""}
                    onChange={(e) =>
                      setPartial({
                        customFieldValues: {
                          ...state.customFieldValues,
                          [field.id]: e.target.value,
                        },
                      })
                    }
                  >
                    <option value="">Selecione...</option>
                    <option value="Sim">Sim</option>
                    <option value="Não">Não</option>
                  </Select>
                ) : field.type === "TEXTAREA" ? (
                  <Textarea
                    id={`field-${field.id}`}
                    value={state.customFieldValues[field.id] ?? ""}
                    onChange={(e) =>
                      setPartial({
                        customFieldValues: {
                          ...state.customFieldValues,
                          [field.id]: e.target.value,
                        },
                      })
                    }
                    placeholder={field.label}
                  />
                ) : (
                  <Input
                    id={`field-${field.id}`}
                    type={
                      field.type === "NUMBER"
                        ? "number"
                        : field.type === "DATE"
                          ? "date"
                          : "text"
                    }
                    value={state.customFieldValues[field.id] ?? ""}
                    onChange={(e) =>
                      setPartial({
                        customFieldValues: {
                          ...state.customFieldValues,
                          [field.id]: e.target.value,
                        },
                      })
                    }
                    placeholder={field.label}
                  />
                )}
              </div>
            ))}

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => goToStep("slots")}>
                Voltar
              </Button>
              <Button onClick={() => goToStep("confirm")}>Continuar</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {state.step === "confirm" && (
        <Card>
          <CardHeader>
            <CardTitle>Confirmar agendamento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <dl className="grid grid-cols-2 gap-2 text-sm">
              <dt className="text-muted-foreground">Prestador</dt>
              <dd className="font-medium">{state.tenantName}</dd>
              <dt className="text-muted-foreground">Serviço</dt>
              <dd className="font-medium">{state.selectedServiceName}</dd>
              <dt className="text-muted-foreground">Horário</dt>
              <dd className="font-medium">{state.selectedSlotLabel}</dd>
              <dt className="text-muted-foreground">Cliente</dt>
              <dd>{state.customerName}</dd>
              <dt className="text-muted-foreground">Telefone</dt>
              <dd>{state.customerPhone}</dd>
              {state.serviceDetail && (
                <>
                  <dt className="text-muted-foreground">Modo</dt>
                  <dd>
                    <Badge variant="outline">
                      {state.serviceDetail.bookingMode}
                    </Badge>
                  </dd>
                </>
              )}
            </dl>

            {state.customFieldValues &&
              Object.keys(state.customFieldValues).length > 0 && (
                <div>
                  <p className="mb-1 text-sm font-medium">
                    Campos personalizados:
                  </p>
                  <div className="rounded border p-2 text-sm">
                    {state.customFields.map((field) => (
                      <div key={field.id}>
                        <span className="text-muted-foreground">
                          {field.label}:{" "}
                        </span>
                        <span className="font-medium">
                          {state.customFieldValues[field.id] ?? "—"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            <div>
              <Label htmlFor="customerNotes">Observações</Label>
              <Input
                id="customerNotes"
                value={state.customerNotes}
                onChange={(e) =>
                  setPartial({ customerNotes: e.target.value })
                }
                placeholder="Observações do cliente"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() =>
                  goToStep(
                    state.customFields.length ? "custom-fields" : "slots",
                  )
                }
              >
                Voltar
              </Button>
              <Button onClick={handleCreate} disabled={busy}>
                {busy
                  ? "Criando..."
                  : "Criar agendamento (origin=WHATSAPP)"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {state.step === "result" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-green-600">
              <CheckCircle2 className="mr-2 inline size-5" />
              Agendamento criado com sucesso
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <dl className="grid grid-cols-2 gap-2 text-sm">
              <dt className="text-muted-foreground">ID</dt>
              <dd className=" text-xs">{state.appointmentId}</dd>
              <dt className="text-muted-foreground">Status</dt>
              <dd>
                <Badge
                  variant={
                    state.appointmentStatus === "CONFIRMED"
                      ? "default"
                      : state.appointmentStatus === "REQUESTED"
                        ? "secondary"
                        : "outline"
                  }
                >
                  {state.appointmentStatus}
                </Badge>
              </dd>
              <dt className="text-muted-foreground">Origem</dt>
              <dd>WHATSAPP</dd>
              <dt className="text-muted-foreground">Mensagem</dt>
              <dd className="font-medium">{state.appointmentMessage}</dd>
            </dl>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={handleReset}>
                <RotateCcw className="mr-1 size-4" />
                Nova simulação
              </Button>
              {state.appointmentId && (
                <Button asChild variant="outline">
                  <Link href="/admin/appointments">
                    Ver agendamentos (admin)
                  </Link>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Debug log */}
      {state.logs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Log de execução</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1  text-xs">
              {state.logs.map((log, idx) => (
                <div
                  key={`${log.step}-${idx}`}
                  className="flex items-center gap-2"
                >
                  {log.status === "ok" ? (
                    <CheckCircle2 className="size-3 shrink-0 text-green-500" />
                  ) : (
                    <XCircle className="size-3 shrink-0 text-red-500" />
                  )}
                  <span className="text-muted-foreground">
                    {log.timestamp.slice(11, 19)}
                  </span>
                  <span className="font-medium">{log.step}</span>
                  <span className="text-muted-foreground">{log.request}</span>
                  <span className="truncate text-muted-foreground/70">
                    {log.response}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
