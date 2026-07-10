import { AUDIT_EVENTS } from "@/features/audit/audit-events";
import {
  normalizeCustomerEmail,
  normalizeCustomerPhone,
} from "@/features/customers/customer-normalization";
import type {
  CreateCustomerInput,
  UpdateCustomerInput,
} from "@/features/customers/customer-schemas";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export type OperationalActorContext = {
  actorId: string;
  tenantId: string;
  ipAddress?: string | null;
};

class CustomerDuplicateError extends Error {
  fieldErrors: Record<string, string[]>;

  constructor(field: "phone" | "email", customerName: string) {
    const label = field === "phone" ? "telefone" : "e-mail";
    const message = `Já existe um cliente cadastrado com este ${label}: ${customerName}.`;
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

async function assertNoDuplicateCustomer(
  tx: Prisma.TransactionClient,
  actor: OperationalActorContext,
  input: Pick<CreateCustomerInput, "phone" | "email">,
  ignoreId?: string,
) {
  const phone = normalizeCustomerPhone(input.phone);
  const email = normalizeCustomerEmail(input.email);
  const candidates = await tx.customer.findMany({
    where: {
      tenantId: actor.tenantId,
      ...(ignoreId ? { id: { not: ignoreId } } : {}),
    },
    select: { name: true, phone: true, email: true },
  });

  const samePhone = candidates.find(
    (customer) => normalizeCustomerPhone(customer.phone) === phone,
  );
  if (samePhone) throw new CustomerDuplicateError("phone", samePhone.name);

  const sameEmail = candidates.find(
    (customer) =>
      email !== null && normalizeCustomerEmail(customer.email) === email,
  );
  if (sameEmail) throw new CustomerDuplicateError("email", sameEmail.name);
}

export async function createCustomer(
  input: CreateCustomerInput,
  actor: OperationalActorContext,
) {
  return prisma.$transaction(async (tx) => {
    await assertNoDuplicateCustomer(tx, actor, input);
    const customer = await tx.customer.create({
      data: {
        tenantId: actor.tenantId,
        name: input.name,
        phone: normalizeCustomerPhone(input.phone),
        email: normalizeCustomerEmail(input.email),
        notes: input.notes,
        isActive: input.isActive,
      },
    });
    await tx.auditLog.create({
      data: auditData(
        actor,
        AUDIT_EVENTS.CUSTOMER_CREATED,
        `Cliente "${customer.name}" criado.`,
        { customerId: customer.id, phone: customer.phone },
      ),
    });
    return customer;
  });
}

export async function updateCustomer(
  input: UpdateCustomerInput,
  actor: OperationalActorContext,
) {
  return prisma.$transaction(async (tx) => {
    const current = await tx.customer.findFirst({
      where: { id: input.id, tenantId: actor.tenantId },
    });
    if (!current) throw new Error("Cliente não encontrado.");

    await assertNoDuplicateCustomer(tx, actor, input, current.id);

    const customer = await tx.customer.update({
      where: { id: current.id },
      data: {
        name: input.name,
        phone: normalizeCustomerPhone(input.phone),
        email: normalizeCustomerEmail(input.email),
        notes: input.notes,
        isActive: input.isActive,
      },
    });
    await tx.auditLog.create({
      data: auditData(
        actor,
        AUDIT_EVENTS.CUSTOMER_UPDATED,
        `Cliente "${customer.name}" atualizado.`,
        { customerId: customer.id },
      ),
    });
    if (current.isActive !== customer.isActive) {
      await tx.auditLog.create({
        data: auditData(
          actor,
          AUDIT_EVENTS.CUSTOMER_STATUS_CHANGED,
          `Cliente "${customer.name}" ${customer.isActive ? "ativado" : "inativado"}.`,
          {
            customerId: customer.id,
            previousStatus: current.isActive,
            newStatus: customer.isActive,
          },
        ),
      });
    }
    return customer;
  });
}

export async function changeCustomerStatus(
  id: string,
  isActive: boolean,
  actor: OperationalActorContext,
) {
  return prisma.$transaction(async (tx) => {
    const current = await tx.customer.findFirst({
      where: { id, tenantId: actor.tenantId },
    });
    if (!current) throw new Error("Cliente não encontrado.");
    const customer = await tx.customer.update({
      where: { id: current.id },
      data: { isActive },
    });
    await tx.auditLog.create({
      data: auditData(
        actor,
        AUDIT_EVENTS.CUSTOMER_STATUS_CHANGED,
        `Cliente "${customer.name}" ${isActive ? "ativado" : "inativado"}.`,
        {
          customerId: customer.id,
          previousStatus: current.isActive,
          newStatus: isActive,
        },
      ),
    });
    return customer;
  });
}

export async function updateCustomerAvatar(
  id: string,
  actor: OperationalActorContext,
  data: { avatarUrl: string; avatarFileKey: string },
) {
  return prisma.$executeRaw`
    UPDATE "customers"
    SET
      "avatar_url" = ${data.avatarUrl},
      "avatar_file_key" = ${data.avatarFileKey},
      "updated_at" = NOW()
    WHERE "id" = ${id}::uuid
      AND "tenant_id" = ${actor.tenantId}::uuid
  `;
}
