import Link from "next/link";
import { z } from "zod";
import { ArrowLeft } from "lucide-react";

import { PageHeading } from "@/components/layout/page-heading";
import { Button } from "@/components/ui/button";
import { findTenantById } from "@/server/repositories/tenant-repository";

import { getTypebotHealth } from "@/features/typebot/typebot-health-service";

import { TypebotCredentialsClient } from "./client";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function TypebotCredentialsPage({
  params,
}: PageProps) {
  const { id } = await params;
  const parsedId = z.string().uuid().safeParse(id);
  if (!parsedId.success) {
    return (
      <div className="space-y-4">
        <PageHeading title="Credenciais Typebot" description="ID inválido." />
      </div>
    );
  }

  const tenant = await findTenantById(parsedId.data);
  if (!tenant) {
    return (
      <div className="space-y-4">
        <PageHeading title="Credenciais Typebot" description="Prestador não encontrado." />
      </div>
    );
  }

  const health = await getTypebotHealth(tenant.id);

  return (
    <>
      <PageHeading
        title={`Credenciais Typebot — ${tenant.name}`}
        description={`/${tenant.slug}`}
        actions={
          <Button asChild variant="outline">
            <Link href={`/admin/tenants/${tenant.id}`}>
              <ArrowLeft className="size-4" />
              Voltar para o prestador
            </Link>
          </Button>
        }
      />

      <TypebotCredentialsClient
        tenantId={tenant.id}
        tenantName={tenant.name}
        health={health}
      />
    </>
  );
}
