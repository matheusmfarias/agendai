"use server";

import { redirect } from "next/navigation";

import { getRequestIpAddress } from "@/features/auth/request-context";
import { getSession } from "@/features/auth/session";
import { publicBookingSchema } from "@/features/public-booking/public-booking-schemas";
import { createPublicBooking } from "@/features/public-booking/public-booking-service";
import type { FormActionState } from "@/types/form-state";

function collectCustomFields(formData: FormData) {
  const customFields: Record<string, string> = {};

  for (const [key, value] of formData.entries()) {
    if (key.startsWith("custom_")) {
      customFields[key] = String(value);
    }
  }

  return customFields;
}

export async function createPublicBookingAction(
  _state: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const parsed = publicBookingSchema.safeParse({
    tenantSlug: formData.get("tenantSlug"),
    serviceId: formData.get("serviceId"),
    startsAt: formData.get("startsAt"),
    customerNotes: formData.get("customerNotes"),
    customFields: collectCustomFields(formData),
  });

  if (!parsed.success) {
    return {
      message: "Revise os campos informados.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const session = await getSession();
  if (!session || session.globalRole !== "CUSTOMER") {
    return {
      message: "Para concluir o agendamento, faça login ou crie sua conta.",
    };
  }

  let appointmentId: string;

  try {
    const result = await createPublicBooking(
      parsed.data,
      session.userId,
      await getRequestIpAddress(),
    );
    appointmentId = result.appointmentId;
  } catch (error) {
    const fieldErrors =
      typeof error === "object" && error !== null && "fieldErrors" in error
        ? (error.fieldErrors as Record<string, string[]>)
        : undefined;

    return {
      message:
        error instanceof Error
          ? error.message
          : "Não foi possível concluir o agendamento.",
      fieldErrors,
    };
  }

  redirect(
    `/${parsed.data.tenantSlug}/book/confirm?appointmentId=${appointmentId}`,
  );
}
