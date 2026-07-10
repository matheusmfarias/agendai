// ---------------------------------------------------------------------------
// OperationFormSection — visual section divider for provider forms.
// Separates long forms into semantic groups without adding nesting.
// ---------------------------------------------------------------------------

type OperationFormSectionProps = {
  title: string;
  description?: string;
  children: React.ReactNode;
};

export function OperationFormSection({
  title,
  description,
  children,
}: OperationFormSectionProps) {
  return (
    <fieldset className="space-y-4">
      <div>
        <legend className="text-sm font-semibold text-foreground">{title}</legend>
        {description ? (
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {children}
    </fieldset>
  );
}
