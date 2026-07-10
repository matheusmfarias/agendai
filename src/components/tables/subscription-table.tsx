"use client";

import Link from "next/link";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { CalendarClock, Eye, Pencil, Receipt } from "lucide-react";

import { StatusActionForm } from "@/components/forms/status-action-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
} from "@/lib/status";
import type { FormActionState } from "@/types/form-state";

export type SubscriptionTableRow = {
  id: string;
  tenantName: string;
  planName: string;
  status: "TRIAL" | "ACTIVE" | "PAST_DUE" | "SUSPENDED" | "CANCELED";
  billingCycle: "MONTHLY" | "ANNUAL";
  price: string;
  startsAt: string;
  expiresAt: string;
  lastPaymentAt: string;
  paymentMethod: string;
};

const columnHelper = createColumnHelper<SubscriptionTableRow>();
type StatusAction = (
  previousState: FormActionState,
  formData: FormData,
) => Promise<FormActionState>;

function getColumns(statusAction: StatusAction) {
  return [
    columnHelper.accessor("tenantName", { header: "Prestador" }),
    columnHelper.accessor("planName", {
      header: "Plano",
      meta: { className: "hidden md:table-cell" },
    }),
    columnHelper.accessor("status", {
      header: "Status",
      cell: (info) => (
        <Badge variant={getStatusBadgeVariant(info.getValue())}>
          {SUBSCRIPTION_STATUS_LABELS[info.getValue()]}
        </Badge>
      ),
    }),
    columnHelper.accessor("billingCycle", {
      header: "Ciclo",
      meta: { className: "hidden md:table-cell" },
      cell: (info) => (info.getValue() === "MONTHLY" ? "Mensal" : "Anual"),
    }),
    columnHelper.accessor("price", {
      header: "Valor",
      meta: { className: "hidden md:table-cell" },
    }),
    columnHelper.accessor("startsAt", {
      header: "Início",
      meta: { className: "hidden md:table-cell" },
    }),
    columnHelper.accessor("expiresAt", {
      header: "Vencimento",
      meta: { className: "hidden md:table-cell" },
    }),
    columnHelper.accessor("lastPaymentAt", {
      header: "Último pagamento",
      meta: { className: "hidden md:table-cell" },
    }),
    columnHelper.accessor("paymentMethod", {
      header: "Forma",
      meta: { className: "hidden md:table-cell" },
    }),
    columnHelper.display({
      id: "actions",
      header: "Ações",
      cell: (info) => (
        <div className="flex gap-1">
          <Button asChild variant="ghost" size="icon">
            <Link
              href={`/admin/subscriptions/${info.row.original.id}`}
              title="Detalhes"
            >
              <Eye className="size-4" />
            </Link>
          </Button>
          <Button asChild variant="ghost" size="icon">
            <Link
              href={`/admin/subscriptions/${info.row.original.id}/edit`}
              title="Editar"
            >
              <Pencil className="size-4" />
            </Link>
          </Button>
          <Button asChild variant="ghost" size="icon">
            <Link
              href={`/admin/subscriptions/${info.row.original.id}/payment`}
              title="Registrar pagamento"
            >
              <Receipt className="size-4" />
            </Link>
          </Button>
          <Button asChild variant="ghost" size="icon">
            <Link
              href={`/admin/subscriptions/${info.row.original.id}/expiration`}
              title="Alterar vencimento"
            >
              <CalendarClock className="size-4" />
            </Link>
          </Button>
          {info.row.original.status === "ACTIVE" ? (
            <StatusActionForm
              id={info.row.original.id}
              status="SUSPENDED"
              label="Suspender"
              confirmation="Suspender esta assinatura? Agendamentos externos poderão ser bloqueados."
              kind="subscription"
              action={statusAction}
            />
          ) : (
            <StatusActionForm
              id={info.row.original.id}
              status="ACTIVE"
              label="Reativar"
              confirmation="Reativar esta assinatura? Os bloqueios por vencimento serão removidos."
              kind="subscription"
              action={statusAction}
            />
          )}
        </div>
      ),
    }),
  ];
}

export function SubscriptionTable({
  data,
  statusAction,
}: {
  data: SubscriptionTableRow[];
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
    <TableContainer>
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((group) => (
            <TableRow key={group.id}>
              {group.headers.map((header) => (
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
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
