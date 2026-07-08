"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";

export interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  id?: string;
  className?: string;
  disabled?: boolean;
  "aria-label"?: string;
}

export function Switch({
  checked,
  onCheckedChange,
  id,
  className,
  disabled,
  "aria-label": ariaLabel,
}: SwitchProps) {
  return (
    <button
      type="button"
      id={id}
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors",
        checked ? "bg-legal-navy" : "bg-border",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
    >
      <span
        className={cn(
          "pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition-transform",
          checked ? "translate-x-5" : "translate-x-0"
        )}
      />
    </button>
  );
}
