import { notFound } from "next/navigation";
import { z } from "zod";

import { SubscriptionForm } from "@/components/forms/subscription-form";
import { PageHeading } from "@/components/layout/page-heading";
import { Card, CardContent } from "@/components/ui/card";
import { toDateInputValue } from "@/lib/formatters";
import { formatDecimalInput } from "@/lib/input-formatters";
import { updateSubscriptionAction } from "@/server/actions/subscription-actions";
import { findAllPlans } from "@/server/repositories/plan-repository";
import { findSubscriptionById } from "@/server/repositories/subscription-repository";

export default async function EditSubscriptionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const parsedId = z.string().uuid().safeParse(id);
  if (!parsedId.success) notFound();

  const [subscription, plans] = await Promise.all([
    findSubscriptionById(parsedId.data),
    findAllPlans(),
  ]);
  if (!subscription) notFound();

  return (
    <>
      <PageHeading
        title="Editar assinatura"
        description={`Ajuste manual da assinatura de ${subscription.tenant.name}.`}
      />
      <Card>
        <CardContent>
          <SubscriptionForm
            plans={plans
              .filter(
                (plan) => plan.isActive || plan.id === subscription.planId,
              )
              .map((plan) => ({
                id: plan.id,
                name: plan.name,
                isActive: plan.isActive,
              }))}
            defaultValues={{
              id: subscription.id,
              planId: subscription.planId,
              status: subscription.status,
              billingCycle: subscription.billingCycle,
              price: formatDecimalInput(subscription.price.toString()),
              startsAt: toDateInputValue(subscription.startsAt),
              expiresAt: toDateInputValue(subscription.expiresAt),
              lastPaymentAt: subscription.lastPaymentAt
                ? toDateInputValue(subscription.lastPaymentAt)
                : "",
              paymentMethod: subscription.paymentMethod ?? "",
              internalNotes: subscription.internalNotes ?? "",
            }}
            action={updateSubscriptionAction}
          />
        </CardContent>
      </Card>
    </>
  );
}
