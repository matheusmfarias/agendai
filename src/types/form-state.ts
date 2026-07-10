export type FormActionState = {
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  success?: boolean;
};
