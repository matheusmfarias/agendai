import { NextResponse } from "next/server";

import { financialFiltersSchema } from "@/features/provider-financial/financial-schemas";
import {
  FINANCIAL_METHOD_LABELS,
  FINANCIAL_STATUS_LABELS,
  FINANCIAL_TYPE_LABELS,
} from "@/features/provider-financial/financial-types";
import { requireTenantAccess } from "@/features/auth/permissions";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { getFinancialDashboardData } from "@/server/repositories/financial-repository";

function csvCell(value: string | number | undefined) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function csvRows(rows: Array<Array<string | number | undefined>>) {
  return rows.map((row) => row.map(csvCell).join(";")).join("\n");
}

function xmlCell(value: string | number | undefined) {
  const text = String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

  return `<Cell><Data ss:Type="String">${text}</Data></Cell>`;
}

function xlsWorkbook(rows: Array<Array<string | number | undefined>>) {
  const tableRows = rows
    .map((row) => `<Row>${row.map(xmlCell).join("")}</Row>`)
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Worksheet ss:Name="Financeiro">
    <Table>${tableRows}</Table>
  </Worksheet>
</Workbook>`;
}

function pdfEscape(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function pdfReport(rows: Array<Array<string | number | undefined>>) {
  const lines = rows
    .slice(0, 42)
    .map((row) =>
      row
        .filter((value) => value !== undefined && value !== "")
        .join(" | ")
        .slice(0, 110),
    );
  const stream = [
    "BT",
    "/F1 16 Tf",
    "48 800 Td",
    "(Relatorio financeiro) Tj",
    "/F1 8 Tf",
    "0 -24 Td",
    ...lines.flatMap((line) => [`(${pdfEscape(line)}) Tj`, "0 -14 Td"]),
    "ET",
  ].join("\n");
  const objects = [
    "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj",
    "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj",
    "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj",
    "4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj",
    `5 0 obj << /Length ${Buffer.byteLength(stream)} >> stream\n${stream}\nendstream endobj`,
  ];
  let body = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object) => {
    offsets.push(Buffer.byteLength(body));
    body += `${object}\n`;
  });
  const xrefOffset = Buffer.byteLength(body);
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    body += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  body += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return body;
}

export async function GET(request: Request) {
  const context = await requireTenantAccess();
  const url = new URL(request.url);
  const rawFilters = Object.fromEntries(url.searchParams);
  const parsedFilters = financialFiltersSchema.safeParse(rawFilters);
  const filters = parsedFilters.success
    ? parsedFilters.data
    : { period: "this-month" as const };
  const report = url.searchParams.get("report") ?? url.searchParams.get("view") ?? "summary";
  const format = url.searchParams.get("format") ?? "csv";
  const data = await getFinancialDashboardData(context.tenantId, filters);
  const rows: Array<Array<string | number | undefined>> = [
    [
      "Data",
      "Vencimento",
      "Tipo",
      "Descrição",
      "Cliente",
      "Serviço",
      "Categoria",
      "Método",
      "Status",
      "Valor",
      "Recebido",
      "Em aberto",
      "Agendamento",
    ],
  ];

  const entries =
    report === "pending"
      ? data.pendingPayments
      : report === "expenses"
        ? data.expenses
        : data.transactions;

  entries.forEach((entry) => {
    rows.push([
      formatDate(entry.date),
      entry.dueDate ? formatDate(entry.dueDate) : "",
      FINANCIAL_TYPE_LABELS[entry.type],
      entry.description,
      entry.customer,
      entry.service,
      entry.category,
      FINANCIAL_METHOD_LABELS[entry.method],
      FINANCIAL_STATUS_LABELS[entry.status],
      formatCurrency(entry.amount),
      formatCurrency(entry.paidAmount),
      formatCurrency(entry.outstandingAmount),
      entry.appointmentId,
    ]);
  });

  if (report === "summary" || report === "reports") {
    rows.push([]);
    rows.push(["Indicador", "Valor", "Detalhe"]);
    data.metrics.forEach((metric) => {
      rows.push([
        metric.label,
        metric.valueKind === "currency"
          ? formatCurrency(metric.value)
          : metric.valueKind === "percent"
            ? `${metric.value}%`
            : metric.value,
        metric.helper,
      ]);
    });
  }

  const extension = format === "xls" ? "xls" : format === "pdf" ? "pdf" : "csv";
  const filename = `financeiro-${report}-${filters.period}.${extension}`;

  if (format === "xls") {
    return new NextResponse(xlsWorkbook(rows), {
      headers: {
        "content-type": "application/vnd.ms-excel; charset=utf-8",
        "content-disposition": `attachment; filename="${filename}"`,
      },
    });
  }

  if (format === "pdf") {
    return new NextResponse(pdfReport(rows), {
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `attachment; filename="${filename}"`,
      },
    });
  }

  const body = `\uFEFF${csvRows(rows)}\n`;

  return new NextResponse(body, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
    },
  });
}
