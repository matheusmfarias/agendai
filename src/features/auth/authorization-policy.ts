import type { GlobalRole, TenantRole } from "@/generated/prisma/client";

export function canAccessAdmin(globalRole: GlobalRole) {
  return globalRole === "SUPER_ADMIN";
}

export function hasTenantRole(
  currentRole: TenantRole,
  allowedRoles: TenantRole[],
) {
  return allowedRoles.includes(currentRole);
}
