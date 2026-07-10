import {
  FINANCIAL_METHOD_DB_VALUES,
} from "@/features/provider-financial/financial-types";
import type {
  CreateFinancialEntryInput,
  RefundFinancialEntryInput,
  RegisterFinancialPaymentInput,
  UpdateFinancialEntryInput,
  UpdateFinancialSettingsInput,
} from "@/features/provider-financial/financial-schemas";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import type { OperationalActorContext } from "@/server/services/customer-service";

class FinancialOwnershipError extends Error {
  fieldErrors: Record<string, string[]>;

  constructor(field: string, message: string) {
    super(message);
    this.fieldErrors = { [field]: [message] };
  }
}

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

async function assertCustomerBelongsToTenant(
  tx: Prisma.TransactionClient,
  actor: OperationalActorContext,
  customerId?: string,
) {
  if (!customerId) return;
  const customer = await tx.customer.findFirst({
    where: { id: customerId, tenantId: actor.tenantId },
    select: { id: true },
  });
  if (!customer) {
    throw new FinancialOwnershipError(
      "customerId",
      "Cliente não encontrado para este prestador.",
    );
  }
}

async function assertServiceBelongsToTenant(
  tx: Prisma.TransactionClient,
  actor: OperationalActorContext,
  serviceId?: string,
) {
  if (!serviceId) return;
  const service = await tx.service.findFirst({
    where: { id: serviceId, tenantId: actor.tenantId },
    select: { id: true },
  });
  if (!service) {
    throw new FinancialOwnershipError(
      "serviceId",
      "Serviço não encontrado para este prestador.",
    );
  }
}

async function appointmentRelations(
  tx: Prisma.TransactionClient,
  actor: OperationalActorContext,
  appointmentId?: string,
) {
  if (!appointmentId) return {};
  const appointment = await tx.appointment.findFirst({
    where: { id: appointmentId, tenantId: actor.tenantId },
    select: { id: true, customerId: true, serviceId: true },
  });
  if (!appointment) {
    throw new FinancialOwnershipError(
      "appointmentId",
      "Agendamento não encontrado para este prestador.",
    );
  }
  return {
    customerId: appointment.customerId,
    serviceId: appointment.serviceId,
  };
}

function paidAmountInCents(
  payments: Array<{ amountInCents: number }>,
) {
  return payments.reduce((total, payment) => total + payment.amountInCents, 0);
}

export async function createFinancialEntry(
  input: CreateFinancialEntryInput,
  actor: OperationalActorContext,
) {
  return prisma.$transaction(async (tx) => {
    const appointment = await appointmentRelations(tx, actor, input.appointmentId);
    const customerId = input.customerId ?? appointment.customerId;
    const serviceId = input.serviceId ?? appointment.serviceId;

    await assertCustomerBelongsToTenant(tx, actor, customerId);
    await assertServiceBelongsToTenant(tx, actor, serviceId);

    const entry = await tx.financialEntry.create({
      data: {
        tenantId: actor.tenantId,
        appointmentId: input.appointmentId,
        customerId,
        serviceId,
        type: input.type,
        status: input.status,
        description: input.description,
        amountInCents: input.amount,
        entryDate: input.entryDate,
        dueDate: input.dueDate,
        paidAt: input.status === "PAID" ? new Date() : null,
        paymentMethod: input.paymentMethod,
        category: input.category,
        notes: input.notes,
      },
    });

    if (entry.status === "PAID") {
      await tx.financialPayment.create({
        data: {
          tenantId: actor.tenantId,
          entryId: entry.id,
          customerId,
          serviceId,
          amountInCents: entry.amountInCents,
          paidAt: entry.paidAt ?? entry.entryDate,
          paymentMethod: entry.paymentMethod ?? "OTHER",
          notes: "Pagamento registrado na criação do lançamento.",
        },
      });
    }

    await tx.auditLog.create({
      data: auditData(actor, "FINANCIAL_ENTRY_CREATED", "Lançamento financeiro criado.", {
        financialEntryId: entry.id,
        type: entry.type,
        status: entry.status,
        amountInCents: entry.amountInCents,
      }),
    });

    return entry;
  });
}

export async function markFinancialEntryAsPaid(
  id: string,
  actor: OperationalActorContext,
  input?: {
    paidAt?: Date;
    paymentMethod?: NonNullable<CreateFinancialEntryInput["paymentMethod"]>;
  },
) {
  return prisma.$transaction(async (tx) => {
    const current = await tx.financialEntry.findFirst({
      where: { id, tenantId: actor.tenantId },
      include: { payments: true },
    });
    if (!current) {
      throw new FinancialOwnershipError(
        "id",
        "Lançamento não encontrado para este prestador.",
      );
    }
    if (["CANCELED", "REFUNDED"].includes(current.status)) {
      throw new FinancialOwnershipError(
        "id",
        "Lançamentos cancelados ou reembolsados não podem ser marcados como pagos.",
      );
    }

    const paidAmount = paidAmountInCents(current.payments);
    const remainingAmount = Math.max(0, current.amountInCents - paidAmount);

    if (remainingAmount > 0) {
      await tx.financialPayment.create({
        data: {
          tenantId: actor.tenantId,
          entryId: current.id,
          customerId: current.customerId,
          serviceId: current.serviceId,
          amountInCents: remainingAmount,
          paidAt: input?.paidAt ?? new Date(),
          paymentMethod: input?.paymentMethod ?? current.paymentMethod ?? "OTHER",
          notes: "Pagamento de quitação registrado pelo financeiro.",
        },
      });
    }

    const entry = await tx.financialEntry.update({
      where: { id },
      data: {
        status: "PAID",
        paidAt: input?.paidAt ?? new Date(),
        ...(input?.paymentMethod ? { paymentMethod: input.paymentMethod } : {}),
      },
    });

    await tx.auditLog.create({
      data: auditData(actor, "FINANCIAL_ENTRY_PAID", "Lançamento marcado como pago.", {
        financialEntryId: entry.id,
        previousStatus: current.status,
      }),
    });

    return entry;
  });
}

export async function registerFinancialPayment(
  input: RegisterFinancialPaymentInput,
  actor: OperationalActorContext,
) {
  return prisma.$transaction(async (tx) => {
    const current = await tx.financialEntry.findFirst({
      where: { id: input.id, tenantId: actor.tenantId },
      include: { payments: true },
    });

    if (!current) {
      throw new FinancialOwnershipError(
        "id",
        "Lançamento não encontrado para este prestador.",
      );
    }
    if (["CANCELED", "REFUNDED"].includes(current.status)) {
      throw new FinancialOwnershipError(
        "id",
        "Lançamentos cancelados ou reembolsados não podem receber pagamento.",
      );
    }

    const paidAmount = paidAmountInCents(current.payments);
    const remainingAmount = Math.max(0, current.amountInCents - paidAmount);

    if (input.amount > remainingAmount) {
      throw new FinancialOwnershipError(
        "amount",
        "O valor informado é maior que o saldo em aberto.",
      );
    }

    const payment = await tx.financialPayment.create({
      data: {
        tenantId: actor.tenantId,
        entryId: current.id,
        customerId: current.customerId,
        serviceId: current.serviceId,
        amountInCents: input.amount,
        paidAt: input.paidAt,
        paymentMethod: input.paymentMethod,
        notes: input.notes,
      },
    });

    const fullyPaid = paidAmount + input.amount >= current.amountInCents;
    await tx.financialEntry.update({
      where: { id: current.id },
      data: {
        status: fullyPaid ? "PAID" : "PENDING",
        paidAt: fullyPaid ? input.paidAt : current.paidAt,
        paymentMethod: input.paymentMethod,
      },
    });

    await tx.auditLog.create({
      data: auditData(actor, "FINANCIAL_PAYMENT_REGISTERED", "Pagamento financeiro registrado.", {
        financialEntryId: current.id,
        paymentId: payment.id,
        amountInCents: payment.amountInCents,
        fullyPaid,
      }),
    });

    return payment;
  });
}

export async function updateFinancialEntry(
  input: UpdateFinancialEntryInput,
  actor: OperationalActorContext,
) {
  return prisma.$transaction(async (tx) => {
    const current = await tx.financialEntry.findFirst({
      where: { id: input.id, tenantId: actor.tenantId },
      include: { payments: true },
    });

    if (!current) {
      throw new FinancialOwnershipError(
        "id",
        "Lançamento não encontrado para este prestador.",
      );
    }
    if (current.status === "CANCELED") {
      throw new FinancialOwnershipError(
        "id",
        "Lançamentos cancelados não podem ser editados.",
      );
    }
    const paidAmount = paidAmountInCents(current.payments);
    if (input.amount < paidAmount) {
      throw new FinancialOwnershipError(
        "amount",
        "O valor do lançamento não pode ser menor que o valor já recebido.",
      );
    }

    const appointment = await appointmentRelations(tx, actor, input.appointmentId);
    const customerId = input.customerId ?? appointment.customerId;
    const serviceId = input.serviceId ?? appointment.serviceId;

    await assertCustomerBelongsToTenant(tx, actor, customerId);
    await assertServiceBelongsToTenant(tx, actor, serviceId);

    const entry = await tx.financialEntry.update({
      where: { id: input.id },
      data: {
        appointmentId: input.appointmentId,
        customerId,
        serviceId,
        type: input.type,
        status: input.status,
        description: input.description,
        amountInCents: input.amount,
        entryDate: input.entryDate,
        dueDate: input.dueDate,
        paidAt: input.status === "PAID" ? (current.paidAt ?? new Date()) : null,
        paymentMethod: input.paymentMethod,
        category: input.category,
        notes: input.notes,
      },
    });

    await tx.auditLog.create({
      data: auditData(actor, "FINANCIAL_ENTRY_UPDATED", "Lançamento financeiro atualizado.", {
        financialEntryId: entry.id,
        previousStatus: current.status,
        status: entry.status,
        amountInCents: entry.amountInCents,
      }),
    });

    return entry;
  });
}

export async function refundFinancialEntry(
  input: RefundFinancialEntryInput,
  actor: OperationalActorContext,
) {
  return prisma.$transaction(async (tx) => {
    const current = await tx.financialEntry.findFirst({
      where: { id: input.id, tenantId: actor.tenantId },
      include: { payments: true },
    });

    if (!current) {
      throw new FinancialOwnershipError(
        "id",
        "Lançamento não encontrado para este prestador.",
      );
    }
    if (current.type !== "REVENUE") {
      throw new FinancialOwnershipError(
        "id",
        "Somente receitas podem ser estornadas por este fluxo.",
      );
    }

    const paidAmount = paidAmountInCents(current.payments);
    if (paidAmount <= 0) {
      throw new FinancialOwnershipError(
        "id",
        "Este lançamento não possui pagamento para estornar.",
      );
    }
    if (input.amount > paidAmount) {
      throw new FinancialOwnershipError(
        "amount",
        "O estorno não pode ser maior que o valor recebido.",
      );
    }

    const refundedAt = new Date();
    const refundEntry = await tx.financialEntry.create({
      data: {
        tenantId: actor.tenantId,
        appointmentId: current.appointmentId,
        customerId: current.customerId,
        serviceId: current.serviceId,
        type: "REFUND",
        status: "REFUNDED",
        description: `Estorno - ${current.description}`,
        amountInCents: input.amount,
        entryDate: refundedAt,
        paidAt: refundedAt,
        paymentMethod: current.paymentMethod ?? "OTHER",
        category: current.category ?? "Estorno",
        notes: input.reason,
      },
    });

    await tx.financialPayment.create({
      data: {
        tenantId: actor.tenantId,
        entryId: refundEntry.id,
        customerId: current.customerId,
        serviceId: current.serviceId,
        amountInCents: input.amount,
        paidAt: refundedAt,
        paymentMethod: current.paymentMethod ?? "OTHER",
        notes: input.reason,
      },
    });

    const fullyRefunded = input.amount >= paidAmount;
    if (fullyRefunded) {
      await tx.financialEntry.update({
        where: { id: current.id },
        data: { status: "REFUNDED" },
      });
    }

    await tx.auditLog.create({
      data: auditData(actor, "FINANCIAL_ENTRY_REFUNDED", "Estorno financeiro registrado.", {
        financialEntryId: current.id,
        refundEntryId: refundEntry.id,
        amountInCents: input.amount,
        fullyRefunded,
      }),
    });

    return refundEntry;
  });
}

export async function cancelFinancialEntry(
  id: string,
  reason: string,
  actor: OperationalActorContext,
) {
  return prisma.$transaction(async (tx) => {
    const current = await tx.financialEntry.findFirst({
      where: { id, tenantId: actor.tenantId },
      select: { id: true, status: true },
    });

    if (!current) {
      throw new FinancialOwnershipError(
        "id",
        "Lançamento não encontrado para este prestador.",
      );
    }
    if (current.status === "CANCELED") {
      throw new FinancialOwnershipError("id", "Este lançamento já está cancelado.");
    }

    const entry = await tx.financialEntry.update({
      where: { id },
      data: {
        status: "CANCELED",
        paidAt: null,
        notes: reason,
      },
    });

    await tx.auditLog.create({
      data: auditData(actor, "FINANCIAL_ENTRY_CANCELED", "Lançamento financeiro cancelado.", {
        financialEntryId: entry.id,
        previousStatus: current.status,
        reason,
      }),
    });

    return entry;
  });
}

export async function updateFinancialSettings(
  input: UpdateFinancialSettingsInput,
  actor: OperationalActorContext,
) {
  const acceptedMethods = input.acceptedMethods;

  return prisma.$transaction(async (tx) => {
    const settings = await tx.financialSettings.upsert({
      where: { tenantId: actor.tenantId },
      create: {
        tenantId: actor.tenantId,
        currency: input.currency,
        acceptedMethods,
        revenueCategories: input.revenueCategories,
        expenseCategories: input.expenseCategories,
        manualControl: input.manualControl,
        payAtLocation: input.payAtLocation,
        requireCheckout: input.requireCheckout,
        allowPartialPayments: input.allowPartialPayments,
        defaultDueDays: input.defaultDueDays,
        reminderTemplate: input.reminderTemplate,
      },
      update: {
        currency: input.currency,
        acceptedMethods,
        revenueCategories: input.revenueCategories,
        expenseCategories: input.expenseCategories,
        manualControl: input.manualControl,
        payAtLocation: input.payAtLocation,
        requireCheckout: input.requireCheckout,
        allowPartialPayments: input.allowPartialPayments,
        defaultDueDays: input.defaultDueDays,
        reminderTemplate: input.reminderTemplate,
      },
    });

    await tx.auditLog.create({
      data: auditData(
        actor,
        "FINANCIAL_SETTINGS_UPDATED",
        "Configurações financeiras atualizadas.",
        {
          acceptedMethods: acceptedMethods.map(
            (method) => FINANCIAL_METHOD_DB_VALUES[method],
          ),
          defaultDueDays: input.defaultDueDays,
          requireCheckout: input.requireCheckout,
        },
      ),
    });

    return settings;
  });
}
