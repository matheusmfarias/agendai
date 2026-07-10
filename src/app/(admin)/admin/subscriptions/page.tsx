import { PageHeading } from "@/components/layout/page-heading";
import {
  SubscriptionTable,
  type SubscriptionTableRow,
} from "@/components/tables/subscription-table";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { changeSubscriptionStatusAction } from "@/server/actions/subscription-actions";
import { findAllSubscriptions } from "@/server/repositories/subscription-repository";

export const metadata = { title: "Assinaturas" };

export default async function SubscriptionsPage() {
  const subscriptions = await findAllSubscriptions();
  const rows: SubscriptionTableRow[] = subscriptions.map((subscription) => ({
    id: subscription.id,
    tenantName: subscription.tenant.name,
    planName: subscription.plan.name,
    status: subscription.status,
    billingCycle: subscription.billingCycle,
    price: formatCurrency(subscription.price.toString()),
    startsAt: formatDate(subscription.startsAt),
    expiresAt: formatDate(subscription.expiresAt),
    lastPaymentAt: formatDate(subscription.lastPaymentAt),
    paymentMethod: subscription.paymentMethod ?? "—",
  }));

  return (
    <>
      <PageHeading
        title="Assinaturas"
        description="Controle manual dos planos, pagamentos e vencimentos."
      />
      <Card>
        <CardContent>
          {rows.length ? (
            <SubscriptionTable
              data={rows}
              statusAction={changeSubscriptionStatusAction}
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              Nenhuma assinatura cadastrada.
            </p>
          )}
        </CardContent>
      </Card>
    </>
  );
}
