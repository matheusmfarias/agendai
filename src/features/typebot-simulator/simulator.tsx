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
  fetchCustomFields,
  fetchAvailableDates,
  fetchAvailablePeriods,
  fetchBusiness,
  fetchCategories,
  fetchServiceDetail,
  fetchServices,
  fetchSlots,
  lookupSimulatorCustomer,
  loadTenants,
  resolveSimulatorCustomer,
  type TenantOption,
} from "@/features/typebot-simulator/simulator-actions";
import { formatBrazilianPhone } from "@/lib/input-formatters";
import {
  buildSimulatorCustomValues,
  type SimulatorState,
  type StepLog,
} from "@/features/typebot-simulator/simulator-types";

const STEP_LABELS: Record<SimulatorState["step"], string> = {
  tenant: "Prestador",
  intent: "Ajuda",
  categories: "Categorias",
  handoff: "Atendente",
  customer: "Cliente",
  services: "Serviços",
  "service-detail": "Detalhe",
  dates: "Datas",
  periods: "Turnos",
  slots: "Horários",
  "custom-fields": "Campos",
  confirm: "Confirmar",
  result: "Resultado",
};

const ALL_STEPS: SimulatorState["step"][] = [
  "tenant",
  "intent",
  "categories",
  "services",
  "service-detail",
  "dates",
  "periods",
  "slots",
  "customer",
  "custom-fields",
  "confirm",
  "result",
];

function statusMessage(status: string): string {
  switch (status) {
    case "CONFIRMED":
      return "Agendamento confirmado! ✅";
    case "REQUESTED":
      return "Solicitação enviada! ✅\n\nO estabelecimento ainda precisa confirmar o horário. Avisaremos você por aqui assim que houver uma resposta.";
    default:
      return "Agendamento registrado.";
  }
}

function formatSlotTimeLabel(label: string) {
  return label.match(/\d{2}:\d{2}$/)?.[0] ?? label;
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
    categories: [],
    selectedCategoryId: "",
    selectedCategoryName: "",
    customerPhone: "",
    customerName: "",
    customerEmail: "",
    customerId: "",
    sessionId: "",
    customerLookupStatus: "",
    matchedCustomerName: "",
    services: [],
    selectedServiceId: "",
    selectedServiceName: "",
    serviceDetail: null,
    customFields: [],
    customFieldIndex: 0,
    availableDates: [],
    selectedDate: "",
    nextStartDate: "",
    periods: [],
    selectedPeriod: "",
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
        step: "intent",
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

  const handleChooseBooking = async () => {
    setBusy(true);
    const result = await fetchCategories(state.tenantSlug);
    addLog(result.log);
    if (result.ok && result.categories) {
      setPartial({ categories: result.categories, step: "categories" });
    } else {
      setError(
        result.error ?? {
          code: "UNKNOWN",
          message: "Não foi possível carregar as opções. Tente novamente.",
        },
      );
    }
    setBusy(false);
  };

  const handleSelectCategory = (categoryId: string, categoryName: string) => {
    setPartial({
      selectedCategoryId: categoryId,
      selectedCategoryName: categoryName,
      services: [],
      selectedServiceId: "",
      selectedServiceName: "",
      serviceDetail: null,
      availableDates: [],
      selectedDate: "",
      periods: [],
      selectedPeriod: "",
      slots: [],
      selectedSlotStartsAt: "",
      appointmentId: "",
    });
  };

  const handleLookupCustomer = async () => {
    setBusy(true);
    const result = await lookupSimulatorCustomer(
      state.tenantSlug,
      state.customerPhone,
    );
    addLog(result.log);
    if (result.ok && result.lookup && result.session) {
      setPartial({
        sessionId: result.session.id,
        customerLookupStatus: result.lookup.status,
        matchedCustomerName: result.lookup.customerName ?? "",
      });
    } else {
      setError(
        result.error ?? {
          code: "UNKNOWN",
          message: "Não foi possível confirmar seus dados. Tente novamente.",
        },
      );
    }
    setBusy(false);
  };

  const handleResolveCustomer = async (action: "CONFIRM" | "CREATE") => {
    setBusy(true);
    const result = await resolveSimulatorCustomer(
      state.tenantSlug,
      action === "CONFIRM"
        ? { action, sessionId: state.sessionId }
        : {
            action,
            sessionId: state.sessionId,
            name: state.customerName,
            email: state.customerEmail || undefined,
            rejectedExisting: state.matchedCustomerName !== "",
          },
    );
    addLog(result.log);
    if (result.ok && result.customer && result.session) {
      setPartial({
        customerId: result.customer.id,
        customerName: result.customer.name,
        sessionId: result.session.id,
        step: "confirm",
      });
    } else {
      setError(
        result.error ?? {
          code: "UNKNOWN",
          message: "Não foi possível confirmar seus dados. Tente novamente.",
        },
      );
    }
    setBusy(false);
  };

  const handleFetchServices = async () => {
    setBusy(true);
    const result = await fetchServices(
      state.tenantSlug,
      state.selectedCategoryId,
    );
    addLog(result.log);
    if (result.ok && result.services) {
      setPartial({ services: result.services, step: "services", error: null });
    } else {
      setError(
        result.error ?? {
          code: "UNKNOWN",
          message: "Não foi possível carregar os serviços. Tente novamente.",
        },
      );
    }
    setBusy(false);
  };

  const handleSelectService = (serviceId: string, serviceName: string) => {
    setPartial({
      selectedServiceId: serviceId,
      selectedServiceName: serviceName,
      availableDates: [],
      selectedDate: "",
      nextStartDate: "",
      periods: [],
      selectedPeriod: "",
      slots: [],
      selectedSlotStartsAt: "",
      selectedSlotLabel: "",
      customFields: [],
      customFieldIndex: 0,
      customFieldValues: {},
      appointmentId: "",
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
          message: "Não foi possível carregar o serviço. Tente novamente.",
        },
      );
    }
    setBusy(false);
  };

  const handleFetchAvailableDates = async (startDate?: string) => {
    setBusy(true);
    const result = await fetchAvailableDates(
      state.tenantSlug,
      state.selectedServiceId,
      startDate,
    );
    addLog(result.log);
    if (result.ok && result.dates) {
      setPartial({
        availableDates: result.dates,
        selectedDate: "",
        nextStartDate: result.nextStartDate ?? "",
        step: "dates",
        error: null,
      });
    } else {
      setError(
        result.error ?? {
          code: "UNKNOWN",
          message: "Não foi possível carregar as datas. Tente novamente.",
        },
      );
    }
    setBusy(false);
  };

  const handleSelectDate = (date: string) => {
    setPartial({
      selectedDate: date,
      periods: [],
      selectedPeriod: "",
      slots: [],
      selectedSlotStartsAt: "",
      selectedSlotLabel: "",
    });
  };

  const handleFetchPeriods = async () => {
    setBusy(true);
    const result = await fetchAvailablePeriods(
      state.tenantSlug,
      state.selectedServiceId,
      state.selectedDate,
    );
    addLog(result.log);
    if (result.ok && result.periods) {
      const onlyPeriod = result.periods.length === 1
        ? result.periods[0].value
        : null;
      if (onlyPeriod) {
        const slotsResult = await fetchSlots(
          state.tenantSlug,
          state.selectedServiceId,
          state.selectedDate,
          onlyPeriod,
        );
        addLog(slotsResult.log);
        if (slotsResult.ok && slotsResult.slots) {
          setPartial({
            periods: result.periods,
            selectedPeriod: onlyPeriod,
            slots: slotsResult.slots,
            step: "slots",
          });
        } else {
          setError(
            slotsResult.error ?? {
              code: "UNKNOWN",
              message: "Não foi possível carregar os horários. Tente novamente.",
            },
          );
        }
        setBusy(false);
        return;
      }
      setPartial({
        periods: result.periods,
        selectedPeriod: "",
        step: "periods",
      });
    } else {
      setError(
        result.error ?? {
          code: "UNKNOWN",
          message: "Não foi possível carregar os turnos. Tente novamente.",
        },
      );
    }
    setBusy(false);
  };

  const handleFetchSlots = async () => {
    if (!state.selectedPeriod) return;
    setBusy(true);
    const result = await fetchSlots(
      state.tenantSlug,
      state.selectedServiceId,
      state.selectedDate,
      state.selectedPeriod,
    );
    addLog(result.log);
    if (result.ok && result.slots) {
      setPartial({ slots: result.slots, step: "slots", error: null });
    } else {
      setError(
        result.error ?? {
          code: "UNKNOWN",
          message: "Não foi possível carregar os horários. Tente novamente.",
        },
      );
    }
    setBusy(false);
  };

  const handleSelectSlot = (startsAt: string, label: string) => {
    setPartial({ selectedSlotStartsAt: startsAt, selectedSlotLabel: label });
  };

  const handleGoToCustomer = async () => {
    setBusy(true);
    const result = await fetchCustomFields(
      state.tenantSlug,
      state.selectedServiceId,
    );
    addLog(result.log);
    if (!result.ok || !result.fields) {
      setError(
        result.error ?? {
          code: "UNKNOWN",
          message: "Não foi possível carregar as perguntas. Tente novamente.",
        },
      );
      setBusy(false);
      return;
    }
    if (result.fields.length) {
      setPartial({
        customFields: result.fields,
        customFieldIndex: 0,
        step: "custom-fields",
      });
      setBusy(false);
      return;
    }
    setPartial({ customFields: [], customFieldValues: {}, step: "customer" });
    setBusy(false);
    if (state.customerPhone) await handleLookupCustomer();
  };

  const handleFinishCustomFields = async () => {
    const field = state.customFields[state.customFieldIndex];
    if (!field) return;
    if (field.required && !(state.customFieldValues[field.id] ?? "").trim()) {
      setError({
        code: "CUSTOM_FIELD_REQUIRED",
        message: `Informe ${field.label}.`,
      });
      return;
    }

    if (state.customFieldIndex + 1 < state.customFields.length) {
      setPartial({ customFieldIndex: state.customFieldIndex + 1 });
      return;
    }

    setPartial({ step: "customer" });
    if (state.customerPhone) await handleLookupCustomer();
  };

  const handleCreate = async () => {
    setBusy(true);
    const customValues = buildSimulatorCustomValues(
      state.customFields,
      state.customFieldValues,
    );
    const result = await createSimulatorAppointment(
      state.tenantSlug,
      state.sessionId,
      state.customerId,
      state.selectedServiceId,
      state.selectedSlotStartsAt,
      customValues,
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
          message: "Não foi possível confirmar o agendamento. Tente novamente.",
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
      categories: [],
      selectedCategoryId: "",
      selectedCategoryName: "",
      customerPhone: "",
      customerName: "",
      customerEmail: "",
      customerId: "",
      sessionId: "",
      customerLookupStatus: "",
      matchedCustomerName: "",
      services: [],
      selectedServiceId: "",
      selectedServiceName: "",
      serviceDetail: null,
      customFields: [],
      customFieldIndex: 0,
      availableDates: [],
      selectedDate: "",
      nextStartDate: "",
      periods: [],
      selectedPeriod: "",
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
              <p className="font-medium">Não foi possível continuar</p>
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

      {state.step === "intent" && (
        <Card>
          <CardHeader>
            <CardTitle className="space-y-1">
              <span className="block">Olá! 👋</span>
              <span className="block">
                Como posso ajudar você na {state.tenantName}?
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button onClick={handleChooseBooking} disabled={busy}>
              Agendar um horário
            </Button>
            <Button
              variant="outline"
              onClick={() => setPartial({ step: "handoff" })}
            >
              Falar com atendente
            </Button>
            <Button variant="ghost" onClick={() => goToStep("tenant")}>
              Voltar
            </Button>
          </CardContent>
        </Card>
      )}

      {state.step === "handoff" && (
        <Card>
          <CardHeader>
            <CardTitle>Atendimento com o estabelecimento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              O fluxo automático foi encerrado. O atendimento continuará com o
              estabelecimento e nenhum agendamento foi criado.
            </p>
            <div className="flex flex-wrap gap-2">
              {state.business?.whatsappUrl && (
                <Button asChild>
                  <Link href={state.business.whatsappUrl} target="_blank">
                    Abrir WhatsApp do estabelecimento
                  </Link>
                </Button>
              )}
              <Button variant="outline" onClick={() => goToStep("intent")}>
                Voltar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {state.step === "categories" && (
        <Card>
          <CardHeader>
            <CardTitle>Qual tipo de serviço você procura?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {state.categories.map((category) => (
              <button
                type="button"
                key={category.id}
                className={`w-full rounded-lg border p-4 text-left transition-colors hover:border-primary ${
                  state.selectedCategoryId === category.id
                    ? "border-primary bg-primary/5"
                    : ""
                }`}
                onClick={() =>
                  handleSelectCategory(category.id, category.name)
                }
              >
                <span className="font-medium">{category.name}</span>
              </button>
            ))}
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => goToStep("intent")}>
                Voltar
              </Button>
              <Button
                onClick={handleFetchServices}
                disabled={busy || !state.selectedCategoryId}
              >
                {busy ? "Carregando..." : "Ver serviços"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {state.step === "customer" && (
        <Card>
          <CardHeader>
            <CardTitle>
              Identificação do cliente — {state.tenantName}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!state.sessionId && !state.customerPhone && (
              <div>
                <Label htmlFor="phone">Informe seu telefone com DDD.</Label>
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
                <p className="mt-1 text-xs text-muted-foreground">
                  No canal real, este valor vem da sessão do WhatsApp.
                </p>
              </div>
            )}

            {state.customerLookupStatus === "FOUND" && (
              <div className="rounded-lg border p-4">
                <p className="font-medium">
                  Encontrei um cadastro em nome de {state.matchedCustomerName}.
                </p>
                <p className="mt-1 font-medium">
                  Posso usar esses dados?
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    onClick={() => handleResolveCustomer("CONFIRM")}
                    disabled={busy}
                  >
                    Sim, continuar
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() =>
                      setPartial({ customerLookupStatus: "NOT_FOUND" })
                    }
                  >
                    Não sou eu
                  </Button>
                </div>
              </div>
            )}

            {(state.customerLookupStatus === "NOT_FOUND" ||
              state.customerLookupStatus === "AMBIGUOUS") && (
              <div className="grid gap-4 sm:grid-cols-2">
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
              </div>
            )}
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() =>
                  goToStep(state.customFields.length ? "custom-fields" : "slots")
                }
              >
                Voltar
              </Button>
              {!state.sessionId && (
                <Button
                  onClick={handleLookupCustomer}
                  disabled={busy || !state.customerPhone}
                >
                  {busy ? "Procurando..." : "Procurar cadastro"}
                </Button>
              )}
              {(state.customerLookupStatus === "NOT_FOUND" ||
                state.customerLookupStatus === "AMBIGUOUS") && (
                <Button
                  onClick={() => handleResolveCustomer("CREATE")}
                  disabled={busy || !state.customerName}
                >
                  {busy ? "Salvando..." : "Continuar com novo cadastro"}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {state.step === "services" && (
        <Card>
          <CardHeader>
            <CardTitle>Agora escolha o serviço:</CardTitle>
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
                <Button variant="outline" onClick={() => goToStep("categories")}>
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

            <div className="flex flex-wrap gap-2 pt-2">
              <Button variant="outline" onClick={() => goToStep("services")}>
                Voltar
              </Button>
              <Button
                onClick={() => handleFetchAvailableDates()}
                disabled={busy}
              >
                {busy ? "Carregando..." : "Buscar datas disponíveis"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {state.step === "dates" && (
        <Card>
          <CardHeader>
            <CardTitle>Qual data fica melhor para você?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {state.availableDates.map((date) => (
              <button
                type="button"
                key={date.date}
                className={`w-full rounded-lg border p-4 text-left transition-colors hover:border-primary ${
                  state.selectedDate === date.date
                    ? "border-primary bg-primary/5"
                    : ""
                }`}
                onClick={() => handleSelectDate(date.date)}
              >
                <span className="font-medium">{date.label}</span>
              </button>
            ))}

            {!state.availableDates.length && (
              <p className="text-sm text-muted-foreground">
                Nenhuma data disponível neste período.
              </p>
            )}

            <div className="flex flex-wrap gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() =>
                  setPartial({
                    step: "services",
                    selectedDate: "",
                    periods: [],
                    selectedPeriod: "",
                    slots: [],
                    selectedSlotStartsAt: "",
                    appointmentId: "",
                  })
                }
              >
                Voltar
              </Button>
              {state.nextStartDate && (
                <Button
                  variant="outline"
                  onClick={() =>
                    handleFetchAvailableDates(state.nextStartDate)
                  }
                  disabled={busy}
                >
                  {busy ? "Carregando..." : "Ver mais datas"}
                </Button>
              )}
              <Button
                onClick={handleFetchPeriods}
                disabled={busy || !state.selectedDate}
              >
                {busy ? "Carregando..." : "Ver turnos"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {state.step === "periods" && (
        <Card>
          <CardHeader>
            <CardTitle>Qual turno você prefere?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {state.periods.map((period) => (
              <button
                type="button"
                key={period.value}
                className={`w-full rounded-lg border p-4 text-left transition-colors hover:border-primary ${
                  state.selectedPeriod === period.value
                    ? "border-primary bg-primary/5"
                    : ""
                }`}
                onClick={() => setPartial({ selectedPeriod: period.value })}
              >
                <span className="font-medium">{period.label}</span>
              </button>
            ))}
            <div className="flex flex-wrap gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() =>
                  setPartial({
                    step: "dates",
                    selectedPeriod: "",
                    slots: [],
                    selectedSlotStartsAt: "",
                    appointmentId: "",
                  })
                }
              >
                Voltar
              </Button>
              <Button
                onClick={handleFetchSlots}
                disabled={busy || !state.selectedPeriod}
              >
                {busy ? "Carregando..." : "Ver horários"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {state.step === "slots" && (
        <Card>
          <CardHeader>
            <CardTitle>Qual horário fica melhor?</CardTitle>
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
                onClick={() =>
                  handleSelectSlot(
                    slot.startsAt,
                    formatSlotTimeLabel(slot.label),
                  )
                }
              >
                <p className="font-medium">
                  {slot.number}. {formatSlotTimeLabel(slot.label)}
                </p>
              </div>
            ))}

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() =>
                  setPartial({
                    step: state.periods.length > 1 ? "periods" : "dates",
                    selectedSlotStartsAt: "",
                    selectedSlotLabel: "",
                    appointmentId: "",
                  })
                }
              >
                Voltar
              </Button>
              <Button
                onClick={handleGoToCustomer}
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
            <CardTitle>Precisamos de mais uma informação</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {state.customFields
              .slice(state.customFieldIndex, state.customFieldIndex + 1)
              .map((field) => (
              <div key={field.id}>
                <Label htmlFor={`field-${field.id}`}>
                  {field.label.replace(/[?]+$/, "")}?
                </Label>
                <p className="mb-2 mt-1 text-sm text-muted-foreground">
                  {field.required
                    ? "Digite sua resposta ou envie ‘Voltar’ para retornar."
                    : "Digite sua resposta, envie ‘Pular’ para continuar ou ‘Voltar’ para retornar."}
                </p>
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
                    placeholder={field.placeholder ?? field.label}
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

            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={() =>
                  state.customFieldIndex > 0
                    ? setPartial({
                        customFieldIndex: state.customFieldIndex - 1,
                      })
                    : goToStep("slots")
                }
              >
                Voltar
              </Button>
              {state.customFields[state.customFieldIndex] &&
                !state.customFields[state.customFieldIndex].required && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      const field = state.customFields[state.customFieldIndex];
                      if (!field) return;
                      setPartial({
                        customFieldValues: {
                          ...state.customFieldValues,
                          [field.id]: "",
                        },
                      });
                      void handleFinishCustomFields();
                    }}
                  >
                    Pular
                  </Button>
                )}
              <Button onClick={() => void handleFinishCustomFields()}>
                Continuar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {state.step === "confirm" && (
        <Card>
          <CardHeader>
            <CardTitle>Confira os dados do seu agendamento:</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <dl className="grid grid-cols-2 gap-2 text-sm">
              <dt className="text-muted-foreground">Serviço</dt>
              <dd className="font-medium">{state.selectedServiceName}</dd>
              <dt className="text-muted-foreground">Data</dt>
              <dd className="font-medium">{state.selectedDate}</dd>
              <dt className="text-muted-foreground">Horário</dt>
              <dd className="font-medium">{state.selectedSlotLabel}</dd>
              <dt className="text-muted-foreground">Cliente</dt>
              <dd>{state.customerName}</dd>
              {state.customerNotes.trim() !== "" && (
                <>
                  <dt className="text-muted-foreground">Observação</dt>
                  <dd>{state.customerNotes.trim()}</dd>
                </>
              )}
            </dl>

            {state.customFieldValues &&
              Object.keys(state.customFieldValues).length > 0 && (
                <div>
                  <p className="mb-1 text-sm font-medium">
                    Dados adicionais:
                  </p>
                  <div className="rounded border p-2 text-sm">
                    {state.customFields
                      .filter(
                        (field) =>
                          (state.customFieldValues[field.id] ?? "").trim() !== "",
                      )
                      .map((field) => (
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
              <Label htmlFor="customerNotes">Observações (opcional)</Label>
              <Input
                id="customerNotes"
                value={state.customerNotes}
                onChange={(e) =>
                  setPartial({ customerNotes: e.target.value })
                }
                placeholder="Observações do cliente"
              />
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              <p className="w-full font-medium">Está tudo certo?</p>
              <Button
                variant="outline"
                onClick={() =>
                  setPartial({ step: "customer", appointmentId: "" })
                }
              >
                Voltar
              </Button>
              <Button onClick={handleCreate} disabled={busy}>
                {busy ? "Confirmando..." : "Confirmar agendamento"}
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
              {state.appointmentStatus === "CONFIRMED"
                ? "Agendamento confirmado! ✅"
                : "Solicitação enviada! ✅"}
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
              <dd className="whitespace-pre-line font-medium">
                {state.appointmentMessage}
              </dd>
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
