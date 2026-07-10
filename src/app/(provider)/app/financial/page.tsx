import { requireTenantAccess } from "@/features/auth/permissions";
import { financialFiltersSchema } from "@/features/provider-financial/financial-schemas";
import { ProviderFinancialView } from "@/features/provider-financial/provider-financial-view";
import {
  cancelFinancialEntryAction,
  checkoutFinancialAppointmentAction,
  createFinancialEntryAction,
  refundFinancialEntryAction,
  registerFinancialPaymentAction,
  updateFinancialEntryAction,
  updateFinancialSettingsAction,
} from "@/server/actions/financial-actions";
import { listActiveServiceOptions } from "@/server/repositories/appointment-repository";
import { listActiveCustomerOptions } from "@/server/repositories/customer-repository";
import { getFinancialDashboardData } from "@/server/repositories/financial-repository";

export const metadata = { title: "Financeiro" };

export default async function FinancialPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const context = await requireTenantAccess();
  const rawFilters = await searchParams;
  const parsedFilters = financialFiltersSchema.safeParse(rawFilters);
  const filters = parsedFilters.success
    ? parsedFilters.data
    : { period: "this-month" as const };
  const [data, customers, services] = await Promise.all([
    getFinancialDashboardData(context.tenantId, filters),
    listActiveCustomerOptions(context.tenantId),
    listActiveServiceOptions(context.tenantId),
  ]);

  return (
    <ProviderFinancialView
      data={data}
      customers={customers.map((customer) => ({
        id: customer.id,
        name: customer.name,
      }))}
      services={services.map((service) => ({
        id: service.id,
        name: service.name,
      }))}
      createAction={createFinancialEntryAction}
      updateAction={updateFinancialEntryAction}
      cancelAction={cancelFinancialEntryAction}
      registerPaymentAction={registerFinancialPaymentAction}
      refundAction={refundFinancialEntryAction}
      checkoutAction={checkoutFinancialAppointmentAction}
      updateSettingsAction={updateFinancialSettingsAction}
      initialFilters={filters}
    />
  );
}
