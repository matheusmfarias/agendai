import {
  type ServiceCategoryRow,
  type ServiceCustomField,
  type ServiceDetail,
  type ServiceListRow,
  ProviderServicesView,
} from "@/features/provider-services/provider-services-view";
import { requireProviderManager } from "@/features/auth/permissions";
import {
  createServiceCategoryAction,
  changeCustomFieldStatusAction,
  changeServiceStatusAction,
  createCustomFieldAction,
  createServiceAction,
  updateServiceCategoryAction,
  updateCustomFieldAction,
  updateServiceAction,
} from "@/server/actions/provider-actions";
import {
  getProviderSchedulingDefaults,
  getService,
  listServiceCategories,
  listServices,
} from "@/server/repositories/provider-repository";

export const metadata = { title: "Serviços" };

type ServicesSearchParams = {
  panel?: string;
  serviceId?: string;
  mode?: string;
  field?: string;
  fieldId?: string;
  categoryId?: string;
  success?: string;
};

function mapServiceRow(service: Awaited<ReturnType<typeof listServices>>[number]): ServiceListRow {
  return {
    id: service.id,
    name: service.name,
    description: service.description,
    categoryId: service.categoryId,
    categoryName: service.category.name,
    categoryActive: service.category.isActive,
    durationMinutes: service.durationMinutes,
    priceType: service.priceType,
    priceValue: service.priceValue?.toString() ?? null,
    bookingMode: service.bookingMode,
    requiresManualConfirmation: service.requiresManualConfirmation,
    internalNotes: service.internalNotes,
    position: service.position,
    isActive: service.isActive,
    customFieldsCount: service._count.customFields,
    appointmentsCount: service._count.appointments,
  };
}

function mapCategory(
  category: Awaited<ReturnType<typeof listServiceCategories>>[number],
): ServiceCategoryRow {
  return {
    id: category.id,
    name: category.name,
    description: category.description,
    position: category.position,
    isActive: category.isActive,
    servicesCount: category._count.services,
  };
}

function mapCustomField(
  field: NonNullable<Awaited<ReturnType<typeof getService>>>["customFields"][number],
): ServiceCustomField {
  const options = Array.isArray(field.options)
    ? field.options.filter((item): item is string => typeof item === "string").join("\n")
    : "";

  return {
    id: field.id,
    label: field.label,
    key: field.key,
    fieldType: field.fieldType,
    options,
    isRequired: field.isRequired,
    position: field.position,
    isActive: field.isActive,
  };
}

function mapServiceDetail(
  service: NonNullable<Awaited<ReturnType<typeof getService>>>,
): ServiceDetail {
  return {
    id: service.id,
    name: service.name,
    description: service.description,
    categoryId: service.categoryId,
    categoryName: service.category.name,
    categoryActive: service.category.isActive,
    durationMinutes: service.durationMinutes,
    priceType: service.priceType,
    priceValue: service.priceValue?.toString() ?? null,
    bookingMode: service.bookingMode,
    requiresManualConfirmation: service.requiresManualConfirmation,
    internalNotes: service.internalNotes,
    position: service.position,
    isActive: service.isActive,
    customFieldsCount: service._count.customFields,
    appointmentsCount: service._count.appointments,
    customFields: service.customFields.map(mapCustomField),
    recentAppointments: service.appointments.map((appointment) => ({
      id: appointment.id,
      startsAt: appointment.startsAt.toISOString(),
      status: appointment.status,
      customer: { name: appointment.customer.name },
    })),
  };
}

export default async function ServicesPage({
  searchParams,
}: {
  searchParams: Promise<ServicesSearchParams>;
}) {
  const context = await requireProviderManager();
  const params = await searchParams;
  const [services, categories, selectedServiceRecord, schedulingDefaults] =
    await Promise.all([
    listServices(context.tenantId),
    listServiceCategories(context.tenantId),
    params.serviceId ? getService(context.tenantId, params.serviceId) : null,
    getProviderSchedulingDefaults(context.tenantId),
  ]);
  const categoryRows = categories.map(mapCategory);
  const selectedService = selectedServiceRecord
    ? mapServiceDetail(selectedServiceRecord)
    : null;
  const selectedCategory =
    params.categoryId
      ? (categoryRows.find((category) => category.id === params.categoryId) ?? null)
      : null;
  const selectedField =
    selectedService && params.fieldId
      ? (selectedService.customFields.find((field) => field.id === params.fieldId) ?? null)
      : null;
  const panelMode =
    params.panel === "category"
      ? "category-create"
      : selectedCategory && params.mode === "edit"
        ? "category-edit"
        : params.panel === "new"
          ? "create"
          : selectedService && params.mode === "edit"
            ? "edit"
            : selectedService && params.field === "new"
              ? "field-create"
              : selectedService && selectedField
                ? "field-edit"
                : selectedService
                  ? "detail"
                  : "none";

  return (
    <ProviderServicesView
      rows={services.map(mapServiceRow)}
      categories={categoryRows}
      selectedService={selectedService}
      selectedField={selectedField}
      selectedCategory={selectedCategory}
      defaultAppointmentDuration={
        schedulingDefaults?.defaultAppointmentDuration ?? 30
      }
      panelMode={panelMode}
      success={params.success}
      createAction={createServiceAction}
      updateAction={updateServiceAction}
      statusAction={changeServiceStatusAction}
      createFieldAction={createCustomFieldAction}
      updateFieldAction={updateCustomFieldAction}
      fieldStatusAction={changeCustomFieldStatusAction}
      createCategoryAction={createServiceCategoryAction}
      updateCategoryAction={updateServiceCategoryAction}
    />
  );
}
