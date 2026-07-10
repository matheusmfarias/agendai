"use client";

import Link from "next/link";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Eye, Pencil } from "lucide-react";

import { StatusActionForm } from "@/components/forms/status-action-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TableContainer } from "@/components/ui/table-container";
import {
  getStatusBadgeVariant,
  SUBSCRIPTION_STATUS_LABELS,
  TENANT_STATUS_LABELS,
} from "@/lib/status";
import type { FormActionState } from "@/types/form-state";

export type TenantTableRow = {
  id: string;
  name: string;
  slug: string;
  responsibleName: string;
  whatsapp: string;
  segment: string;
  location: string;
  status: "ACTIVE" | "SUSPENDED" | "CANCELED";
  planName: string;
  subscriptionStatus:
    | "TRIAL"
    | "ACTIVE"
    | "PAST_DUE"
    | "SUSPENDED"
    | "CANCELED"
    | null;
  expiresAt: string;
  createdAt: string;
};

const columnHelper = createColumnHelper<TenantTableRow>();

type StatusAction = (
  previousState: FormActionState,
  formData: FormData,
) => Promise<FormActionState>;

function getColumns(statusAction: StatusAction) {
  return [
    columnHelper.accessor("name", {
      header: "Negócio",
      cell: (info) => (
        <div>
          <p className="font-medium">{info.getValue()}</p>
          <p className="text-xs text-muted-foreground">
            /{info.row.original.slug}
          </p>
        </div>
      ),
    }),
    columnHelper.accessor("responsibleName", {
      header: "Responsável",
      meta: { className: "hidden md:table-cell" },
    }),
    columnHelper.accessor("whatsapp", {
      header: "WhatsApp",
      meta: { className: "hidden md:table-cell" },
    }),
    columnHelper.accessor("segment", {
      header: "Segmento",
      meta: { className: "hidden md:table-cell" },
    }),
    columnHelper.accessor("location", {
      header: "Cidade/UF",
      meta: { className: "hidden md:table-cell" },
    }),
    columnHelper.accessor("status", {
      header: "Status",
      cell: (info) => (
        <Badge variant={getStatusBadgeVariant(info.getValue())}>
          {TENANT_STATUS_LABELS[info.getValue()]}
        </Badge>
      ),
    }),
    columnHelper.accessor("planName", {
      header: "Plano",
      meta: { className: "hidden md:table-cell" },
    }),
    columnHelper.accessor("subscriptionStatus", {
      header: "Assinatura",
      meta: { className: "hidden md:table-cell" },
      cell: (info) => {
        const status = info.getValue();
        return status ? (
          <Badge variant={getStatusBadgeVariant(status)}>
            {SUBSCRIPTION_STATUS_LABELS[status]}
          </Badge>
        ) : (
          "—"
        );
      },
    }),
    columnHelper.accessor("expiresAt", {
      header: "Vencimento",
      meta: { className: "hidden md:table-cell" },
    }),
    columnHelper.accessor("createdAt", {
      header: "Criado em",
      meta: { className: "hidden md:table-cell" },
    }),
    columnHelper.display({
      id: "actions",
      header: "Ações",
      cell: (info) => (
        <div className="flex gap-1">
          <Button asChild variant="ghost" size="icon">
            <Link
              href={`/admin/tenants/${info.row.original.id}`}
              title="Detalhes"
            >
              <Eye className="size-4" />
            </Link>
          </Button>
          <Button asChild variant="ghost" size="icon">
            <Link
              href={`/admin/tenants/${info.row.original.id}/edit`}
              title="Editar"
            >
              <Pencil className="size-4" />
            </Link>
          </Button>
          {info.row.original.status === "ACTIVE" ? (
            <StatusActionForm
              id={info.row.original.id}
              status="SUSPENDED"
              label="Suspender"
              confirmation="Suspender este prestador? O prestador perderá acesso operacional e os canais externos poderão ser bloqueados."
              kind="tenant"
              action={statusAction}
            />
          ) : (
            <StatusActionForm
              id={info.row.original.id}
              status="ACTIVE"
              label="Reativar"
              confirmation="Reativar este prestador? O prestador voltará a ter acesso operacional."
              kind="tenant"
              action={statusAction}
            />
          )}
        </div>
      ),
    }),
  ];
}

// ---------------------------------------------------------------------------
// Mobile card
// ---------------------------------------------------------------------------

function TenantMobileCard({
  row,
  statusAction,
}: {
  row: TenantTableRow;
  statusAction: StatusAction;
}) {
  return (
    <Card className="md:hidden">
      <CardContent className="space-y-3 py-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-medium">{row.name}</p>
            <p className="text-xs text-muted-foreground">/{row.slug}</p>
          </div>
          <Badge variant={getStatusBadgeVariant(row.status)}>
            {TENANT_STATUS_LABELS[row.status]}
          </Badge>
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          <span className="text-muted-foreground">{row.location}</span>
          {row.subscriptionStatus ? (
            <Badge variant={getStatusBadgeVariant(row.subscriptionStatus)}>
              {SUBSCRIPTION_STATUS_LABELS[row.subscriptionStatus]}
            </Badge>
          ) : (
            <span className="text-muted-foreground">Sem assinatura</span>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={`/admin/tenants/${row.id}`}>Ver</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href={`/admin/tenants/${row.id}/edit`}>Editar</Link>
          </Button>
          {row.status === "ACTIVE" ? (
            <StatusActionForm
              id={row.id}
              status="SUSPENDED"
              label="Suspender"
              confirmation="Suspender este prestador? O prestador perderá acesso operacional e os canais externos poderão ser bloqueados."
              kind="tenant"
              action={statusAction}
            />
          ) : (
            <StatusActionForm
              id={row.id}
              status="ACTIVE"
              label="Reativar"
              confirmation="Reativar este prestador? O prestador voltará a ter acesso operacional."
              kind="tenant"
              action={statusAction}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function TenantTable({
  data,
  statusAction,
}: {
  data: TenantTableRow[];
  statusAction: StatusAction;
}) {
  const columns = getColumns(statusAction);
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <>
      {/* Mobile cards */}
      <div className="space-y-3 md:hidden">
        {data.map((row) => (
          <TenantMobileCard
            key={row.id}
            row={row}
            statusAction={statusAction}
          />
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block">
        <TableContainer>
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      className={
                        (header.column.columnDef.meta as { className?: string } | undefined)
                          ?.className
                      }
                    >
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className={
                        (cell.column.columnDef.meta as { className?: string } | undefined)
                          ?.className
                      }
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </div>
    </>
  );
}
