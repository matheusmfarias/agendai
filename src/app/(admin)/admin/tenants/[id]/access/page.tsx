import { notFound, redirect } from "next/navigation";
import { z } from "zod";

import { TenantOwnerAccessForm } from "@/components/forms/tenant-owner-access-form";
import { PageHeading } from "@/components/layout/page-heading";
import { Card, CardContent } from "@/components/ui/card";
import { provisionTenantOwnerAction } from "@/server/actions/tenant-actions";
import { findTenantById } from "@/server/repositories/tenant-repository";

export default async function CreateTenantOwnerAccessPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const parsedId = z.string().uuid().safeParse(id);
  if (!parsedId.success) notFound();
  const tenant = await findTenantById(parsedId.data);
  if (!tenant) notFound();

  if (tenant.tenantUsers[0]) {
    redirect(`/admin/tenants/${tenant.id}/reset-password`);
  }

  return (
    <>
      <PageHeading
        title="Criar acesso do responsável"
        description={`Crie o usuário OWNER de ${tenant.name}.`}
      />
      <Card>
        <CardContent>
          <TenantOwnerAccessForm
            mode="create"
            defaultValues={{
              tenantId: tenant.id,
              ownerName: tenant.responsibleName,
              ownerEmail: tenant.email,
              initialPassword: "",
              confirmInitialPassword: "",
            }}
            action={provisionTenantOwnerAction}
          />
        </CardContent>
      </Card>
    </>
  );
}
