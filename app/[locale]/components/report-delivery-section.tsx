"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import type { ScanResult } from "@/lib/types";
import EmailReportForm from "./email-report-form";

interface ReportDeliverySectionProps {
  result: ScanResult;
  locale: string;
  isPro: boolean;
  onDownload: () => void;
}

export default function ReportDeliverySection({
  result,
  locale,
  isPro,
  onDownload,
}: ReportDeliverySectionProps) {
  const t = useTranslations("reportDelivery");

  return (
    <div className="summary-card mb-8 border-l-4 border-ink/20">
      <div className="text-xs font-sans font-semibold uppercase tracking-wide text-ink-muted mb-2">
        {t("stepLabel")}
      </div>
      <h4 className="mb-2">{t("title")}</h4>
      <p className="text-sm text-ink-light mb-6 leading-relaxed font-sans">{t("subtitle")}</p>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-6">
        <button type="button" onClick={onDownload} className="btn btn-primary btn-lg shrink-0">
          {t("download")}
        </button>
        {isPro && (
          <Link href={`/${locale}/reports`} className="btn btn-outline btn-lg shrink-0 text-center">
            {t("viewHistory")}
          </Link>
        )}
      </div>

      <div className="pt-5 border-t border-border/40">
        <EmailReportForm result={result} locale={locale} />
      </div>
    </div>
  );
}
