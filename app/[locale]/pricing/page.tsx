"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import PricingSection from "../components/pricing-section";
import SiteNav from "../components/site-nav";
import AuthPanel from "../components/auth-panel";
import CreditsRemainingBadge from "../components/credits-remaining-badge";
import { usePricingStore } from "@/stores/usePricingStore";

export default function PricingPage() {
  const t = useTranslations("nav");
  const locale = useLocale();
  const setSelectedPlan = usePricingStore((s) => s.setSelectedPlan);
  const [authUser, setAuthUser] = useState<{ email: string; pro: boolean } | null>(null);
  const [authOpen, setAuthOpen] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then((r) => r.json())
      .then((me) => {
        if (me.authenticated && me.email) {
          setAuthUser({ email: me.email, pro: !!me.pro });
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const plan = params.get("plan");
    if (plan !== "pro" && plan !== "team" && plan !== "boost") return;
    window.history.replaceState({}, "", `/${locale}/pricing`);
    if (plan === "pro" || plan === "team") {
      setSelectedPlan(plan);
    }
  }, [locale, setSelectedPlan]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setAuthUser(null);
    window.location.href = `/${locale}/pricing`;
  }

  return (
    <>
      <SiteNav
        locale={locale}
        authUser={authUser}
        showProBadge={!!authUser?.pro}
        onSignIn={() => setAuthOpen(true)}
        onLogout={handleLogout}
      />

      <div className="max-w-6xl mx-auto px-6 pt-8 pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <Link
          href={`/${locale}`}
          className="text-sm font-sans text-ink-light hover:text-ink transition-colors"
        >
          ← {t("startScan")}
        </Link>
        <CreditsRemainingBadge />
      </div>

      <PricingSection
        locale={locale}
        compact
        onRequireAuth={() => setAuthOpen(true)}
      />

      <AuthPanel
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        locale={locale}
        onSuccess={() => {
          setAuthOpen(false);
          fetch("/api/auth/me", { credentials: "include" })
            .then((r) => r.json())
            .then((me) => {
              if (me.authenticated && me.email) {
                setAuthUser({ email: me.email, pro: !!me.pro });
              }
            });
        }}
      />
    </>
  );
}
