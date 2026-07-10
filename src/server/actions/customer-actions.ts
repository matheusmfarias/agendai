"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  requireProviderManager,
  requireProviderOperator,
} from "@/features/auth/permissions";
import { getRequestIpAddress } from "@/features/auth/request-context";
import {
  changeCustomerStatusSchema,
  createCustomerSchema,
  updateCustomerSchema,
} from "@/features/customers/customer-schemas";
import {
  actionErrorState,
  validationErrorState,
} from "@/server/actions/action-utils";
import {
  changeCustomerStatus,
  createCustomer,
  updateCustomerAvatar,
  updateCustomer,
} from "@/server/services/customer-service";
import type { FormActionState } from "@/types/form-state";

async function operatorActor() {
  const context = await requireProviderOperator();
  return {
    actorId: context.user.id,
    tenantId: context.tenantId,
    ipAddress: await getRequestIpAddress(),
  };
}

async function managerActor() {
  const context = await requireProviderManager();
  return {
    actorId: context.user.id,
    tenantId: context.tenantId,
    ipAddress: await getRequestIpAddress(),
  };
}

function customerRedirectPath(formData: FormData, customerId: string, success: string) {
  const fallback = "/app/customers";
  const rawReturnTo = formData.get("returnTo");
  const returnTo = typeof rawReturnTo === "string" ? rawReturnTo : fallback;

  try {
    const url = new URL(returnTo, "http://agenda-zap.local");
    if (url.pathname !== fallback) {
      url.pathname = fallback;
      url.search = "";
    }
    url.searchParams.delete("panel");
    url.searchParams.delete("mode");
    url.searchParams.set("customerId", customerId);
    url.searchParams.set("success", success);
    url.searchParams.set("refresh", String(Date.now()));
    return `${url.pathname}?${url.searchParams.toString()}`;
  } catch {
    return `${fallback}?customerId=${customerId}&success=${success}&refresh=${Date.now()}`;
  }
}

async function saveCustomerAvatarFile(customerId: string, formData: FormData) {
  const file = formData.get("avatar");
  if (!file || !(file instanceof File) || !file.size) return null;

  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
  if (!allowedTypes.includes(file.type)) {
    throw new Error("Formato inválido. Use JPEG, PNG ou WebP.");
  }

  const maxSize = 2 * 1024 * 1024;
  if (file.size > maxSize) {
    throw new Error("A imagem deve ter no máximo 2 MB.");
  }

  const ext = file.type.split("/")[1] === "jpeg" ? "jpg" : file.type.split("/")[1];
  const fileKey = `${customerId}-${Date.now()}.${ext}`;
  const fs = await import("fs/promises");
  const path = await import("path");
  const uploadsDir = path.join(
    process.cwd(),
    "storage",
    "uploads",
    "customer-avatars",
  );
  await fs.mkdir(uploadsDir, { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(path.join(uploadsDir, fileKey), buffer);

  return {
    avatarUrl: `/api/customer/avatar/${fileKey}`,
    avatarFileKey: fileKey,
  };
}

export async function createCustomerAction(
  _state: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const actor = await operatorActor();
  const parsed = createCustomerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return validationErrorState(parsed.error);
  let customerId: string;
  try {
    const customer = await createCustomer(parsed.data, actor);
    customerId = customer.id;
    const avatar = await saveCustomerAvatarFile(customerId, formData);
    if (avatar) await updateCustomerAvatar(customerId, actor, avatar);
  } catch (error) {
    return actionErrorState(error);
  }
  revalidatePath("/app");
  revalidatePath("/app/customers");
  redirect(customerRedirectPath(formData, customerId, "created"));
}

export async function updateCustomerAction(
  _state: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const actor = await managerActor();
  const parsed = updateCustomerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return validationErrorState(parsed.error);
  let customerId: string;
  try {
    const customer = await updateCustomer(parsed.data, actor);
    customerId = customer.id;
    const avatar = await saveCustomerAvatarFile(customerId, formData);
    if (avatar) await updateCustomerAvatar(customerId, actor, avatar);
  } catch (error) {
    return actionErrorState(error);
  }
  revalidatePath("/app");
  revalidatePath("/app/customers");
  redirect(customerRedirectPath(formData, customerId, "updated"));
}

export async function changeCustomerStatusAction(
  _state: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const actor = await managerActor();
  const parsed = changeCustomerStatusSchema.safeParse(
    Object.fromEntries(formData),
  );
  if (!parsed.success) return validationErrorState(parsed.error);
  try {
    await changeCustomerStatus(parsed.data.id, parsed.data.isActive, actor);
  } catch (error) {
    return actionErrorState(error);
  }
  revalidatePath("/app");
  revalidatePath("/app/customers");
  redirect(customerRedirectPath(formData, parsed.data.id, "status"));
}
