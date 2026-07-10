"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireSuperAdmin } from "@/features/auth/permissions";
import { getRequestIpAddress } from "@/features/auth/request-context";
import {
  changeExpirationSchema,
  changeSubscriptionStatusSchema,
  registerPaymentSchema,
  updateSubscriptionSchema,
} from "@/features/subscriptions/subscription-schemas";
import {
  actionErrorState,
  validationErrorState,
} from "@/server/actions/action-utils";
import {
  changeSubscriptionExpiration,
  changeSubscriptionStatus,
  registerManualPayment,
  updateSubscription,
} from "@/server/services/subscription-service";
import type { FormActionState } from "@/types/form-state";

export async function updateSubscriptionAction(
  _previousState: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const user = await requireSuperAdmin();
  const parsed = updateSubscriptionSchema.safeParse(
    Object.fromEntries(formData),
  );

  if (!parsed.success) {
    return validationErrorState(parsed.error);
  }

  try {
    await updateSubscription(parsed.data, {
      actorId: user.id,
      ipAddress: await getRequestIpAddress(),
    });
  } catch (error) {
    return actionErrorState(error);
  }
  revalidatePath("/admin");
  redirect(`/admin/subscriptions/${parsed.data.id}?success=updated`);
}

export async function registerPaymentAction(
  _previousState: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const user = await requireSuperAdmin();
  const parsed = registerPaymentSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return validationErrorState(parsed.error);
  }

  try {
    await registerManualPayment(parsed.data, {
      actorId: user.id,
      ipAddress: await getRequestIpAddress(),
    });
  } catch (error) {
    return actionErrorState(error);
  }
  revalidatePath("/admin");
  redirect(`/admin/subscriptions/${parsed.data.id}?success=payment`);
}

export async function changeExpirationAction(
  _previousState: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const user = await requireSuperAdmin();
  const parsed = changeExpirationSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return validationErrorState(parsed.error);
  }

  try {
    await changeSubscriptionExpiration(parsed.data, {
      actorId: user.id,
      ipAddress: await getRequestIpAddress(),
    });
  } catch (error) {
    return actionErrorState(error);
  }
  revalidatePath("/admin");
  redirect(`/admin/subscriptions/${parsed.data.id}?success=expiration`);
}

export async function changeSubscriptionStatusAction(
  _previousState: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const user = await requireSuperAdmin();
  const parsed = changeSubscriptionStatusSchema.safeParse(
    Object.fromEntries(formData),
  );

  if (!parsed.success) {
    return validationErrorState(parsed.error);
  }

  try {
    await changeSubscriptionStatus(parsed.data.id, parsed.data.status, {
      actorId: user.id,
      ipAddress: await getRequestIpAddress(),
    });
  } catch (error) {
    return actionErrorState(error);
  }
  revalidatePath("/admin");
  redirect(`/admin/subscriptions/${parsed.data.id}?success=status`);
}
