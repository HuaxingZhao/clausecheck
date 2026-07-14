"use client";

import { useTranslations } from "next-intl";
import type { ScanResult } from "@/lib/types";
import EmailReportForm from "./email-report-form";
import { Link } from "@/i18n/routing";

interface ReportDeliverySectionProps {
  result: ScanResult;
  locale: string;
  isPro: boolean;
  refining?: boolean;
  onDownload: () => void;
}

export default function ReportDeliverySection({
  result,
  locale,
  isPro,
  refining = false,
  onDownload,
}: ReportDeliverySectionProps) {
  const t = useTranslations("reportDelivery");

  return (
    <div className="report-delivery-section summary-card mb-8 border-l-4 border-ink/30">
      <div className="text-xs font-sans font-semibold uppercase tracking-wide text-ink mb-2">
        {t("stepLabel")}
      </div>
      <h4 className="mb-2 text-ink">{t("title")}</h4>
      <p className="text-sm text-ink mb-6 leading-relaxed font-sans">{t("subtitle")}</p>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-6">
        <button
          type="button"
          onClick={onDownload}
          disabled={refining}
          className="btn btn-primary btn-lg shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {t("download")}
        </button>
        {isPro && (
          <Link
            href="/reports"
            className="btn btn-outline btn-lg shrink-0 text-center text-ink"
          >
            {t("viewHistory")}
          </Link>
        )}
      </div>

      <div className={`pt-5 border-t border-border/40 ${refining ? "opacity-50 pointer-events-none" : ""}`}>
        <EmailReportForm result={result} locale={locale} />
      </div>
    </div>
  );
}
