"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  Mail,
  Phone,
  Search,
  UserCheck,
  UsersRound,
  X,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  ContentGrid,
  MetricCard as ModuleMetricCard,
  ModuleToolbar,
} from "@/components/layout/module-page";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  formatCustomerPhone,
  normalizeCustomerPhone,
  normalizeCustomerText,
} from "@/features/customers/customer-normalization";

export type CustomerTableRow = {
  id: string;
  name: string;
  phone: string;
  email: string;
  avatarUrl: string | null;
  avatarVersion: string | null;
  appointmentsCount: number;
  isActive: boolean;
  createdAt: string;
  lastVisit: string;
};

type StatusFilter = "all" | "active" | "inactive" | "withAppointments" | "withoutAppointments";
type SortMode = "name" | "recent" | "frequent" | "lastVisit";

function initials(name: string) {
  const parts = name
    .split(" ")
    .map((part) => part.trim())
    .filter(Boolean);

  return (parts[0]?.[0] ?? "?") + (parts[1]?.[0] ?? "");
}

function pluralize(count: number, singular: string, plural: string) {
  return count === 1 ? singular : plural;
}

function avatarSrc(value: string, version?: string | null) {
  const cacheKey = version ?? value;
  return `${value}${value.includes("?") ? "&" : "?"}v=${encodeURIComponent(cacheKey)}`;
}

function customerHref(id: string) {
  return `/app/customers?customerId=${id}`;
}

function parseBrazilianDate(value: string) {
  const [date] = value.split(",");
  const [day, month, year] = date.split("/").map(Number);
  if (!day || !month || !year) return 0;
  return new Date(year, month - 1, day).getTime();
}

function matchesSearch(row: CustomerTableRow, query: string) {
  const normalizedText = normalizeCustomerText(query);
  const queryDigits = query.replace(/\D/g, "");
  const queryPhone = queryDigits.startsWith("55")
    ? queryDigits.slice(2)
    : queryDigits;
  const rowPhone = normalizeCustomerPhone(row.phone);

  if (queryPhone && rowPhone.includes(queryPhone)) return true;
  if (!normalizedText) return true;

  return [row.name, row.email]
    .map(normalizeCustomerText)
    .some((value) => value.includes(normalizedText));
}

function CustomerListItem({
  row,
  onNavigate,
}: {
  row: CustomerTableRow;
  onNavigate?: (href: string) => void;
}) {
  const href = customerHref(row.id);
  return (
    <Link
      href={href}
      onClick={(event) => {
        if (!onNavigate) return;
        event.preventDefault();
        onNavigate(href);
      }}
      className="group grid gap-3 rounded-2xl border border-border bg-card p-3.5 transition-all hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-md sm:grid-cols-[auto_1fr_auto]"
    >
      <div className="grid size-11 place-items-center overflow-hidden rounded-full bg-primary/10 text-sm font-bold uppercase text-primary">
        {row.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarSrc(row.avatarUrl, row.avatarVersion)}
            alt={row.name}
            className="size-full object-cover"
          />
        ) : (
          initials(row.name)
        )}
      </div>
      <div className="min-w-0 space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-base font-semibold leading-tight">
            {row.name}
          </p>
          {!row.isActive ? <Badge variant="outline">Inativo</Badge> : null}
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Phone className="size-3.5" />
            {row.phone ? formatCustomerPhone(row.phone) : "Sem telefone"}
          </span>
          <span className="inline-flex min-w-0 items-center gap-1.5">
            <Mail className="size-3.5" />
            <span className="truncate">{row.email}</span>
          </span>
        </div>
      </div>
      <div className="flex items-center justify-between gap-4 sm:justify-end">
        <div className="text-left sm:text-right">
          <p className="text-sm font-semibold">
            {row.appointmentsCount}{" "}
            {pluralize(row.appointmentsCount, "agendamento", "agendamentos")}
          </p>
          <p className="text-xs text-muted-foreground">
            Última visita: {row.lastVisit}
          </p>
        </div>
        <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
      </div>
    </Link>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof UsersRound;
  label: string;
  value: string | number;
}) {
  return <ModuleMetricCard label={label} value={value} icon={<Icon className="size-4" />} tone="primary" />;
}

export function CustomerTable({
  data,
  onNavigate,
}: {
  data: CustomerTableRow[];
  onNavigate?: (href: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [sort, setSort] = useState<SortMode>("name");
  const filtered = useMemo(() => {
    return data
      .filter((row) => matchesSearch(row, query))
      .filter((row) => {
        if (filter === "active") return row.isActive;
        if (filter === "inactive") return !row.isActive;
        if (filter === "withAppointments") return row.appointmentsCount > 0;
        if (filter === "withoutAppointments") return row.appointmentsCount === 0;
        return true;
      })
      .sort((first, second) => {
        if (sort === "recent") {
          return parseBrazilianDate(second.createdAt) - parseBrazilianDate(first.createdAt);
        }
        if (sort === "frequent") {
          return second.appointmentsCount - first.appointmentsCount;
        }
        if (sort === "lastVisit") {
          return parseBrazilianDate(second.lastVisit) - parseBrazilianDate(first.lastVisit);
        }
        return first.name.localeCompare(second.name, "pt-BR");
      });
  }, [data, filter, query, sort]);
  const activeCount = data.filter((row) => row.isActive).length;
  const topCustomers = [...data]
    .filter((row) => row.appointmentsCount > 0)
    .sort((first, second) => second.appointmentsCount - first.appointmentsCount)
    .slice(0, 3);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <MetricCard icon={UsersRound} label="Clientes cadastrados" value={data.length} />
        <MetricCard icon={UserCheck} label="Clientes ativos" value={activeCount} />
        <MetricCard
          icon={CalendarDays}
          label="Agendamentos vinculados"
          value={data.reduce((total, row) => total + row.appointmentsCount, 0)}
        />
      </div>

      <ContentGrid>
        <Card className="overflow-hidden py-0">
          <ModuleToolbar className="space-y-3 rounded-none border-x-0 border-t-0 shadow-none">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar por nome, telefone ou e-mail..."
                className="h-10 rounded-xl pl-9 pr-10"
              />
              {query ? (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="absolute right-2 top-1/2 rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  aria-label="Limpar busca"
                >
                  <X className="size-4" />
                </button>
              ) : null}
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <Select
                value={filter}
                onChange={(event) => setFilter(event.target.value as StatusFilter)}
                dropdownStrategy="absolute"
              >
                <option value="all">Todos</option>
                <option value="active">Ativos</option>
                <option value="inactive">Inativos</option>
                <option value="withAppointments">Com agendamento</option>
                <option value="withoutAppointments">Sem agendamento</option>
              </Select>
              <Select
                value={sort}
                onChange={(event) => setSort(event.target.value as SortMode)}
                dropdownStrategy="absolute"
              >
                <option value="name">Ordem alfabética</option>
                <option value="recent">Mais recentes</option>
                <option value="frequent">Mais frequentes</option>
                <option value="lastVisit">Última visita</option>
              </Select>
            </div>
          </ModuleToolbar>
          <CardContent className="space-y-2.5 p-3">
            {filtered.length ? (
              filtered.map((row) => (
                <CustomerListItem
                  key={row.id}
                  row={row}
                  onNavigate={onNavigate}
                />
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-border p-8 text-center">
                <p className="font-semibold">Nenhum cliente encontrado</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Ajuste a busca ou limpe os filtros para ver todos os clientes.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  className="mt-4"
                  onClick={() => {
                    setQuery("");
                    setFilter("all");
                    setSort("name");
                  }}
                >
                  Limpar filtros
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="self-start xl:sticky xl:top-4">
          <CardContent className="space-y-4 p-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Mais frequentes
              </p>
              <h2 className="mt-1 text-lg font-semibold">
                Clientes recorrentes
              </h2>
            </div>
            {topCustomers.length ? (
              <div className="space-y-2.5">
                {topCustomers.map((customer, index) => (
                  <Link
                    key={customer.id}
                    href={customerHref(customer.id)}
                    onClick={(event) => {
                      if (!onNavigate) return;
                      event.preventDefault();
                      onNavigate(customerHref(customer.id));
                    }}
                    className="flex items-center gap-3 rounded-2xl border border-border p-3 transition-colors hover:bg-muted/40"
                  >
                    <span className="grid size-8 place-items-center overflow-hidden rounded-full bg-muted text-xs font-semibold">
                      {customer.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={avatarSrc(customer.avatarUrl, customer.avatarVersion)}
                          alt={customer.name}
                          className="size-full object-cover"
                        />
                      ) : (
                        index + 1
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">
                        {customer.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {customer.appointmentsCount} agendamento(s) · última visita: {customer.lastVisit}
                      </p>
                    </div>
                    <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
                  </Link>
                ))}
              </div>
            ) : (
              <p className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                Os clientes recorrentes aparecem aqui após os primeiros agendamentos.
              </p>
            )}
          </CardContent>
        </Card>
      </ContentGrid>
    </div>
  );
}
