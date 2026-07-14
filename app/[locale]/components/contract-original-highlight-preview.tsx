"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import mammoth from "mammoth";
import { applyDomHighlights, clearDomHighlights } from "@/lib/dom-highlight";
import { locateAllChanges } from "@/lib/redline";
import type { ContractChange } from "@/lib/types";
import { fileForUpload } from "@/lib/upload-safe";
import ContractHighlightTextPreview from "./contract-highlight-text-preview";

/**
 * Shows the uploaded file in its original layout (Word HTML or PDF iframe)
 * with numbered red highlights mapped to the right-panel suggestions.
 */
export default function ContractOriginalHighlightPreview({
  file,
  contractText,
  changes,
  focusedIndex = null,
  locale,
  isPro,
}: {
  file: File;
  contractText: string | null;
  changes: ContractChange[];
  focusedIndex?: number | null;
  locale: string;
  isPro: boolean;
}) {
  const t = useTranslations("revise");
  const containerRef = useRef<HTMLDivElement>(null);
  const [docxHtml, setDocxHtml] = useState<string | null>(null);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [fallbackPdfUrl, setFallbackPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isPdf = file.name.toLowerCase().endsWith(".pdf");
  const isDocx = file.name.toLowerCase().endsWith(".docx");

  useEffect(() => {
    if (!isDocx) return;
    let cancelled = false;
    file.arrayBuffer().then(async (buf) => {
      const htmlResult = await mammoth.convertToHtml({ arrayBuffer: buf });
      if (cancelled) return;
      setDocxHtml(htmlResult.value);
    });
    return () => {
      cancelled = true;
    };
  }, [file, contractText, isDocx]);

  useEffect(() => {
    if (!isPdf) return;
    const url = URL.createObjectURL(file);
    setFallbackPdfUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file, isPdf]);

  useEffect(() => {
    if (!isPdf || !changes.length || !isPro) {
      setPdfPreviewUrl(null);
      return;
    }
    let cancelled = false;
    let objectUrl: string | null = null;
    setLoading(true);

    const previewChanges =
      focusedIndex != null && changes[focusedIndex]
        ? [changes[focusedIndex]]
        : changes;

    const fd = new FormData();
    const { uploadFile, originalName } = fileForUpload(file);
    fd.append("file", uploadFile);
    fd.append("originalFileName", originalName);
    fd.append("changes", JSON.stringify(previewChanges));
    fd.append("locale", locale);

    fetch("/api/revise/preview", {
      method: "POST",
      body: fd,
    })
      .then(async (res) => {
        if (!res.ok) throw new Error("preview failed");
        return res.blob();
      })
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setPdfPreviewUrl(objectUrl);
      })
      .catch(() => {
        if (!cancelled) setPdfPreviewUrl(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [file, changes, isPdf, isPro, locale, focusedIndex]);

  const textForLocate = contractText || "";
  const { located: preLocated } = useMemo(
    () =>
      textForLocate
        ? locateAllChanges(textForLocate, changes, { strict: true })
        : { source: "", located: [] as ReturnType<typeof locateAllChanges>["located"] },
    [textForLocate, changes]
  );

  const matchedCount = preLocated.filter((l) => l.matched).length;
  const unmatched = changes.length - matchedCount;

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !docxHtml) return;

    const domText = el.textContent ?? "";
    const located = domText.trim()
      ? locateAllChanges(domText, changes, { strict: true }).located
      : preLocated;

    applyDomHighlights(el, located, focusedIndex);
    return () => clearDomHighlights(el);
  }, [docxHtml, changes, focusedIndex, preLocated]);

  useEffect(() => {
    if (focusedIndex == null) return;
    const el = containerRef.current?.querySelector(`#highlight-${focusedIndex}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [focusedIndex, docxHtml]);

  if (!isPdf && !isDocx && contractText) {
    return (
      <ContractHighlightTextPreview
        contractText={contractText}
        changes={changes}
        focusedIndex={focusedIndex}
      />
    );
  }

  const frameUrl = isPdf ? (pdfPreviewUrl ?? fallbackPdfUrl) : null;
  const showingFallback = isPdf && !pdfPreviewUrl && !!fallbackPdfUrl;

  return (
    <div className="original-preview-box flex-1 min-h-0 flex flex-col border-0 rounded-none bg-paper-dark/30">
      <div className="flex flex-wrap items-center justify-end gap-2 px-4 pt-2 shrink-0">
        <span className="text-xs text-ink-muted font-sans">
          {t("highlightMappedCount", { matched: matchedCount, total: changes.length })}
        </span>
        {changes.length > 0 && (
          <span className="preview-highlight-target px-1.5 py-0.5 text-xs">
            {t("legendHighlightNumbered")}
          </span>
        )}
      </div>
      {unmatched > 0 && (
        <p className="text-xs text-amber-700 bg-amber-50/80 mx-4 mb-2 rounded-lg p-2 font-sans shrink-0">
          {matchedCount > 0
            ? t("previewPartialMatch", { matched: matchedCount, total: changes.length })
            : t("highlightNoMatch")}
        </p>
      )}
      {loading && isPdf && (
        <p className="text-xs text-ink-muted px-4 pb-2 font-sans shrink-0">{t("previewLoading")}</p>
      )}
      {showingFallback && !loading && changes.length > 0 && (
        <p className="text-xs text-amber-700 bg-amber-50/80 mx-4 mb-2 rounded-lg p-2 font-sans shrink-0">
          {t("previewFallbackPdf")}
        </p>
      )}

      <div className="doc-editor-scroll flex-1 min-h-0 p-3 sm:p-4">
        {isDocx && docxHtml && (
          <div className="contract-document-page contract-document-page--docx">
            <div
              ref={containerRef}
              className="original-preview-docx contract-docx-body"
              dangerouslySetInnerHTML={{ __html: docxHtml }}
            />
          </div>
        )}
        {isPdf && frameUrl && (
          <div className="contract-document-page contract-document-page--pdf h-full min-h-[480px] p-0 overflow-hidden">
            <iframe
              title={t("originalPreviewTitle")}
              src={`${frameUrl}#toolbar=0`}
              className="original-preview-frame w-full h-full min-h-[480px] border-0"
            />
          </div>
        )}
      </div>
    </div>
  );
}
