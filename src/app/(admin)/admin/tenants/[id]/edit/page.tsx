import { notFound } from "next/navigation";
import { z } from "zod";

import { TenantForm } from "@/components/forms/tenant-form";
import { PageHeading } from "@/components/layout/page-heading";
import { Card, CardContent } from "@/components/ui/card";
import { updateTenantAction } from "@/server/actions/tenant-actions";
import { findTenantById } from "@/server/repositories/tenant-repository";

export default async function EditTenantPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const parsedId = z.string().uuid().safeParse(id);
  if (!parsedId.success) notFound();
  const tenant = await findTenantById(parsedId.data);
  if (!tenant) notFound();

  return (
    <>
      <PageHeading
        title="Editar prestador"
        description={`Atualize os dados administrativos de ${tenant.name}.`}
      />
      <Card>
        <CardContent>
          <TenantForm
            mode="edit"
            defaultValues={{
              id: tenant.id,
              name: tenant.name,
              slug: tenant.slug,
              documentType: tenant.documentType ?? "CNPJ",
              documentNumber: tenant.documentNumber ?? "",
              publicDisplayName: tenant.publicDisplayName ?? "",
              responsibleName: tenant.responsibleName,
              email: tenant.email,
              whatsapp: tenant.whatsapp,
              segment: tenant.segment,
              city: tenant.city,
              state: tenant.state,
              postalCode: tenant.postalCode ?? "",
              neighborhood: tenant.neighborhood ?? "",
              address: tenant.address ?? "",
              addressComplement: tenant.addressComplement ?? "",
              googleMapsUrl: tenant.googleMapsUrl ?? "",
              serviceLocation:
                tenant.serviceLocation === "CUSTOMER_ADDRESS" ||
                tenant.serviceLocation === "BOTH"
                  ? tenant.serviceLocation
                  : "BUSINESS_ADDRESS",
              timezone:
                tenant.timezone === "America/Manaus" ||
                tenant.timezone === "America/Cuiaba" ||
                tenant.timezone === "America/Rio_Branco"
                  ? tenant.timezone
                  : "America/Sao_Paulo",
              defaultAppointmentDuration: tenant.defaultAppointmentDuration,
              defaultSlotInterval: tenant.defaultSlotInterval,
              minBookingNoticeMinutes: tenant.minBookingNoticeMinutes,
              maxBookingAdvanceDays: tenant.maxBookingAdvanceDays,
              description: tenant.description ?? "",
              status: tenant.status,
            }}
            action={updateTenantAction}
          />
        </CardContent>
      </Card>
    </>
  );
}
