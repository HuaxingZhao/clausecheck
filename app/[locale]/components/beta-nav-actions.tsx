"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";

interface BetaNavActionsProps {
  locale: string;
  freeScanCount: number;
}

export default function BetaNavActions({
  locale,
  freeScanCount,
}: BetaNavActionsProps) {
  const t = useTranslations("beta");
  const tLang = useTranslations("langSwitch");
  const [pending, setPending] = useState<"lang" | "try" | null>(null);
  const nextLocale = locale === "zh" ? "en" : "zh";

  return (
    <div
      className={`beta-nav-actions${pending ? " is-pending" : ""}`}
      aria-busy={pending != null}
    >
      <div className="beta-nav-actions-row">
        <Link
          href="/beta"
          locale={nextLocale}
          prefetch
          className="beta-lang-switch text-xs font-sans text-ink-muted hover:text-ink"
          onClick={() => setPending("lang")}
          aria-label={tLang("to")}
          aria-disabled={pending != null}
        >
          {pending === "lang" ? t("nav.switching") : tLang("label")}
        </Link>
        <Link
          href="/#upload"
          prefetch
          className="btn btn-outline text-xs"
          onClick={() => setPending("try")}
          aria-disabled={pending != null}
        >
          {pending === "try" ? t("nav.opening") : t("nav.tryProduct")}
        </Link>
      </div>
      <p className="beta-nav-try-hint">
        {t("nav.tryProductHint", { count: freeScanCount })}
      </p>
    </div>
  );
}
