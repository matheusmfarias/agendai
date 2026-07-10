"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  ExternalLink,
  Globe,
  Info,
  Layers,
  ListChecks,
  Loader2,
  Sparkles,
  Wrench,
  XCircle,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert } from "@/components/ui/alert";

import type {
  OnboardingChecklist,
} from "@/features/onboarding/onboarding-checklist-service";
import type { SegmentTemplateDefinition } from "@/features/segment-templates/segment-template-types";
import {
  applySegmentTemplateFromOnboarding,
  applySuggestedAvailabilityFromOnboarding,
  completeOnboarding,
  skipOnboarding,
  updateBusinessInfoFromOnboarding,
} from "@/features/onboarding/onboarding-actions";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ESTADOS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA",
  "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN",
  "RS", "RO", "RR", "SC", "SP", "SE", "TO",
];

const STEPS = [
  { key: "business", label: "Dados do negócio", icon: Building2 },
  { key: "services", label: "Serviços", icon: Wrench },
  { key: "availability", label: "Horários", icon: Clock },
  { key: "publicLink", label: "Link público", icon: Globe },
  { key: "review", label: "Revisão", icon: ListChecks },
] as const;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

type TenantInfo = {
  id: string;
  name: string;
  responsibleName: string;
  email: string;
  whatsapp: string;
  segment: string;
  city: string;
  state: string;
  address: string | null;
  description: string | null;
  slug: string;
  onboardingStatus: string;
};

type Props = {
  tenant: TenantInfo;
  templates: SegmentTemplateDefinition[];
  initialChecklist: OnboardingChecklist;
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function OnboardingWizard({
  tenant,
  templates,
  initialChecklist,
}: Props) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [checklist] = useState(initialChecklist);

  // Business form state
  const formRef = useRef<HTMLFormElement>(null);

  // Template state
  const [templateLoading, setTemplateLoading] = useState<string | null>(null);
  const [templateResult, setTemplateResult] = useState<{
    key: string;
    created: number;
  } | null>(null);

  // Availability state
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [availabilityResult, setAvailabilityResult] = useState<{
    created: number;
    skipped: number;
  } | null>(null);

  // Business form saving
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Error state
  const [error, setError] = useState<string | null>(null);

  // --- Derived ---

  const suggestedTemplate = tenant.segment
    ? templates.find(
        (t) =>
          t.segment.toLowerCase() === tenant.segment.toLowerCase() ||
          t.name.toLowerCase() === tenant.segment.toLowerCase(),
      )
    : undefined;

  // --- Handlers ---

  async function handleSaveBusiness(formData: FormData) {
    setSaving(true);
    setSaveError(null);
    try {
      const result = await updateBusinessInfoFromOnboarding(formData);
      if (!result.ok) {
        setSaveError(result.error ?? "Erro ao salvar.");
      }
    } catch {
      setSaveError("Erro ao salvar dados.");
    }
    setSaving(false);
  }

  async function handleApplyTemplate(key: string) {
    setTemplateLoading(key);
    setError(null);
    try {
      const result = await applySegmentTemplateFromOnboarding(key);
      if (result.ok) {
        setTemplateResult({ key, created: result.created?.services ?? 0 });
        router.refresh();
      } else {
        setError(result.error ?? "Erro ao aplicar template.");
      }
    } catch {
      setError("Erro ao aplicar template.");
    }
    setTemplateLoading(null);
  }

  async function handleApplyAvailability() {
    setAvailabilityLoading(true);
    setError(null);
    try {
      const result = await applySuggestedAvailabilityFromOnboarding();
      if (result.ok) {
        setAvailabilityResult({
          created: result.created ?? 0,
          skipped: result.skipped ?? 0,
        });
      } else {
        setError(result.error ?? "Erro ao aplicar horários.");
      }
    } catch {
      setError("Erro ao aplicar horários.");
    }
    setAvailabilityLoading(false);
  }

  async function handleComplete() {
    setError(null);
    try {
      await completeOnboarding();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      // If redirect happened, this won't run
      setError(msg || "Erro ao concluir onboarding.");
    }
  }

  async function handleSkip() {
    try {
      await skipOnboarding();
    } catch {
      setError("Erro ao pular onboarding.");
    }
  }

  // --- Render helpers ---

  function checklistItemStatusIcon(status: string) {
    if (status === "DONE") return <CheckCircle2 className="size-4 text-green-600" />;
    if (status === "WARNING") return <Info className="size-4 text-amber-500" />;
    if (status === "BLOCKED") return <XCircle className="size-4 text-red-500" />;
    return <Info className="size-4 text-muted-foreground" />;
  }

  // --- Step content ---

  function renderStepBusiness() {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Dados do negócio</CardTitle>
          <CardDescription>
            Revise e complete as informações do seu negócio. O slug <strong>/{tenant.slug}</strong> é gerenciado pela plataforma.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form ref={formRef} action={handleSaveBusiness}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="name">Nome do negócio *</Label>
                <Input
                  id="name"
                  name="name"
                  defaultValue={tenant.name}
                  required
                  minLength={2}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="responsibleName">Nome do responsável *</Label>
                <Input
                  id="responsibleName"
                  name="responsibleName"
                  defaultValue={tenant.responsibleName}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">E-mail *</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  defaultValue={tenant.email}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="whatsapp">WhatsApp *</Label>
                <Input
                  id="whatsapp"
                  name="whatsapp"
                  defaultValue={tenant.whatsapp}
                  required
                  placeholder="(11) 99999-9999"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="segment">Segmento</Label>
                <Input
                  id="segment"
                  name="segment"
                  defaultValue={tenant.segment}
                  placeholder="Ex: Mecânica, Barbearia"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">Cidade</Label>
                <Input
                  id="city"
                  name="city"
                  defaultValue={tenant.city}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">Estado</Label>
                <select
                  id="state"
                  name="state"
                  defaultValue={tenant.state}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                >
                  <option value="">Selecione</option>
                  {ESTADOS.map((uf) => (
                    <option key={uf} value={uf}>
                      {uf}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="address">Endereço</Label>
                <Input
                  id="address"
                  name="address"
                  defaultValue={tenant.address ?? ""}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="description">Descrição do negócio</Label>
                <Textarea
                  id="description"
                  name="description"
                  defaultValue={tenant.description ?? ""}
                  rows={3}
                />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-3">
              <Button type="submit" disabled={saving} variant="outline">
                {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
                Salvar dados
              </Button>
              {saveError && <p className="text-sm text-destructive">{saveError}</p>}
            </div>
          </form>
        </CardContent>
      </Card>
    );
  }

  function renderStepServices() {
    const hasServices = checklist.hasActiveService;
    const hasCategories = checklist.hasActiveCategory;

    return (
      <Card>
        <CardHeader>
          <CardTitle>Serviços</CardTitle>
          <CardDescription>
            Garanta que seu negócio tenha serviços configurados para os clientes agendarem.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Current status */}
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="rounded-lg border p-4">
              <p className="text-sm font-medium">Categorias ativas</p>
              <p className="text-2xl font-bold">
                {hasCategories ? (
                  <CheckCircle2 className="size-5 text-green-600 inline" />
                ) : (
                  <XCircle className="size-5 text-red-500 inline" />
                )}{" "}
                {hasCategories ? "Sim" : "Não"}
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-sm font-medium">Serviços ativos</p>
              <p className="text-2xl font-bold">
                {hasServices ? (
                  <CheckCircle2 className="size-5 text-green-600 inline" />
                ) : (
                  <XCircle className="size-5 text-red-500 inline" />
                )}{" "}
                {hasServices ? "Sim" : "Não"}
              </p>
            </div>
          </div>

          {/* Quick actions */}
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/app/services">
                <Wrench className="mr-2 size-4" />
                Criar serviço manualmente
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/app/services/categories/new">
                <Layers className="mr-2 size-4" />
                Criar categoria
              </Link>
            </Button>
          </div>

          {/* Templates */}
          <div className="rounded-lg border p-4">
            <p className="mb-3 text-sm font-semibold">
              <Sparkles className="mr-2 inline size-4" />
              Aplicar template de segmento
            </p>
            <p className="mb-3 text-xs text-muted-foreground">
              Templates criam categorias, serviços e campos personalizados automaticamente. Itens já existentes não são duplicados.
            </p>

            {suggestedTemplate && (
              <div className="mb-3 rounded bg-primary/5 p-3">
                <p className="text-xs font-medium text-primary">
                  Sugerido para o segmento &ldquo;{tenant.segment}&rdquo;:
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleApplyTemplate(suggestedTemplate.key)}
                    disabled={templateLoading === suggestedTemplate.key || templateResult?.key === suggestedTemplate.key}
                  >
                    {templateLoading === suggestedTemplate.key ? (
                      <Loader2 className="mr-2 size-4 animate-spin" />
                    ) : null}
                    {suggestedTemplate.name}
                  </Button>
                  {templateResult?.key === suggestedTemplate.key && (
                    <Badge variant="success">
                      {templateResult.created} serviços criados
                    </Badge>
                  )}
                </div>
              </div>
            )}

            <p className="mb-2 text-xs text-muted-foreground">
              Ou escolha outro template:
            </p>
            <div className="flex flex-wrap gap-2">
              {templates
                .filter((t) => t.key !== suggestedTemplate?.key)
                .map((t) => (
                  <Button
                    key={t.key}
                    variant="outline"
                    size="sm"
                    onClick={() => handleApplyTemplate(t.key)}
                    disabled={templateLoading === t.key || templateResult?.key === t.key}
                  >
                    {templateLoading === t.key ? (
                      <Loader2 className="mr-2 size-4 animate-spin" />
                    ) : null}
                    {t.name}
                    {templateResult?.key === t.key && (
                      <CheckCircle2 className="ml-2 size-4 text-green-600" />
                    )}
                  </Button>
                ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  function renderStepAvailability() {
    const hasAvailability = checklist.hasAvailability;

    return (
      <Card>
        <CardHeader>
          <CardTitle>Horários de atendimento</CardTitle>
          <CardDescription>
            Configure os dias e horários em que você atende.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Current status */}
          <div className="rounded-lg border p-4">
            <p className="text-sm font-medium">Horários configurados</p>
            <p className="text-2xl font-bold">
              {hasAvailability ? (
                <CheckCircle2 className="size-5 text-green-600 inline" />
              ) : (
                <XCircle className="size-5 text-red-500 inline" />
              )}{" "}
              {hasAvailability ? "Sim" : "Não"}
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/app/availability">
                <Clock className="mr-2 size-4" />
                Configurar horários manualmente
              </Link>
            </Button>
          </div>

          {/* Suggested availability */}
          <div className="rounded-lg border p-4">
            <p className="mb-3 text-sm font-semibold">
              <Sparkles className="mr-2 inline size-4" />
              Horários sugeridos
            </p>
            <p className="mb-3 text-xs text-muted-foreground">
              Aplicar horário padrão (seg–sex 08:00–12:00 / 13:30–18:00, sáb 08:00–12:00). Regras já existentes não são duplicadas.
            </p>

            <div className="mb-3 grid gap-1 text-xs sm:grid-cols-3">
              {["Seg–Sex", "Seg–Sex", "Sáb"].map((_, i) => {
                if (i === 0) return (
                  <div key={i} className="rounded bg-muted/50 px-2 py-1">
                    08:00 – 12:00 (30 min)
                  </div>
                );
                if (i === 1) return (
                  <div key={i} className="rounded bg-muted/50 px-2 py-1">
                    13:30 – 18:00 (30 min)
                  </div>
                );
                return (
                  <div key={i} className="rounded bg-muted/50 px-2 py-1">
                    08:00 – 12:00 (30 min)
                  </div>
                );
              })}
            </div>

            <Button
              size="sm"
              onClick={handleApplyAvailability}
              disabled={availabilityLoading || !!availabilityResult}
            >
              {availabilityLoading && (
                <Loader2 className="mr-2 size-4 animate-spin" />
              )}
              {availabilityResult
                ? `${availabilityResult.created} criados, ${availabilityResult.skipped} já existiam`
                : "Aplicar horários sugeridos"}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  function renderStepPublicLink() {
    const publicUrl = `/${tenant.slug}`;
    const ready = checklist.publicBookingReady;

    return (
      <Card>
        <CardHeader>
          <CardTitle>Link público de agendamento</CardTitle>
          <CardDescription>
            Seu link público para clientes agendarem serviços.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* URL */}
          <div className="rounded-lg border p-4">
            <p className="mb-2 text-sm font-medium">URL do seu link público</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded bg-muted px-3 py-2 text-sm">
                {publicUrl}
              </code>
              <Button
                variant="outline"
                size="icon"
                onClick={() => navigator.clipboard.writeText(window.location.origin + publicUrl)}
                title="Copiar link"
              >
                <Copy className="size-4" />
              </Button>
              <Button asChild variant="outline" size="icon">
                <Link href={publicUrl} target="_blank">
                  <ExternalLink className="size-4" />
                </Link>
              </Button>
            </div>
          </div>

          {/* Status summary */}
          <div className="rounded-lg border p-4">
            <p className="mb-3 text-sm font-semibold">Status do link público</p>
            <div className="space-y-2 text-sm">
              {[
                { label: "Serviços ativos", ok: checklist.hasActiveService },
                { label: "Horários configurados", ok: checklist.hasAvailability },
                { label: "Link publico liberado", ok: checklist.publicLinkAllowed },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2">
                  {item.ok ? (
                    <CheckCircle2 className="size-4 text-green-600" />
                  ) : (
                    <XCircle className="size-4 text-red-500" />
                  )}
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          {ready ? (
            <Alert variant="default">
              <CheckCircle2 className="mr-2 size-4" />
              Seu link público já pode ser compartilhado com clientes.
            </Alert>
          ) : (
            <Alert variant="destructive">
              <Info className="mr-2 size-4" />
              Complete os itens pendentes para liberar o agendamento pelo link público.
            </Alert>
          )}
        </CardContent>
      </Card>
    );
  }

  function renderStepReview() {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Revisão final</CardTitle>
          <CardDescription>
            Confira se tudo está pronto antes de concluir a configuração inicial.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Checklist */}
          <div className="space-y-3">
            {checklist.items.map((item) => (
              <div
                key={item.key}
                className="flex items-start gap-3 rounded-lg border p-3"
              >
                <div className="mt-0.5">{checklistItemStatusIcon(item.status)}</div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{item.label}</p>
                  {item.description && (
                    <p className="text-xs text-muted-foreground">
                      {item.description}
                    </p>
                  )}
                </div>
                {item.status !== "DONE" && item.status !== "OPTIONAL" && item.actionHref && (
                  <Button asChild variant="ghost" size="sm" className="shrink-0">
                    <Link href={item.actionHref}>
                      {item.actionLabel ?? "Resolver"}
                      <ArrowRight className="ml-1 size-3" />
                    </Link>
                  </Button>
                )}
              </div>
            ))}
          </div>

          {/* WhatsApp/Typebot note */}
          <Alert variant="default">
            <Info className="mr-2 size-4" />
            A configuração do canal WhatsApp/Typebot é realizada pela plataforma. Entre em contato com o administrador se precisar ativar esse canal.
          </Alert>

          {/* Actions */}
          <div className="flex flex-wrap gap-3 border-t pt-4">
            <Button
              onClick={handleComplete}
              disabled={!checklist.canCompleteOnboarding}
            >
              <CheckCircle2 className="mr-2 size-4" />
              Concluir onboarding
            </Button>
            <Button variant="outline" onClick={handleSkip}>
              Pular por enquanto
            </Button>
          </div>

          {!checklist.canCompleteOnboarding && (
            <p className="text-xs text-muted-foreground">
              Para concluir, é necessário: dados do negócio preenchidos, pelo menos 1 serviço ativo e 1 horário configurado.
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  // --- Main render ---

  return (
    <div className="space-y-6">
      {/* Stepper */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap items-center gap-1 sm:gap-2">
            {STEPS.map((s, i) => {
              const isActive = i === step;
              const isDone = i < step;
              const Icon = s.icon;
              return (
                <div key={s.key} className="flex items-center gap-1 sm:gap-2">
                  {i > 0 && (
                    <ChevronRight className="size-4 text-muted-foreground shrink-0" />
                  )}
                  <button
                    type="button"
                    onClick={() => setStep(i)}
                    className={`flex items-center gap-1 rounded-full px-2 sm:px-3 py-1 text-xs sm:text-sm font-medium transition-colors shrink-0 ${
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : isDone
                          ? "bg-primary/10 text-primary"
                          : "bg-muted text-muted-foreground"
                    }`}
                  >
                    <Icon className="size-3 sm:size-4" />
                    <span className="hidden sm:inline">{s.label}</span>
                  </button>
                </div>
              );
            })}
            <span className="ml-auto text-xs text-muted-foreground">
              Etapa {step + 1} de {STEPS.length}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Error */}
      {error && (
        <Alert variant="destructive">
          <XCircle className="mr-2 size-4" />
          {error}
        </Alert>
      )}

      {/* Step content */}
      {step === 0 && renderStepBusiness()}
      {step === 1 && renderStepServices()}
      {step === 2 && renderStepAvailability()}
      {step === 3 && renderStepPublicLink()}
      {step === 4 && renderStepReview()}

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => setStep(Math.max(0, step - 1))}
          disabled={step === 0}
        >
          <ChevronLeft className="mr-2 size-4" />
          Voltar
        </Button>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={handleSkip}>
            Pular
          </Button>
          {step < STEPS.length - 1 && (
            <Button onClick={() => setStep(step + 1)}>
              Próximo
              <ChevronRight className="ml-2 size-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
