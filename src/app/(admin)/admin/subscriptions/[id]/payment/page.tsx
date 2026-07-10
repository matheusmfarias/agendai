import { addMonths, format } from "date-fns";
import { notFound } from "next/navigation";
import { z } from "zod";

import { PaymentForm } from "@/components/forms/payment-form";
import { PageHeading } from "@/components/layout/page-heading";
import { Card, CardContent } from "@/components/ui/card";
import { formatDecimalInput } from "@/lib/input-formatters";
import { registerPaymentAction } from "@/server/actions/subscription-actions";
import { findSubscriptionById } from "@/server/repositories/subscription-repository";

export default async function RegisterPaymentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const parsedId = z.string().uuid().safeParse(id);
  if (!parsedId.success) notFound();
  const subscription = await findSubscriptionById(parsedId.data);
  if (!subscription) notFound();

  const suggestedExpiration =
    subscription.billingCycle === "MONTHLY"
      ? addMonths(subscription.expiresAt, 1)
      : addMonths(subscription.expiresAt, 12);

  return (
    <>
      <PageHeading
        title="Registrar pagamento"
        description={`Pagamento manual da assinatura de ${subscription.tenant.name}.`}
      />
      <Card>
        <CardContent>
          <PaymentForm
            defaultValues={{
              id: subscription.id,
              paymentDate: format(new Date(), "yyyy-MM-dd"),
              paymentMethod: subscription.paymentMethod ?? "Pix",
              amountPaid: formatDecimalInput(subscription.price.toString()),
              newExpiresAt: format(suggestedExpiration, "yyyy-MM-dd"),
              internalNotes: "",
            }}
            action={registerPaymentAction}
          />
        </CardContent>
      </Card>
    </>
  );
}
