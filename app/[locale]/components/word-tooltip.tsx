"use client";

import type { ReactNode } from "react";

/** Hover tooltip for Word ribbon controls. */
export default function WordTooltip({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <span className="word-tooltip-wrap">
      {children}
      <span className="word-tooltip" role="tooltip">
        {label}
      </span>
    </span>
  );
}
