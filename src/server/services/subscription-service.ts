import { AUDIT_EVENTS } from "@/features/audit/audit-events";
import type {
  ChangeExpirationInput,
  RegisterPaymentInput,
  UpdateSubscriptionInput,
} from "@/features/subscriptions/subscription-schemas";
import { prisma } from "@/lib/prisma";
import type { AdminActorContext } from "@/server/services/admin-context";

function appendInternalNote(current: string | null, note?: string) {
  if (!note) {
    return current;
  }

  const entry = `[${new Date().toISOString()}] ${note}`;
  return current ? `${current}\n${entry}` : entry;
}

export async function updateSubscription(
  input: UpdateSubscriptionInput,
  actor: AdminActorContext,
) {
  return prisma.$transaction(async (tx) => {
    const current = await tx.subscription.findUnique({
      where: { id: input.id },
    });

    if (!current) {
      throw new Error("Assinatura não encontrada.");
    }

    const plan = await tx.plan.findFirst({
      where: {
        id: input.planId,
        OR: [{ isActive: true }, { id: current.planId }],
      },
    });

    if (!plan) {
      throw new Error("Selecione um plano ativo.");
    }

    const subscription = await tx.subscription.update({
      where: { id: input.id },
      data: {
        planId: input.planId,
        status: input.status,
        billingCycle: input.billingCycle,
        price: input.price,
        startsAt: input.startsAt,
        expiresAt: input.expiresAt,
        lastPaymentAt: input.lastPaymentAt || null,
        paymentMethod: input.paymentMethod || null,
        internalNotes: input.internalNotes || null,
      },
    });

    await tx.auditLog.create({
      data: {
        tenantId: subscription.tenantId,
        actorType: "SUPER_ADMIN",
        actorId: actor.actorId,
        eventType: AUDIT_EVENTS.SUBSCRIPTION_UPDATED,
        description: "Assinatura atualizada manualmente.",
        metadata: {
          subscriptionId: subscription.id,
          before: {
            planId: current.planId,
            status: current.status,
            expiresAt: current.expiresAt.toISOString(),
          },
          after: {
            planId: subscription.planId,
            status: subscription.status,
            expiresAt: subscription.expiresAt.toISOString(),
          },
        },
        ipAddress: actor.ipAddress,
      },
    });

    if (current.status !== subscription.status) {
      const statusEvent =
        subscription.status === "ACTIVE"
          ? AUDIT_EVENTS.SUBSCRIPTION_REACTIVATED
          : subscription.status === "SUSPENDED"
            ? AUDIT_EVENTS.SUBSCRIPTION_SUSPENDED
            : subscription.status === "CANCELED"
              ? AUDIT_EVENTS.SUBSCRIPTION_CANCELED
              : AUDIT_EVENTS.SUBSCRIPTION_UPDATED;

      if (statusEvent !== AUDIT_EVENTS.SUBSCRIPTION_UPDATED) {
        await tx.auditLog.create({
          data: {
            tenantId: subscription.tenantId,
            actorType: "SUPER_ADMIN",
            actorId: actor.actorId,
            eventType: statusEvent,
            description: `Status da assinatura alterado de ${current.status} para ${subscription.status}.`,
            metadata: {
              subscriptionId: subscription.id,
              previousStatus: current.status,
              newStatus: subscription.status,
              changedDuringEdit: true,
            },
            ipAddress: actor.ipAddress,
          },
        });
      }
    }

    return subscription;
  });
}

export async function registerManualPayment(
  input: RegisterPaymentInput,
  actor: AdminActorContext,
) {
  return prisma.$transaction(async (tx) => {
    const current = await tx.subscription.findUnique({
      where: { id: input.id },
    });

    if (!current) {
      throw new Error("Assinatura não encontrada.");
    }

    const subscription = await tx.subscription.update({
      where: { id: input.id },
      data: {
        lastPaymentAt: input.paymentDate,
        expiresAt: input.newExpiresAt,
        status: "ACTIVE",
        paymentMethod: input.paymentMethod,
        internalNotes: appendInternalNote(
          current.internalNotes,
          input.internalNotes,
        ),
      },
    });

    await tx.auditLog.create({
      data: {
        tenantId: subscription.tenantId,
        actorType: "SUPER_ADMIN",
        actorId: actor.actorId,
        eventType: AUDIT_EVENTS.SUBSCRIPTION_PAYMENT_REGISTERED,
        description: "Pagamento manual registrado.",
        metadata: {
          subscriptionId: subscription.id,
          paymentDate: input.paymentDate.toISOString(),
          paymentMethod: input.paymentMethod,
          amountPaid: input.amountPaid,
          previousExpiration: current.expiresAt.toISOString(),
          newExpiration: input.newExpiresAt.toISOString(),
          previousStatus: current.status,
          newStatus: subscription.status,
        },
        ipAddress: actor.ipAddress,
      },
    });

    return subscription;
  });
}

export async function changeSubscriptionExpiration(
  input: ChangeExpirationInput,
  actor: AdminActorContext,
) {
  return prisma.$transaction(async (tx) => {
    const current = await tx.subscription.findUnique({
      where: { id: input.id },
    });

    if (!current) {
      throw new Error("Assinatura não encontrada.");
    }

    const subscription = await tx.subscription.update({
      where: { id: input.id },
      data: {
        expiresAt: input.expiresAt,
        internalNotes: appendInternalNote(current.internalNotes, input.reason),
      },
    });

    await tx.auditLog.create({
      data: {
        tenantId: subscription.tenantId,
        actorType: "SUPER_ADMIN",
        actorId: actor.actorId,
        eventType: AUDIT_EVENTS.SUBSCRIPTION_EXPIRATION_CHANGED,
        description: "Vencimento da assinatura alterado manualmente.",
        metadata: {
          subscriptionId: subscription.id,
          previousExpiration: current.expiresAt.toISOString(),
          newExpiration: input.expiresAt.toISOString(),
          reason: input.reason,
        },
        ipAddress: actor.ipAddress,
      },
    });

    return subscription;
  });
}

export async function changeSubscriptionStatus(
  id: string,
  status: "ACTIVE" | "SUSPENDED" | "CANCELED",
  actor: AdminActorContext,
) {
  return prisma.$transaction(async (tx) => {
    const current = await tx.subscription.findUnique({ where: { id } });

    if (!current) {
      throw new Error("Assinatura não encontrada.");
    }

    const subscription = await tx.subscription.update({
      where: { id },
      data: { status },
    });

    const eventType =
      status === "ACTIVE"
        ? AUDIT_EVENTS.SUBSCRIPTION_REACTIVATED
        : status === "SUSPENDED"
          ? AUDIT_EVENTS.SUBSCRIPTION_SUSPENDED
          : AUDIT_EVENTS.SUBSCRIPTION_CANCELED;

    await tx.auditLog.create({
      data: {
        tenantId: subscription.tenantId,
        actorType: "SUPER_ADMIN",
        actorId: actor.actorId,
        eventType,
        description: `Status da assinatura alterado de ${current.status} para ${status}.`,
        metadata: {
          subscriptionId: subscription.id,
          previousStatus: current.status,
          newStatus: status,
        },
        ipAddress: actor.ipAddress,
      },
    });

    return subscription;
  });
}
