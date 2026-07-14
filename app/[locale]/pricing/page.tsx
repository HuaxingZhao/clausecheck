"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Link, localizedPath } from "@/i18n/routing";
import { useTranslations, useLocale } from "next-intl";
import PricingSection from "../components/pricing-section";
import SiteNav from "../components/site-nav";
import AuthPanel from "../components/auth-panel";
import CreditsRemainingBadge from "../components/credits-remaining-badge";

export default function PricingPage() {
  const t = useTranslations("nav");
  const locale = useLocale();
  const [authUser, setAuthUser] = useState<{
    email?: string | null;
    phone?: string | null;
    pro: boolean;
  } | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const openCheckoutRef = useRef<((plan: "pro") => void) | null>(null);
  const openAddOnRef = useRef<(() => void) | null>(null);
  const deepLinkHandled = useRef(false);

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then((r) => r.json())
      .then((me) => {
        if (me.authenticated) {
          setAuthUser({ email: me.email, phone: me.phone, pro: !!me.pro });
        }
      })
      .catch(() => {});
  }, []);

  const tryDeepLink = useCallback(() => {
    if (typeof window === "undefined" || deepLinkHandled.current) return;
    const params = new URLSearchParams(window.location.search);
    const plan = params.get("plan");
    if (plan !== "pro" && plan !== "boost") return;
    if (plan === "pro" && !openCheckoutRef.current) return;
    if (plan === "boost" && !openAddOnRef.current) return;
    deepLinkHandled.current = true;
    window.history.replaceState({}, "", localizedPath("/pricing", locale));
    if (plan === "pro") openCheckoutRef.current?.("pro");
    if (plan === "boost") openAddOnRef.current?.();
  }, [locale]);

  useEffect(() => {
    tryDeepLink();
  }, [tryDeepLink]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setAuthUser(null);
    window.location.href = localizedPath("/pricing", locale);
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
          href="/"
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
        registerCheckoutOpener={(open) => {
          openCheckoutRef.current = open;
          tryDeepLink();
        }}
        registerAddOnOpener={(open) => {
          openAddOnRef.current = open;
          tryDeepLink();
        }}
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
              if (me.authenticated) {
                setAuthUser({ email: me.email, phone: me.phone, pro: !!me.pro });
              }
            });
        }}
      />
    </>
  );
}
