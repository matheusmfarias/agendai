import { notFound } from "next/navigation";
import { z } from "zod";

import { ExpirationForm } from "@/components/forms/expiration-form";
import { PageHeading } from "@/components/layout/page-heading";
import { Card, CardContent } from "@/components/ui/card";
import { toDateInputValue } from "@/lib/formatters";
import { changeExpirationAction } from "@/server/actions/subscription-actions";
import { findSubscriptionById } from "@/server/repositories/subscription-repository";

export default async function ChangeExpirationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const parsedId = z.string().uuid().safeParse(id);
  if (!parsedId.success) notFound();
  const subscription = await findSubscriptionById(parsedId.data);
  if (!subscription) notFound();

  return (
    <>
      <PageHeading
        title="Alterar vencimento"
        description={`Ajuste manual da assinatura de ${subscription.tenant.name}.`}
      />
      <Card>
        <CardContent>
          <ExpirationForm
            defaultValues={{
              id: subscription.id,
              expiresAt: toDateInputValue(subscription.expiresAt),
              reason: "",
            }}
            action={changeExpirationAction}
          />
        </CardContent>
      </Card>
    </>
  );
}
