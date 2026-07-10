"use client";

import Link from "next/link";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";

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

export type AppointmentTableRow = {
  id: string;
  startsAt: string;
  customerName: string;
  customerPhone: string;
  serviceName: string;
  origin: string;
  status: string;
  statusTone: "success" | "destructive" | "warning" | "outline";
  estimatedPrice: string;
  createdAt: string;
};

const columnHelper = createColumnHelper<AppointmentTableRow>();
const columns = [
  columnHelper.accessor("startsAt", { header: "Data/hora" }),
  columnHelper.accessor("customerName", { header: "Cliente" }),
  columnHelper.accessor("customerPhone", {
    header: "Telefone",
    meta: { className: "hidden md:table-cell" },
  }),
  columnHelper.accessor("serviceName", {
    header: "Serviço",
    meta: { className: "hidden md:table-cell" },
  }),
  columnHelper.accessor("origin", {
    header: "Origem",
    meta: { className: "hidden md:table-cell" },
  }),
  columnHelper.accessor("status", {
    header: "Status",
    cell: (info) => (
      <Badge variant={info.row.original.statusTone}>{info.getValue()}</Badge>
    ),
  }),
  columnHelper.accessor("estimatedPrice", {
    header: "Valor estimado",
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
      <Button asChild variant="ghost" size="sm">
        <Link
          href={`/app/appointments/${info.row.original.id}`}
        >
          Ver
        </Link>
      </Button>
    ),
  }),
];

// ---------------------------------------------------------------------------
// Mobile card
// ---------------------------------------------------------------------------

function AppointmentMobileCard({ row }: { row: AppointmentTableRow }) {
  return (
    <Card className="md:hidden">
      <CardContent className="space-y-3 py-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-medium">{row.customerName}</p>
            <p className="text-sm text-muted-foreground">{row.serviceName}</p>
          </div>
          <Badge variant={row.statusTone}>{row.status}</Badge>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <span>{row.startsAt}</span>
          <span>{row.origin}</span>
        </div>

        <Button asChild variant="outline" size="sm">
          <Link href={`/app/appointments/${row.id}`}>Ver</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function AppointmentTable({
  data,
}: {
  data: AppointmentTableRow[];
}) {
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
          <AppointmentMobileCard key={row.id} row={row} />
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block">
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
