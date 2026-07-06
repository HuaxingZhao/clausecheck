"use client";

import type { ReactNode } from "react";

interface ContractDocumentCanvasProps {
  locale?: string;
  children: ReactNode;
  /** Extra classes on the scroll container (e.g. preview padding). */
  scrollClassName?: string;
}

/**
 * Shared A4 page shell for edit + preview — keeps WYSIWYG layout identical.
 */
export default function ContractDocumentCanvas({
  locale = "zh",
  children,
  scrollClassName = "",
}: ContractDocumentCanvasProps) {
  const localeClass =
    locale === "en" ? "contract-document-page--en" : "contract-document-page--zh";

  return (
    <div
      className={`doc-editor-scroll contract-editor-canvas flex-1 min-h-0 ${scrollClassName}`.trim()}
    >
      <div className="contract-editor-page-wrap">
        <div
          className={`contract-document-page contract-document-page--editable contract-document-page--rich contract-document-page--word ${localeClass}`}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
