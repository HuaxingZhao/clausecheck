"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import SiteNav from "../components/site-nav";
import AuthPanel from "../components/auth-panel";
import { INVITE_CODE_MAX_USES } from "@/lib/invite/constants";

interface InviteStatsResponse {
  code: string;
  invite_url: string;
  invite_count: number;
  credits_earned: number;
  use_count: number;
  max_uses: number;
}

export default function InvitePage() {
  const t = useTranslations("invite");
  const locale = useLocale();
  const [authUser, setAuthUser] = useState<{
    email?: string | null;
    phone?: string | null;
    pro: boolean;
  } | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<InviteStatsResponse | null>(null);
  const [copyToast, setCopyToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const meRes = await fetch("/api/auth/me", { credentials: "include" });
      const me = await meRes.json();
      if (!me.authenticated) {
        setAuthUser(null);
        setStats(null);
        setAuthOpen(true);
        return;
      }
      setAuthUser({ email: me.email, phone: me.phone, pro: !!me.pro });

      const res = await fetch(`/api/invite/stats?locale=${locale}`, { credentials: "include" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed");
      }
      setStats((await res.json()) as InviteStatsResponse);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  useEffect(() => {
    if (!copyToast) return;
    const id = window.setTimeout(() => setCopyToast(null), 2500);
    return () => window.clearTimeout(id);
  }, [copyToast]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setAuthUser(null);
    window.location.href = `/${locale}/invite`;
  }

  async function copyInviteLink() {
    if (!stats) return;
    try {
      await navigator.clipboard.writeText(stats.invite_url);
      setCopyToast(t("copied"));
    } catch {
      setCopyToast(t("copyFailed"));
    }
  }

  async function copyShareText() {
    if (!stats) return;
    const text = t("shareTemplate", { url: stats.invite_url });
    try {
      await navigator.clipboard.writeText(text);
      setCopyToast(t("shareCopied"));
    } catch {
      setCopyToast(t("copyFailed"));
    }
  }

  const remainingUses = stats ? Math.max(0, stats.max_uses - stats.use_count) : INVITE_CODE_MAX_USES;

  return (
    <>
      {copyToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] bg-ink text-white text-sm px-4 py-2 rounded-full shadow-lg font-sans">
          {copyToast}
        </div>
      )}

      <SiteNav
        locale={locale}
        authUser={authUser}
        showProBadge={!!authUser?.pro}
        onSignIn={() => setAuthOpen(true)}
        onLogout={handleLogout}
      />

      <main className="page-content-wide mx-auto px-6 py-10 font-sans">
        <div className="max-w-2xl mx-auto">
          <Link
            href={`/${locale}`}
            className="text-sm text-ink-light hover:text-ink transition-colors"
          >
            ← {t("backHome")}
          </Link>

          <header className="mt-6 mb-8">
            <p className="text-xs uppercase tracking-widest text-accent font-semibold mb-2">
              {t("label")}
            </p>
            <h1 className="font-display text-3xl sm:text-4xl text-ink mb-3">{t("title")}</h1>
            <p className="text-ink-light leading-relaxed">{t("subtitle")}</p>
          </header>

          {loading && (
            <div className="rounded-2xl border border-border bg-paper p-8 text-center text-ink-muted">
              {t("loading")}
            </div>
          )}

          {!loading && error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700 text-sm">
              {error}
            </div>
          )}

          {!loading && stats && (
            <div className="space-y-6">
              <section className="rounded-2xl border border-border bg-paper p-6 shadow-sm">
                <h2 className="font-display text-xl text-ink mb-4">{t("linkTitle")}</h2>
                <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
                  <code className="flex-1 text-sm bg-cream border border-border rounded-xl px-4 py-3 break-all text-ink">
                    {stats.invite_url}
                  </code>
                  <button type="button" className="btn btn-primary shrink-0" onClick={copyInviteLink}>
                    {t("copyLink")}
                  </button>
                </div>
                <p className="text-xs text-ink-muted mt-3">
                  {t("codeLabel")}: <span className="font-mono font-semibold tracking-widest">{stats.code}</span>
                  {" · "}
                  {t("usesRemaining", { count: remainingUses, max: stats.max_uses })}
                </p>
              </section>

              <section className="rounded-2xl border border-accent/30 bg-accent/5 p-6">
                <h2 className="font-display text-xl text-ink mb-2">{t("progressTitle")}</h2>
                <p className="text-2xl font-semibold text-ink mb-1">
                  {t("progressSummary", {
                    invites: stats.invite_count,
                    quota: stats.credits_earned,
                  })}
                </p>
                <p className="text-sm text-ink-light">{t("progressHint")}</p>
              </section>

              <section className="rounded-2xl border border-border bg-paper p-6">
                <h2 className="font-display text-xl text-ink mb-3">{t("shareTitle")}</h2>
                <blockquote className="text-sm text-ink-light leading-relaxed border-l-4 border-accent pl-4 mb-4">
                  {t("shareTemplate", { url: stats.invite_url })}
                </blockquote>
                <button type="button" className="btn btn-outline" onClick={copyShareText}>
                  {t("copyShare")}
                </button>
              </section>
            </div>
          )}
        </div>
      </main>

      <AuthPanel
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        locale={locale}
        onSuccess={() => {
          setAuthOpen(false);
          void loadStats();
        }}
      />

    </>
  );
}
