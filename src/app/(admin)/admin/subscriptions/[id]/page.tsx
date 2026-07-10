import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarClock, Pencil, Receipt } from "lucide-react";
import { z } from "zod";

import { StatusActionForm } from "@/components/forms/status-action-form";
import { PageHeading } from "@/components/layout/page-heading";
import { SuccessAlert } from "@/components/layout/success-alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/formatters";
import {
  getStatusBadgeVariant,
  SUBSCRIPTION_STATUS_LABELS,
  TENANT_STATUS_LABELS,
} from "@/lib/status";
import { changeSubscriptionStatusAction } from "@/server/actions/subscription-actions";
import { findSubscriptionById } from "@/server/repositories/subscription-repository";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ success?: string }>;
};

export default async function SubscriptionDetailPage({
  params,
  searchParams,
}: PageProps) {
  const { id } = await params;
  const parsedId = z.string().uuid().safeParse(id);
  if (!parsedId.success) notFound();
  const subscription = await findSubscriptionById(parsedId.data);
  if (!subscription) notFound();
  const { success } = await searchParams;

  return (
    <>
      <PageHeading
        title={`Assinatura de ${subscription.tenant.name}`}
        description={`Plano ${subscription.plan.name}`}
        actions={
          <>
            <Button asChild variant="outline">
              <Link href={`/admin/subscriptions/${subscription.id}/edit`}>
                <Pencil className="size-4" />
                Editar
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={`/admin/subscriptions/${subscription.id}/payment`}>
                <Receipt className="size-4" />
                Registrar pagamento
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={`/admin/subscriptions/${subscription.id}/expiration`}>
                <CalendarClock className="size-4" />
                Alterar vencimento
              </Link>
            </Button>
          </>
        }
      />
      <SuccessAlert code={success} context="subscription" />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Dados da assinatura</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 text-sm sm:grid-cols-2">
            <Detail label="Plano" value={subscription.plan.name} />
            <Detail
              label="Status"
              value={
                <Badge variant={getStatusBadgeVariant(subscription.status)}>
                  {SUBSCRIPTION_STATUS_LABELS[subscription.status]}
                </Badge>
              }
            />
            <Detail
              label="Ciclo"
              value={
                subscription.billingCycle === "MONTHLY" ? "Mensal" : "Anual"
              }
            />
            <Detail
              label="Valor"
              value={formatCurrency(subscription.price.toString())}
            />
            <Detail label="Início" value={formatDate(subscription.startsAt)} />
            <Detail
              label="Vencimento"
              value={formatDate(subscription.expiresAt)}
            />
            <Detail
              label="Último pagamento"
              value={formatDate(subscription.lastPaymentAt)}
            />
            <Detail
              label="Forma de pagamento"
              value={subscription.paymentMethod ?? "—"}
            />
            <Detail
              label="Atualizada em"
              value={formatDateTime(subscription.updatedAt)}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Status</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {subscription.status !== "ACTIVE" ? (
              <StatusActionForm
                id={subscription.id}
                status="ACTIVE"
                label="Reativar"
                confirmation="Reativar esta assinatura? Os bloqueios por vencimento serão removidos."
                kind="subscription"
                action={changeSubscriptionStatusAction}
              />
            ) : (
              <StatusActionForm
                id={subscription.id}
                status="SUSPENDED"
                label="Suspender"
                confirmation="Suspender esta assinatura? Agendamentos externos poderão ser bloqueados."
                kind="subscription"
                action={changeSubscriptionStatusAction}
              />
            )}
            {subscription.status !== "CANCELED" ? (
              <StatusActionForm
                id={subscription.id}
                status="CANCELED"
                label="Cancelar"
                confirmation="Cancelar esta assinatura? Esta ação não pode ser desfeita."
                variant="destructive"
                kind="subscription"
                action={changeSubscriptionStatusAction}
              />
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Prestador</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Detail label="Nome" value={subscription.tenant.name} />
            <Detail label="Slug" value={`/${subscription.tenant.slug}`} />
            <Detail
              label="Status"
              value={
                <Badge
                  variant={getStatusBadgeVariant(subscription.tenant.status)}
                >
                  {TENANT_STATUS_LABELS[subscription.tenant.status]}
                </Badge>
              }
            />
            <Button asChild variant="outline" size="sm">
              <Link href={`/admin/tenants/${subscription.tenant.id}`}>
                Ver prestador
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Observações internas</CardTitle>
          </CardHeader>
          <CardContent className="whitespace-pre-wrap text-sm text-muted-foreground">
            {subscription.internalNotes || "Nenhuma observação."}
          </CardContent>
        </Card>
      </div>
    </>
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
