import { hasTenantRole } from "@/features/auth/authorization-policy";
import { getCurrentTenantContext, getCurrentUser } from "@/features/auth/permissions";

export async function getWhatsAppManagerContext() {
  const [user, context] = await Promise.all([
    getCurrentUser(),
    getCurrentTenantContext(),
  ]);
  if (!user || !context || !hasTenantRole(context.role, ["OWNER", "ADMIN"])) {
    return null;
  }
  return { user, context };
}
