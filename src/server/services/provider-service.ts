import { AUDIT_EVENTS } from "@/features/audit/audit-events";
import type {
  CreateAvailabilityRuleInput,
  CreateCustomFieldInput,
  CreateScheduleBlockInput,
  CreateServiceCategoryInput,
  CreateServiceInput,
  ProviderSettingsInput,
  UpdateAvailabilityRuleInput,
  UpdateCustomFieldInput,
  UpdateScheduleBlockInput,
  UpdateServiceCategoryInput,
  UpdateServiceInput,
} from "@/features/provider/provider-schemas";
import { Prisma } from "@/generated/prisma/client";
import { normalizeBrazilianPhone, onlyDigits } from "@/lib/input-formatters";
import { prisma } from "@/lib/prisma";

type ProviderActorContext = {
  actorId: string;
  tenantId: string;
  ipAddress?: string | null;
};

function timeToDate(value: string) {
  return new Date(`1970-01-01T${value}:00.000Z`);
}

function auditData(
  actor: ProviderActorContext,
  eventType: string,
  description: string,
  metadata?: Prisma.InputJsonValue,
): Prisma.AuditLogUncheckedCreateInput {
  return {
    tenantId: actor.tenantId,
    actorType: "TENANT_USER" as const,
    actorId: actor.actorId,
    eventType,
    description,
    metadata,
    ipAddress: actor.ipAddress,
  };
}

export async function updateProviderSettings(
  input: ProviderSettingsInput & { logoFileKey?: string },
  actor: ProviderActorContext,
) {
  return prisma.$transaction(async (tx) => {
    const current = await tx.tenant.findFirst({
      where: { id: actor.tenantId },
    });
    if (!current) throw new Error("Prestador não encontrado.");

    const tenant = await tx.tenant.update({
      where: { id: actor.tenantId },
      data: {
        ...input,
        whatsapp: normalizeBrazilianPhone(input.whatsapp),
        postalCode: input.postalCode ? onlyDigits(input.postalCode) : null,
      },
    });
    await tx.auditLog.create({
      data: auditData(
        actor,
        AUDIT_EVENTS.TENANT_SETTINGS_UPDATED,
        `Configurações de "${tenant.name}" atualizadas.`,
        {
          changedFields: Object.keys(input).filter(
            (key) =>
              String(current[key as keyof typeof current] ?? "") !==
              String(input[key as keyof typeof input] ?? ""),
          ),
        },
      ),
    });
    return tenant;
  });
}

export async function createServiceCategory(
  input: CreateServiceCategoryInput,
  actor: ProviderActorContext,
) {
  return prisma.$transaction(async (tx) => {
    const category = await tx.serviceCategory.create({
      data: { tenantId: actor.tenantId, ...input },
    });
    await tx.auditLog.create({
      data: auditData(
        actor,
        AUDIT_EVENTS.SERVICE_CATEGORY_CREATED,
        `Categoria "${category.name}" criada.`,
        { categoryId: category.id, isActive: category.isActive },
      ),
    });
    return category;
  });
}

export async function updateServiceCategory(
  input: UpdateServiceCategoryInput,
  actor: ProviderActorContext,
) {
  return prisma.$transaction(async (tx) => {
    const current = await tx.serviceCategory.findFirst({
      where: { id: input.id, tenantId: actor.tenantId },
    });
    if (!current) throw new Error("Categoria não encontrada.");

    const category = await tx.serviceCategory.update({
      where: { id: current.id },
      data: {
        name: input.name,
        description: input.description,
        position: input.position,
        isActive: input.isActive,
      },
    });
    await tx.auditLog.create({
      data: auditData(
        actor,
        AUDIT_EVENTS.SERVICE_CATEGORY_UPDATED,
        `Categoria "${category.name}" atualizada.`,
        { categoryId: category.id },
      ),
    });
    if (current.isActive !== category.isActive) {
      await tx.auditLog.create({
        data: auditData(
          actor,
          AUDIT_EVENTS.SERVICE_CATEGORY_STATUS_CHANGED,
          `Categoria "${category.name}" ${category.isActive ? "ativada" : "inativada"}.`,
          {
            categoryId: category.id,
            previousStatus: current.isActive,
            newStatus: category.isActive,
          },
        ),
      });
    }
    return category;
  });
}

export async function changeServiceCategoryStatus(
  id: string,
  isActive: boolean,
  actor: ProviderActorContext,
) {
  return prisma.$transaction(async (tx) => {
    const current = await tx.serviceCategory.findFirst({
      where: { id, tenantId: actor.tenantId },
    });
    if (!current) throw new Error("Categoria não encontrada.");
    const category = await tx.serviceCategory.update({
      where: { id: current.id },
      data: { isActive },
    });
    await tx.auditLog.create({
      data: auditData(
        actor,
        AUDIT_EVENTS.SERVICE_CATEGORY_STATUS_CHANGED,
        `Categoria "${category.name}" ${isActive ? "ativada" : "inativada"}.`,
        { categoryId: category.id, previousStatus: current.isActive, newStatus: isActive },
      ),
    });
    return category;
  });
}

async function assertCategory(
  tx: Prisma.TransactionClient,
  tenantId: string,
  categoryId: string,
) {
  const category = await tx.serviceCategory.findFirst({
    where: { id: categoryId, tenantId },
    select: { id: true },
  });
  if (!category) throw new Error("A categoria selecionada não pertence ao prestador.");
}

export async function createService(
  input: CreateServiceInput,
  actor: ProviderActorContext,
) {
  return prisma.$transaction(async (tx) => {
    await assertCategory(tx, actor.tenantId, input.categoryId);
    const service = await tx.service.create({
      data: { tenantId: actor.tenantId, ...input },
    });
    await tx.auditLog.create({
      data: auditData(actor, AUDIT_EVENTS.SERVICE_CREATED, `Serviço "${service.name}" criado.`, {
        serviceId: service.id,
        categoryId: service.categoryId,
        isActive: service.isActive,
      }),
    });
    return service;
  });
}

export async function updateService(
  input: UpdateServiceInput,
  actor: ProviderActorContext,
) {
  return prisma.$transaction(async (tx) => {
    const current = await tx.service.findFirst({
      where: { id: input.id, tenantId: actor.tenantId },
    });
    if (!current) throw new Error("Serviço não encontrado.");
    await assertCategory(tx, actor.tenantId, input.categoryId);
    const service = await tx.service.update({
      where: { id: current.id },
      data: {
        categoryId: input.categoryId,
        name: input.name,
        description: input.description,
        durationMinutes: input.durationMinutes,
        priceType: input.priceType,
        priceValue: input.priceValue,
        bookingMode: input.bookingMode,
        requiresManualConfirmation: input.requiresManualConfirmation,
        internalNotes: input.internalNotes,
        position: input.position,
        isActive: input.isActive,
      },
    });
    await tx.auditLog.create({
      data: auditData(actor, AUDIT_EVENTS.SERVICE_UPDATED, `Serviço "${service.name}" atualizado.`, {
        serviceId: service.id,
        categoryId: service.categoryId,
      }),
    });
    if (current.isActive !== service.isActive) {
      await tx.auditLog.create({
        data: auditData(
          actor,
          AUDIT_EVENTS.SERVICE_STATUS_CHANGED,
          `Serviço "${service.name}" ${service.isActive ? "ativado" : "inativado"}.`,
          { serviceId: service.id, previousStatus: current.isActive, newStatus: service.isActive },
        ),
      });
    }
    return service;
  });
}

export async function changeServiceStatus(
  id: string,
  isActive: boolean,
  actor: ProviderActorContext,
) {
  return prisma.$transaction(async (tx) => {
    const current = await tx.service.findFirst({ where: { id, tenantId: actor.tenantId } });
    if (!current) throw new Error("Serviço não encontrado.");
    const service = await tx.service.update({ where: { id: current.id }, data: { isActive } });
    await tx.auditLog.create({
      data: auditData(
        actor,
        AUDIT_EVENTS.SERVICE_STATUS_CHANGED,
        `Serviço "${service.name}" ${isActive ? "ativado" : "inativado"}.`,
        { serviceId: service.id, previousStatus: current.isActive, newStatus: isActive },
      ),
    });
    return service;
  });
}

async function assertService(
  tx: Prisma.TransactionClient,
  tenantId: string,
  serviceId: string,
) {
  const service = await tx.service.findFirst({
    where: { id: serviceId, tenantId },
    select: { id: true, name: true },
  });
  if (!service) throw new Error("Serviço não encontrado.");
  return service;
}

export async function createCustomField(
  input: CreateCustomFieldInput,
  actor: ProviderActorContext,
) {
  return prisma.$transaction(async (tx) => {
    const service = await assertService(tx, actor.tenantId, input.serviceId);
    const field = await tx.customField.create({
      data: {
        tenantId: actor.tenantId,
        ...input,
        options: input.options ?? Prisma.JsonNull,
      },
    });
    await tx.auditLog.create({
      data: auditData(actor, AUDIT_EVENTS.CUSTOM_FIELD_CREATED, `Campo "${field.label}" criado no serviço "${service.name}".`, {
        customFieldId: field.id,
        serviceId: service.id,
      }),
    });
    return field;
  });
}

export async function updateCustomField(
  input: UpdateCustomFieldInput,
  actor: ProviderActorContext,
) {
  return prisma.$transaction(async (tx) => {
    const current = await tx.customField.findFirst({
      where: { id: input.id, serviceId: input.serviceId, tenantId: actor.tenantId },
    });
    if (!current) throw new Error("Campo personalizado não encontrado.");
    const field = await tx.customField.update({
      where: { id: current.id },
      data: {
        label: input.label,
        key: input.key,
        fieldType: input.fieldType,
        options: input.options ?? Prisma.JsonNull,
        isRequired: input.isRequired,
        position: input.position,
        isActive: input.isActive,
      },
    });
    await tx.auditLog.create({
      data: auditData(actor, AUDIT_EVENTS.CUSTOM_FIELD_UPDATED, `Campo "${field.label}" atualizado.`, {
        customFieldId: field.id,
        serviceId: field.serviceId,
      }),
    });
    if (current.isActive !== field.isActive) {
      await tx.auditLog.create({
        data: auditData(
          actor,
          AUDIT_EVENTS.CUSTOM_FIELD_STATUS_CHANGED,
          `Campo "${field.label}" ${field.isActive ? "ativado" : "inativado"}.`,
          { customFieldId: field.id, serviceId: field.serviceId, previousStatus: current.isActive, newStatus: field.isActive },
        ),
      });
    }
    return field;
  });
}

export async function changeCustomFieldStatus(
  id: string,
  serviceId: string,
  isActive: boolean,
  actor: ProviderActorContext,
) {
  return prisma.$transaction(async (tx) => {
    const current = await tx.customField.findFirst({
      where: { id, serviceId, tenantId: actor.tenantId },
    });
    if (!current) throw new Error("Campo personalizado não encontrado.");
    const field = await tx.customField.update({ where: { id: current.id }, data: { isActive } });
    await tx.auditLog.create({
      data: auditData(
        actor,
        AUDIT_EVENTS.CUSTOM_FIELD_STATUS_CHANGED,
        `Campo "${field.label}" ${isActive ? "ativado" : "inativado"}.`,
        { customFieldId: field.id, serviceId: field.serviceId, previousStatus: current.isActive, newStatus: isActive },
      ),
    });
    return field;
  });
}

export async function createAvailabilityRule(
  input: CreateAvailabilityRuleInput,
  actor: ProviderActorContext,
) {
  return prisma.$transaction(async (tx) => {
    const rule = await tx.availabilityRule.create({
      data: {
        tenantId: actor.tenantId,
        weekday: input.weekday,
        startTime: timeToDate(input.startTime),
        endTime: timeToDate(input.endTime),
        slotIntervalMinutes: input.slotIntervalMinutes,
        isActive: input.isActive,
      },
    });
    await tx.auditLog.create({
      data: auditData(actor, AUDIT_EVENTS.AVAILABILITY_RULE_CREATED, "Horário de atendimento criado.", {
        availabilityRuleId: rule.id,
        weekday: rule.weekday,
      }),
    });
    return rule;
  });
}

export async function updateAvailabilityRule(
  input: UpdateAvailabilityRuleInput,
  actor: ProviderActorContext,
) {
  return prisma.$transaction(async (tx) => {
    const current = await tx.availabilityRule.findFirst({
      where: { id: input.id, tenantId: actor.tenantId },
    });
    if (!current) throw new Error("Horário de atendimento não encontrado.");
    const rule = await tx.availabilityRule.update({
      where: { id: current.id },
      data: {
        weekday: input.weekday,
        startTime: timeToDate(input.startTime),
        endTime: timeToDate(input.endTime),
        slotIntervalMinutes: input.slotIntervalMinutes,
        isActive: input.isActive,
      },
    });
    await tx.auditLog.create({
      data: auditData(actor, AUDIT_EVENTS.AVAILABILITY_RULE_UPDATED, "Horário de atendimento atualizado.", {
        availabilityRuleId: rule.id,
        weekday: rule.weekday,
      }),
    });
    if (current.isActive !== rule.isActive) {
      await tx.auditLog.create({
        data: auditData(
          actor,
          AUDIT_EVENTS.AVAILABILITY_RULE_STATUS_CHANGED,
          `Horário de atendimento ${rule.isActive ? "ativado" : "inativado"}.`,
          { availabilityRuleId: rule.id, previousStatus: current.isActive, newStatus: rule.isActive },
        ),
      });
    }
    return rule;
  });
}

export async function changeAvailabilityRuleStatus(
  id: string,
  isActive: boolean,
  actor: ProviderActorContext,
) {
  return prisma.$transaction(async (tx) => {
    const current = await tx.availabilityRule.findFirst({
      where: { id, tenantId: actor.tenantId },
    });
    if (!current) throw new Error("Horário de atendimento não encontrado.");
    const rule = await tx.availabilityRule.update({ where: { id: current.id }, data: { isActive } });
    await tx.auditLog.create({
      data: auditData(
        actor,
        AUDIT_EVENTS.AVAILABILITY_RULE_STATUS_CHANGED,
        `Horário de atendimento ${isActive ? "ativado" : "inativado"}.`,
        { availabilityRuleId: rule.id, previousStatus: current.isActive, newStatus: isActive },
      ),
    });
    return rule;
  });
}

export async function createScheduleBlock(
  input: CreateScheduleBlockInput,
  actor: ProviderActorContext,
) {
  return prisma.$transaction(async (tx) => {
    const block = await tx.scheduleBlock.create({
      data: {
        tenantId: actor.tenantId,
        createdByUserId: actor.actorId,
        ...input,
      },
    });
    await tx.auditLog.create({
      data: auditData(actor, AUDIT_EVENTS.SCHEDULE_BLOCK_CREATED, `Bloqueio de agenda criado: ${block.reason}.`, {
        scheduleBlockId: block.id,
        startsAt: block.startsAt.toISOString(),
        endsAt: block.endsAt.toISOString(),
      }),
    });
    return block;
  });
}

export async function updateScheduleBlock(
  input: UpdateScheduleBlockInput,
  actor: ProviderActorContext,
) {
  return prisma.$transaction(async (tx) => {
    const current = await tx.scheduleBlock.findFirst({
      where: { id: input.id, tenantId: actor.tenantId },
    });
    if (!current) throw new Error("Bloqueio de agenda não encontrado.");

    const block = await tx.scheduleBlock.update({
      where: { id: current.id },
      data: {
        startsAt: input.startsAt,
        endsAt: input.endsAt,
        reason: input.reason,
      },
    });

    await tx.auditLog.create({
      data: auditData(
        actor,
        AUDIT_EVENTS.SCHEDULE_BLOCK_UPDATED,
        `Bloqueio de agenda atualizado: ${block.reason}.`,
        {
          scheduleBlockId: block.id,
          previousStartsAt: current.startsAt.toISOString(),
          previousEndsAt: current.endsAt.toISOString(),
          startsAt: block.startsAt.toISOString(),
          endsAt: block.endsAt.toISOString(),
        },
      ),
    });

    return block;
  });
}

export async function deleteScheduleBlock(
  id: string,
  actor: ProviderActorContext,
) {
  return prisma.$transaction(async (tx) => {
    const block = await tx.scheduleBlock.findFirst({
      where: { id, tenantId: actor.tenantId },
    });
    if (!block) throw new Error("Bloqueio de agenda não encontrado.");
    await tx.scheduleBlock.delete({ where: { id: block.id } });
    await tx.auditLog.create({
      data: auditData(actor, AUDIT_EVENTS.SCHEDULE_BLOCK_DELETED, `Bloqueio de agenda removido: ${block.reason}.`, {
        scheduleBlockId: block.id,
        startsAt: block.startsAt.toISOString(),
        endsAt: block.endsAt.toISOString(),
      }),
    });
    return block;
  });
}
