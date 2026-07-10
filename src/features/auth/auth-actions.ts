"use server";

import { redirect } from "next/navigation";

import { AUDIT_EVENTS } from "@/features/audit/audit-events";
import { createAuditLog } from "@/features/audit/audit-log-service";
import { authenticateUser } from "@/features/auth/auth-service";
import { getRequestIpAddress } from "@/features/auth/request-context";
import { loginSchema } from "@/features/auth/auth-schemas";
import {
  createSession,
  deleteSession,
  getSession,
} from "@/features/auth/session";
import { updateUserLastLogin } from "@/server/repositories/user-repository";

export type LoginActionState = {
  message?: string;
  fieldErrors?: {
    email?: string[];
    password?: string[];
  };
};

export async function loginAction(
  _previousState: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> {
  const parsedInput = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsedInput.success) {
    return {
      message: "Revise os campos informados.",
      fieldErrors: parsedInput.error.flatten().fieldErrors,
    };
  }

  const ipAddress = await getRequestIpAddress();
  const user = await authenticateUser(
    parsedInput.data.email,
    parsedInput.data.password,
  );

  if (!user) {
    await createAuditLog({
      actorType: "SYSTEM",
      eventType: AUDIT_EVENTS.LOGIN_FAILED,
      description: "Tentativa de login inválida.",
      metadata: { email: parsedInput.data.email },
      ipAddress,
    });

    return {
      message: "E-mail ou senha inválidos.",
    };
  }

  await updateUserLastLogin(user.id);

  await createAuditLog({
    actorType:
      user.globalRole === "SUPER_ADMIN"
        ? "SUPER_ADMIN"
        : String(user.globalRole) === "CUSTOMER"
          ? "CUSTOMER"
          : "TENANT_USER",
    actorId: user.id,
    tenantId: user.activeTenantId,
    eventType: AUDIT_EVENTS.LOGIN_SUCCESS,
    description: "Login realizado com sucesso.",
    ipAddress,
  });

  await createSession({
    userId: user.id,
    email: user.email,
    globalRole: user.globalRole,
    activeTenantId: user.activeTenantId,
  });

  redirect(
    user.globalRole === "SUPER_ADMIN"
      ? "/admin/dashboard"
      : String(user.globalRole) === "CUSTOMER"
        ? "/"
        : "/app/dashboard",
  );
}

export async function logoutAction() {
  const session = await getSession();

  if (session) {
    await createAuditLog({
      actorType:
        session.globalRole === "SUPER_ADMIN"
          ? "SUPER_ADMIN"
          : String(session.globalRole) === "CUSTOMER"
            ? "CUSTOMER"
            : "TENANT_USER",
      actorId: session.userId,
      tenantId: session.activeTenantId,
      eventType: AUDIT_EVENTS.LOGOUT,
      description: "Logout realizado.",
      ipAddress: await getRequestIpAddress(),
    });
  }

  await deleteSession();
  redirect("/login");
}
