import { format } from "date-fns";

export function setFormDataValue(
  formData: FormData,
  key: string,
  value: unknown,
) {
  if (value === undefined || value === null) {
    return;
  }

  if (value instanceof Date) {
    formData.set(key, format(value, "yyyy-MM-dd"));
    return;
  }

  formData.set(key, String(value));
}
