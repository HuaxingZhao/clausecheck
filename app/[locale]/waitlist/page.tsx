"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import SiteNav from "../components/site-nav";

function WaitlistContent() {
  const t = useTranslations("waitlist");
  const locale = useLocale();
  const searchParams = useSearchParams();
  const plan = searchParams.get("plan") === "boost" ? "boost" : "pro";
  const planLabel = plan === "boost" ? t("planBoost") : t("planPro");

  return (
    <main className="max-w-lg mx-auto px-6 py-20 text-center">
      <div className="section-label">{t("label")}</div>
      <h1 className="mb-3">{t("title")}</h1>
      <p className="text-ink-light font-sans mb-2">{t("subtitle", { plan: planLabel })}</p>
      <p className="text-sm text-ink-muted font-sans mb-8">{t("body")}</p>
      <Link href={`/${locale}/pricing`} className="btn btn-primary">
        {t("backPricing")}
      </Link>
    </main>
  );
}

export default function WaitlistPage() {
  const locale = useLocale();

  return (
    <>
      <SiteNav locale={locale} onSignIn={() => {}} onLogout={() => {}} />
      <Suspense fallback={null}>
        <WaitlistContent />
      </Suspense>
    </>
  );
}
