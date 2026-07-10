import {
  type CustomerPanelDetail,
  ProviderCustomersView,
} from "@/features/provider-customers/provider-customers-view";
import { requireProviderOperator } from "@/features/auth/permissions";
import { formatDate } from "@/lib/formatters";
import {
  getCustomer,
  listCustomers,
} from "@/server/repositories/customer-repository";
import {
  changeCustomerStatusAction,
  createCustomerAction,
  updateCustomerAction,
} from "@/server/actions/customer-actions";
import type { CustomerTableRow } from "@/components/tables/customer-table";

export const metadata = { title: "Clientes" };

type CustomersPageSearchParams = {
  panel?: string;
  customerId?: string;
  mode?: string;
  success?: string;
  refresh?: string;
};

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<CustomersPageSearchParams>;
}) {
  const context = await requireProviderOperator();
  const params = await searchParams;
  const [customers, selectedCustomer] = await Promise.all([
    listCustomers(context.tenantId),
    params.customerId ? getCustomer(context.tenantId, params.customerId) : null,
  ]);
  const rows: CustomerTableRow[] = customers.map((customer) => ({
    id: customer.id,
    name: customer.name,
    phone: customer.phone,
    email: customer.email ?? "—",
    avatarUrl: customer.avatarUrl ?? customer.user?.avatarUrl ?? null,
    avatarVersion:
      customer.avatarFileKey ?? customer.user?.avatarFileKey ?? null,
    appointmentsCount: customer._count.appointments,
    isActive: customer.isActive,
    createdAt: formatDate(customer.createdAt),
    lastVisit: formatDate(customer.appointments[0]?.startsAt),
  }));
  const detail: CustomerPanelDetail | null = selectedCustomer
    ? {
        id: selectedCustomer.id,
        name: selectedCustomer.name,
        phone: selectedCustomer.phone,
        email: selectedCustomer.email,
        avatarUrl:
          selectedCustomer.avatarUrl ?? selectedCustomer.user?.avatarUrl ?? null,
        avatarVersion:
          selectedCustomer.avatarFileKey ??
          selectedCustomer.user?.avatarFileKey ??
          null,
        notes: selectedCustomer.notes,
        isActive: selectedCustomer.isActive,
        createdAt: selectedCustomer.createdAt.toISOString(),
        appointments: selectedCustomer.appointments.map((appointment) => ({
          id: appointment.id,
          startsAt: appointment.startsAt.toISOString(),
          status: appointment.status,
          estimatedPrice: appointment.estimatedPrice?.toString() ?? null,
          finalPrice: appointment.finalPrice?.toString() ?? null,
          service: { name: appointment.service.name },
        })),
      }
    : null;
  const panelMode =
    params.panel === "new"
      ? "create"
      : detail && params.mode === "edit"
        ? "edit"
        : detail
          ? "detail"
          : "none";

  return (
    <ProviderCustomersView
      rows={rows}
      selectedCustomer={detail}
      panelMode={panelMode}
      success={params.success}
      canManage={context.role === "OWNER" || context.role === "ADMIN"}
      createAction={createCustomerAction}
      updateAction={updateCustomerAction}
      statusAction={changeCustomerStatusAction}
    />
  );
}
