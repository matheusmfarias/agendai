"use server";

import { hash } from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { createAuditLog } from "@/features/audit/audit-log-service";
import { authenticateUser } from "@/features/auth/auth-service";
import { getRequestIpAddress } from "@/features/auth/request-context";
import { createSession, deleteSession } from "@/features/auth/session";
import { normalizeBrazilianPhone } from "@/lib/input-formatters";
import { prisma } from "@/lib/prisma";
import { updateUserLastLogin } from "@/server/repositories/user-repository";
import type { FormActionState } from "@/types/form-state";

const redirectSchema = z
  .string()
  .trim()
  .startsWith("/", "Retorno inválido.")
  .default("/");

const registerSchema = z
  .object({
    firstName: z.string().trim().min(2, "Informe seu nome.").max(80),
    lastName: z.string().trim().min(2, "Informe seu sobrenome.").max(100),
    email: z
      .string()
      .trim()
      .email("Informe um e-mail válido.")
      .transform((value) => value.toLowerCase()),
    phone: z.string().trim().min(8, "Informe seu telefone.").max(30),
    password: z.string().min(8, "A senha deve ter ao menos 8 caracteres."),
    confirmPassword: z.string().min(1, "Confirme sua senha."),
    redirectTo: redirectSchema,
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "A confirmação deve ser igual à senha.",
  });

const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .email("Informe um e-mail válido.")
    .transform((value) => value.toLowerCase()),
  password: z.string().min(8, "A senha deve ter ao menos 8 caracteres."),
  redirectTo: redirectSchema,
});

const identifyEmailSchema = z.object({
  email: z
    .string()
    .trim()
    .email("Informe um e-mail válido.")
    .transform((value) => value.toLowerCase()),
});

export type PublicCustomerEmailState =
  | {
      status: "idle";
      email?: undefined;
      message?: string;
      fieldErrors?: Record<string, string[] | undefined>;
    }
  | {
      status: "existing" | "new" | "blocked";
      email: string;
      message?: string;
      fieldErrors?: Record<string, string[] | undefined>;
    };

function normalizePhone(value: string) {
  return normalizeBrazilianPhone(value) || value.trim();
}

function safeRedirect(path: string): never {
  redirect(path.startsWith("/") ? path : "/");
}

function appendAuthResult(path: string, value: "login" | "registered") {
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}auth=${value}`;
}

export async function identifyPublicCustomerEmailAction(
  formData: FormData,
): Promise<PublicCustomerEmailState> {
  const parsed = identifyEmailSchema.safeParse({
    email: formData.get("email"),
  });

  if (!parsed.success) {
    return {
      status: "idle",
      message: "Revise os campos informados.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    select: { globalRole: true },
  });

  if (!user) {
    return { status: "new", email: parsed.data.email };
  }

  if (String(user.globalRole) !== "CUSTOMER") {
    return {
      status: "blocked",
      email: parsed.data.email,
      message:
        "Este e-mail não pode ser usado no agendamento público. Use uma conta de cliente.",
    };
  }

  return { status: "existing", email: parsed.data.email };
}

export async function registerPublicCustomerAction(
  _state: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const parsed = registerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      message: "Revise os campos informados.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const existing = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    select: { id: true },
  });

  if (existing) {
    return { message: "Já existe um usuário com este e-mail." };
  }

  const passwordHash = await hash(parsed.data.password, 12);
  const user = await prisma.user.create({
    data: {
      name: `${parsed.data.firstName} ${parsed.data.lastName}`,
      email: parsed.data.email,
      phone: normalizePhone(parsed.data.phone),
      passwordHash,
      globalRole: "CUSTOMER",
      isActive: true,
      lastLoginAt: new Date(),
    } as never,
  });

  await createAuditLog({
    actorType: "CUSTOMER",
    actorId: user.id,
    eventType: "CUSTOMER_USER_REGISTERED",
    description: "Cliente final cadastrado pelo fluxo público.",
    ipAddress: await getRequestIpAddress(),
  });

  await createSession({
    userId: user.id,
    email: user.email,
    globalRole: "CUSTOMER",
    activeTenantId: null,
  });

  revalidatePath(parsed.data.redirectTo);
  safeRedirect(appendAuthResult(parsed.data.redirectTo, "registered"));
}

export async function loginPublicCustomerAction(
  _state: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      message: "Revise os campos informados.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const ipAddress = await getRequestIpAddress();
  const user = await authenticateUser(parsed.data.email, parsed.data.password);

  if (!user || String(user.globalRole) !== "CUSTOMER") {
    await createAuditLog({
      actorType: "SYSTEM",
      eventType: "CUSTOMER_LOGIN_FAILED",
      description: "Tentativa de login público de cliente inválida.",
      metadata: { email: parsed.data.email },
      ipAddress,
    });

    return { message: "E-mail ou senha inválidos." };
  }

  await createAuditLog({
    actorType: "CUSTOMER",
    actorId: user.id,
    eventType: "CUSTOMER_LOGIN_SUCCESS",
    description: "Login público de cliente realizado com sucesso.",
    ipAddress,
  });
  await updateUserLastLogin(user.id);

  await createSession({
    userId: user.id,
    email: user.email,
    globalRole: "CUSTOMER",
    activeTenantId: null,
  });

  revalidatePath(parsed.data.redirectTo);
  safeRedirect(appendAuthResult(parsed.data.redirectTo, "login"));
}

export async function logoutPublicCustomerAction(formData: FormData) {
  await deleteSession();
  const redirectTo = redirectSchema.catch("/").parse(formData.get("redirectTo"));
  safeRedirect(redirectTo);
}
