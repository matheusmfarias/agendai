import { PlanForm } from "@/components/forms/plan-form";
import { PageHeading } from "@/components/layout/page-heading";
import { Card, CardContent } from "@/components/ui/card";
import { createPlanAction } from "@/server/actions/plan-actions";

export const metadata = { title: "Novo plano" };

export default function NewPlanPage() {
  return (
    <>
      <PageHeading
        title="Novo plano"
        description="Cadastre uma nova opção comercial."
      />
      <Card>
        <CardContent>
          <PlanForm
            mode="create"
            defaultValues={{
              name: "",
              description: "",
              monthlyPrice: "0,00",
              annualPrice: "0,00",
              whatsappEnabled: false,
              publicLinkEnabled: true,
              isActive: true,
            }}
            action={createPlanAction}
          />
        </CardContent>
      </Card>
    </>
  );
}
