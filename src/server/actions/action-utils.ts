import type { ZodError } from "zod";

import type { FormActionState } from "@/types/form-state";

export function validationErrorState(error: ZodError): FormActionState {
  const fieldErrors = error.flatten().fieldErrors;
  const fields = Object.keys(fieldErrors);

  return {
    message: fields.length
      ? `Revise os campos informados: ${fields.join(", ")}.`
      : "Revise os campos informados.",
    fieldErrors,
  };
}

export function actionErrorState(error: unknown): FormActionState {
  if (
    typeof error === "object" &&
    error !== null &&
    "fieldErrors" in error &&
    typeof error.fieldErrors === "object" &&
    error.fieldErrors !== null
  ) {
    return {
      message:
        error instanceof Error
          ? error.message
          : "Revise os campos informados.",
      fieldErrors: error.fieldErrors as Record<string, string[] | undefined>,
    };
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  ) {
    return {
      message: "Já existe um registro com os dados únicos informados.",
    };
  }

  return {
    message:
      error instanceof Error
        ? error.message
        : "Não foi possível concluir a operação.",
  };
}
