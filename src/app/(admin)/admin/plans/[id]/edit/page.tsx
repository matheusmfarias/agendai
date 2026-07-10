import { notFound } from "next/navigation";
import { z } from "zod";

import { PlanForm } from "@/components/forms/plan-form";
import { PageHeading } from "@/components/layout/page-heading";
import { Card, CardContent } from "@/components/ui/card";
import { formatDecimalInput } from "@/lib/input-formatters";
import { updatePlanAction } from "@/server/actions/plan-actions";
import { findPlanById } from "@/server/repositories/plan-repository";

export default async function EditPlanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const parsedId = z.string().uuid().safeParse(id);
  if (!parsedId.success) notFound();
  const plan = await findPlanById(parsedId.data);
  if (!plan) notFound();

  return (
    <>
      <PageHeading
        title="Editar plano"
        description={`${plan._count.subscriptions} assinatura(s) vinculada(s). Prefira inativar a excluir.`}
      />
      <Card>
        <CardContent>
          <PlanForm
            mode="edit"
            defaultValues={{
              id: plan.id,
              name: plan.name,
              description: plan.description ?? "",
              monthlyPrice: formatDecimalInput(plan.monthlyPrice.toString()),
              annualPrice: formatDecimalInput(plan.annualPrice.toString()),
              whatsappEnabled: plan.whatsappEnabled,
              publicLinkEnabled: plan.publicLinkEnabled,
              isActive: plan.isActive,
            }}
            action={updatePlanAction}
          />
        </CardContent>
      </Card>
    </>
  );
}
