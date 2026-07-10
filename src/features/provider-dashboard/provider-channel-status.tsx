"use client";

import Link from "next/link";
import {
  AlertCircle,
  CheckCircle2,
  Globe,
  MessageCircle,
  Monitor,
  XCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ChannelStatus = "ready" | "pending" | "blocked";

type ProviderChannelStatusProps = {
  publicBookingReady: boolean;
  publicLinkAllowed: boolean;
  typebotReady: boolean;
  typebotAllowed: boolean;
  tenantSlug: string;
};

const STATUS_STYLE: Record<ChannelStatus, string> = {
  ready: "bg-success/10 text-success",
  pending: "bg-warning/15 text-warning-foreground",
  blocked: "bg-destructive/10 text-destructive",
};

function StatusIcon({ status }: { status: ChannelStatus }) {
  if (status === "ready") return <CheckCircle2 className="size-4" />;
  if (status === "pending") return <AlertCircle className="size-4" />;
  return <XCircle className="size-4" />;
}

function ChannelRow({
  icon,
  label,
  status,
  description,
  actionLabel,
  actionHref,
}: {
  icon: React.ReactNode;
  label: string;
  status: ChannelStatus;
  description: string;
  actionLabel?: string;
  actionHref?: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl px-1 py-3 first:pt-0 last:pb-0">
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-semibold">{label}</p>
          <span
            className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[status]}`}
          >
            <StatusIcon status={status} />
          </span>
        </div>
        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
          {description}
        </p>
        {actionLabel && actionHref ? (
          <Button
            asChild
            variant="quiet"
            size="sm"
            className="mt-1 h-auto p-0 text-xs"
          >
            <Link href={actionHref}>{actionLabel}</Link>
          </Button>
        ) : null}
      </div>
    </div>
  );
}

export function ProviderChannelStatus({
  publicBookingReady,
  publicLinkAllowed,
  typebotReady,
  typebotAllowed,
  tenantSlug,
}: ProviderChannelStatusProps) {
  const publicLinkStatus: ChannelStatus = publicBookingReady
    ? "ready"
    : publicLinkAllowed
      ? "pending"
      : "blocked";

  const publicLinkDescription = publicBookingReady
    ? "Disponível para receber reservas online."
    : publicLinkAllowed
      ? "Finalize serviços e horários para publicar."
      : "Indisponível no plano atual.";

  const typebotStatus: ChannelStatus = typebotReady
    ? "ready"
    : typebotAllowed
      ? "pending"
      : "blocked";

  const typebotDescription = typebotReady
    ? "Integração pronta para atendimento automatizado."
    : typebotAllowed
      ? "Ainda não configurado pela plataforma."
      : "Indisponível no plano atual.";

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Canais de agendamento</CardTitle>
      </CardHeader>
      <CardContent className="divide-y divide-border">
        <ChannelRow
          icon={<Globe className="size-5" />}
          label="Link público"
          status={publicLinkStatus}
          description={publicLinkDescription}
          actionLabel={
            publicBookingReady
              ? `/${tenantSlug}`
              : publicLinkAllowed
                ? "Configurar agora"
                : undefined
          }
          actionHref={
            publicBookingReady
              ? `/${tenantSlug}`
              : publicLinkAllowed
                ? "/app/services"
                : undefined
          }
        />

        <ChannelRow
          icon={<MessageCircle className="size-5" />}
          label="WhatsApp / Typebot"
          status={typebotStatus}
          description={typebotDescription}
        />

        <ChannelRow
          icon={<Monitor className="size-5" />}
          label="Painel manual"
          status="ready"
          description="Crie e acompanhe agendamentos pelo painel."
          actionLabel="Novo agendamento"
          actionHref="/app/appointments?panel=new"
        />
      </CardContent>
    </Card>
  );
}
