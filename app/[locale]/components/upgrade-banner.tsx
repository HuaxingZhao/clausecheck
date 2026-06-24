"use client";

import { useTranslations } from "next-intl";
import type { ScanResult } from "@/lib/types";

interface UpgradeBannerProps {
  result: ScanResult;
  onUpgrade: () => void;
  onPayPerUse?: () => void;
}

export default function UpgradeBanner({ result, onUpgrade, onPayPerUse }: UpgradeBannerProps) {
  const t = useTranslations("upgrade");

  const highCount = result.flags.filter((f) => f.level === "high").length;
  const mediumCount = result.flags.filter((f) => f.level === "medium").length;
  const risky = highCount > 0 || result.scoreNum >= 60 || mediumCount >= 2;

  if (!risky) return null;

  return (
    <div className="upgrade-banner mb-6">
      <div className="upgrade-banner-inner">
        <div>
          <p className="font-sans font-semibold text-ink mb-1">{t("title")}</p>
          <p className="text-sm text-ink-light leading-relaxed">
            {highCount > 0
              ? t("bodyHigh", { count: highCount })
              : t("bodyMedium", { score: result.scoreNum })}
          </p>
          <ul className="text-xs text-ink-muted mt-3 space-y-1 font-sans">
            {(t.raw("benefits") as string[]).map((b, i) => (
              <li key={i}>✓ {b}</li>
            ))}
          </ul>
        </div>
        <div className="flex flex-col gap-2 shrink-0">
          <button type="button" onClick={onUpgrade} className="btn btn-primary">
            {t("ctaPro")}
          </button>
          {onPayPerUse && (
            <button type="button" onClick={onPayPerUse} className="btn btn-outline text-sm">
              {t("ctaOnce")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
