"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Link, localizedPath } from "@/i18n/routing";
import AuthPanel from "../components/auth-panel";
import SiteNav from "../components/site-nav";
import type { ServerQuotaStatus } from "@/lib/quota";
import {
  clearPendingInviteCode,
  getOrCreateDeviceFingerprint,
  readPendingInviteCode,
} from "@/lib/invite/client-fingerprint";

interface AuthMe {
  authenticated: boolean;
  email?: string | null;
  phone?: string | null;
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
        window.history.replaceState({}, "", localizedPath("/account", locale));
      }
    }
  }, [refresh, locale, tAuth]);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(id);
  }, [toast]);

  useEffect(() => {
    if (!auth?.authenticated) return;
    const code = readPendingInviteCode();
    if (!code) return;

    void (async () => {
      try {
        const res = await fetch(`/api/invite/redeem?locale=${locale}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            code,
            device_fingerprint: getOrCreateDeviceFingerprint(),
          }),
        });
        if (res.ok) {
          clearPendingInviteCode();
          setToast(locale === "zh" ? "邀请奖励已到账！" : "Invite bonus applied!");
        } else if (res.status === 409 || res.status === 400) {
          clearPendingInviteCode();
        }
      } catch {
        /* non-blocking */
      }
    })();
  }, [auth?.authenticated, locale]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = localizedPath("/", locale);
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
        window.history.replaceState({}, "", localizedPath("/account", locale));
      }
    })();
  }, [locale, refresh, t]);

  const isZh = locale === "zh";
  const tierLabel =
    auth?.tier === "team"
      ? t("planTeam")
      : auth?.pro || auth?.tier === "pro"
        ? t("planPro")
        : auth?.tier === "pay_per_use"
          ? t("planAddOn")
          : t("planFree");

  const showAddOnCta = quota != null && quota.remaining === 0;

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
          auth?.authenticated
            ? { email: auth.email, phone: auth.phone, pro: !!auth.pro }
            : null
        }
        showProBadge={!!auth?.pro}
        onSignIn={() => setAuthOpen(true)}
        onLogout={handleLogout}
      />

      <main className="max-w-2xl mx-auto px-6 py-16">
        <div className="flex flex-wrap items-center gap-4 mb-6 font-sans text-sm">
          <Link
            href="/"
            className="text-ink-light hover:text-ink transition-colors"
          >
            ← {t("backHome")}
          </Link>
          <Link
            href="/#upload"
            className="text-legal-navy font-medium hover:underline"
          >
            {t("backScan")} →
          </Link>
        </div>
        <div className="section-label">{t("label")}</div>
        <h1 className="mb-2">{t("title")}</h1>
        <p className="text-ink-light mb-10">{t("subtitle")}</p>

        {loading && <p className="text-sm text-ink-muted font-sans">{t("loading")}</p>}

        {!loading && !auth?.authenticated && (
          <div className="space-y-4">
            <p className="text-sm text-ink-muted font-sans">{t("signInPrompt")}</p>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                className="btn btn-primary text-sm"
                onClick={() => setAuthOpen(true)}
              >
                {tAuth("signInRegister")}
              </button>
              <Link href="/forgot-password" className="btn btn-outline text-sm">
                {t("forgotPasswordLink")}
              </Link>
            </div>
          </div>
        )}

        {!loading && auth?.authenticated && (
          <div className="space-y-6">
            <div className="account-card">
              <h2 className="font-sans font-semibold text-lg mb-4">{t("profile")}</h2>
              <dl className="account-dl">
                {auth.phone && (
                  <div>
                    <dt>{t("phone")}</dt>
                    <dd>{auth.phone}</dd>
                  </div>
                )}
                <div>
                  <dt>{t("email")}</dt>
                  <dd>{auth.email || t("emailNotSet")}</dd>
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
                {quota && (
                  <div>
                    <dt>{t("scanQuota")}</dt>
                    <dd>
                      {typeof quota.quotaUsed === "number" &&
                      typeof quota.quotaLimit === "number" &&
                      quota.quotaLimit > 0
                        ? t("quotaUsedOfLimit", {
                            used: quota.quotaUsed,
                            limit: quota.quotaLimit,
                          })
                        : quota.remaining === 0
                          ? t("quotaExhausted")
                          : t("scansRemaining", { count: Math.max(0, quota.remaining) })}
                    </dd>
                  </div>
                )}
              </dl>
            </div>

            {auth.email && (
              <div className="account-card">
                <h2 className="font-sans font-semibold text-lg mb-2">{t("resetPasswordLink")}</h2>
                <Link href="/forgot-password" className="btn btn-outline text-sm">
                  {t("resetPasswordLink")} →
                </Link>
              </div>
            )}

            <div className="account-card">
              <h2 className="font-sans font-semibold text-lg mb-2">{t("inviteFriends")}</h2>
              <Link href="/invite" className="btn btn-outline text-sm">
                {t("inviteFriends")} →
              </Link>
            </div>

            {!auth.pro && (
              <div className="account-card account-upgrade">
                <h2 className="font-sans font-semibold text-lg mb-2">{t("upgradeTitle")}</h2>
                <p className="text-sm text-ink-light mb-6">{t("upgradeBody")}</p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Link
                    href="/pricing?plan=pro"
                    className="btn btn-primary flex-1 text-center"
                  >
                    {t("upgradePro")}
                  </Link>
                  {showAddOnCta && (
                    <Link
                      href="/pricing?plan=boost"
                      className="btn btn-outline flex-1 text-center"
                    >
                      {t("upgradeAddOn")}
                    </Link>
                  )}
                </div>
                <Link
                  href="/pricing"
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
                  <Link href="/reports" className="btn btn-primary text-sm">
                    {t("viewReports")}
                  </Link>
                  <Link href="/revisions" className="btn btn-outline text-sm">
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
