// ---------------------------------------------------------------------------
// HelpCallout — subtle contextual help block for provider forms.
// Use sparingly at decision points; not for long-form documentation.
// ---------------------------------------------------------------------------

type HelpCalloutProps = {
  children: React.ReactNode;
};

export function HelpCallout({ children }: HelpCalloutProps) {
  return (
    <div className="rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
      {children}
    </div>
  );
}
