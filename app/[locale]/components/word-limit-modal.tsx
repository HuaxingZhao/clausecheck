"use client";

import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";

interface WordLimitModalProps {
  open: boolean;
  locale: string;
  onClose: () => void;
}

export default function WordLimitModal({ open, locale: _locale, onClose }: WordLimitModalProps) {
  void _locale;
  const t = useTranslations("upload");

  if (!open) return null;

  return (
    <div
      className="word-limit-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="word-limit-modal-title"
      onClick={onClose}
    >
      <div className="word-limit-modal" onClick={(e) => e.stopPropagation()}>
        <h3 id="word-limit-modal-title" className="text-lg font-sans font-semibold text-ink mb-3">
          {t("wordLimitModalTitle")}
        </h3>
        <p className="text-sm text-ink-light font-sans leading-relaxed mb-6">
          {t("wordLimitModalBody")}
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-end">
          <button type="button" className="btn btn-outline" onClick={onClose}>
            {t("wordLimitModalClose")}
          </button>
          <Link
            href="/pricing"
            className="btn btn-primary text-center"
            onClick={onClose}
          >
            {t("viewPricing")}
          </Link>
        </div>
      </div>
    </div>
  );
}
