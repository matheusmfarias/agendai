import { cn } from "@/lib/utils";

type PageHeadingProps = {
  title: string;
  description: string;
  actions?: React.ReactNode;
  /** When true, renders the title with the display font (Lora). Defaults to false. */
  useDisplayFont?: boolean;
};

export function PageHeading({
  title,
  description,
  actions,
  useDisplayFont = false,
}: PageHeadingProps) {
  return (
    <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
      <div>
        <h1
          className={cn(
            "text-2xl font-semibold tracking-tight",
            useDisplayFont && "font-display",
          )}
        >
          {title}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}
