import { addMonths, format } from "date-fns";

import { TenantForm } from "@/components/forms/tenant-form";
import { PageHeading } from "@/components/layout/page-heading";
import { Card, CardContent } from "@/components/ui/card";
import { createTenantAction } from "@/server/actions/tenant-actions";
import { findActivePlans } from "@/server/repositories/plan-repository";

export const metadata = { title: "Novo prestador" };

export default async function NewTenantPage() {
  const plans = await findActivePlans();

  return (
    <>
      <PageHeading
        title="Novo prestador"
        description="Cadastre o negócio e sua assinatura inicial."
      />
      <Card>
        <CardContent>
          <TenantForm
            mode="create"
            plans={plans.map((plan) => ({
              ...plan,
              monthlyPrice: plan.monthlyPrice.toString(),
              annualPrice: plan.annualPrice.toString(),
            }))}
            defaultValues={{
              name: "",
              slug: "",
              documentType: "CNPJ",
              documentNumber: "",
              publicDisplayName: "",
              responsibleName: "",
              email: "",
              whatsapp: "",
              segment: "",
              city: "",
              state: "",
              postalCode: "",
              neighborhood: "",
              address: "",
              addressComplement: "",
              googleMapsUrl: "",
              serviceLocation: "BUSINESS_ADDRESS",
              timezone: "America/Sao_Paulo",
              defaultAppointmentDuration: 30,
              defaultSlotInterval: 30,
              minBookingNoticeMinutes: 120,
              maxBookingAdvanceDays: 30,
              description: "",
              status: "ACTIVE",
              planId: plans[0]?.id ?? "",
              billingCycle: "MONTHLY",
              expiresAt: format(addMonths(new Date(), 1), "yyyy-MM-dd"),
              ownerName: "",
              ownerEmail: "",
              initialPassword: "",
              confirmInitialPassword: "",
            }}
            action={createTenantAction}
          />
        </CardContent>
      </Card>
    </>
  );
}
