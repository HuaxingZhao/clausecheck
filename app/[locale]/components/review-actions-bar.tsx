"use client";

import { useCallback, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import type { LockedReviewItem, ScanResult } from "@/lib/types";
import { lockedItemsToChanges } from "@/lib/review-to-changes";
import { buildNegotiationEmail, downloadTextFile } from "@/lib/negotiation-email";
import { trackEvent } from "@/lib/analytics";

type RiskLevel = "high" | "medium" | "low";
const RISK_LEVELS: RiskLevel[] = ["high", "medium", "low"];

interface ReviewActionsBarProps {
  items: LockedReviewItem[];
  acceptedIds: Set<string>;
  selectedLevels: Set<RiskLevel>;
  onLevelToggle: (level: RiskLevel) => void;
  onClearAll: () => void;
  result: ScanResult;
  contractText: string;
  locale: string;
  isPro: boolean;
  sourceFile: File | null;
  onUpgrade?: () => void;
  onBackToAnalysis?: () => void;
}

export default function ReviewActionsBar({
  items,
  acceptedIds,
  selectedLevels,
  onLevelToggle,
  onClearAll,
  result,
  contractText,
  locale,
  isPro,
  sourceFile,
  onUpgrade,
  onBackToAnalysis,
}: ReviewActionsBarProps) {
  const t = useTranslations("reviewActions");
  const tReview = useTranslations("review");
  const [exporting, setExporting] = useState(false);
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  const levelCounts = useMemo(() => {
    const counts: Record<RiskLevel, number> = { high: 0, medium: 0, low: 0 };
    for (const item of items) {
      if (item.level) counts[item.level] += 1;
    }
    return counts;
  }, [items]);

  const acceptedItems = useMemo(
    () => items.filter((i) => acceptedIds.has(i.id)),
    [items, acceptedIds]
  );

  const changes = useMemo(
    () => lockedItemsToChanges(items, acceptedIds),
    [items, acceptedIds]
  );

  const handleDownloadEmail = useCallback(() => {
    if (!changes.length) return;
    const email = buildNegotiationEmail({
      result,
      changes,
      acceptedItems,
      locale: locale === "en" ? "en" : "zh",
      fileName: sourceFile?.name,
    });
    downloadTextFile(
      email,
      locale === "zh" ? "ClauseCheck-谈判邮件.txt" : "ClauseCheck-negotiation-email.txt"
    );
    trackEvent("review_export_email", { count: changes.length, locale });
  }, [changes, acceptedItems, result, locale, sourceFile?.name]);

  const handleExportWorkbook = useCallback(async () => {
    if (!isPro) {
      onUpgrade?.();
      return;
    }
    if (!changes.length || !contractText.trim()) return;

    setExporting(true);
    setExportNotice(null);
    try {
      const res = await fetch("/api/review/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locale,
          contractText,
          changes,
          fileName: sourceFile?.name ?? null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Export failed");
      }

      const appliedHeader = res.headers.get("X-Applied-Count");
      const applied = appliedHeader ? Number(appliedHeader) : null;
      if (applied != null && applied < changes.length) {
        setExportNotice(
          t("exportPartialNotice", { applied, total: changes.length })
        );
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download =
        locale === "zh"
          ? "ClauseCheck-修订对照稿.docx"
          : "ClauseCheck-Revision-Workbook.docx";
      a.click();
      URL.revokeObjectURL(url);
      trackEvent("review_export_workbook", { count: changes.length, locale });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Export failed";
      alert(msg);
    } finally {
      setExporting(false);
    }
  }, [changes, isPro, locale, contractText, sourceFile?.name, onUpgrade, t]);

  return (
    <div className="review-actions-bar">
      <div className="review-actions-top">
        <span className="text-sm font-sans text-ink">
          {t("acceptedCount", { count: acceptedIds.size, total: items.length })}
        </span>
        <div className="review-actions-buttons">
          {onBackToAnalysis && (
            <button
              type="button"
              className="btn btn-sm review-back-btn"
              onClick={onBackToAnalysis}
            >
              {tReview("backToAnalysis")}
            </button>
          )}
          <div className="review-accept-levels">
            <span className="review-accept-levels-label">{t("acceptLevelsLabel")}</span>
            {RISK_LEVELS.map((level) => (
              <label key={level} className="review-accept-level-chip">
                <input
                  type="checkbox"
                  checked={selectedLevels.has(level)}
                  onChange={() => onLevelToggle(level)}
                />
                <span className={`review-level-badge review-level-badge--${level}`}>
                  {tReview(`level_${level}`)}
                </span>
                <span className="review-accept-level-count">({levelCounts[level]})</span>
              </label>
            ))}
          </div>
          <button type="button" className="btn btn-outline btn-sm" onClick={onClearAll}>
            {t("clearAll")}
          </button>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            disabled={!changes.length}
            onClick={handleDownloadEmail}
          >
            {t("downloadEmail")}
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            disabled={!changes.length || exporting}
            onClick={handleExportWorkbook}
          >
            {exporting ? t("exporting") : isPro ? t("exportContract") : t("exportContractPro")}
          </button>
        </div>
      </div>
      <div className="review-export-notes">
        <p className="review-export-note">{t("exportWordOnly")}</p>
        <p className="review-export-note review-export-note--muted">{t("exportWhyNotAuto")}</p>
        <p className="review-export-note review-export-note--muted">{t("exportFormatHint")}</p>
        {exportNotice && (
          <p className="review-export-note review-export-note--warn">{exportNotice}</p>
        )}
      </div>
    </div>
  );
}
