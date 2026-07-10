"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  requireProviderManager,
  requireProviderOperator,
} from "@/features/auth/permissions";
import { getRequestIpAddress } from "@/features/auth/request-context";
import {
  changeAppointmentStatusSchema,
  checkoutAppointmentSchema,
  createAppointmentSchema,
  updateAppointmentSchema,
} from "@/features/appointments/appointment-schemas";
import {
  actionErrorState,
  validationErrorState,
} from "@/server/actions/action-utils";
import {
  changeAppointmentStatus,
  checkoutAppointment,
  createAppointment,
  updateAppointment,
} from "@/server/services/appointment-service";
import type { FormActionState } from "@/types/form-state";

function formDataWithCustomFields(formData: FormData) {
  const data = Object.fromEntries(formData);
  const customFields: Record<string, string> = {};

  for (const [key, value] of formData.entries()) {
    if (key.startsWith("custom_")) {
      customFields[key] = String(value);
    }
  }

  return { ...data, customFields };
}

async function actorFor(role: "operator" | "manager") {
  const context =
    role === "manager"
      ? await requireProviderManager()
      : await requireProviderOperator();
  return {
    actorId: context.user.id,
    tenantId: context.tenantId,
    ipAddress: await getRequestIpAddress(),
  };
}

function appointmentRedirectPath(formData: FormData, appointmentId: string, success: string) {
  const fallback = "/app/appointments";
  const rawReturnTo = formData.get("returnTo");
  const returnTo = typeof rawReturnTo === "string" ? rawReturnTo : fallback;

  try {
    const url = new URL(returnTo, "http://agenda-zap.local");
    if (url.pathname !== "/app/appointments") {
      url.pathname = fallback;
      url.search = "";
    }
    url.searchParams.delete("panel");
    url.searchParams.set("appointmentId", appointmentId);
    url.searchParams.set("success", success);
    return `${url.pathname}?${url.searchParams.toString()}`;
  } catch {
    return `${fallback}?appointmentId=${appointmentId}&success=${success}`;
  }
}

export async function createAppointmentAction(
  _state: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const actor = await actorFor("operator");
  const parsed = createAppointmentSchema.safeParse(
    formDataWithCustomFields(formData),
  );
  if (!parsed.success) return validationErrorState(parsed.error);
  let appointmentId: string;
  try {
    const appointment = await createAppointment(parsed.data, actor);
    appointmentId = appointment.id;
  } catch (error) {
    return actionErrorState(error);
  }
  revalidatePath("/app");
  redirect(appointmentRedirectPath(formData, appointmentId, "created"));
}

export async function updateAppointmentAction(
  _state: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const actor = await actorFor("manager");
  const parsed = updateAppointmentSchema.safeParse(
    formDataWithCustomFields(formData),
  );
  if (!parsed.success) return validationErrorState(parsed.error);
  let appointmentId: string;
  try {
    const appointment = await updateAppointment(parsed.data, actor);
    appointmentId = appointment.id;
  } catch (error) {
    return actionErrorState(error);
  }
  revalidatePath("/app");
  redirect(`/app/appointments?appointmentId=${appointmentId}&success=updated`);
}

export async function changeAppointmentStatusAction(
  _state: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const actor = await actorFor("operator");
  const parsed = changeAppointmentStatusSchema.safeParse(
    Object.fromEntries(formData),
  );
  if (!parsed.success) return validationErrorState(parsed.error);
  try {
    await changeAppointmentStatus(
      parsed.data.id,
      parsed.data.status,
      parsed.data.finalPrice,
      actor,
    );
  } catch (error) {
    return actionErrorState(error);
  }
  revalidatePath("/app");
  redirect(appointmentRedirectPath(formData, parsed.data.id, "status"));
}

export async function checkoutAppointmentAction(
  _state: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const actor = await actorFor("operator");
  const parsed = checkoutAppointmentSchema.safeParse(
    Object.fromEntries(formData),
  );
  if (!parsed.success) return validationErrorState(parsed.error);
  try {
    await checkoutAppointment(parsed.data, actor);
  } catch (error) {
    return actionErrorState(error);
  }
  revalidatePath("/app");
  redirect(`/app/appointments?appointmentId=${parsed.data.id}&success=checkout`);
}
