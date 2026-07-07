"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import Link from "next/link";
import AuthPanel from "../components/auth-panel";
import SiteNav from "../components/site-nav";
import type { ServerQuotaStatus } from "@/lib/quota";

interface AuthMe {
  authenticated: boolean;
  email?: string;
  pro?: boolean;
  tier?: string;
  subscriptionStatus?: string;
  proUntil?: string | null;
}

export default function AccountPage() {
  const t = useTranslations("account");
  const tAuth = useTranslations("auth");
  const locale = useLocale();

  const [auth, setAuth] = useState<AuthMe | null>(null);
  const [quota, setQuota] = useState<ServerQuotaStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [authOpen, setAuthOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [meRes, quotaRes] = await Promise.all([
        fetch("/api/auth/me", { credentials: "include" }),
        fetch("/api/quota", { credentials: "include" }),
      ]);
      const me = (await meRes.json()) as AuthMe;
      setAuth(me);
      if (quotaRes.ok) {
        setQuota((await quotaRes.json()) as ServerQuotaStatus);
      }
      if (!me.authenticated) {
        setAuthOpen(true);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("auth") === "success") {
        setToast(tAuth("success"));
        window.history.replaceState({}, "", `/${locale}/account`);
      }
    }
  }, [refresh, locale, tAuth]);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(id);
  }, [toast]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = `/${locale}`;
  }

  async function handleCheckout(
    priceId: "pro_monthly" | "pay_per_use",
    currency: "cny" | "usd" | "sgd"
  ) {
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        priceId,
        currency,
        successUrl: `${window.location.origin}/${locale}/account?checkout=success`,
        cancelUrl: window.location.href,
      }),
    });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
  }

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("checkout") !== "success") return;
    const sessionId = params.get("session_id");
    if (!sessionId) return;

    (async () => {
      try {
        await fetch("/api/checkout/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId }),
        });
        setToast(t("upgradeSuccess"));
        await refresh();
      } catch {
        /* ignore */
      } finally {
        window.history.replaceState({}, "", `/${locale}/account`);
      }
    })();
  }, [locale, refresh, t]);

  const isZh = locale === "zh";
  const currency = isZh ? "cny" : "usd";
  const tierLabel =
    auth?.pro || auth?.tier === "pro"
      ? t("planPro")
      : auth?.tier === "pay_per_use"
        ? t("planPayPerUse")
        : t("planFree");

  return (
    <>
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-ink text-white text-sm px-4 py-2 rounded-full shadow-lg font-sans">
          {toast}
        </div>
      )}

      <SiteNav
        locale={locale}
        authUser={
          auth?.authenticated && auth.email
            ? { email: auth.email, pro: !!auth.pro }
            : null
        }
        showProBadge={!!auth?.pro}
        onSignIn={() => setAuthOpen(true)}
        onLogout={handleLogout}
      />

      <main className="max-w-2xl mx-auto px-6 py-16">
        <div className="section-label">{t("label")}</div>
        <h1 className="mb-2">{t("title")}</h1>
        <p className="text-ink-light mb-10">{t("subtitle")}</p>

        {loading && <p className="text-sm text-ink-muted font-sans">{t("loading")}</p>}

        {!loading && !auth?.authenticated && (
          <p className="text-sm text-ink-muted font-sans">{t("signInPrompt")}</p>
        )}

        {!loading && auth?.authenticated && (
          <div className="space-y-6">
            <div className="account-card">
              <h2 className="font-sans font-semibold text-lg mb-4">{t("profile")}</h2>
              <dl className="account-dl">
                <div>
                  <dt>{t("email")}</dt>
                  <dd>{auth.email}</dd>
                </div>
                <div>
                  <dt>{t("plan")}</dt>
                  <dd>
                    <span className={`account-plan-badge ${auth.pro ? "pro" : "free"}`}>
                      {tierLabel}
                    </span>
                  </dd>
                </div>
                {auth.proUntil && auth.pro && (
                  <div>
                    <dt>{t("proUntil")}</dt>
                    <dd>
                      {new Date(auth.proUntil).toLocaleDateString(
                        isZh ? "zh-CN" : "en-US"
                      )}
                    </dd>
                  </div>
                )}
                {quota && !auth.pro && (
                  <div>
                    <dt>{t("scanQuota")}</dt>
                    <dd>
                      {quota.inTrialPeriod
                        ? t("trialActive")
                        : quota.remaining === -1
                          ? t("unlimited")
                          : t("scansRemaining", { count: quota.remaining })}
                    </dd>
                  </div>
                )}
              </dl>
            </div>

            {!auth.pro && (
              <div className="account-card account-upgrade">
                <h2 className="font-sans font-semibold text-lg mb-2">{t("upgradeTitle")}</h2>
                <p className="text-sm text-ink-light mb-6">{t("upgradeBody")}</p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    className="btn btn-primary flex-1"
                    onClick={() => handleCheckout("pro_monthly", currency)}
                  >
                    {t("upgradePro")}
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline flex-1"
                    onClick={() => handleCheckout("pay_per_use", currency)}
                  >
                    {t("upgradePayPerUse")}
                  </button>
                </div>
                <Link
                  href={`/${locale}#pricing`}
                  className="inline-block text-sm text-accent hover:text-accent-dark mt-4 font-sans"
                >
                  {t("viewPricing")} →
                </Link>
              </div>
            )}

            {auth.pro && (
              <div className="account-card">
                <h2 className="font-sans font-semibold text-lg mb-2">{t("proFeatures")}</h2>
                <p className="text-sm text-ink-light mb-4">{t("proFeaturesBody")}</p>
                <div className="flex flex-wrap gap-3">
                  <Link href={`/${locale}/reports`} className="btn btn-primary text-sm">
                    {t("viewReports")}
                  </Link>
                  <Link href={`/${locale}/revisions`} className="btn btn-outline text-sm">
                    {t("viewRevisions")}
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      <AuthPanel
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        locale={locale}
        initialEmail={auth?.email || ""}
      />
    </>
  );
}
