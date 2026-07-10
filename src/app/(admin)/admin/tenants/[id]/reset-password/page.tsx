import { notFound, redirect } from "next/navigation";
import { z } from "zod";

import { TenantOwnerAccessForm } from "@/components/forms/tenant-owner-access-form";
import { PageHeading } from "@/components/layout/page-heading";
import { Card, CardContent } from "@/components/ui/card";
import { resetTenantOwnerPasswordAction } from "@/server/actions/tenant-actions";
import { findTenantById } from "@/server/repositories/tenant-repository";

export default async function ResetTenantOwnerPasswordPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const parsedId = z.string().uuid().safeParse(id);
  if (!parsedId.success) notFound();
  const tenant = await findTenantById(parsedId.data);
  if (!tenant) notFound();

  const ownerLink = tenant.tenantUsers[0];
  if (!ownerLink) {
    redirect(`/admin/tenants/${tenant.id}/access`);
  }

  return (
    <>
      <PageHeading
        title="Redefinir senha"
        description={`Defina uma nova senha para ${ownerLink.user.name}.`}
      />
      <Card>
        <CardContent>
          <TenantOwnerAccessForm
            mode="reset"
            defaultValues={{
              tenantId: tenant.id,
              userId: ownerLink.user.id,
              newPassword: "",
              confirmNewPassword: "",
            }}
            action={resetTenantOwnerPasswordAction}
          />
        </CardContent>
      </Card>
    </>
  );
}
