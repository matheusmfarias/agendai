import Link from "next/link";
import { Plus } from "lucide-react";

import { PageHeading } from "@/components/layout/page-heading";
import { SuccessAlert } from "@/components/layout/success-alert";
import { PlanTable, type PlanTableRow } from "@/components/tables/plan-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/formatters";
import { findAllPlans } from "@/server/repositories/plan-repository";

export const metadata = { title: "Planos" };

export default async function PlansPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string }>;
}) {
  const plans = await findAllPlans();
  const { success } = await searchParams;
  const rows: PlanTableRow[] = plans.map((plan) => ({
    id: plan.id,
    name: plan.name,
    monthlyPrice: formatCurrency(plan.monthlyPrice.toString()),
    annualPrice: formatCurrency(plan.annualPrice.toString()),
    whatsappEnabled: plan.whatsappEnabled,
    publicLinkEnabled: plan.publicLinkEnabled,
    isActive: plan.isActive,
    subscriptionsCount: plan._count.subscriptions,
  }));

  return (
    <>
      <PageHeading
        title="Planos"
        description="Configure os planos comerciais disponíveis."
        actions={
          <Button asChild>
            <Link href="/admin/plans/new">
              <Plus className="size-4" />
              Novo plano
            </Link>
          </Button>
        }
      />
      <SuccessAlert code={success} context="plan" />
      <Card>
        <CardContent>
          {rows.length ? (
            <PlanTable data={rows} />
          ) : (
            <p className="text-sm text-muted-foreground">
              Nenhum plano cadastrado.
            </p>
          )}
        </CardContent>
      </Card>
    </>
  );
}
