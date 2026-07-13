import { ModuleHeader } from "@/components/layout/module-page";

type PageHeadingProps = {
  title: string;
  description: string;
  actions?: React.ReactNode;
  /** Retained for compatibility with existing callers. */
  useDisplayFont?: boolean;
};

export function PageHeading({
  title,
  description,
  actions,
}: PageHeadingProps) {
  return <ModuleHeader title={title} description={description} actions={actions} />;
}
