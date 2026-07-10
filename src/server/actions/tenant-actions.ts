"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  changeTenantStatusSchema,
  createTenantSchema,
  provisionTenantOwnerSchema,
  resetTenantOwnerPasswordSchema,
  updateTenantSchema,
} from "@/features/tenants/tenant-schemas";
import { requireSuperAdmin } from "@/features/auth/permissions";
import { getRequestIpAddress } from "@/features/auth/request-context";
import {
  actionErrorState,
  validationErrorState,
} from "@/server/actions/action-utils";
import {
  changeTenantStatus,
  createTenant,
  provisionTenantOwner,
  resetTenantOwnerPassword,
  updateTenant,
} from "@/server/services/tenant-service";
import type { FormActionState } from "@/types/form-state";

export async function createTenantAction(
  _previousState: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const user = await requireSuperAdmin();
  const parsed = createTenantSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return validationErrorState(parsed.error);
  }

  let tenantId: string;
  try {
    const tenant = await createTenant(parsed.data, {
      actorId: user.id,
      ipAddress: await getRequestIpAddress(),
    });
    tenantId = tenant.id;
  } catch (error) {
    return actionErrorState(error);
  }
  revalidatePath("/admin");
  redirect(`/admin/tenants/${tenantId}/templates?success=created`);
}

export async function updateTenantAction(
  _previousState: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const user = await requireSuperAdmin();
  const parsed = updateTenantSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return validationErrorState(parsed.error);
  }

  let tenantId: string;
  try {
    const tenant = await updateTenant(parsed.data, {
      actorId: user.id,
      ipAddress: await getRequestIpAddress(),
    });
    tenantId = tenant.id;
  } catch (error) {
    return actionErrorState(error);
  }
  revalidatePath("/admin");
  redirect(`/admin/tenants/${tenantId}?success=updated`);
}

export async function changeTenantStatusAction(
  _previousState: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const user = await requireSuperAdmin();
  const parsed = changeTenantStatusSchema.safeParse(
    Object.fromEntries(formData),
  );

  if (!parsed.success) {
    return validationErrorState(parsed.error);
  }

  try {
    await changeTenantStatus(parsed.data.id, parsed.data.status, {
      actorId: user.id,
      ipAddress: await getRequestIpAddress(),
    });
  } catch (error) {
    return actionErrorState(error);
  }
  revalidatePath("/admin");
  redirect(`/admin/tenants/${parsed.data.id}?success=status`);
}

export async function provisionTenantOwnerAction(
  _previousState: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const user = await requireSuperAdmin();
  const parsed = provisionTenantOwnerSchema.safeParse(
    Object.fromEntries(formData),
  );

  if (!parsed.success) {
    return validationErrorState(parsed.error);
  }

  try {
    await provisionTenantOwner(parsed.data, {
      actorId: user.id,
      ipAddress: await getRequestIpAddress(),
    });
  } catch (error) {
    return actionErrorState(error);
  }

  revalidatePath("/admin");
  redirect(`/admin/tenants/${parsed.data.tenantId}?success=owner-created`);
}

export async function resetTenantOwnerPasswordAction(
  _previousState: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const user = await requireSuperAdmin();
  const parsed = resetTenantOwnerPasswordSchema.safeParse(
    Object.fromEntries(formData),
  );

  if (!parsed.success) {
    return validationErrorState(parsed.error);
  }

  try {
    await resetTenantOwnerPassword(parsed.data, {
      actorId: user.id,
      ipAddress: await getRequestIpAddress(),
    });
  } catch (error) {
    return actionErrorState(error);
  }

  revalidatePath("/admin");
  redirect(`/admin/tenants/${parsed.data.tenantId}?success=password-reset`);
}
