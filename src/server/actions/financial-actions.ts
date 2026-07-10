"use server";

import { revalidatePath } from "next/cache";

import { requireProviderOperator } from "@/features/auth/permissions";
import { getRequestIpAddress } from "@/features/auth/request-context";
import {
  checkoutAppointmentSchema,
} from "@/features/appointments/appointment-schemas";
import {
  cancelFinancialEntrySchema,
  createFinancialEntrySchema,
  markFinancialEntryAsPaidSchema,
  refundFinancialEntrySchema,
  registerFinancialPaymentSchema,
  updateFinancialEntrySchema,
  updateFinancialSettingsSchema,
} from "@/features/provider-financial/financial-schemas";
import {
  actionErrorState,
  validationErrorState,
} from "@/server/actions/action-utils";
import {
  cancelFinancialEntry,
  createFinancialEntry,
  markFinancialEntryAsPaid,
  refundFinancialEntry,
  registerFinancialPayment,
  updateFinancialEntry,
  updateFinancialSettings,
} from "@/server/services/financial-service";
import { checkoutAppointment } from "@/server/services/appointment-service";
import type { FormActionState } from "@/types/form-state";

async function actorForFinancialAction() {
  const context = await requireProviderOperator();
  return {
    actorId: context.user.id,
    tenantId: context.tenantId,
    ipAddress: await getRequestIpAddress(),
  };
}

export async function createFinancialEntryAction(
  _state: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const actor = await actorForFinancialAction();
  const parsed = createFinancialEntrySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return validationErrorState(parsed.error);

  try {
    await createFinancialEntry(parsed.data, actor);
  } catch (error) {
    return actionErrorState(error);
  }

  revalidatePath("/app");
  revalidatePath("/app/financial");
  return { success: true, message: "Lançamento salvo." };
}

export async function markFinancialEntryAsPaidAction(
  _state: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const actor = await actorForFinancialAction();
  const parsed = markFinancialEntryAsPaidSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return validationErrorState(parsed.error);

  try {
    await markFinancialEntryAsPaid(parsed.data.id, actor, {
      paidAt: parsed.data.paidAt,
      paymentMethod: parsed.data.paymentMethod,
    });
  } catch (error) {
    return actionErrorState(error);
  }

  revalidatePath("/app");
  revalidatePath("/app/financial");
  return { success: true, message: "Pagamento registrado." };
}

export async function registerFinancialPaymentAction(
  _state: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const actor = await actorForFinancialAction();
  const parsed = registerFinancialPaymentSchema.safeParse(
    Object.fromEntries(formData),
  );
  if (!parsed.success) return validationErrorState(parsed.error);

  try {
    await registerFinancialPayment(parsed.data, actor);
  } catch (error) {
    return actionErrorState(error);
  }

  revalidatePath("/app");
  revalidatePath("/app/financial");
  return { success: true, message: "Pagamento registrado." };
}

export async function refundFinancialEntryAction(
  _state: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const actor = await actorForFinancialAction();
  const parsed = refundFinancialEntrySchema.safeParse(
    Object.fromEntries(formData),
  );
  if (!parsed.success) return validationErrorState(parsed.error);

  try {
    await refundFinancialEntry(parsed.data, actor);
  } catch (error) {
    return actionErrorState(error);
  }

  revalidatePath("/app");
  revalidatePath("/app/financial");
  return { success: true, message: "Estorno registrado." };
}

export async function updateFinancialEntryAction(
  _state: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const actor = await actorForFinancialAction();
  const parsed = updateFinancialEntrySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return validationErrorState(parsed.error);

  try {
    await updateFinancialEntry(parsed.data, actor);
  } catch (error) {
    return actionErrorState(error);
  }

  revalidatePath("/app");
  revalidatePath("/app/financial");
  return { success: true, message: "Lançamento atualizado." };
}

export async function cancelFinancialEntryAction(
  _state: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const actor = await actorForFinancialAction();
  const parsed = cancelFinancialEntrySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return validationErrorState(parsed.error);

  try {
    await cancelFinancialEntry(parsed.data.id, parsed.data.reason, actor);
  } catch (error) {
    return actionErrorState(error);
  }

  revalidatePath("/app");
  revalidatePath("/app/financial");
  return { success: true, message: "Lançamento cancelado." };
}

export async function updateFinancialSettingsAction(
  _state: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const actor = await actorForFinancialAction();
  const payload = {
    ...Object.fromEntries(formData),
    acceptedMethods: formData.getAll("acceptedMethods"),
  };
  const parsed = updateFinancialSettingsSchema.safeParse(
    payload,
  );
  if (!parsed.success) return validationErrorState(parsed.error);

  try {
    await updateFinancialSettings(parsed.data, actor);
  } catch (error) {
    return actionErrorState(error);
  }

  revalidatePath("/app/financial");
  return { success: true, message: "Configurações salvas." };
}

export async function checkoutFinancialAppointmentAction(
  _state: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const actor = await actorForFinancialAction();
  const parsed = checkoutAppointmentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return validationErrorState(parsed.error);

  try {
    await checkoutAppointment(parsed.data, actor);
  } catch (error) {
    return actionErrorState(error);
  }

  revalidatePath("/app");
  revalidatePath("/app/financial");
  revalidatePath("/app/appointments");
  return { success: true, message: "Checkout concluído." };
}
