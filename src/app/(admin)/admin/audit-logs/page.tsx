import Link from "next/link";

import { auditLogFiltersSchema } from "@/features/audit/audit-schemas";
import { AuditLogFilterForm } from "@/components/forms/audit-log-filter-form";
import { PageHeading } from "@/components/layout/page-heading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ListToolbar } from "@/components/ui/list-toolbar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TableContainer } from "@/components/ui/table-container";
import { formatDateTime } from "@/lib/formatters";
import { findAuditLogs } from "@/server/repositories/audit-log-repository";
import { findTenantOptions } from "@/server/repositories/tenant-repository";

export const metadata = { title: "Logs de auditoria" };

type SearchParams = {
  tenantId?: string;
  eventType?: string;
  actorType?: string;
  startDate?: string;
  endDate?: string;
};

export default async function AuditLogsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const rawFilters = await searchParams;
  const parsed = auditLogFiltersSchema.safeParse(rawFilters);
  const filters = parsed.success ? parsed.data : {};
  const endDate = filters.endDate ? new Date(`${filters.endDate}T23:59:59.999`) : undefined;

  const [logs, tenants] = await Promise.all([
    findAuditLogs({
      tenantId: filters.tenantId || undefined,
      eventType: filters.eventType || undefined,
      actorType: filters.actorType || undefined,
      startDate: filters.startDate
        ? new Date(`${filters.startDate}T00:00:00`)
        : undefined,
      endDate,
    }),
    findTenantOptions(),
  ]);

  return (
    <>
      <PageHeading
        title="Logs de auditoria"
        description="Consulte eventos administrativos imutáveis."
      />
      <ListToolbar>
        <AuditLogFilterForm
          tenants={tenants}
          defaultValues={{
            tenantId: filters.tenantId ?? "",
            eventType: filters.eventType ?? "",
            actorType: filters.actorType ?? "",
            startDate: filters.startDate ?? "",
            endDate: filters.endDate ?? "",
          }}
        />
      </ListToolbar>

      <Card>
        <CardContent>
          {logs.length ? (
            <TableContainer>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data/hora</TableHead>
                    <TableHead>Evento</TableHead>
                    <TableHead className="hidden md:table-cell">Ator</TableHead>
                    <TableHead className="hidden md:table-cell">Tenant</TableHead>
                    <TableHead className="hidden md:table-cell">Descrição</TableHead>
                    <TableHead className="hidden md:table-cell">IP</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>{formatDateTime(log.createdAt)}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{log.eventType}</Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">{log.actorType}</TableCell>
                      <TableCell className="hidden md:table-cell">{log.tenant?.name ?? "—"}</TableCell>
                      <TableCell className="hidden md:table-cell max-w-md">
                        {log.description}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">{log.ipAddress ?? "—"}</TableCell>
                      <TableCell>
                        <Button asChild variant="ghost" size="sm">
                          <Link href={`/admin/audit-logs/${log.id}`}>
                            Detalhes
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <EmptyState
              icon="scroll"
              title="Nenhum registro encontrado"
              description="Os eventos administrativos e operacionais aparecerão aqui conforme a plataforma for utilizada."
            />
          )}
        </CardContent>
      </Card>
    </>
  );
}
