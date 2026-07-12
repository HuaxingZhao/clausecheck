"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import type { ScanResult } from "@/lib/types";
import { extractDataCategoriesHint } from "@/lib/dpa/detect-dpa";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export interface GenerateDpaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  result: ScanResult;
  locale: string;
  isPro: boolean;
  onUpgrade?: () => void;
}

interface GenResponse {
  preview: string;
  fullContent: string;
  watermarkText: string;
  unlocked: boolean;
  tier?: string;
}

export default function GenerateDpaModal({
  open,
  onOpenChange,
  result,
  locale,
  isPro,
  onUpgrade,
}: GenerateDpaModalProps) {
  const t = useTranslations("dpa");
  const loc = locale === "en" ? "en" : "zh";

  const defaultCats = useMemo(
    () => extractDataCategoriesHint(result).join(", "),
    [result]
  );

  const [jurisdiction, setJurisdiction] = useState(
    result.detectedJurisdiction || result.feedbackMeta?.jurisdiction || "international_commercial"
  );
  const [controllerName, setControllerName] = useState("");
  const [processorName, setProcessorName] = useState("");
  const [processingPurpose, setProcessingPurpose] = useState(
    loc === "zh" ? "提供合同项下的产品/服务" : "Provide contracted products/services"
  );
  const [dataCategories, setDataCategories] = useState(defaultCats);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [out, setOut] = useState<GenResponse | null>(null);

  useEffect(() => {
    if (!open) return;
    setJurisdiction(
      result.detectedJurisdiction ||
        result.feedbackMeta?.jurisdiction ||
        "international_commercial"
    );
    setDataCategories(extractDataCategoriesHint(result).join(", "));
    setOut(null);
    setError(null);
  }, [open, result]);

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/generate-dpa", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          jurisdiction,
          dataCategories: dataCategories
            .split(/[,，;；\n]/)
            .map((s) => s.trim())
            .filter(Boolean),
          processingPurpose,
          controllerName,
          processorName,
          locale: loc,
        }),
      });
      const body = (await res.json()) as GenResponse & {
        error?: string;
        message?: string;
      };
      if (!res.ok) {
        throw new Error(body.message || body.error || t("generateError"));
      }
      setOut(body);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("generateError"));
    } finally {
      setLoading(false);
    }
  }

  async function handleDownloadDocx() {
    if (!out?.unlocked) return;
    setLoading(true);
    try {
      const res = await fetch("/api/generate-dpa", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          jurisdiction,
          dataCategories: dataCategories
            .split(/[,，;；\n]/)
            .map((s) => s.trim())
            .filter(Boolean),
          processingPurpose,
          controllerName,
          processorName,
          locale: loc,
          download: "docx",
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          (body as { message?: string }).message || t("downloadError")
        );
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download =
        loc === "zh" ? "ClauseCheck-DPA-草稿.docx" : "ClauseCheck-DPA-Draft.docx";
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("downloadError"));
    } finally {
      setLoading(false);
    }
  }

  function handleDownloadPdf() {
    const content = out?.unlocked ? out.fullContent : out?.preview;
    if (!content) return;
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(
      `<!doctype html><html><head><title>DPA</title>
      <style>body{font-family:Georgia,serif;max-width:720px;margin:2rem auto;padding:1rem;white-space:pre-wrap;line-height:1.5}
      .wm{color:#b45309;font-size:12px;border:1px dashed #f59e0b;padding:8px;margin-bottom:1rem}</style>
      </head><body>
      ${out?.watermarkText ? `<div class="wm">${out.watermarkText}</div>` : ""}
      <pre style="font-family:inherit;white-space:pre-wrap">${content
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")}</pre>
      <script>window.onload=()=>window.print()</script>
      </body></html>`
    );
    w.document.close();
  }

  const displayText = out
    ? out.unlocked && out.fullContent
      ? out.fullContent
      : out.preview
    : "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-t-2xl sm:rounded-2xl p-5 sm:p-6 shadow-xl">
        <DialogHeader>
          <DialogTitle className="font-sans text-lg text-ink">
            {t("modalTitle")}
          </DialogTitle>
        </DialogHeader>

        <p className="text-xs text-ink-muted font-sans mb-4">{t("modalHint")}</p>

        <div className="grid gap-3 sm:grid-cols-2 mb-4">
          <label className="block text-xs font-sans text-ink-muted">
            {t("jurisdiction")}
            <input
              className="mt-1 w-full rounded-md border border-border/60 px-2 py-1.5 text-sm text-ink"
              value={jurisdiction}
              onChange={(e) => setJurisdiction(e.target.value)}
            />
          </label>
          <label className="block text-xs font-sans text-ink-muted sm:col-span-2">
            {t("dataCategories")}
            <input
              className="mt-1 w-full rounded-md border border-border/60 px-2 py-1.5 text-sm text-ink"
              value={dataCategories}
              onChange={(e) => setDataCategories(e.target.value)}
            />
          </label>
          <label className="block text-xs font-sans text-ink-muted">
            {t("controllerName")}
            <input
              className="mt-1 w-full rounded-md border border-border/60 px-2 py-1.5 text-sm text-ink"
              value={controllerName}
              onChange={(e) => setControllerName(e.target.value)}
              placeholder="[TO BE NEGOTIATED]"
            />
          </label>
          <label className="block text-xs font-sans text-ink-muted">
            {t("processorName")}
            <input
              className="mt-1 w-full rounded-md border border-border/60 px-2 py-1.5 text-sm text-ink"
              value={processorName}
              onChange={(e) => setProcessorName(e.target.value)}
              placeholder="[TO BE NEGOTIATED]"
            />
          </label>
          <label className="block text-xs font-sans text-ink-muted sm:col-span-2">
            {t("processingPurpose")}
            <textarea
              className="mt-1 w-full rounded-md border border-border/60 px-2 py-1.5 text-sm text-ink min-h-[3rem]"
              value={processingPurpose}
              onChange={(e) => setProcessingPurpose(e.target.value)}
            />
          </label>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => void handleGenerate()}
            disabled={loading}
          >
            {loading ? t("generating") : t("generate")}
          </button>
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => onOpenChange(false)}
          >
            {t("close")}
          </button>
        </div>

        {error && (
          <p className="text-sm text-red-700 font-sans mb-3" role="alert">
            {error}
          </p>
        )}

        {out && (
          <div className="dpa-result-panel">
            {out.watermarkText ? (
              <div className="dpa-watermark">{out.watermarkText}</div>
            ) : (
              <div className="dpa-unlocked-badge">{t("unlockedBadge")}</div>
            )}
            <pre className="dpa-preview-body">{displayText}</pre>
            <p className="dpa-disclaimer-foot">{t("disclaimerFoot")}</p>

            <div className="flex flex-wrap gap-2 mt-4">
              {out.unlocked ? (
                <>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => void handleDownloadDocx()}
                    disabled={loading}
                  >
                    {t("downloadWord")}
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={handleDownloadPdf}
                  >
                    {t("downloadPdf")}
                  </button>
                </>
              ) : (
                <>
                  {onUpgrade ? (
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => {
                        onOpenChange(false);
                        onUpgrade();
                      }}
                    >
                      {t("upgradeToDownload")}
                    </button>
                  ) : (
                    <Link
                      href={`/${locale}/#pricing`}
                      className="btn btn-primary"
                      onClick={() => onOpenChange(false)}
                    >
                      {t("upgradeToDownload")}
                    </Link>
                  )}
                  {!isPro && (
                    <p className="text-xs text-ink-muted font-sans w-full">
                      {t("freePreviewHint")}
                    </p>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
