"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  MessageSquareText,
  Pencil,
  Plus,
  ReceiptText,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { CustomerForm } from "@/components/forms/customer-form";
import { ProviderStatusForm } from "@/components/forms/provider-status-form";
import { PageHeading } from "@/components/layout/page-heading";
import { ModulePage } from "@/components/layout/module-page";
import { PanelShell } from "@/components/layout/panel-shell";
import { SuccessAlert } from "@/components/layout/success-alert";
import {
  CustomerTable,
  type CustomerTableRow,
} from "@/components/tables/customer-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { AppointmentStatusBadge } from "@/features/appointments/appointment-status";
import {
  customerWhatsappHref,
  formatCustomerPhone,
} from "@/features/customers/customer-normalization";
import type { AppointmentStatus } from "@/generated/prisma/client";
import { formatCurrency } from "@/lib/formatters";
import type { FormActionState } from "@/types/form-state";

type CustomerAppointment = {
  id: string;
  startsAt: string;
  status: AppointmentStatus;
  estimatedPrice: string | null;
  finalPrice: string | null;
  service: { name: string };
};

export type CustomerPanelDetail = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  avatarUrl: string | null;
  avatarVersion: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  appointments: CustomerAppointment[];
};

type CustomerFormValues = {
  id?: string;
  name: string;
  phone: string;
  email: string;
  notes: string;
  isActive: boolean;
  avatarUrl?: string | null;
  avatarVersion?: string | null;
};

type ProviderCustomersViewProps = {
  rows: CustomerTableRow[];
  selectedCustomer: CustomerPanelDetail | null;
  panelMode: "none" | "create" | "detail" | "edit";
  success?: string;
  canManage: boolean;
  createAction: (
    state: FormActionState,
    data: FormData,
  ) => Promise<FormActionState>;
  updateAction: (
    state: FormActionState,
    data: FormData,
  ) => Promise<FormActionState>;
  statusAction: (
    state: FormActionState,
    data: FormData,
  ) => Promise<FormActionState>;
};

function initials(name: string) {
  const parts = name.split(" ").filter(Boolean);
  return (parts[0]?.[0] ?? "?") + (parts[1]?.[0] ?? "");
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function appointmentAmount(appointment: CustomerAppointment) {
  return Number(appointment.finalPrice ?? appointment.estimatedPrice ?? 0);
}

function avatarSrc(value: string, version?: string | null) {
  const cacheKey = version ?? value;
  return `${value}${value.includes("?") ? "&" : "?"}v=${encodeURIComponent(cacheKey)}`;
}

function customerHref(params: Record<string, string | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }
  const query = search.toString();
  return query ? `/app/customers?${query}` : "/app/customers";
}

function CustomerDetailPanel({
  customer,
  canManage,
  onEdit,
  statusAction,
}: {
  customer: CustomerPanelDetail;
  canManage: boolean;
  onEdit: () => void;
  statusAction: ProviderCustomersViewProps["statusAction"];
}) {
  const now = new Date();
  const upcoming = customer.appointments.filter(
    (appointment) => new Date(appointment.startsAt) >= now,
  );
  const past = customer.appointments.filter(
    (appointment) => new Date(appointment.startsAt) < now,
  );
  const completedPast = past.filter((appointment) =>
    ["FINISHED", "CONFIRMED"].includes(appointment.status),
  );
  const finished = customer.appointments.filter(
    (appointment) => appointment.status === "FINISHED",
  );
  const canceled = customer.appointments.filter((appointment) =>
    appointment.status.startsWith("CANCELED"),
  );
  const totalRevenue = finished.reduce(
    (total, appointment) => total + appointmentAmount(appointment),
    0,
  );
  const nextVisit = upcoming.at(-1)?.startsAt;
  const lastVisit = completedPast[0]?.startsAt;
  const whatsappUrl = customerWhatsappHref(customer.phone);

  return (
    <div className="space-y-5">
      <div className="rounded-3xl bg-gradient-to-br from-primary/12 via-primary/5 to-transparent p-4 text-center">
        <div className="mx-auto grid size-20 place-items-center overflow-hidden rounded-full bg-background text-2xl font-bold uppercase text-primary shadow-lg">
          {customer.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarSrc(customer.avatarUrl, customer.avatarVersion)}
              alt={customer.name}
              className="size-full object-cover"
            />
          ) : (
            initials(customer.name)
          )}
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
          <h3 className="text-xl font-semibold">{customer.name}</h3>
          <Badge variant={customer.isActive ? "success" : "outline"}>
            {customer.isActive ? "Ativo" : "Inativo"}
          </Badge>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Cliente desde {formatDate(customer.createdAt)}
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {whatsappUrl ? (
            <Button asChild variant="outline" size="sm">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageSquareText className="size-4" />
                WhatsApp
              </a>
            </Button>
          ) : (
            <span className="rounded-full border border-dashed border-border px-3 py-2 text-xs text-muted-foreground">
              Sem telefone válido para WhatsApp
            </span>
          )}
          {canManage ? (
            <Button type="button" size="sm" onClick={onEdit}>
              <Pencil className="size-4" />
              Editar
            </Button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Card className="py-3">
          <CardContent className="flex items-center gap-3 px-4">
            <CalendarDays className="size-5 text-primary" />
            <div>
              <p className="text-xl font-semibold">
                {customer.appointments.length}
              </p>
              <p className="text-xs text-muted-foreground">Agendamentos</p>
            </div>
          </CardContent>
        </Card>
        <Card className="py-3">
          <CardContent className="flex items-center gap-3 px-4">
            <ReceiptText className="size-5 text-primary" />
            <div>
              <p className="text-xl font-semibold">
                {formatCurrency(totalRevenue)}
              </p>
              <p className="text-xs text-muted-foreground">Receita finalizada</p>
            </div>
          </CardContent>
        </Card>
        <Card className="py-3">
          <CardContent className="flex items-center gap-3 px-4">
            <ShieldCheck className="size-5 text-primary" />
            <div>
              <p className="text-xl font-semibold">{canceled.length}</p>
              <p className="text-xs text-muted-foreground">Cancelamentos</p>
            </div>
          </CardContent>
        </Card>
        <Card className="py-3">
          <CardContent className="flex items-center gap-3 px-4">
            <Sparkles className="size-5 text-primary" />
            <div>
              <p className="text-xl font-semibold">{formatDate(lastVisit)}</p>
              <p className="text-xs text-muted-foreground">Última visita</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-3 rounded-2xl bg-muted/35 p-2 sm:grid-cols-2">
        <div className="rounded-xl bg-background px-4 py-3 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Próximo
          </p>
          <p className="mt-1 font-semibold">
            {nextVisit ? formatDateTime(nextVisit) : "Nenhum agendado"}
          </p>
        </div>
        <div className="rounded-xl bg-background px-4 py-3 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Anteriores
          </p>
          <p className="mt-1 font-semibold">{past.length} registro(s)</p>
        </div>
      </div>

      <div className="rounded-3xl border border-border p-4">
        <p className="mb-3 flex items-center gap-2 font-semibold">
          <MessageSquareText className="size-4" />
          Observações internas
        </p>
        <p className="whitespace-pre-wrap text-sm text-muted-foreground">
          {customer.notes || "Nenhuma observação registrada."}
        </p>
      </div>

      <div className="rounded-3xl border border-border p-4">
        <p className="mb-3 font-semibold">Histórico de agendamentos</p>
        {customer.appointments.length ? (
          <div className="max-h-[24rem] space-y-3 overflow-y-auto pr-1">
            {customer.appointments.map((appointment) => (
              <Link
                key={appointment.id}
                href={`/app/appointments?appointmentId=${appointment.id}`}
                className="grid gap-2 rounded-2xl border border-border p-3 transition-colors hover:bg-muted/35"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{appointment.service.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDateTime(appointment.startsAt)}
                    </p>
                  </div>
                  <AppointmentStatusBadge status={appointment.status} />
                </div>
                <p className="text-sm font-semibold">
                  {formatCurrency(appointmentAmount(appointment))}
                </p>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Ainda não há agendamentos para este cliente.
          </p>
        )}
      </div>

      {canManage ? (
        <div className="rounded-3xl border border-border p-4">
          <p className="mb-3 font-semibold">Status do cliente</p>
          <p className="mb-3 text-sm text-muted-foreground">
            {customer.isActive
              ? "Cliente ativo e disponível para novos agendamentos."
              : "Cliente inativo. Histórico preservado, mas indisponível para novos agendamentos."}
          </p>
          <ProviderStatusForm
            id={customer.id}
            isActive={customer.isActive}
            action={statusAction}
            destructive={customer.isActive}
            confirmMessage={
              customer.isActive
                ? "Inativar este cliente? O histórico será preservado, mas ele deixará de aparecer para novos agendamentos manuais."
                : undefined
            }
            returnTo={customerHref({ customerId: customer.id })}
          />
        </div>
      ) : null}
    </div>
  );
}

export function ProviderCustomersView({
  rows,
  selectedCustomer,
  panelMode,
  success,
  canManage,
  createAction,
  updateAction,
  statusAction,
}: ProviderCustomersViewProps) {
  const router = useRouter();

  function navigate(href: string) {
    router.push(href, { scroll: false });
  }

  function closePanel() {
    router.push("/app/customers", { scroll: false });
  }

  const createDefaults: CustomerFormValues = {
    name: "",
    phone: "",
    email: "",
    notes: "",
    isActive: true,
  };

  const editDefaults: CustomerFormValues | null = selectedCustomer
    ? {
        id: selectedCustomer.id,
        name: selectedCustomer.name,
        phone: formatCustomerPhone(selectedCustomer.phone),
        email: selectedCustomer.email ?? "",
        avatarUrl: selectedCustomer.avatarUrl,
        avatarVersion: selectedCustomer.avatarVersion,
        notes: selectedCustomer.notes ?? "",
        isActive: selectedCustomer.isActive,
      }
    : null;

  return (
    <ModulePage>
      <PageHeading
        title="Clientes"
        description="Centralize clientes manuais e clientes vindos do link público, com histórico e contato rápido."
        actions={
          <Button type="button" onClick={() => navigate(customerHref({ panel: "new" }))}>
            <Plus className="size-4" />
            Novo cliente
          </Button>
        }
      />
      <SuccessAlert code={success} context="customer" />
      {rows.length ? (
        <CustomerTable data={rows} onNavigate={navigate} />
      ) : (
        <EmptyState
          icon="users"
          title="Nenhum cliente encontrado"
          description="Clientes aparecem aqui quando você cria um agendamento manual ou quando eles usam seu link público."
          action={
            <Button
              type="button"
              onClick={() => navigate(customerHref({ panel: "new" }))}
            >
              <Plus className="size-4" />
              Novo cliente
            </Button>
          }
        />
      )}

      {panelMode === "create" ? (
        <PanelShell
          key="new-customer"
          title="Novo cliente"
          subtitle="Cadastro rápido sem sair da lista"
          onClose={closePanel}
        >
          <CustomerForm
            mode="create"
            action={createAction}
            defaultValues={createDefaults}
            returnTo="/app/customers"
          />
        </PanelShell>
      ) : null}

      {selectedCustomer && panelMode === "detail" ? (
        <PanelShell
          key={`detail-${selectedCustomer.id}-${selectedCustomer.avatarVersion ?? ""}`}
          title={selectedCustomer.name}
          subtitle={`${selectedCustomer.isActive ? "Cliente ativo" : "Cliente inativo"} · ${formatCustomerPhone(selectedCustomer.phone)}`}
          onClose={closePanel}
        >
          <CustomerDetailPanel
            customer={selectedCustomer}
            canManage={canManage}
            statusAction={statusAction}
            onEdit={() =>
              navigate(
                customerHref({ customerId: selectedCustomer.id, mode: "edit" }),
              )
            }
          />
        </PanelShell>
      ) : null}

      {selectedCustomer && panelMode === "edit" && editDefaults ? (
        <PanelShell
          key={`edit-${selectedCustomer.id}-${selectedCustomer.avatarVersion ?? ""}`}
          title="Editar cliente"
          subtitle={selectedCustomer.name}
          onClose={closePanel}
        >
          <div className="mb-4">
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                navigate(customerHref({ customerId: selectedCustomer.id }))
              }
            >
              <ArrowLeft className="size-4" />
              Voltar ao perfil
            </Button>
          </div>
          <CustomerForm
            key={`form-${editDefaults.id}-${editDefaults.avatarVersion ?? ""}`}
            mode="edit"
            action={updateAction}
            defaultValues={editDefaults}
            returnTo={customerHref({ customerId: selectedCustomer.id })}
          />
        </PanelShell>
      ) : null}
    </ModulePage>
  );
}
