import { compare } from "bcryptjs";

import { findUserForAuthentication } from "@/server/repositories/user-repository";

export async function authenticateUser(email: string, password: string) {
  const user = await findUserForAuthentication(email);

  if (!user || !user.isActive) {
    return null;
  }

  const passwordMatches = await compare(password, user.passwordHash);

  if (!passwordMatches) {
    return null;
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    globalRole: user.globalRole,
    activeTenantId: user.tenantUsers[0]?.tenantId ?? null,
  };
}
