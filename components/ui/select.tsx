"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";

export interface SelectOption<T extends string = string> {
  value: T;
  label: string;
}

export interface SelectProps<T extends string = string> {
  value: T;
  onValueChange: (value: T) => void;
  options: SelectOption<T>[];
  id?: string;
  className?: string;
  "aria-label"?: string;
}

export function Select<T extends string = string>({
  value,
  onValueChange,
  options,
  id,
  className,
  "aria-label": ariaLabel,
}: SelectProps<T>) {
  return (
    <select
      id={id}
      aria-label={ariaLabel}
      value={value}
      onChange={(e) => onValueChange(e.target.value as T)}
      className={cn(
        "rounded-lg border border-border/60 bg-white px-3 py-2 text-sm font-sans text-ink",
        className
      )}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
