import { cn } from "@/lib/utils";

type TableContainerProps = {
  children: React.ReactNode;
  className?: string;
};

/**
 * Responsive table wrapper.
 *
 * Wraps a <table> with overflow-x-auto so wide tables scroll horizontally
 * on narrow viewports instead of breaking the layout.
 *
 * Usage:
 *   <TableContainer>
 *     <Table>...</Table>
 *   </TableContainer>
 */
export function TableContainer({ children, className }: TableContainerProps) {
  return (
    <div
      className={cn(
        "w-full overflow-x-auto rounded-lg border border-border",
        className,
      )}
    >
      {children}
    </div>
  );
}
