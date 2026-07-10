"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireProviderManager } from "@/features/auth/permissions";
import { getRequestIpAddress } from "@/features/auth/request-context";
import {
  changeAvailabilityRuleStatusSchema,
  changeCustomFieldStatusSchema,
  changeServiceCategoryStatusSchema,
  changeServiceStatusSchema,
  createAvailabilityRuleSchema,
  createCustomFieldSchema,
  createScheduleBlockSchema,
  createServiceCategorySchema,
  createServiceSchema,
  deleteScheduleBlockSchema,
  providerSettingsSchema,
  updateAvailabilityRuleSchema,
  updateCustomFieldSchema,
  updateScheduleBlockSchema,
  updateServiceCategorySchema,
  updateServiceSchema,
} from "@/features/provider/provider-schemas";
import {
  actionErrorState,
  validationErrorState,
} from "@/server/actions/action-utils";
import { SERVICE_SUCCESS_CODES } from "@/features/provider-services/service-success";
import {
  changeAvailabilityRuleStatus,
  changeCustomFieldStatus,
  changeServiceCategoryStatus,
  changeServiceStatus,
  createAvailabilityRule,
  createCustomField,
  createScheduleBlock,
  createService,
  createServiceCategory,
  deleteScheduleBlock,
  updateAvailabilityRule,
  updateCustomField,
  updateProviderSettings,
  updateScheduleBlock,
  updateService,
  updateServiceCategory,
} from "@/server/services/provider-service";
import type { FormActionState } from "@/types/form-state";

async function getProviderActor() {
  const context = await requireProviderManager();
  return {
    actorId: context.user.id,
    tenantId: context.tenantId,
    ipAddress: await getRequestIpAddress(),
  };
}

function scheduleBlockRedirectPath(formData: FormData, success: string) {
  const fallback = "/app/availability";
  const rawReturnTo = formData.get("returnTo");
  const returnTo = typeof rawReturnTo === "string" ? rawReturnTo : fallback;

  try {
    const url = new URL(returnTo, "http://agenda-zap.local");
    if (
      url.pathname !== "/app/appointments" &&
      url.pathname !== "/app/availability" &&
      url.pathname !== "/app/availability/blocks"
    ) {
      url.pathname = fallback;
      url.search = "";
    }
    if (url.pathname === "/app/availability/blocks") {
      url.pathname = fallback;
      url.searchParams.set("tab", "blocks");
    }
    if (url.pathname === fallback) {
      url.searchParams.set("tab", "blocks");
    }
    url.searchParams.delete("panel");
    url.searchParams.delete("mode");
    url.searchParams.delete("blockId");
    url.searchParams.delete("startTime");
    url.searchParams.set("success", success);
    return `${url.pathname}?${url.searchParams.toString()}`;
  } catch {
    return `${fallback}?tab=blocks&success=${success}`;
  }
}

function safeAppRedirectPath(formData: FormData, fallback: string, success: string) {
  const rawReturnTo = formData.get("returnTo");
  const returnTo = typeof rawReturnTo === "string" ? rawReturnTo : fallback;

  try {
    const url = new URL(returnTo, "http://agenda-zap.local");
    if (!url.pathname.startsWith("/app/")) {
      url.pathname = fallback;
      url.search = "";
    }
    url.searchParams.delete("panel");
    url.searchParams.delete("mode");
    url.searchParams.delete("ruleId");
    url.searchParams.delete("blockId");
    url.searchParams.delete("startTime");
    url.searchParams.delete("field");
    url.searchParams.delete("fieldId");
    url.searchParams.set("success", success);
    return `${url.pathname}?${url.searchParams.toString()}`;
  } catch {
    return `${fallback}?success=${success}`;
  }
}

async function runAction<T>(
  schema: { safeParse: (input: unknown) => { success: true; data: T } | { success: false; error: Parameters<typeof validationErrorState>[0] } },
  formData: FormData,
  operation: (input: T, actor: Awaited<ReturnType<typeof getProviderActor>>) => Promise<unknown>,
): Promise<FormActionState> {
  const actor = await getProviderActor();
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return validationErrorState(parsed.error);
  try {
    await operation(parsed.data, actor);
    return {};
  } catch (error) {
    return actionErrorState(error);
  }
}

export async function updateProviderSettingsAction(
  _state: FormActionState,
  formData: FormData,
) {
  const actor = await getProviderActor();
  const parsed = providerSettingsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return validationErrorState(parsed.error);

  try {
    const logo = await saveTenantLogoFile(actor.tenantId, formData);
    await updateProviderSettings({ ...parsed.data, ...logo }, actor);
  } catch (error) {
    return actionErrorState(error);
  }

  revalidatePath("/app");
  const tenantSlug = formData.get("tenantSlug");
  if (typeof tenantSlug === "string" && tenantSlug) {
    revalidatePath(`/${tenantSlug}`);
  }
  redirect("/app/settings?success=updated");
}

async function saveTenantLogoFile(tenantId: string, formData: FormData) {
  const file = formData.get("logoFile");
  if (!file || !(file instanceof File) || !file.size) {
    return {};
  }

  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
  if (!allowedTypes.includes(file.type)) {
    throw new Error("Formato inválido. Use JPEG, PNG ou WebP.");
  }

  const maxSize = 2 * 1024 * 1024;
  if (file.size > maxSize) {
    throw new Error("A imagem deve ter no máximo 2 MB.");
  }

  const ext = file.type.split("/")[1] === "jpeg" ? "jpg" : file.type.split("/")[1];
  const fileKey = `${tenantId}-${Date.now()}.${ext}`;
  const fs = await import("fs/promises");
  const path = await import("path");
  const uploadsDir = path.join(
    process.cwd(),
    "storage",
    "uploads",
    "provider-logos",
  );
  await fs.mkdir(uploadsDir, { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(path.join(uploadsDir, fileKey), buffer);

  return {
    logoUrl: `/api/provider/logo/${fileKey}`,
    logoFileKey: fileKey,
  };
}

export async function createServiceCategoryAction(_state: FormActionState, formData: FormData) {
  const result = await runAction(createServiceCategorySchema, formData, createServiceCategory);
  if (result.message) return result;
  revalidatePath("/app");
  redirect(safeAppRedirectPath(formData, "/app/services/categories", SERVICE_SUCCESS_CODES.categoryCreated));
}

export async function updateServiceCategoryAction(_state: FormActionState, formData: FormData) {
  const result = await runAction(updateServiceCategorySchema, formData, updateServiceCategory);
  if (result.message) return result;
  revalidatePath("/app");
  redirect(safeAppRedirectPath(formData, "/app/services/categories", SERVICE_SUCCESS_CODES.categoryUpdated));
}

export async function changeServiceCategoryStatusAction(_state: FormActionState, formData: FormData) {
  const result = await runAction(changeServiceCategoryStatusSchema, formData, (input, actor) =>
    changeServiceCategoryStatus(input.id, input.isActive, actor),
  );
  if (result.message) return result;
  revalidatePath("/app");
  redirect(safeAppRedirectPath(formData, "/app/services/categories", SERVICE_SUCCESS_CODES.categoryStatus));
}

export async function createServiceAction(_state: FormActionState, formData: FormData) {
  const result = await runAction(createServiceSchema, formData, createService);
  if (result.message) return result;
  revalidatePath("/app");
  redirect(safeAppRedirectPath(formData, "/app/services", SERVICE_SUCCESS_CODES.serviceCreated));
}

export async function updateServiceAction(_state: FormActionState, formData: FormData) {
  const result = await runAction(updateServiceSchema, formData, updateService);
  if (result.message) return result;
  revalidatePath("/app");
  redirect(safeAppRedirectPath(formData, "/app/services", SERVICE_SUCCESS_CODES.serviceUpdated));
}

export async function changeServiceStatusAction(_state: FormActionState, formData: FormData) {
  const result = await runAction(changeServiceStatusSchema, formData, (input, actor) =>
    changeServiceStatus(input.id, input.isActive, actor),
  );
  if (result.message) return result;
  revalidatePath("/app");
  redirect(safeAppRedirectPath(formData, "/app/services", SERVICE_SUCCESS_CODES.serviceStatus));
}

export async function createCustomFieldAction(_state: FormActionState, formData: FormData) {
  let serviceId = "";
  const result = await runAction(createCustomFieldSchema, formData, async (input, actor) => {
    serviceId = input.serviceId;
    return createCustomField(input, actor);
  });
  if (result.message) return result;
  revalidatePath("/app");
  redirect(safeAppRedirectPath(formData, `/app/services/${serviceId}`, "field-created"));
}

export async function updateCustomFieldAction(_state: FormActionState, formData: FormData) {
  let serviceId = "";
  const result = await runAction(updateCustomFieldSchema, formData, async (input, actor) => {
    serviceId = input.serviceId;
    return updateCustomField(input, actor);
  });
  if (result.message) return result;
  revalidatePath("/app");
  redirect(safeAppRedirectPath(formData, `/app/services/${serviceId}`, "field-updated"));
}

export async function changeCustomFieldStatusAction(_state: FormActionState, formData: FormData) {
  let serviceId = "";
  const result = await runAction(changeCustomFieldStatusSchema, formData, async (input, actor) => {
    serviceId = input.serviceId;
    return changeCustomFieldStatus(input.id, input.serviceId, input.isActive, actor);
  });
  if (result.message) return result;
  revalidatePath("/app");
  redirect(safeAppRedirectPath(formData, `/app/services/${serviceId}`, "field-status"));
}

export async function createAvailabilityRuleAction(_state: FormActionState, formData: FormData) {
  const result = await runAction(createAvailabilityRuleSchema, formData, createAvailabilityRule);
  if (result.message) return result;
  revalidatePath("/app");
  redirect(safeAppRedirectPath(formData, "/app/availability", "created"));
}

export async function updateAvailabilityRuleAction(_state: FormActionState, formData: FormData) {
  const result = await runAction(updateAvailabilityRuleSchema, formData, updateAvailabilityRule);
  if (result.message) return result;
  revalidatePath("/app");
  redirect(safeAppRedirectPath(formData, "/app/availability", "updated"));
}

export async function changeAvailabilityRuleStatusAction(_state: FormActionState, formData: FormData) {
  const result = await runAction(changeAvailabilityRuleStatusSchema, formData, (input, actor) =>
    changeAvailabilityRuleStatus(input.id, input.isActive, actor),
  );
  if (result.message) return result;
  revalidatePath("/app");
  redirect(safeAppRedirectPath(formData, "/app/availability", "status"));
}

export async function createScheduleBlockAction(_state: FormActionState, formData: FormData) {
  const result = await runAction(createScheduleBlockSchema, formData, createScheduleBlock);
  if (result.message) return result;
  revalidatePath("/app");
  redirect(scheduleBlockRedirectPath(formData, "block-created"));
}

export async function updateScheduleBlockAction(_state: FormActionState, formData: FormData) {
  const result = await runAction(updateScheduleBlockSchema, formData, updateScheduleBlock);
  if (result.message) return result;
  revalidatePath("/app");
  redirect(scheduleBlockRedirectPath(formData, "block-updated"));
}

export async function deleteScheduleBlockAction(_state: FormActionState, formData: FormData) {
  const result = await runAction(deleteScheduleBlockSchema, formData, (input, actor) =>
    deleteScheduleBlock(input.id, actor),
  );
  if (result.message) return result;
  revalidatePath("/app");
  redirect(scheduleBlockRedirectPath(formData, "block-deleted"));
}
