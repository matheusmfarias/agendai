import Link from "next/link";
import { z } from "zod";
import { ArrowLeft } from "lucide-react";

import { PageHeading } from "@/components/layout/page-heading";
import { SuccessAlert } from "@/components/layout/success-alert";
import { Button } from "@/components/ui/button";
import { findTenantById } from "@/server/repositories/tenant-repository";
import { listSegmentTemplates } from "@/features/segment-templates/segment-template-service";

import { SegmentTemplateClient } from "./client";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ success?: string }>;
};

export default async function SegmentTemplatePage({
  params,
  searchParams,
}: PageProps) {
  const { id } = await params;
  const { success } = await searchParams;
  const parsedId = z.string().uuid().safeParse(id);
  if (!parsedId.success) {
    return (
      <div className="space-y-4">
        <PageHeading title="Templates de segmento" description="ID inválido." />
      </div>
    );
  }

  const tenant = await findTenantById(parsedId.data);
  if (!tenant) {
    return (
      <div className="space-y-4">
        <PageHeading
          title="Templates de segmento"
          description="Prestador não encontrado."
        />
      </div>
    );
  }

  const templates = listSegmentTemplates();

  return (
    <>
      <PageHeading
        title={`Templates de segmento — ${tenant.name}`}
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

      <SuccessAlert code={success} context="tenant" />

      <SegmentTemplateClient
        tenantId={tenant.id}
        tenantName={tenant.name}
        tenantSegment={tenant.segment ?? undefined}
        templates={templates}
      />
    </>
  );
}
