import { AUDIT_EVENTS } from "@/features/audit/audit-events";
import type {
  CreatePlanInput,
  UpdatePlanInput,
} from "@/features/plans/plan-schemas";
import { prisma } from "@/lib/prisma";
import type { AdminActorContext } from "@/server/services/admin-context";

export async function createPlan(
  input: CreatePlanInput,
  actor: AdminActorContext,
) {
  return prisma.$transaction(async (tx) => {
    const plan = await tx.plan.create({
      data: {
        name: input.name,
        description: input.description || null,
        monthlyPrice: input.monthlyPrice,
        annualPrice: input.annualPrice,
        whatsappEnabled: input.whatsappEnabled,
        publicLinkEnabled: input.publicLinkEnabled,
        isActive: input.isActive,
      },
    });

    await tx.auditLog.create({
      data: {
        actorType: "SUPER_ADMIN",
        actorId: actor.actorId,
        eventType: AUDIT_EVENTS.PLAN_CREATED,
        description: `Plano "${plan.name}" criado.`,
        metadata: {
          planId: plan.id,
          monthlyPrice: input.monthlyPrice,
          annualPrice: input.annualPrice,
          isActive: input.isActive,
        },
        ipAddress: actor.ipAddress,
      },
    });

    return plan;
  });
}

export async function updatePlan(
  input: UpdatePlanInput,
  actor: AdminActorContext,
) {
  return prisma.$transaction(async (tx) => {
    const current = await tx.plan.findUnique({ where: { id: input.id } });

    if (!current) {
      throw new Error("Plano não encontrado.");
    }

    const plan = await tx.plan.update({
      where: { id: input.id },
      data: {
        name: input.name,
        description: input.description || null,
        monthlyPrice: input.monthlyPrice,
        annualPrice: input.annualPrice,
        whatsappEnabled: input.whatsappEnabled,
        publicLinkEnabled: input.publicLinkEnabled,
        isActive: input.isActive,
      },
    });

    await tx.auditLog.create({
      data: {
        actorType: "SUPER_ADMIN",
        actorId: actor.actorId,
        eventType: AUDIT_EVENTS.PLAN_UPDATED,
        description: `Plano "${plan.name}" atualizado.`,
        metadata: {
          planId: plan.id,
          before: {
            name: current.name,
            isActive: current.isActive,
            monthlyPrice: current.monthlyPrice.toString(),
            annualPrice: current.annualPrice.toString(),
          },
          after: {
            name: plan.name,
            isActive: plan.isActive,
            monthlyPrice: plan.monthlyPrice.toString(),
            annualPrice: plan.annualPrice.toString(),
          },
        },
        ipAddress: actor.ipAddress,
      },
    });

    return plan;
  });
}
