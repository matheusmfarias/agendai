import Link from "next/link";
import { Plus } from "lucide-react";

import { PageHeading } from "@/components/layout/page-heading";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  TenantTable,
  type TenantTableRow,
} from "@/components/tables/tenant-table";
import { formatDate } from "@/lib/formatters";
import { changeTenantStatusAction } from "@/server/actions/tenant-actions";
import { findAllTenants } from "@/server/repositories/tenant-repository";

export const metadata = { title: "Prestadores" };

export default async function TenantsPage() {
  const tenants = await findAllTenants();
  const rows: TenantTableRow[] = tenants.map((tenant) => ({
    id: tenant.id,
    name: tenant.name,
    slug: tenant.slug,
    responsibleName: tenant.responsibleName,
    whatsapp: tenant.whatsapp,
    segment: tenant.segment,
    location: `${tenant.city}/${tenant.state}`,
    status: tenant.status,
    planName: tenant.subscription?.plan.name ?? "—",
    subscriptionStatus: tenant.subscription?.status ?? null,
    expiresAt: formatDate(tenant.subscription?.expiresAt),
    createdAt: formatDate(tenant.createdAt),
  }));

  return (
    <>
      <PageHeading
        title="Prestadores"
        description="Gerencie os tenants e suas situações operacionais."
        actions={
          <Button asChild>
            <Link href="/admin/tenants/new">
              <Plus className="size-4" />
              Novo prestador
            </Link>
          </Button>
        }
      />
      <Card>
        <CardContent>
          {rows.length ? (
            <TenantTable
              data={rows}
              statusAction={changeTenantStatusAction}
            />
          ) : (
            <EmptyState
              icon="users"
              title="Nenhum prestador cadastrado"
              description="Cadastre o primeiro prestador para liberar painel, serviços e link público."
              action={
                <Button asChild>
                  <Link href="/admin/tenants/new">
                    <Plus className="size-4" />
                    Novo prestador
                  </Link>
                </Button>
              }
            />
          )}
        </CardContent>
      </Card>
    </>
  );
}
