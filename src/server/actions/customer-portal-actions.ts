"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireCustomer } from "@/features/auth/permissions";
import { normalizeBrazilianPhone } from "@/lib/input-formatters";
import {
  actionErrorState,
  validationErrorState,
} from "@/server/actions/action-utils";
import {
  createAppointmentReview,
  findReviewByAppointment,
  getCustomerAppointment,
  updateCustomerAvatar,
  updateCustomerProfile,
} from "@/server/repositories/customer-portal-repository";

import type { FormActionState } from "@/types/form-state";

// ── Profile schemas ──

const updateProfileSchema = z.object({
  name: z.string().trim().min(2, "Informe seu nome.").max(100),
  phone: z
    .string()
    .trim()
    .transform(normalizeBrazilianPhone)
    .pipe(z.string().min(10, "Informe seu telefone.").max(11)),
});

// ── Review schema ──

const createReviewSchema = z.object({
  appointmentId: z.string().uuid(),
  rating: z
    .number()
    .int()
    .min(1, "Informe a nota.")
    .max(5, "A nota máxima é 5."),
  comment: z
    .string()
    .trim()
    .max(1000, "O comentário deve ter no máximo 1000 caracteres.")
    .optional()
    .transform((v) => (v === "" ? undefined : v)),
});

// ── Actions ──

export async function updateCustomerProfileAction(
  _state: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const user = await requireCustomer();

  const parsed = updateProfileSchema.safeParse(
    Object.fromEntries(formData),
  );
  if (!parsed.success) {
    return validationErrorState(parsed.error);
  }

  try {
    await updateCustomerProfile(user.id, parsed.data);
  } catch {
    return actionErrorState("Erro ao salvar o perfil. Tente novamente.");
  }

  revalidatePath("/cliente/perfil");
  redirect("/cliente/perfil?success=updated_settings");
}

export async function updateCustomerAvatarAction(
  _state: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const user = await requireCustomer();

  const file = formData.get("avatar") as File | null;

  if (!file || !(file instanceof File) || !file.size) {
    return { message: "Selecione uma imagem para o avatar." };
  }

  // Validate type
  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
  if (!allowedTypes.includes(file.type)) {
    return { message: "Formato inválido. Use JPEG, PNG ou WebP." };
  }

  // Validate size (2 MB)
  const maxSize = 2 * 1024 * 1024;
  if (file.size > maxSize) {
    return { message: "A imagem deve ter no máximo 2 MB." };
  }

  try {
    // Generate safe file key
    const ext = file.type.split("/")[1] === "jpeg" ? "jpg" : file.type.split("/")[1];
    const fileKey = `${user.id}-${Date.now()}.${ext}`;

    // Save to disk
    const fs = await import("fs/promises");
    const path = await import("path");

    const uploadsDir = path.join(process.cwd(), "storage", "uploads", "customer-avatars");
    await fs.mkdir(uploadsDir, { recursive: true });

    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(path.join(uploadsDir, fileKey), buffer);

    const avatarUrl = `/api/customer/avatar/${fileKey}`;
    await updateCustomerAvatar(user.id, { avatarUrl, avatarFileKey: fileKey });
  } catch {
    return actionErrorState("Erro ao salvar a foto. Tente novamente.");
  }

  revalidatePath("/cliente/perfil");
  redirect("/cliente/perfil?success=updated_settings");
}

export async function createAppointmentReviewAction(
  _state: FormActionState,
  formData: FormData,
): Promise<FormActionState> {
  const user = await requireCustomer();

  const parsed = createReviewSchema.safeParse({
    appointmentId: formData.get("appointmentId"),
    rating: formData.get("rating") ? Number(formData.get("rating")) : undefined,
    comment: formData.get("comment"),
  });

  if (!parsed.success) {
    return validationErrorState(parsed.error);
  }

  // Verify the appointment belongs to this customer
  const appointment = await getCustomerAppointment(
    user.id,
    parsed.data.appointmentId,
  );

  if (!appointment) {
    return { message: "Agendamento não encontrado." };
  }

  if (appointment.status !== "FINISHED") {
    return {
      message:
        "Você pode avaliar apenas atendimentos concluídos.",
    };
  }

  // Check for existing review
  const existing = await findReviewByAppointment(parsed.data.appointmentId);
  if (existing) {
    return { message: "Este atendimento já foi avaliado." };
  }

  try {
    await createAppointmentReview({
      tenantId: appointment.tenantId,
      appointmentId: parsed.data.appointmentId,
      customerUserId: user.id,
      rating: parsed.data.rating,
      comment: parsed.data.comment,
    });
  } catch {
    return actionErrorState("Erro ao enviar a avaliação. Tente novamente.");
  }

  revalidatePath(`/cliente/agendamentos/${parsed.data.appointmentId}`);
  redirect(
    `/cliente/agendamentos/${parsed.data.appointmentId}?reviewed=1`,
  );
}
