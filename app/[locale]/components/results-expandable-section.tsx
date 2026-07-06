"use client";

import { useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";

interface ResultsExpandableSectionProps {
  title: string;
  preview?: string;
  count?: number;
  defaultOpen?: boolean;
  variant?: "default" | "warning";
  children: ReactNode;
}

export default function ResultsExpandableSection({
  title,
  preview,
  count,
  defaultOpen = false,
  variant = "default",
  children,
}: ResultsExpandableSectionProps) {
  const t = useTranslations("results");
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div
      className={`results-expandable mb-4 ${
        variant === "warning" ? "results-expandable--warning" : ""
      }`}
    >
      <button
        type="button"
        className="results-expandable-header"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="results-expandable-title">{title}</span>
        {count != null && count > 0 && (
          <span className="results-expandable-count">{count}</span>
        )}
        {!open && preview && (
          <span className="results-expandable-preview">{preview}</span>
        )}
        <span className="results-expandable-chevron" aria-hidden>
          {open ? "▾" : "▸"}
        </span>
        <span className="sr-only">{open ? t("collapseSection") : t("expandSection")}</span>
      </button>
      {open && <div className="results-expandable-body">{children}</div>}
    </div>
  );
}

export function truncatePreview(text: string | undefined, max = 72): string {
  const t = (text ?? "").replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max)}…`;
}
