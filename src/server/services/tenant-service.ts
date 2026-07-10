import { AUDIT_EVENTS } from "@/features/audit/audit-events";
import type {
  CreateTenantInput,
  ProvisionTenantOwnerInput,
  ResetTenantOwnerPasswordInput,
  UpdateTenantInput,
} from "@/features/tenants/tenant-schemas";
import { hash } from "bcryptjs";
import { normalizeBrazilianPhone, onlyDigits } from "@/lib/input-formatters";
import { prisma } from "@/lib/prisma";
import type { AdminActorContext } from "@/server/services/admin-context";

function optionalText(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function normalizeDocument(value?: string | null) {
  const digits = onlyDigits(value);
  return digits || null;
}

export async function createTenant(
  input: CreateTenantInput,
  actor: AdminActorContext,
) {
  return prisma.$transaction(async (tx) => {
    const existingSlug = await tx.tenant.findUnique({
      where: { slug: input.slug },
      select: { id: true },
    });

    if (existingSlug) {
      throw new Error("O slug informado já está em uso.");
    }

    const existingUser = await tx.user.findUnique({
      where: { email: input.ownerEmail },
      select: { id: true },
    });

    if (existingUser) {
      throw new Error("Já existe um usuário com este e-mail.");
    }

    const plan = await tx.plan.findFirst({
      where: { id: input.planId, isActive: true },
    });

    if (!plan) {
      throw new Error("Selecione um plano ativo.");
    }

    const price =
      input.billingCycle === "MONTHLY"
        ? plan.monthlyPrice
        : plan.annualPrice;
    const passwordHash = await hash(input.initialPassword, 12);

    const tenant = await tx.tenant.create({
      data: {
        name: input.name,
        slug: input.slug,
        documentType: normalizeDocument(input.documentNumber)
          ? (input.documentType ?? "CNPJ")
          : null,
        documentNumber: normalizeDocument(input.documentNumber),
        publicDisplayName: optionalText(input.publicDisplayName),
        responsibleName: input.responsibleName,
        email: input.email.toLowerCase(),
        whatsapp: normalizeBrazilianPhone(input.whatsapp),
        segment: input.segment,
        city: input.city,
        state: input.state,
        postalCode: input.postalCode ? onlyDigits(input.postalCode) : null,
        neighborhood: optionalText(input.neighborhood),
        address: optionalText(input.address),
        addressComplement: optionalText(input.addressComplement),
        googleMapsUrl: optionalText(input.googleMapsUrl),
        serviceLocation: input.serviceLocation,
        timezone: input.timezone,
        defaultAppointmentDuration: input.defaultAppointmentDuration,
        defaultSlotInterval: input.defaultSlotInterval,
        minBookingNoticeMinutes: input.minBookingNoticeMinutes,
        maxBookingAdvanceDays: input.maxBookingAdvanceDays,
        description: optionalText(input.description),
        status: input.status,
        onboardingStatus: "SKIPPED",
        onboardingSkippedAt: new Date(),
        subscription: {
          create: {
            planId: plan.id,
            status: "TRIAL",
            billingCycle: input.billingCycle,
            price,
            startsAt: new Date(),
            expiresAt: input.expiresAt,
          },
        },
        tenantUsers: {
          create: {
            role: "OWNER",
            isActive: true,
            user: {
              create: {
                name: input.ownerName,
                email: input.ownerEmail,
                passwordHash,
                globalRole: "USER",
                isActive: true,
              },
            },
          },
        },
      },
      include: {
        subscription: true,
        tenantUsers: {
          where: { role: "OWNER" },
          take: 1,
          include: { user: true },
        },
      },
    });
    const ownerLink = tenant.tenantUsers[0];

    if (!ownerLink) {
      throw new Error("Não foi possível criar o acesso do responsável.");
    }

    await tx.auditLog.create({
      data: {
        tenantId: tenant.id,
        actorType: "SUPER_ADMIN",
        actorId: actor.actorId,
        eventType: AUDIT_EVENTS.TENANT_CREATED,
        description: `Prestador "${tenant.name}" criado com assinatura inicial.`,
        metadata: {
          slug: tenant.slug,
          planId: plan.id,
          subscriptionId: tenant.subscription?.id,
          billingCycle: input.billingCycle,
          expiresAt: input.expiresAt.toISOString(),
        },
        ipAddress: actor.ipAddress,
      },
    });

    const ownerMetadata = {
      tenantId: tenant.id,
      userId: ownerLink.userId,
      email: ownerLink.user.email,
      role: ownerLink.role,
    };

    await tx.auditLog.createMany({
      data: [
        {
          tenantId: tenant.id,
          actorType: "SUPER_ADMIN",
          actorId: actor.actorId,
          eventType: AUDIT_EVENTS.TENANT_OWNER_USER_CREATED,
          description: `Usuário responsável de "${tenant.name}" criado.`,
          metadata: ownerMetadata,
          ipAddress: actor.ipAddress,
        },
        {
          tenantId: tenant.id,
          actorType: "SUPER_ADMIN",
          actorId: actor.actorId,
          eventType: AUDIT_EVENTS.TENANT_OWNER_LINKED,
          description: `Usuário responsável vinculado como OWNER de "${tenant.name}".`,
          metadata: ownerMetadata,
          ipAddress: actor.ipAddress,
        },
      ],
    });

    return tenant;
  });
}

export async function provisionTenantOwner(
  input: ProvisionTenantOwnerInput,
  actor: AdminActorContext,
) {
  return prisma.$transaction(async (tx) => {
    const tenant = await tx.tenant.findUnique({
      where: { id: input.tenantId },
      select: {
        id: true,
        name: true,
        tenantUsers: {
          where: { role: "OWNER" },
          select: { id: true },
          take: 1,
        },
      },
    });

    if (!tenant) {
      throw new Error("Prestador não encontrado.");
    }

    if (tenant.tenantUsers.length > 0) {
      throw new Error("Este prestador já possui um usuário responsável.");
    }

    const existingUser = await tx.user.findUnique({
      where: { email: input.ownerEmail },
      select: { id: true },
    });

    if (existingUser) {
      throw new Error("Já existe um usuário com este e-mail.");
    }

    const passwordHash = await hash(input.initialPassword, 12);
    const user = await tx.user.create({
      data: {
        name: input.ownerName,
        email: input.ownerEmail,
        passwordHash,
        globalRole: "USER",
        isActive: true,
      },
    });
    const link = await tx.tenantUser.create({
      data: {
        tenantId: tenant.id,
        userId: user.id,
        role: "OWNER",
        isActive: true,
      },
    });
    const metadata = {
      tenantId: tenant.id,
      userId: user.id,
      email: user.email,
      role: link.role,
    };

    await tx.auditLog.createMany({
      data: [
        {
          tenantId: tenant.id,
          actorType: "SUPER_ADMIN",
          actorId: actor.actorId,
          eventType: AUDIT_EVENTS.TENANT_OWNER_USER_CREATED,
          description: `Usuário responsável de "${tenant.name}" criado.`,
          metadata,
          ipAddress: actor.ipAddress,
        },
        {
          tenantId: tenant.id,
          actorType: "SUPER_ADMIN",
          actorId: actor.actorId,
          eventType: AUDIT_EVENTS.TENANT_OWNER_LINKED,
          description: `Usuário responsável vinculado como OWNER de "${tenant.name}".`,
          metadata,
          ipAddress: actor.ipAddress,
        },
      ],
    });

    return user;
  });
}

export async function resetTenantOwnerPassword(
  input: ResetTenantOwnerPasswordInput,
  actor: AdminActorContext,
) {
  return prisma.$transaction(async (tx) => {
    const ownerLink = await tx.tenantUser.findFirst({
      where: {
        tenantId: input.tenantId,
        userId: input.userId,
        role: "OWNER",
      },
      include: {
        tenant: { select: { name: true } },
        user: { select: { id: true, email: true } },
      },
    });

    if (!ownerLink) {
      throw new Error("Usuário responsável não encontrado neste prestador.");
    }

    const passwordHash = await hash(input.newPassword, 12);
    await tx.user.update({
      where: { id: ownerLink.userId },
      data: { passwordHash },
    });

    await tx.auditLog.create({
      data: {
        tenantId: ownerLink.tenantId,
        actorType: "SUPER_ADMIN",
        actorId: actor.actorId,
        eventType: AUDIT_EVENTS.TENANT_OWNER_PASSWORD_RESET,
        description: `Senha do responsável de "${ownerLink.tenant.name}" redefinida.`,
        metadata: {
          tenantId: ownerLink.tenantId,
          userId: ownerLink.user.id,
          email: ownerLink.user.email,
        },
        ipAddress: actor.ipAddress,
      },
    });

    return ownerLink.user;
  });
}

export async function updateTenant(
  input: UpdateTenantInput,
  actor: AdminActorContext,
) {
  return prisma.$transaction(async (tx) => {
    const current = await tx.tenant.findUnique({ where: { id: input.id } });

    if (!current) {
      throw new Error("Prestador não encontrado.");
    }

    const duplicateSlug = await tx.tenant.findFirst({
      where: { slug: input.slug, id: { not: input.id } },
      select: { id: true },
    });

    if (duplicateSlug) {
      throw new Error("O slug informado já está em uso.");
    }

    const tenant = await tx.tenant.update({
      where: { id: input.id },
      data: {
        name: input.name,
        slug: input.slug,
        documentType: normalizeDocument(input.documentNumber)
          ? (input.documentType ?? "CNPJ")
          : null,
        documentNumber: normalizeDocument(input.documentNumber),
        publicDisplayName: optionalText(input.publicDisplayName),
        responsibleName: input.responsibleName,
        email: input.email.toLowerCase(),
        whatsapp: normalizeBrazilianPhone(input.whatsapp),
        segment: input.segment,
        city: input.city,
        state: input.state,
        postalCode: input.postalCode ? onlyDigits(input.postalCode) : null,
        neighborhood: optionalText(input.neighborhood),
        address: optionalText(input.address),
        addressComplement: optionalText(input.addressComplement),
        googleMapsUrl: optionalText(input.googleMapsUrl),
        serviceLocation: input.serviceLocation,
        timezone: input.timezone,
        defaultAppointmentDuration: input.defaultAppointmentDuration,
        defaultSlotInterval: input.defaultSlotInterval,
        minBookingNoticeMinutes: input.minBookingNoticeMinutes,
        maxBookingAdvanceDays: input.maxBookingAdvanceDays,
        description: optionalText(input.description),
        status: input.status,
      },
    });

    await tx.auditLog.create({
      data: {
        tenantId: tenant.id,
        actorType: "SUPER_ADMIN",
        actorId: actor.actorId,
        eventType: AUDIT_EVENTS.TENANT_UPDATED,
        description: `Prestador "${tenant.name}" atualizado.`,
        metadata: {
          before: {
            name: current.name,
            slug: current.slug,
            status: current.status,
          },
          after: {
            name: tenant.name,
            slug: tenant.slug,
            status: tenant.status,
          },
        },
        ipAddress: actor.ipAddress,
      },
    });

    if (current.status !== tenant.status) {
      const statusEvent =
        tenant.status === "ACTIVE"
          ? AUDIT_EVENTS.TENANT_REACTIVATED
          : tenant.status === "SUSPENDED"
            ? AUDIT_EVENTS.TENANT_SUSPENDED
            : AUDIT_EVENTS.TENANT_CANCELED;

      await tx.auditLog.create({
        data: {
          tenantId: tenant.id,
          actorType: "SUPER_ADMIN",
          actorId: actor.actorId,
          eventType: statusEvent,
          description: `Status do prestador "${tenant.name}" alterado de ${current.status} para ${tenant.status}.`,
          metadata: {
            previousStatus: current.status,
            newStatus: tenant.status,
            changedDuringEdit: true,
          },
          ipAddress: actor.ipAddress,
        },
      });
    }

    return tenant;
  });
}

export async function changeTenantStatus(
  id: string,
  status: "ACTIVE" | "SUSPENDED" | "CANCELED",
  actor: AdminActorContext,
) {
  return prisma.$transaction(async (tx) => {
    const current = await tx.tenant.findUnique({ where: { id } });

    if (!current) {
      throw new Error("Prestador não encontrado.");
    }

    const tenant = await tx.tenant.update({
      where: { id },
      data: { status },
    });

    const eventType =
      status === "ACTIVE"
        ? AUDIT_EVENTS.TENANT_REACTIVATED
        : status === "SUSPENDED"
          ? AUDIT_EVENTS.TENANT_SUSPENDED
          : AUDIT_EVENTS.TENANT_CANCELED;

    await tx.auditLog.create({
      data: {
        tenantId: tenant.id,
        actorType: "SUPER_ADMIN",
        actorId: actor.actorId,
        eventType,
        description: `Status do prestador "${tenant.name}" alterado de ${current.status} para ${status}.`,
        metadata: {
          previousStatus: current.status,
          newStatus: status,
        },
        ipAddress: actor.ipAddress,
      },
    });

    return tenant;
  });
}
