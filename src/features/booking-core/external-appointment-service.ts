import {
  assertAvailability,
  assertNoSlotConflict,
  publicStatusForBookingMode,
} from "@/features/booking-core/availability";
import { validateCustomFields } from "@/features/booking-core/custom-fields";
import {
  enqueueAppointmentConfirmation,
  enqueueAppointmentRequested,
} from "@/features/whatsapp/whatsapp-outbox-service";
import type { Prisma } from "@/generated/prisma/client";

export const EXTERNAL_BOOKING_MESSAGES = {
  DIRECT: "Agendamento confirmado com sucesso.",
  REQUIRES_CONFIRMATION:
    "Sua solicitação foi enviada e aguarda confirmação do prestador.",
  INFORMATIONAL:
    "Sua solicitação foi enviada. O prestador entrará em contato para dar continuidade.",
} as const;

export type ExternalBookingChannel = "PUBLIC_LINK" | "TYPEBOT";

const persistedOriginByChannel = {
  PUBLIC_LINK: "PUBLIC_LINK",
  // WHATSAPP is the historical persisted name for Typebot appointments.
  // Keep the storage value stable while treating Typebot as the input channel.
  TYPEBOT: "WHATSAPP",
} as const;

const externalServiceSelect = {
  id: true,
  name: true,
  durationMinutes: true,
  priceType: true,
  priceValue: true,
  bookingMode: true,
  category: { select: { name: true } },
  customFields: {
    where: { isActive: true },
    orderBy: [{ position: "asc" }, { label: "asc" }],
    select: {
      id: true,
      label: true,
      fieldType: true,
      isRequired: true,
      options: true,
    },
  },
} satisfies Prisma.ServiceSelect;

type ExternalService = Prisma.ServiceGetPayload<{
  select: typeof externalServiceSelect;
}>;

export class ExternalAppointmentError extends Error {
  constructor(
    public readonly code: "SERVICE_UNAVAILABLE" | "VALIDATION_ERROR",
    message: string,
    public readonly fieldErrors?: Record<string, string[]>,
  ) {
    super(message);
    this.name = "ExternalAppointmentError";
  }
}

export type PreparedExternalAppointment = {
  tenantId: string;
  service: ExternalService;
  startsAt: Date;
  endsAt: Date;
  status: "CONFIRMED" | "REQUESTED" | "WAITING_INFO";
  customValues: { customFieldId: string; value: string }[];
};

export async function prepareExternalAppointment(
  tx: Prisma.TransactionClient,
  input: {
    tenantId: string;
    serviceId: string;
    startsAt: Date;
    customFields: Record<string, string>;
  },
): Promise<PreparedExternalAppointment> {
  const service = await tx.service.findFirst({
    where: {
      id: input.serviceId,
      tenantId: input.tenantId,
      isActive: true,
      category: { isActive: true },
    },
    select: externalServiceSelect,
  });
  if (!service) {
    throw new ExternalAppointmentError(
      "SERVICE_UNAVAILABLE",
      "Serviço indisponível para agendamento.",
    );
  }

  const customValues = validateCustomFields(
    service.customFields,
    input.customFields,
  );
  if (!customValues.ok) {
    throw new ExternalAppointmentError(
      "VALIDATION_ERROR",
      "Revise os campos personalizados.",
      customValues.fieldErrors,
    );
  }

  const endsAt = new Date(
    input.startsAt.getTime() + service.durationMinutes * 60_000,
  );
  await assertAvailability(tx, input.tenantId, input.startsAt, endsAt);
  await assertNoSlotConflict(tx, input.tenantId, input.startsAt, endsAt);

  return {
    tenantId: input.tenantId,
    service,
    startsAt: input.startsAt,
    endsAt,
    status: publicStatusForBookingMode(service.bookingMode),
    customValues: customValues.rows,
  };
}

export async function persistExternalAppointment(
  tx: Prisma.TransactionClient,
  input: {
    prepared: PreparedExternalAppointment;
    channel: ExternalBookingChannel;
    customer: { id: string; name: string; phone: string };
    customerUserId?: string;
    customerNotes?: string | null;
  },
) {
  const { prepared, customer } = input;
  const origin = persistedOriginByChannel[input.channel];
  const appointment = await tx.appointment.create({
    data: {
      tenant: { connect: { id: prepared.tenantId } },
      customer: { connect: { id: customer.id } },
      ...(input.customerUserId
        ? { customerUser: { connect: { id: input.customerUserId } } }
        : {}),
      service: { connect: { id: prepared.service.id } },
      origin,
      status: prepared.status,
      startsAt: prepared.startsAt,
      endsAt: prepared.endsAt,
      customerNotes: input.customerNotes ?? null,
      estimatedPrice: prepared.service.priceValue,
    },
  });

  const messageInput = {
    tenantId: prepared.tenantId,
    appointmentId: appointment.id,
    customerName: customer.name,
    customerPhone: customer.phone,
    serviceName: prepared.service.name,
    startsAt: prepared.startsAt,
  };
  if (prepared.status === "CONFIRMED") {
    await enqueueAppointmentConfirmation(tx, messageInput);
  } else if (prepared.status === "REQUESTED") {
    await enqueueAppointmentRequested(tx, messageInput);
  }

  if (prepared.customValues.length) {
    await tx.appointmentCustomValue.createMany({
      data: prepared.customValues.map((row) => ({
        appointmentId: appointment.id,
        customFieldId: row.customFieldId,
        value: row.value,
      })),
    });
  }

  return { appointment, origin, status: prepared.status };
}
