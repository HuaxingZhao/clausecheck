"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import mammoth from "mammoth";
import type { ContractChange } from "@/lib/types";
import { fileForUpload } from "@/lib/upload-safe";

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Red-highlight original passages in mammoth HTML — no text replacement. */
function highlightChangesInDocxHtml(html: string, changes: ContractChange[]): string {
  let out = html;
  for (const c of changes) {
    const orig = c.original?.trim();
    if (!orig) continue;
    const snippet = orig.length > 160 ? orig.slice(0, 160) : orig;
    try {
      out = out.replace(
        new RegExp(escapeRegExp(snippet), "g"),
        (match) => `<mark class="preview-highlight-target">${match}</mark>`
      );
    } catch {
      /* skip invalid regex */
    }
  }
  return out;
}

export default function OriginalContractPreview({
  file,
  changes,
  locale,
  isPro,
  embedded = false,
  previewMode = "highlight",
}: {
  file: File;
  changes: ContractChange[];
  locale: string;
  isPro: boolean;
  embedded?: boolean;
  previewMode?: "highlight" | "apply" | "preview";
}) {
  const t = useTranslations("revise");
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
      const result = await mammoth.convertToHtml({ arrayBuffer: buf });
      if (cancelled) return;
      setDocxHtml(highlightChangesInDocxHtml(result.value, changes));
    });
    return () => {
      cancelled = true;
    };
  }, [file, changes, isDocx]);

  useEffect(() => {
    if (!isPdf) return;
    const url = URL.createObjectURL(file);
    setFallbackPdfUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file, isPdf]);

  useEffect(() => {
    if (!isPdf) return;
    if (previewMode !== "highlight" && !changes.length) {
      setPdfPreviewUrl(null);
      return;
    }
    if (!changes.length || !isPro) {
      setPdfPreviewUrl(null);
      return;
    }

    let cancelled = false;
    let objectUrl: string | null = null;
    setLoading(true);

    const fd = new FormData();
    const { uploadFile, originalName } = fileForUpload(file);
    fd.append("file", uploadFile);
    fd.append("originalFileName", originalName);
    fd.append("changes", JSON.stringify(changes));
    fd.append("locale", locale);
    fd.append("mode", previewMode);

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
  }, [file, changes, isPdf, isPro, locale, previewMode]);

  const frameUrl = isPdf ? (pdfPreviewUrl ?? fallbackPdfUrl) : null;
  const showingFallback = isPdf && !pdfPreviewUrl && !!fallbackPdfUrl;

  const boxClass = embedded
    ? "original-preview-box flex-1 min-h-0 flex flex-col border-0 rounded-none"
    : "original-preview-box h-full flex flex-col";

  return (
    <div className={boxClass}>
      {!embedded && (
        <>
          <div className="revised-contract-header flex flex-wrap items-center justify-between gap-2 shrink-0">
            <span>{t("originalPreviewTitle")}</span>
            {changes.length > 0 && (
              <span className="redline-legend">
                <span className="preview-highlight-target px-1.5 py-0.5">{t("legendHighlight")}</span>
              </span>
            )}
          </div>
          <p className="text-xs text-ink-muted px-4 pt-3 pb-2 font-sans leading-relaxed shrink-0">
            {t("originalPreviewHintHighlight")}
          </p>
        </>
      )}
      {embedded && changes.length > 0 && (
        <div className="flex items-center justify-end gap-2 px-4 pt-2 shrink-0">
          <span className="preview-highlight-target px-1.5 py-0.5 text-xs">{t("legendHighlight")}</span>
        </div>
      )}
      {loading && isPdf && (
        <p className="text-xs text-ink-muted px-4 pb-2 font-sans shrink-0">{t("previewLoading")}</p>
      )}
      {showingFallback && !loading && changes.length > 0 && (
        <p className="text-xs text-amber-700 bg-amber-50/80 mx-4 mb-2 rounded-lg p-2 font-sans shrink-0">
          {t("previewFallbackPdf")}
        </p>
      )}
      {frameUrl && (
        <iframe
          title={t("originalPreviewTitle")}
          src={`${frameUrl}#toolbar=0`}
          className="original-preview-frame flex-1 min-h-0"
        />
      )}
      {isDocx && docxHtml && (
        <div
          className="original-preview-docx flex-1 min-h-0"
          dangerouslySetInnerHTML={{ __html: docxHtml }}
        />
      )}
      {!isPdf && !isDocx && (
        <p className="text-sm text-amber-700 bg-amber-50/80 rounded-lg p-3 m-4 font-sans">
          {t("originalPreviewUnsupported")}
        </p>
      )}
    </div>
  );
}
