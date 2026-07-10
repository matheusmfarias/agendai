import type { SuccessAlertContext } from "@/components/layout/success-alert";

export const SERVICE_SUCCESS_CODES = {
  categoryCreated: "category-created",
  categoryUpdated: "category-updated",
  categoryStatus: "category-status",
  serviceCreated: "service-created",
  serviceUpdated: "service-updated",
  serviceStatus: "service-status",
} as const;

export function serviceSuccessContext(
  success?: string,
): SuccessAlertContext {
  if (success?.startsWith("category-")) return "category";
  if (success?.startsWith("field-")) return "field";
  return "service";
}
