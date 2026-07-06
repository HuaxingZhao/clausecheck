"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { diffForSuggestion } from "@/lib/suggestion-diff";

interface SuggestionDiffDisplayProps {
  original: string;
  revised: string;
}

export default function SuggestionDiffDisplay({
  original,
  revised,
}: SuggestionDiffDisplayProps) {
  const t = useTranslations("revise");

  const { originalParts, revisedParts } = useMemo(
    () => diffForSuggestion(original, revised),
    [original, revised]
  );

  return (
    <div className="suggestion-stacked">
      {original.trim() && (
        <div className="suggestion-stack-block suggestion-stack-block--plain">
          <span className="suggestion-context-label">{t("originalContext")}</span>
          <p className="suggestion-diff-text">
            {originalParts.length > 0 ? (
              originalParts.map((p, i) =>
                p.removed ? (
                  <span key={i} className="diff-removed">
                    {p.text}
                  </span>
                ) : (
                  <span key={i}>{p.text}</span>
                )
              )
            ) : (
              original.trim()
            )}
          </p>
        </div>
      )}
      <div className="suggestion-stack-block suggestion-stack-block--plain">
        <span className="suggestion-context-label">{t("suggestedContext")}</span>
        <p className="suggestion-diff-text">
          {revisedParts.length > 0 ? (
            revisedParts.map((p, i) =>
              p.added ? (
                <mark key={i} className="diff-added">
                  {p.text}
                </mark>
              ) : (
                <span key={i}>{p.text}</span>
              )
            )
          ) : (
            revised.trim() || "—"
          )}
        </p>
      </div>
    </div>
  );
}
