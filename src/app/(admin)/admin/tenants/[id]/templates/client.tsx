"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  CheckCircle2,
  Clock,
  Info,
  Layers,
  MapPin,
  XCircle,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

import {
  applySegmentTemplateAction,
  previewSegmentTemplateAction,
} from "@/features/segment-templates/segment-template-actions";
import type {
  SegmentTemplateApplicationResult,
  SegmentTemplateDefinition,
  SegmentTemplateKey,
  SegmentTemplatePreview,
} from "@/features/segment-templates/segment-template-types";

const WEEKDAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

type Props = {
  tenantId: string;
  tenantName: string;
  tenantSegment?: string;
  templates: SegmentTemplateDefinition[];
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function SegmentTemplateClient({
  tenantId,
  tenantName,
  tenantSegment,
  templates,
}: Props) {
  const router = useRouter();

  // --- state ---
  const [selectedKey, setSelectedKey] = useState<SegmentTemplateKey | null>(
    null,
  );
  const [includeAvailability, setIncludeAvailability] = useState(true);
  const [preview, setPreview] = useState<SegmentTemplatePreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<SegmentTemplateApplicationResult | null>(null);

  // --- handlers ---

  async function handleSelectTemplate(key: SegmentTemplateKey) {
    setSelectedKey(key);
    setError(null);
    setSuccess(null);
    setPreviewLoading(true);

    const result = await previewSegmentTemplateAction(
      tenantId,
      key,
      includeAvailability,
    );

    if (!result.ok) {
      setError(result.error);
      setPreview(null);
    } else {
      setPreview(result.preview);
    }
    setPreviewLoading(false);
  }

  async function handleApply() {
    if (!selectedKey) return;
    setLoading(true);
    setError(null);

    const result = await applySegmentTemplateAction(
      tenantId,
      tenantName,
      selectedKey,
      includeAvailability,
    );

    if (!result.ok) {
      setError(result.error ?? "Erro ao aplicar template.");
    } else {
      setSuccess(result.result);
      // Refresh preview
      const freshPreview = await previewSegmentTemplateAction(
        tenantId,
        selectedKey,
        includeAvailability,
      );
      if (freshPreview.ok) {
        setPreview(freshPreview.preview);
      }
    }
    setLoading(false);
    router.refresh();
  }

  // Derive suggested template from tenant segment
  const suggestedTemplate = tenantSegment
    ? templates.find(
        (t) =>
          t.segment.toLowerCase() === tenantSegment.toLowerCase() ||
          t.name.toLowerCase() === tenantSegment.toLowerCase(),
      )
    : undefined;

  // --- render ---

  return (
    <div className="space-y-6">
      {/* Tenant context */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="size-5" />
            Dados do prestador
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm sm:grid-cols-3">
          <div>
            <p className="text-xs text-muted-foreground">Prestador</p>
            <p className="font-medium">{tenantName}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Segmento atual</p>
            <p className="font-medium">{tenantSegment || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">
              Template sugerido
            </p>
            <p className="font-medium">
              {suggestedTemplate ? (
                <Badge variant="success">{suggestedTemplate.name}</Badge>
              ) : (
                <span className="text-muted-foreground">Nenhum</span>
              )}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Template selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="size-5" />
            Templates disponíveis
          </CardTitle>
          <CardDescription>
            Selecione um template para visualizar o que será criado. A
            aplicação é segura: itens já existentes não são duplicados.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {templates.map((t) => (
              <Button
                key={t.key}
                variant={selectedKey === t.key ? "default" : "outline"}
                size="sm"
                onClick={() => handleSelectTemplate(t.key)}
                disabled={previewLoading}
              >
                {t.name}
              </Button>
            ))}
          </div>

          {/* Availability toggle */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="includeAvailability"
              checked={includeAvailability}
              onChange={(e) => {
                setIncludeAvailability(e.target.checked);
                if (selectedKey) handleSelectTemplate(selectedKey);
              }}
            />
            <Label htmlFor="includeAvailability" className="text-sm">
              Incluir horários sugeridos
            </Label>
          </div>
        </CardContent>
      </Card>

      {/* Loading */}
      {previewLoading && (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Carregando preview…
          </CardContent>
        </Card>
      )}

      {/* Error */}
      {error && (
        <Card className="border-destructive">
          <CardContent className="py-4 text-sm text-destructive">
            {error}
          </CardContent>
        </Card>
      )}

      {/* Success */}
      {success && (
        <Card className="border-green-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-700">
              <CheckCircle2 className="size-5" />
              Template aplicado com sucesso
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <SummaryList title="Criado" items={[
              { label: "Categorias", count: success.created.categories },
              { label: "Serviços", count: success.created.services },
              { label: "Campos personalizados", count: success.created.customFields },
              { label: "Regras de horário", count: success.created.availabilityRules },
            ]} />
            <SummaryList title="Ignorado (já existia)" items={[
              { label: "Categorias", count: success.skipped.categories },
              { label: "Serviços", count: success.skipped.services },
              { label: "Campos personalizados", count: success.skipped.customFields },
              { label: "Regras de horário", count: success.skipped.availabilityRules },
            ]} />
          </CardContent>
        </Card>
      )}

      {/* Preview */}
      {preview && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="size-5" />
              Preview: {preview.template.name}
            </CardTitle>
            <CardDescription>
              {preview.template.description}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Categories */}
            <div>
              <h4 className="mb-3 text-sm font-semibold">Categorias e serviços</h4>
              <div className="space-y-4">
                {preview.categories.map((cat) => (
                  <div
                    key={cat.name}
                    className="rounded-lg border p-4"
                  >
                    <div className="mb-2 flex items-center gap-2">
                      <span className="font-medium">{cat.name}</span>
                      {cat.exists ? (
                        <Badge variant="secondary" className="text-xs">
                          já existe
                        </Badge>
                      ) : (
                        <Badge variant="success" className="text-xs">
                          será criada
                        </Badge>
                      )}
                    </div>

                    <div className="space-y-3">
                      {cat.services.map((svc) => (
                        <div
                          key={svc.name}
                          className="rounded bg-muted/50 p-3 text-sm"
                        >
                          <div className="mb-1 flex items-center gap-2">
                            <span className="font-medium">{svc.name}</span>
                            {svc.exists ? (
                              <Badge variant="secondary" className="text-xs">
                                já existe
                              </Badge>
                            ) : (
                              <Badge variant="success" className="text-xs">
                                será criado
                              </Badge>
                            )}
                          </div>

                          {/* Custom fields for this service */}
                          {svc.customFields.length > 0 && (
                            <div className="mt-2 space-y-1">
                              <p className="text-xs text-muted-foreground">
                                Campos personalizados:
                              </p>
                              {svc.customFields.map((cf) => (
                                <div
                                  key={cf.key}
                                  className="flex items-center gap-2 text-xs"
                                >
                                  {cf.exists ? (
                                    <CheckCircle2 className="size-3 text-muted-foreground" />
                                  ) : (
                                    <XCircle className="size-3 text-orange-500" />
                                  )}
                                  <span>{cf.label}</span>
                                  <span className="text-muted-foreground">
                                    ({cf.key})
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Availability */}
            {preview.availabilityRules.length > 0 && (
              <div>
                <h4 className="mb-3 text-sm font-semibold">Horários sugeridos</h4>
                <div className="space-y-1">
                  {preview.availabilityRules.map((rule) => (
                    <div
                      key={`${rule.weekday}-${rule.startTime}`}
                      className="flex items-center gap-2 rounded bg-muted/50 px-3 py-2 text-sm"
                    >
                      {rule.exists ? (
                        <CheckCircle2 className="size-4 text-muted-foreground" />
                      ) : (
                        <XCircle className="size-4 text-orange-500" />
                      )}
                      <span className="w-10 font-medium">
                        {WEEKDAY_LABELS[rule.weekday]}
                      </span>
                      <Clock className="size-3 text-muted-foreground" />
                      <span>
                        {rule.startTime} – {rule.endTime}
                      </span>
                      {rule.exists && (
                        <Badge variant="secondary" className="ml-auto text-xs">
                          já existe
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Apply button */}
            <div className="flex items-center gap-3 border-t pt-4">
              <Button
                onClick={handleApply}
                disabled={loading}
              >
                {loading ? "Aplicando…" : "Aplicar template"}
              </Button>
              <p className="text-xs text-muted-foreground">
                Serão criados apenas itens ausentes. Dados existentes não serão
                alterados.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Summary list helper
// ---------------------------------------------------------------------------

function SummaryList({
  title,
  items,
}: {
  title: string;
  items: { label: string; count: number }[];
}) {
  return (
    <div>
      <p className="mb-1 text-xs font-semibold text-muted-foreground">
        {title}
      </p>
      <div className="grid grid-cols-2 gap-1 text-xs">
        {items.map((item) => (
          <div key={item.label} className="flex justify-between">
            <span>{item.label}</span>
            <span className="font-medium">{item.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
