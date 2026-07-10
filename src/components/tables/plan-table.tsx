"use client";

import Link from "next/link";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Pencil } from "lucide-react";

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

export type PlanTableRow = {
  id: string;
  name: string;
  monthlyPrice: string;
  annualPrice: string;
  whatsappEnabled: boolean;
  publicLinkEnabled: boolean;
  isActive: boolean;
  subscriptionsCount: number;
};

const columnHelper = createColumnHelper<PlanTableRow>();
const columns = [
  columnHelper.accessor("name", { header: "Plano" }),
  columnHelper.accessor("monthlyPrice", {
    header: "Mensal",
    meta: { className: "hidden md:table-cell" },
  }),
  columnHelper.accessor("annualPrice", {
    header: "Anual",
    meta: { className: "hidden md:table-cell" },
  }),
  columnHelper.accessor("whatsappEnabled", {
    header: "WhatsApp",
    meta: { className: "hidden md:table-cell" },
    cell: (info) => (
      <Badge variant={info.getValue() ? "success" : "secondary"}>
        {info.getValue() ? "Sim" : "Não"}
      </Badge>
    ),
  }),
  columnHelper.accessor("publicLinkEnabled", {
    header: "Link público",
    meta: { className: "hidden md:table-cell" },
    cell: (info) => (
      <Badge variant={info.getValue() ? "success" : "secondary"}>
        {info.getValue() ? "Sim" : "Não"}
      </Badge>
    ),
  }),
  columnHelper.accessor("subscriptionsCount", {
    header: "Prestadores",
    meta: { className: "hidden md:table-cell" },
  }),
  columnHelper.accessor("isActive", {
    header: "Status",
    cell: (info) => (
      <Badge variant={info.getValue() ? "success" : "outline"}>
        {info.getValue() ? "Ativo" : "Inativo"}
      </Badge>
    ),
  }),
  columnHelper.display({
    id: "actions",
    header: "Ações",
    cell: (info) => (
      <Button asChild variant="ghost" size="icon">
        <Link
          href={`/admin/plans/${info.row.original.id}/edit`}
          title="Editar"
        >
          <Pencil className="size-4" />
        </Link>
      </Button>
    ),
  }),
];

export function PlanTable({ data }: { data: PlanTableRow[] }) {
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
