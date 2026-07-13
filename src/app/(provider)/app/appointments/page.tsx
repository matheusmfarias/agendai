import { cookies } from "next/headers";

import { appointmentFilterSchema } from "@/features/appointments/appointment-schemas";
import { timeDateToMinutes } from "@/features/appointments/appointment-rules";
import { requireProviderOperator } from "@/features/auth/permissions";
import { jsonOptionsToStrings } from "@/features/booking-core/custom-fields";
import { ProviderAgendaView } from "@/features/provider-appointments/provider-agenda-view";
import {
  checkoutAppointmentAction,
  changeAppointmentStatusAction,
  createAppointmentAction,
  updateAppointmentAction,
} from "@/server/actions/appointment-actions";
import {
  createScheduleBlockAction,
  deleteScheduleBlockAction,
  updateScheduleBlockAction,
} from "@/server/actions/provider-actions";
import {
  getAppointment,
  listActiveServiceOptions,
  listAppointments,
} from "@/server/repositories/appointment-repository";
import { listActiveCustomerOptions } from "@/server/repositories/customer-repository";
import {
  listAvailabilityRules,
  listScheduleBlocks,
} from "@/server/repositories/provider-repository";

export const metadata = { title: "Agenda" };

function todayInputValue() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

type AgendaViewMode = "day" | "week" | "month" | "agenda";

const AGENDA_VIEW_MODE_COOKIE_NAME = "agendazap_provider_agenda_view_mode";

type AppointmentStatusValue =
  | "REQUESTED"
  | "CONFIRMED"
  | "WAITING_INFO"
  | "RESCHEDULED"
  | "CANCELED_BY_CUSTOMER"
  | "CANCELED_BY_PROVIDER"
  | "NO_SHOW"
  | "IN_PROGRESS"
  | "FINISHED";

function effectiveStatus(
  status: AppointmentStatusValue,
  endsAt: Date,
): AppointmentStatusValue {
  if (
    endsAt < new Date() &&
    ![
      "CANCELED_BY_CUSTOMER",
      "CANCELED_BY_PROVIDER",
      "NO_SHOW",
      "FINISHED",
    ].includes(status)
  ) {
    return "FINISHED";
  }

  return status;
}

function parseViewMode(value: string | undefined): AgendaViewMode {
  return value === "week" ||
    value === "month" ||
    value === "agenda" ||
    value === "day"
    ? value
    : "day";
}

function isUuid(value: string | undefined) {
  return Boolean(
    value &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        value,
      ),
  );
}

function localDate(value: string) {
  return new Date(`${value}T12:00:00-03:00`);
}

function toInputValue(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function addDays(value: string, amount: number) {
  const date = localDate(value);
  date.setDate(date.getDate() + amount);
  return toInputValue(date);
}

function startOfWeek(value: string) {
  const date = localDate(value);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  return toInputValue(date);
}

function endOfWeek(value: string) {
  return addDays(startOfWeek(value), 6);
}

function startOfMonth(value: string) {
  const date = localDate(value);
  return toInputValue(new Date(date.getFullYear(), date.getMonth(), 1));
}

function endOfMonth(value: string) {
  const date = localDate(value);
  return toInputValue(new Date(date.getFullYear(), date.getMonth() + 1, 0));
}

function appointmentRangeFor(viewMode: AgendaViewMode, selectedDate: string) {
  if (viewMode === "week") {
    return {
      startDate: startOfWeek(selectedDate),
      endDate: endOfWeek(selectedDate),
    };
  }

  if (viewMode === "month") {
    return {
      startDate: startOfMonth(selectedDate),
      endDate: endOfMonth(selectedDate),
    };
  }

  if (viewMode === "agenda") {
    return {
      startDate: selectedDate,
      endDate: addDays(selectedDate, 6),
    };
  }

  return { startDate: selectedDate, endDate: selectedDate };
}

type CheckoutEventLike = {
  id: string;
  createdAt: Date;
  metadata: unknown;
};

function metadataRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function moneyString(value: unknown) {
  return typeof value === "number" || typeof value === "string"
    ? String(value)
    : "0";
}

function checkoutInfoFrom(events: CheckoutEventLike[]) {
  const event = events[0];
  if (!event) return null;

  const metadata = metadataRecord(event.metadata);
  return {
    eventId: event.id,
    paidAt: event.createdAt.toISOString(),
    paymentMethod:
      typeof metadata.paymentMethod === "string"
        ? metadata.paymentMethod
        : "OTHER",
    amount: moneyString(metadata.amount),
    tip: moneyString(metadata.tip),
    discount: moneyString(metadata.discount),
    total: moneyString(metadata.total),
  };
}

export default async function AppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const context = await requireProviderOperator();
  const rawFilters = await searchParams;
  const parsedFilters = appointmentFilterSchema.safeParse(rawFilters);
  const parsed = parsedFilters.success ? parsedFilters.data : {};
  const selectedDate = parsed.startDate ?? todayInputValue();
  const cookieStore = await cookies();
  const storedViewMode = cookieStore.get(AGENDA_VIEW_MODE_COOKIE_NAME)?.value;
  const viewMode = parseViewMode(rawFilters.view ?? storedViewMode);
  const range = appointmentRangeFor(viewMode, selectedDate);
  const selectedAppointmentId = isUuid(rawFilters.appointmentId)
    ? rawFilters.appointmentId
    : undefined;
  const filters = {
    ...parsed,
    startDate: range.startDate,
    endDate: range.endDate,
  };

  const [
    appointments,
    services,
    customers,
    availabilityRules,
    scheduleBlocks,
    selectedAppointment,
  ] = await Promise.all([
    listAppointments(context.tenantId, filters),
    listActiveServiceOptions(context.tenantId),
    listActiveCustomerOptions(context.tenantId),
    listAvailabilityRules(context.tenantId),
    listScheduleBlocks(context.tenantId),
    selectedAppointmentId
      ? getAppointment(context.tenantId, selectedAppointmentId)
      : Promise.resolve(null),
  ]);
  const selectedScheduleBlock =
    rawFilters.blockId
      ? scheduleBlocks.find((block) => block.id === rawFilters.blockId) ?? null
      : null;

  return (
    <ProviderAgendaView
      selectedDate={selectedDate}
      viewMode={viewMode}
      initialStartTime={rawFilters.startTime}
      isCreating={rawFilters.panel === "new"}
      isCreatingScheduleBlock={rawFilters.panel === "block"}
      appointments={appointments.map((appointment) => ({
        id: appointment.id,
        startsAt: appointment.startsAt.toISOString(),
        endsAt: appointment.endsAt.toISOString(),
        status: effectiveStatus(appointment.status, appointment.endsAt),
        origin: appointment.origin,
        estimatedPrice: appointment.estimatedPrice?.toString() ?? null,
        finalPrice: appointment.finalPrice?.toString() ?? null,
        checkout: checkoutInfoFrom(appointment.events),
        customer: {
          name: appointment.customer.name,
          phone: appointment.customer.phone,
        },
        service: {
          name: appointment.service.name,
        },
      }))}
      scheduleBlocks={scheduleBlocks.map((block) => ({
        id: block.id,
        startsAt: block.startsAt.toISOString(),
        endsAt: block.endsAt.toISOString(),
        reason: block.reason,
        createdByName: block.createdBy.name,
      }))}
      workingHours={availabilityRules
        .filter((rule) => rule.isActive)
        .map((rule) => ({
          weekday: rule.weekday,
          startMinutes: timeDateToMinutes(rule.startTime),
          endMinutes: timeDateToMinutes(rule.endTime),
        }))}
      services={services.map((service) => ({
        id: service.id,
        name: service.name,
        durationMinutes: service.durationMinutes,
        priceType: service.priceType,
        priceValue: service.priceValue?.toString() ?? null,
        categoryName: service.category.name,
        categoryActive: service.category.isActive,
        customFields: service.customFields.map((field) => ({
          id: field.id,
          label: field.label,
          fieldType: field.fieldType,
          options: jsonOptionsToStrings(field.options),
          isRequired: field.isRequired,
        })),
      }))}
      customers={customers.map((customer) => ({
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
      }))}
      filters={{
        startDate: filters.startDate,
        endDate: filters.endDate,
        status: filters.status,
        serviceId: filters.serviceId,
        customerId: filters.customerId,
        origin: filters.origin,
      }}
      selectedAppointment={
        selectedAppointment
          ? {
              id: selectedAppointment.id,
              startsAt: selectedAppointment.startsAt.toISOString(),
              endsAt: selectedAppointment.endsAt.toISOString(),
              status: effectiveStatus(
                selectedAppointment.status,
                selectedAppointment.endsAt,
              ),
              origin: selectedAppointment.origin,
              estimatedPrice:
                selectedAppointment.estimatedPrice?.toString() ?? null,
              finalPrice: selectedAppointment.finalPrice?.toString() ?? null,
              checkout: checkoutInfoFrom(
                selectedAppointment.events.filter(
                  (event) => event.eventType === "CHECKOUT_COMPLETED",
                ),
              ),
              customerNotes: selectedAppointment.customerNotes,
              internalNotes: selectedAppointment.internalNotes,
              customer: {
                id: selectedAppointment.customer.id,
                name: selectedAppointment.customer.name,
                phone: selectedAppointment.customer.phone,
                email: selectedAppointment.customer.email,
              },
              service: {
                id: selectedAppointment.service.id,
                name: selectedAppointment.service.name,
                durationMinutes: selectedAppointment.service.durationMinutes,
                categoryName: selectedAppointment.service.category.name,
                categoryActive: selectedAppointment.service.category.isActive,
                priceType: selectedAppointment.service.priceType,
                priceValue: selectedAppointment.service.priceValue?.toString() ?? null,
                customFields: selectedAppointment.service.customFields.map((field) => ({
                  id: field.id,
                  label: field.label,
                  fieldType: field.fieldType,
                  options: jsonOptionsToStrings(field.options),
                  isRequired: field.isRequired,
                })),
              },
              customValues: selectedAppointment.customValues.map((item) => ({
                id: item.id,
                customFieldId: item.customFieldId,
                label: item.customField.label,
                fieldType: item.customField.fieldType,
                value: item.value,
                serviceId: item.customField.serviceId,
                serviceName: item.customField.service.name,
                serviceDurationMinutes: item.customField.service.durationMinutes,
              })),
              events: selectedAppointment.events.map((event) => ({
                id: event.id,
                eventType: event.eventType,
                description: event.description,
                createdAt: event.createdAt.toISOString(),
                metadata: event.metadata,
              })),
              review: selectedAppointment.review
                ? {
                    rating: selectedAppointment.review.rating,
                    comment: selectedAppointment.review.comment,
                    createdAt: selectedAppointment.review.createdAt.toISOString(),
                  }
                : null,
            }
          : null
      }
      highlightAppointmentId={
        rawFilters.highlight === "notification" ? selectedAppointmentId : undefined
      }
      selectedScheduleBlock={
        selectedScheduleBlock
          ? {
              id: selectedScheduleBlock.id,
              startsAt: selectedScheduleBlock.startsAt.toISOString(),
              endsAt: selectedScheduleBlock.endsAt.toISOString(),
              reason: selectedScheduleBlock.reason,
              createdByName: selectedScheduleBlock.createdBy.name,
            }
          : null
      }
      canEditAppointment={context.role === "OWNER" || context.role === "ADMIN"}
      createAction={createAppointmentAction}
      updateAction={updateAppointmentAction}
      statusAction={changeAppointmentStatusAction}
      checkoutAction={checkoutAppointmentAction}
      createScheduleBlockAction={createScheduleBlockAction}
      updateScheduleBlockAction={updateScheduleBlockAction}
      deleteScheduleBlockAction={deleteScheduleBlockAction}
    />
  );
}
