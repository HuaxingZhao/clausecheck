"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { buildRedlinedDocument } from "@/lib/redline";
import type { ContractChange } from "@/lib/types";

export default function ContractRedlinePreview({
  contractText,
  changes,
}: {
  contractText: string;
  changes: ContractChange[];
}) {
  const t = useTranslations("revise");
  const doc = useMemo(
    () => buildRedlinedDocument(contractText, changes),
    [contractText, changes]
  );

  const unmatched = changes.length - doc.matched;

  return (
    <div className="original-preview-box mb-6">
      <div className="revised-contract-header flex flex-wrap items-center justify-between gap-2">
        <span>{t("originalPreviewTitle")}</span>
        <span className="redline-legend">
          <span className="redline-deleted">{t("legendRemoved")}</span>
          <span className="redline-inserted">{t("legendAdded")}</span>
        </span>
      </div>
      <p className="text-xs text-ink-muted px-4 pt-3 pb-2 font-sans leading-relaxed">
        {t("originalPreviewHint")}
      </p>
      {unmatched > 0 && doc.matched > 0 && (
        <p className="text-xs text-amber-700 bg-amber-50/80 mx-4 mb-3 rounded-lg p-3 font-sans">
          {t("previewPartialMatch", { matched: doc.matched, total: changes.length })}
        </p>
      )}
      {doc.matched === 0 && changes.length > 0 ? (
        <p className="text-sm text-amber-700 bg-amber-50/80 rounded-lg p-3 m-4 font-sans">
          {t("redlineNoMatch")}
        </p>
      ) : (
        <div className="revised-contract-text redline-contract-body">
          {doc.paragraphs.map((para, pi) => (
            <p key={pi} className="redline-paragraph">
              {para.map((span, si) => (
                <span
                  key={si}
                  className={
                    span.kind === "deleted"
                      ? "redline-deleted"
                      : span.kind === "inserted"
                        ? "redline-inserted"
                        : undefined
                  }
                >
                  {span.text}
                </span>
              ))}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
