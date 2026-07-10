import { redirect } from "next/navigation";
import { cache } from "react";

import { AUDIT_EVENTS } from "@/features/audit/audit-events";
import { createAuditLog } from "@/features/audit/audit-log-service";
import {
  canAccessAdmin,
  hasTenantRole,
} from "@/features/auth/authorization-policy";
import { getRequestIpAddress } from "@/features/auth/request-context";
import { getSession } from "@/features/auth/session";
import type { TenantRole } from "@/generated/prisma/client";
import { findActiveTenantContext } from "@/server/repositories/tenant-user-repository";
import { findActiveUserBySession } from "@/server/repositories/user-repository";

const getCachedSession = cache(async () => getSession());

const getCachedCurrentUser = cache(async () => {
  const session = await getCachedSession();

  if (!session) {
    return null;
  }

  return findActiveUserBySession(session.userId, session.email);
});

const getCachedTenantContext = cache(async () => {
  const session = await getCachedSession();

  if (!session) {
    return null;
  }

  return findActiveTenantContext(session.userId, session.activeTenantId);
});

export async function getCurrentUser() {
  return getCachedCurrentUser();
}

export async function requireAuth() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}

export async function requireSuperAdmin() {
  const user = await getCurrentUser();

  if (!user || !canAccessAdmin(user.globalRole)) {
    await createAuditLog({
      actorType: user
        ? String(user.globalRole) === "CUSTOMER"
          ? "CUSTOMER"
          : "TENANT_USER"
        : "SYSTEM",
      actorId: user?.id,
      eventType: AUDIT_EVENTS.ADMIN_ACCESS_DENIED,
      description: "Acesso negado à área administrativa.",
      ipAddress: await getRequestIpAddress(),
    });

    redirect(user ? "/access-denied" : "/login");
  }

  return user;
}

export async function getCurrentTenantContext() {
  return getCachedTenantContext();
}

export async function requireTenantAccess(tenantId?: string) {
  const user = await requireAuth();
  const tenantContext = await getCurrentTenantContext();
  const hasAccess =
    tenantContext && (!tenantId || tenantContext.tenantId === tenantId);

  if (!hasAccess) {
    await createAuditLog({
      actorType:
        String(user.globalRole) === "CUSTOMER" ? "CUSTOMER" : "TENANT_USER",
      actorId: user.id,
      tenantId,
      eventType: AUDIT_EVENTS.TENANT_ACCESS_DENIED,
      description: "Acesso negado à área do prestador.",
      metadata: tenantId ? { requestedTenantId: tenantId } : undefined,
      ipAddress: await getRequestIpAddress(),
    });

    redirect("/access-denied");
  }

  return { user, ...tenantContext };
}

export async function requireTenantRole(
  tenantId: string,
  roles: TenantRole[],
) {
  const context = await requireTenantAccess(tenantId);

  if (!hasTenantRole(context.role, roles)) {
    await createAuditLog({
      actorType: "TENANT_USER",
      actorId: context.user.id,
      tenantId,
      eventType: AUDIT_EVENTS.TENANT_ACCESS_DENIED,
      description: "Papel insuficiente para acessar o recurso do prestador.",
      metadata: {
        currentRole: context.role,
        requiredRoles: roles,
      },
      ipAddress: await getRequestIpAddress(),
    });

    redirect("/access-denied");
  }

  return context;
}

export async function requireProviderManager() {
  const context = await requireTenantAccess();

  if (!hasTenantRole(context.role, ["OWNER", "ADMIN"])) {
    await createAuditLog({
      actorType: "TENANT_USER",
      actorId: context.user.id,
      tenantId: context.tenantId,
      eventType: AUDIT_EVENTS.TENANT_ACCESS_DENIED,
      description: "Papel insuficiente para acessar manutenção do prestador.",
      metadata: {
        currentRole: context.role,
        requiredRoles: ["OWNER", "ADMIN"],
      },
      ipAddress: await getRequestIpAddress(),
    });

    redirect("/access-denied");
  }

  return context;
}

export async function requireProviderOperator() {
  const context = await requireTenantAccess();

  if (!hasTenantRole(context.role, ["OWNER", "ADMIN", "OPERATOR"])) {
    redirect("/access-denied");
  }

  return context;
}

export async function requireCustomer() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?redirectTo=/cliente");
  }

  if (String(user.globalRole) !== "CUSTOMER") {
    redirect("/access-denied");
  }

  return user;
}
