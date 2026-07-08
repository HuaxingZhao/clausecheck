import * as React from "react";
import { cn } from "@/lib/utils/cn";

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number;
  indicatorClassName?: string;
}

export function Progress({ value, className, indicatorClassName, ...props }: ProgressProps) {
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <div
      className={cn("h-2 w-full overflow-hidden rounded-full bg-paper-dark", className)}
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      {...props}
    >
      <div
        className={cn(
          "h-full rounded-full transition-all duration-300",
          indicatorClassName ?? "bg-legal-navy"
        )}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
