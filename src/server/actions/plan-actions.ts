"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  createPlanSchema,
  updatePlanSchema,
} from "@/features/plans/plan-schemas";
import { requireSuperAdmin } from "@/features/auth/permissions";
import { getRequestIpAddress } from "@/features/auth/request-context";
import {
  actionErrorState,
  validationErrorState,
} from "@/server/actions/action-utils";
import { createPlan, updatePlan } from "@/server/services/plan-service";
import type { FormActionState } from "@/types/form-state";

function planFormInput(formData: FormData) {
  return {
    ...Object.fromEntries(formData),
    whatsappEnabled: formData.get("whatsappEnabled") === "true",
    publicLinkEnabled: formData.get("publicLinkEnabled") === "true",
    isActive: formData.get("isActive") === "true",
  };
}

export async function createPlanAction(
  _previousState: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const user = await requireSuperAdmin();
  const parsed = createPlanSchema.safeParse(planFormInput(formData));

  if (!parsed.success) {
    return validationErrorState(parsed.error);
  }

  try {
    await createPlan(parsed.data, {
      actorId: user.id,
      ipAddress: await getRequestIpAddress(),
    });
  } catch (error) {
    return actionErrorState(error);
  }
  revalidatePath("/admin");
  redirect("/admin/plans?success=created");
}

export async function updatePlanAction(
  _previousState: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const user = await requireSuperAdmin();
  const parsed = updatePlanSchema.safeParse(planFormInput(formData));

  if (!parsed.success) {
    return validationErrorState(parsed.error);
  }

  try {
    await updatePlan(parsed.data, {
      actorId: user.id,
      ipAddress: await getRequestIpAddress(),
    });
  } catch (error) {
    return actionErrorState(error);
  }
  revalidatePath("/admin");
  redirect("/admin/plans?success=updated");
}
