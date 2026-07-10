import { notFound } from "next/navigation";
import { z } from "zod";

import { PageHeading } from "@/components/layout/page-heading";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatDateTime } from "@/lib/formatters";
import { findAuditLogById } from "@/server/repositories/audit-log-repository";

export default async function AuditLogDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const parsedId = z.string().uuid().safeParse(id);
  if (!parsedId.success) notFound();
  const log = await findAuditLogById(parsedId.data);
  if (!log) notFound();

  return (
    <>
      <PageHeading
        title={log.eventType}
        description="Detalhe imutável do evento de auditoria."
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Evento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <Detail label="Descrição" value={log.description} />
            <Detail label="Ator" value={log.actorType} />
            <Detail label="Actor ID" value={log.actorId ?? "—"} />
            <Detail label="Tenant" value={log.tenant?.name ?? "—"} />
            <Detail label="Tenant ID" value={log.tenantId ?? "—"} />
            <Detail label="IP" value={log.ipAddress ?? "—"} />
            <Detail label="Criado em" value={formatDateTime(log.createdAt)} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Metadata</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="overflow-x-auto rounded-lg bg-muted p-4 text-xs">
              {JSON.stringify(log.metadata, null, 2) ?? "null"}
            </pre>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 break-all font-medium">{value}</p>
    </div>
  );
}
