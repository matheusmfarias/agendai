import Link from "next/link";
import { notFound } from "next/navigation";
import {
  CalendarX2,
  KeyRound,
  Layers,
  Pencil,
  ReceiptText,
  UserPlus,
} from "lucide-react";
import { z } from "zod";

import { StatusActionForm } from "@/components/forms/status-action-form";
import { SuccessAlert } from "@/components/layout/success-alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatDate, formatDateTime } from "@/lib/formatters";
import {
  getStatusBadgeVariant,
  SUBSCRIPTION_STATUS_LABELS,
  TENANT_STATUS_LABELS,
} from "@/lib/status";
import { changeTenantStatusAction } from "@/server/actions/tenant-actions";
import { findTenantById } from "@/server/repositories/tenant-repository";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ success?: string }>;
};

export default async function TenantDetailPage({
  params,
  searchParams,
}: PageProps) {
  const { id } = await params;
  const parsedId = z.string().uuid().safeParse(id);
  if (!parsedId.success) notFound();

  const tenant = await findTenantById(parsedId.data);
  if (!tenant) notFound();

  const { success } = await searchParams;
  const subscription = tenant.subscription;
  const ownerLink = tenant.tenantUsers[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 rounded-lg border border-border bg-card p-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="font-display text-xl font-semibold tracking-tight">
            {tenant.name}
          </p>
          <p className="text-sm text-muted-foreground">/{tenant.slug}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Badge variant={getStatusBadgeVariant(tenant.status)}>
              {TENANT_STATUS_LABELS[tenant.status]}
            </Badge>
            {subscription ? (
              <Badge variant={getStatusBadgeVariant(subscription.status)}>
                {SUBSCRIPTION_STATUS_LABELS[subscription.status]}
              </Badge>
            ) : (
              <Badge variant="outline">Sem assinatura</Badge>
            )}
            <span className="text-sm text-muted-foreground">
              {tenant.city}/{tenant.state} · {tenant.segment}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={`/admin/tenants/${tenant.id}/edit`}>
              <Pencil className="size-4" />
              Editar
            </Link>
          </Button>
          {tenant.status !== "ACTIVE" ? (
            <StatusActionForm
              id={tenant.id}
              status="ACTIVE"
              label="Reativar"
              confirmation="Reativar este prestador? O prestador voltará a ter acesso operacional."
              kind="tenant"
              action={changeTenantStatusAction}
            />
          ) : (
            <StatusActionForm
              id={tenant.id}
              status="SUSPENDED"
              label="Suspender"
              confirmation="Suspender este prestador? O prestador perderá acesso operacional e os canais externos poderão ser bloqueados."
              kind="tenant"
              action={changeTenantStatusAction}
            />
          )}
          {tenant.status !== "CANCELED" && (
            <StatusActionForm
              id={tenant.id}
              status="CANCELED"
              label="Cancelar"
              confirmation="Cancelar este prestador? O prestador será permanentemente cancelado. Esta ação não pode ser desfeita."
              variant="destructive"
              kind="tenant"
              action={changeTenantStatusAction}
            />
          )}
        </div>
      </div>

      <SuccessAlert code={success} context="tenant" />

      {/* Main info: business + subscription */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Dados do negócio</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 text-sm sm:grid-cols-2">
            <Detail label="Responsável" value={tenant.responsibleName} />
            <Detail
              label="Documento"
              value={
                tenant.documentNumber
                  ? `${tenant.documentType ?? "Documento"} ${tenant.documentNumber}`
                  : "Não informado"
              }
            />
            <Detail label="E-mail" value={tenant.email} />
            <Detail label="WhatsApp" value={tenant.whatsapp} />
            <Detail label="Segmento" value={tenant.segment} />
            <Detail label="Cidade/UF" value={`${tenant.city}/${tenant.state}`} />
            <Detail label="Criado em" value={formatDateTime(tenant.createdAt)} />
            <Detail
              label="Atualizado em"
              value={formatDateTime(tenant.updatedAt)}
            />
            <Detail
              label="Último acesso"
              value={formatDate(tenant.tenantUsers[0]?.user.lastLoginAt)}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Assinatura</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {subscription ? (
              <>
                <Detail label="Plano" value={subscription.plan.name} />
                <Detail
                  label="Status"
                  value={
                    <Badge
                      variant={getStatusBadgeVariant(subscription.status)}
                    >
                      {SUBSCRIPTION_STATUS_LABELS[subscription.status]}
                    </Badge>
                  }
                />
                <Detail
                  label="Vencimento"
                  value={formatDate(subscription.expiresAt)}
                />
                <div className="pt-2">
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/admin/subscriptions/${subscription.id}`}>
                      <ReceiptText className="size-4" />
                      Gerenciar assinatura
                    </Link>
                  </Button>
                </div>
              </>
            ) : (
              <p className="text-muted-foreground">Sem assinatura cadastrada.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick actions row */}
      <Card>
        <CardHeader>
          <CardTitle>Ações administrativas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href={`/admin/tenants/${tenant.id}/templates`}>
                <Layers className="size-4" />
                Aplicar template
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href={`/admin/tenants/${tenant.id}/typebot-credentials`}>
                <KeyRound className="size-4" />
                Credenciais Typebot
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href={`/admin/audit-logs?tenantId=${tenant.id}`}>
                Ver logs do prestador
              </Link>
            </Button>
            {ownerLink ? (
              <Button asChild variant="outline" size="sm">
                <Link href={`/admin/tenants/${tenant.id}/reset-password`}>
                  <KeyRound className="size-4" />
                  Redefinir senha
                </Link>
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {/* Usuário responsável */}
      <Card>
        <CardHeader>
          <CardTitle>Usuário responsável</CardTitle>
        </CardHeader>
        <CardContent>
          {ownerLink ? (
            <div className="grid gap-4 text-sm sm:grid-cols-2">
              <Detail label="Nome" value={ownerLink.user.name} />
              <Detail label="E-mail de login" value={ownerLink.user.email} />
              <Detail label="Role no tenant" value={ownerLink.role} />
              <Detail
                label="Status do usuário"
                value={
                  <Badge
                    variant={ownerLink.user.isActive ? "success" : "destructive"}
                  >
                    {ownerLink.user.isActive ? "Ativo" : "Inativo"}
                  </Badge>
                }
              />
              <Detail
                label="Status do vínculo"
                value={
                  <Badge
                    variant={ownerLink.isActive ? "success" : "destructive"}
                  >
                    {ownerLink.isActive ? "Ativo" : "Inativo"}
                  </Badge>
                }
              />
              <Detail
                label="Criado em"
                value={formatDateTime(ownerLink.user.createdAt)}
              />
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Este prestador ainda não possui usuário responsável.
              </p>
              <Button asChild>
                <Link href={`/admin/tenants/${tenant.id}/access`}>
                  <UserPlus className="size-4" />
                  Criar acesso do responsável
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Placeholder + logs */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Agendamentos recentes</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-3 text-sm text-muted-foreground">
            <CalendarX2 className="size-5" />
            A agenda detalhada ainda não faz parte desta fase.
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Links rápidos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {tenant.slug && (
              <Button asChild variant="outline" size="sm" className="w-full justify-start">
                <Link href={`/${tenant.slug}`} target="_blank">
                  Ver link público
                </Link>
              </Button>
            )}
            <Button asChild variant="outline" size="sm" className="w-full justify-start">
              <Link href={`/admin/appointments`}>Agendamentos (admin)</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Logs */}
      <Card>
        <CardHeader>
          <CardTitle>Logs recentes</CardTitle>
        </CardHeader>
        <CardContent>
          {tenant.auditLogs.length ? (
            <div className="divide-y">
              {tenant.auditLogs.map((log) => (
                <div key={log.id} className="py-3 text-sm">
                  <div className="flex flex-wrap justify-between gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {log.eventType}
                    </Badge>
                    <time className="text-xs text-muted-foreground">
                      {formatDateTime(log.createdAt)}
                    </time>
                  </div>
                  <p className="mt-1 text-muted-foreground">{log.description}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Nenhum log registrado.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Detail({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="mt-1 font-medium">{value}</div>
    </div>
  );
}
