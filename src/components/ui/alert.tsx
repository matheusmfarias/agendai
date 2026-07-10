import type * as React from "react";

import { cn } from "@/lib/utils";

function Alert({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<"div"> & {
  variant?: "default" | "success" | "destructive" | "warning" | "info";
}) {
  return (
    <div
      role="alert"
      className={cn(
        "rounded-lg border px-4 py-3 text-sm",
        variant === "default" &&
          "border-border bg-muted/50 text-foreground",
        variant === "success" &&
          "border-success/30 bg-success/10 text-success",
        variant === "destructive" &&
          "border-destructive/30 bg-destructive/5 text-destructive",
        variant === "warning" &&
          "border-warning/40 bg-warning/10 text-warning-foreground",
        variant === "info" &&
          "border-info/30 bg-info/10 text-info",
        className,
      )}
      {...props}
    />
  );
}

export { Alert };
