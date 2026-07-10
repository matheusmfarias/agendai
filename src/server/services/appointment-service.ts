import { AUDIT_EVENTS } from "@/features/audit/audit-events";
import {
  BLOCKING_APPOINTMENT_STATUSES,
  calculateAppointmentEnd,
  canTransitionAppointmentStatus,
  isWithinRecurringAvailability,
  timeDateToMinutes,
} from "@/features/appointments/appointment-rules";
import type {
  CheckoutAppointmentInput,
  CreateAppointmentInput,
  UpdateAppointmentInput,
} from "@/features/appointments/appointment-schemas";
import { validateCustomFields } from "@/features/booking-core/custom-fields";
import type { OperationalActorContext } from "@/server/services/customer-service";
import {
  getSubscriptionPolicy,
} from "@/features/subscriptions/subscription-policy";
import {
  AppointmentStatus,
  Prisma,
} from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

function auditData(
  actor: OperationalActorContext,
  eventType: string,
  description: string,
  metadata?: Prisma.InputJsonValue,
): Prisma.AuditLogUncheckedCreateInput {
  return {
    tenantId: actor.tenantId,
    actorType: "TENANT_USER",
    actorId: actor.actorId,
    eventType,
    description,
    metadata,
    ipAddress: actor.ipAddress,
  };
}

async function validateAppointmentSlot(
  tx: Prisma.TransactionClient,
  input: {
    customerId: string;
    serviceId: string;
    startsAt: Date;
    allowOutsideAvailability: boolean;
    allowConcurrentAppointment: boolean;
    durationMinutesOverride?: number;
    excludeAppointmentId?: string;
  },
  actor: OperationalActorContext,
) {
  const [customer, service] = await Promise.all([
    tx.customer.findFirst({
      where: {
        id: input.customerId,
        tenantId: actor.tenantId,
        isActive: true,
      },
      select: { id: true, name: true },
    }),
    tx.service.findFirst({
      where: {
        id: input.serviceId,
        tenantId: actor.tenantId,
        isActive: true,
      },
      include: {
        category: { select: { name: true, isActive: true } },
        customFields: {
          where: { isActive: true },
          orderBy: [{ position: "asc" }, { label: "asc" }],
        },
      },
    }),
  ]);

  if (!customer) {
    throw new Error("Selecione um cliente ativo deste prestador.");
  }
  if (!service) {
    throw new Error("Selecione um serviço ativo deste prestador.");
  }

  const endsAt = calculateAppointmentEnd(
    input.startsAt,
    input.durationMinutesOverride ?? service.durationMinutes,
  );

  const [conflict, scheduleBlock, availabilityRules] = await Promise.all([
    input.allowConcurrentAppointment
      ? Promise.resolve(null)
      : tx.appointment.findFirst({
          where: {
            tenantId: actor.tenantId,
            status: { in: BLOCKING_APPOINTMENT_STATUSES },
            startsAt: { lt: endsAt },
            endsAt: { gt: input.startsAt },
            ...(input.excludeAppointmentId
              ? { id: { not: input.excludeAppointmentId } }
              : {}),
          },
          select: { id: true, startsAt: true, endsAt: true },
        }),
    tx.scheduleBlock.findFirst({
      where: {
        tenantId: actor.tenantId,
        startsAt: { lt: endsAt },
        endsAt: { gt: input.startsAt },
      },
      select: { id: true, reason: true },
    }),
    input.allowOutsideAvailability
      ? Promise.resolve([])
      : tx.availabilityRule.findMany({
          where: { tenantId: actor.tenantId, isActive: true },
          select: {
            weekday: true,
            startTime: true,
            endTime: true,
          },
        }),
  ]);

  if (conflict) {
    throw new Error("Já existe um agendamento conflitante neste horário.");
  }
  if (scheduleBlock) {
    throw new Error(
      `O horário cruza um bloqueio de agenda: ${scheduleBlock.reason}.`,
    );
  }
  if (
    !input.allowOutsideAvailability &&
    !isWithinRecurringAvailability(
      input.startsAt,
      endsAt,
      availabilityRules.map((rule) => ({
        weekday: rule.weekday,
        startMinutes: timeDateToMinutes(rule.startTime),
        endMinutes: timeDateToMinutes(rule.endTime),
      })),
    )
  ) {
    throw new Error(
      "O horário não cabe integralmente na disponibilidade configurada. Marque o encaixe manual para prosseguir fora dela.",
    );
  }

  return { customer, service, endsAt };
}

function validateAppointmentCustomValues(
  customFieldsToValidate: {
    id: string;
    label: string;
    fieldType: string;
    isRequired: boolean;
    options: Prisma.JsonValue | null;
  }[],
  customFields: Record<string, string>,
) {
  const result = validateCustomFields(
    customFieldsToValidate.map((field) => ({
      id: field.id,
      label: field.label,
      fieldType: field.fieldType,
      isRequired: field.isRequired,
      options: field.options,
    })),
    customFields,
  );

  if (!result.ok) {
    const error = new Error("Revise os campos personalizados.");
    Object.assign(error, { fieldErrors: result.fieldErrors });
    throw error;
  }

  return result.rows;
}

async function getExtraServicesForCustomFields(
  tx: Prisma.TransactionClient,
  actor: OperationalActorContext,
  serviceIds: string[],
) {
  const uniqueIds = Array.from(new Set(serviceIds)).filter(Boolean);
  if (!uniqueIds.length) return [];

  const services = await tx.service.findMany({
    where: {
      tenantId: actor.tenantId,
      id: { in: uniqueIds },
      isActive: true,
    },
    select: {
      id: true,
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
    },
  });

  if (services.length !== uniqueIds.length) {
    throw new Error("Um dos serviços adicionais selecionados não está disponível.");
  }

  return services;
}

export async function createAppointment(
  input: CreateAppointmentInput,
  actor: OperationalActorContext,
) {
  // Subscription enforcement: block manual creation at >15 days overdue
  const tenant = await prisma.tenant.findUnique({
    where: { id: actor.tenantId },
    select: {
      status: true,
      subscription: {
        select: {
          status: true,
          expiresAt: true,
          plan: { select: { publicLinkEnabled: true, whatsappEnabled: true } },
        },
      },
    },
  });

  if (tenant) {
    const policy = getSubscriptionPolicy({
      tenantStatus: tenant.status,
      subscription: tenant.subscription
        ? {
            status: tenant.subscription.status,
            expiresAt: tenant.subscription.expiresAt,
            plan: {
              publicLinkEnabled: tenant.subscription.plan.publicLinkEnabled,
              whatsappEnabled: tenant.subscription.plan.whatsappEnabled,
            },
          }
        : null,
    });

    if (!policy.canCreateManualAppointment) {
      await prisma.auditLog.create({
        data: {
          tenantId: actor.tenantId,
          actorType: "TENANT_USER",
          actorId: actor.actorId,
          eventType: "SUBSCRIPTION_ENFORCEMENT_BLOCKED_MANUAL_APPOINTMENT",
          description:
            "Tentativa de criação manual de agendamento bloqueada por política de assinatura.",
          metadata: {
            tenantId: actor.tenantId,
            channel: "MANUAL_PANEL",
            policyStatus: policy.status,
            daysOverdue: policy.daysOverdue,
          },
          ipAddress: actor.ipAddress,
        },
      });

      throw new Error(
        "Não é possível criar novos agendamentos enquanto a assinatura estiver bloqueada.",
      );
    }
  }

  return prisma.$transaction(
    async (tx) => {
      const { customer, service, endsAt } = await validateAppointmentSlot(
        tx,
        input,
        actor,
      );
      const extraServices = await getExtraServicesForCustomFields(
        tx,
        actor,
        input.extraServiceIds.filter((id) => id !== service.id),
      );
      const customRows = validateAppointmentCustomValues(
        [
          ...service.customFields,
          ...extraServices.flatMap((item) => item.customFields),
        ],
        input.customFields,
      );
      const appointment = await tx.appointment.create({
        data: {
          tenantId: actor.tenantId,
          customerId: customer.id,
          serviceId: service.id,
          origin: "MANUAL_PANEL",
          status: input.status,
          startsAt: input.startsAt,
          endsAt,
          customerNotes: input.customerNotes,
          internalNotes: input.internalNotes,
          estimatedPrice: input.estimatedPrice ?? service.priceValue,
          createdByUserId: actor.actorId,
        },
      });
      if (customRows.length) {
        await tx.appointmentCustomValue.createMany({
          data: customRows.map((row) => ({
            appointmentId: appointment.id,
            customFieldId: row.customFieldId,
            value: row.value,
          })),
        });
      }
      const metadata = {
        appointmentId: appointment.id,
        customerId: customer.id,
        serviceId: service.id,
        startsAt: appointment.startsAt.toISOString(),
        endsAt: appointment.endsAt.toISOString(),
        status: appointment.status,
        origin: appointment.origin,
        manualFit: input.allowOutsideAvailability,
        concurrentFit: input.allowConcurrentAppointment,
        durationMinutes: input.durationMinutesOverride ?? service.durationMinutes,
      };
      await tx.appointmentEvent.create({
        data: {
          tenantId: actor.tenantId,
          appointmentId: appointment.id,
          actorType: "TENANT_USER",
          actorId: actor.actorId,
          eventType: "CREATED",
          description: `Agendamento criado manualmente para ${customer.name}.`,
          metadata,
        },
      });
      await tx.auditLog.create({
        data: auditData(
          actor,
          AUDIT_EVENTS.APPOINTMENT_CREATED,
          `Agendamento de "${customer.name}" para "${service.name}" criado.`,
          metadata,
        ),
      });
      return appointment;
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}

export async function updateAppointment(
  input: UpdateAppointmentInput,
  actor: OperationalActorContext,
) {
  return prisma.$transaction(
    async (tx) => {
      const current = await tx.appointment.findFirst({
        where: { id: input.id, tenantId: actor.tenantId },
      });
      if (!current) throw new Error("Agendamento n?o encontrado.");
      if (
        ["CANCELED_BY_CUSTOMER", "CANCELED_BY_PROVIDER", "NO_SHOW"].includes(
          current.status,
        )
      ) {
        throw new Error(
          "Agendamentos cancelados ou marcados como falta n?o podem ser editados.",
        );
      }

      let customer: { id: string; name: string };
      let service: {
        id: string;
        name: string;
        durationMinutes: number;
        priceValue: Prisma.Decimal | null;
        customFields: {
          id: string;
          label: string;
          fieldType: string;
          isRequired: boolean;
          options: Prisma.JsonValue | null;
        }[];
      };
      let endsAt = current.endsAt;
      let startsAt = current.startsAt;

      if (current.status === "FINISHED") {
        if (input.status && !["FINISHED", "NO_SHOW"].includes(input.status)) {
          throw new Error(
            "Agendamentos finalizados s? podem permanecer finalizados ou virar n?o comparecimento.",
          );
        }

        const [foundCustomer, foundService] = await Promise.all([
          tx.customer.findFirst({
            where: { id: input.customerId, tenantId: actor.tenantId, isActive: true },
            select: { id: true, name: true },
          }),
          tx.service.findFirst({
            where: { id: input.serviceId, tenantId: actor.tenantId },
            select: {
              id: true,
              name: true,
              durationMinutes: true,
              priceValue: true,
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
            },
          }),
        ]);
        if (!foundCustomer) throw new Error("Cliente inv?lido ou inativo.");
        if (!foundService) throw new Error("Servi?o inv?lido.");
        customer = foundCustomer;
        service = foundService;
      } else {
        const validated = await validateAppointmentSlot(
          tx,
          { ...input, excludeAppointmentId: current.id },
          actor,
        );
        customer = validated.customer;
        service = validated.service;
        endsAt = validated.endsAt;
        startsAt = input.startsAt;
      }

      const extraServices = await getExtraServicesForCustomFields(
        tx,
        actor,
        input.extraServiceIds.filter((id) => id !== service.id),
      );
      const customRows = validateAppointmentCustomValues(
        [
          ...service.customFields,
          ...extraServices.flatMap((item) => item.customFields),
        ],
        input.customFields,
      );

      const appointment = await tx.appointment.update({
        where: { id: current.id },
        data: {
          customerId: customer.id,
          serviceId: service.id,
          startsAt,
          endsAt,
          customerNotes: input.customerNotes,
          internalNotes: input.internalNotes,
          estimatedPrice: input.estimatedPrice ?? service.priceValue,
          finalPrice: input.finalPrice,
          status: input.status ?? current.status,
        },
      });
      await tx.appointmentCustomValue.deleteMany({
        where: { appointmentId: appointment.id },
      });
      if (customRows.length) {
        await tx.appointmentCustomValue.createMany({
          data: customRows.map((row) => ({
            appointmentId: appointment.id,
            customFieldId: row.customFieldId,
            value: row.value,
          })),
        });
      }

      const metadata = {
        appointmentId: appointment.id,
        before: {
          customerId: current.customerId,
          serviceId: current.serviceId,
          startsAt: current.startsAt.toISOString(),
          endsAt: current.endsAt.toISOString(),
          status: current.status,
        },
        after: {
          customerId: appointment.customerId,
          serviceId: appointment.serviceId,
          startsAt: appointment.startsAt.toISOString(),
          endsAt: appointment.endsAt.toISOString(),
          status: appointment.status,
        },
        manualFit: input.allowOutsideAvailability,
        concurrentFit: input.allowConcurrentAppointment,
        durationMinutes: input.durationMinutesOverride ?? service.durationMinutes,
      };
      const events: Prisma.AppointmentEventCreateManyInput[] = [
        {
          tenantId: actor.tenantId,
          appointmentId: appointment.id,
          actorType: "TENANT_USER",
          actorId: actor.actorId,
          eventType: appointment.status === "NO_SHOW" ? "NO_SHOW" : "UPDATED",
          description:
            appointment.status === "NO_SHOW"
              ? "Agendamento marcado como n?o comparecimento."
              : "Dados do agendamento atualizados.",
          metadata,
        },
      ];
      if (
        current.customerNotes !== appointment.customerNotes ||
        current.internalNotes !== appointment.internalNotes
      ) {
        events.push({
          tenantId: actor.tenantId,
          appointmentId: appointment.id,
          actorType: "TENANT_USER",
          actorId: actor.actorId,
          eventType: "NOTE_ADDED",
          description: "Observa??es do agendamento atualizadas.",
          metadata: { appointmentId: appointment.id },
        });
      }
      await tx.appointmentEvent.createMany({ data: events });
      await tx.auditLog.create({
        data: auditData(
          actor,
          appointment.status === "NO_SHOW"
            ? AUDIT_EVENTS.APPOINTMENT_NO_SHOW
            : AUDIT_EVENTS.APPOINTMENT_UPDATED,
          `Agendamento de "${customer.name}" atualizado.`,
          metadata,
        ),
      });
      return appointment;
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}

function eventForStatus(status: AppointmentStatus) {
  if (status === "CANCELED_BY_PROVIDER") return "CANCELED";
  if (status === "IN_PROGRESS") return "STARTED";
  if (status === "FINISHED") return "FINISHED";
  if (status === "NO_SHOW") return "NO_SHOW";
  return "STATUS_CHANGED";
}

function auditEventForStatus(status: AppointmentStatus) {
  if (status === "CANCELED_BY_PROVIDER")
    return AUDIT_EVENTS.APPOINTMENT_CANCELED;
  if (status === "FINISHED") return AUDIT_EVENTS.APPOINTMENT_FINISHED;
  if (status === "NO_SHOW") return AUDIT_EVENTS.APPOINTMENT_NO_SHOW;
  return AUDIT_EVENTS.APPOINTMENT_STATUS_CHANGED;
}

async function createFinancialEntryForCheckout(
  tx: Prisma.TransactionClient,
  input: {
    tenantId: string;
    appointmentId: string;
    customerId: string;
    serviceId: string;
    serviceName: string;
    paymentMethod: CheckoutAppointmentInput["paymentMethod"];
    total: number;
    checkedOutAt: Date;
  },
) {
  const existingEntry = await tx.financialEntry.findFirst({
    where: {
      tenantId: input.tenantId,
      appointmentId: input.appointmentId,
      type: "REVENUE",
    },
    select: { id: true },
  });

  if (existingEntry) {
    return tx.financialEntry.update({
      where: { id: existingEntry.id },
      data: {
        status: "PAID",
        amountInCents: Math.round(input.total * 100),
        paidAt: input.checkedOutAt,
        entryDate: input.checkedOutAt,
        paymentMethod: input.paymentMethod,
      },
    });
  }

  return tx.financialEntry.create({
    data: {
      tenantId: input.tenantId,
      appointmentId: input.appointmentId,
      customerId: input.customerId,
      serviceId: input.serviceId,
      type: "REVENUE",
      status: "PAID",
      description: `Checkout - ${input.serviceName}`,
      amountInCents: Math.round(input.total * 100),
      entryDate: input.checkedOutAt,
      paidAt: input.checkedOutAt,
      paymentMethod: input.paymentMethod,
      category: "Atendimento",
      notes: "Gerado automaticamente a partir do checkout do agendamento.",
    },
  });
}

export async function changeAppointmentStatus(
  id: string,
  status: AppointmentStatus,
  finalPrice: number | undefined,
  actor: OperationalActorContext,
) {
  return prisma.$transaction(async (tx) => {
    const current = await tx.appointment.findFirst({
      where: { id, tenantId: actor.tenantId },
      include: {
        customer: { select: { name: true } },
        service: { select: { name: true } },
      },
    });
    if (!current) throw new Error("Agendamento não encontrado.");
    if (!canTransitionAppointmentStatus(current.status, status)) {
      throw new Error(
        `A transição de ${current.status} para ${status} não é permitida.`,
      );
    }

    const appointment = await tx.appointment.update({
      where: { id: current.id },
      data: {
        status,
        ...(status === "FINISHED" && finalPrice !== undefined
          ? { finalPrice }
          : {}),
      },
    });
    const metadata = {
      appointmentId: appointment.id,
      previousStatus: current.status,
      newStatus: status,
      ...(status === "FINISHED" && finalPrice !== undefined
        ? { finalPrice }
        : {}),
    };
    await tx.appointmentEvent.create({
      data: {
        tenantId: actor.tenantId,
        appointmentId: appointment.id,
        actorType: "TENANT_USER",
        actorId: actor.actorId,
        eventType: eventForStatus(status),
        description: `Status alterado de ${current.status} para ${status}.`,
        metadata,
      },
    });
    await tx.auditLog.create({
      data: auditData(
        actor,
        auditEventForStatus(status),
        `Status do agendamento de "${current.customer.name}" alterado para ${status}.`,
        metadata,
      ),
    });
    return appointment;
  });
}

export async function checkoutAppointment(
  input: CheckoutAppointmentInput,
  actor: OperationalActorContext,
) {
  return prisma.$transaction(async (tx) => {
    const current = await tx.appointment.findFirst({
      where: { id: input.id, tenantId: actor.tenantId },
      include: {
        customer: { select: { name: true } },
        service: { select: { name: true } },
      },
    });

    if (!current) throw new Error("Agendamento não encontrado.");
    if (
      ["CANCELED_BY_CUSTOMER", "CANCELED_BY_PROVIDER", "NO_SHOW"].includes(
        current.status,
      )
    ) {
      throw new Error("Este agendamento não pode receber checkout.");
    }

    const existingCheckout = await tx.appointmentEvent.findFirst({
      where: {
        tenantId: actor.tenantId,
        appointmentId: current.id,
        eventType: "CHECKOUT_COMPLETED",
      },
      select: { id: true },
    });

    if (existingCheckout) {
      throw new Error("Este agendamento j? possui checkout realizado.");
    }

    const total = Math.max(0, input.amount + input.tip - input.discount);
    const appointment = await tx.appointment.update({
      where: { id: current.id },
      data: {
        status: "FINISHED",
        finalPrice: total,
      },
    });
    const metadata = {
      appointmentId: appointment.id,
      paymentMethod: input.paymentMethod,
      amount: input.amount,
      tip: input.tip,
      discount: input.discount,
      total,
    };
    const checkedOutAt = new Date();

    await tx.appointmentEvent.create({
      data: {
        tenantId: actor.tenantId,
        appointmentId: appointment.id,
        actorType: "TENANT_USER",
        actorId: actor.actorId,
        eventType: "CHECKOUT_COMPLETED",
        description: `Checkout concluído via ${input.paymentMethod}.`,
        metadata,
      },
    });
    await createFinancialEntryForCheckout(tx, {
      tenantId: actor.tenantId,
      appointmentId: appointment.id,
      customerId: appointment.customerId,
      serviceId: appointment.serviceId,
      serviceName: current.service.name,
      paymentMethod: input.paymentMethod,
      total,
      checkedOutAt,
    });
    await tx.auditLog.create({
      data: auditData(
        actor,
        AUDIT_EVENTS.APPOINTMENT_FINISHED,
        `Checkout do agendamento de "${current.customer.name}" concluído.`,
        metadata,
      ),
    });

    return appointment;
  });
}
