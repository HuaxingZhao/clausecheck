"use client";

import { useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import Link from "next/link";
import AuthPanel from "../components/auth-panel";

interface RevisionRow {
  id: string;
  title: string;
  locale: string;
  changeCount: number;
  createdAt: string;
  hasFinalContract?: boolean;
  finalFileType?: "pdf" | "docx" | null;
}

export default function RevisionsPage() {
  const t = useTranslations("revisions");
  const tAuth = useTranslations("auth");
  const locale = useLocale();

  const [auth, setAuth] = useState<{
    authenticated: boolean;
    email?: string;
    pro?: boolean;
  } | null>(null);
  const [revisions, setRevisions] = useState<RevisionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authOpen, setAuthOpen] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const meRes = await fetch("/api/auth/me");
        const me = await meRes.json();
        setAuth(me);

        if (!me.authenticated) {
          setAuthOpen(true);
          return;
        }
        if (!me.pro) {
          setError(t("proRequired"));
          return;
        }

        const res = await fetch("/api/revisions");
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed");
        setRevisions(data.revisions || []);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [t]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = `/${locale}`;
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleString(locale === "zh" ? "zh-CN" : "en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <>
      <nav className="border-b border-border bg-paper/80 backdrop-blur sticky top-0 z-40">
        <div className="nav-inner">
          <Link href={`/${locale}`} className="font-sans font-semibold text-lg tracking-tight">
            ClauseCheck
          </Link>
          <div className="flex items-center gap-4 text-sm font-sans text-ink-light">
            {auth?.email && (
              <span className="hidden sm:inline text-ink-muted">{auth.email}</span>
            )}
            <Link href={`/${locale}`} className="hover:text-ink transition-colors">
              {t("backScan")}
            </Link>
            {auth?.authenticated && (
              <button onClick={handleLogout} className="hover:text-ink transition-colors">
                {tAuth("logout")}
              </button>
            )}
          </div>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-16">
        <div className="section-label">{t("label")}</div>
        <h1 className="mb-2">{t("title")}</h1>
        <p className="text-ink-light mb-10">{t("subtitle")}</p>

        {loading && <p className="text-sm text-ink-muted font-sans">{t("loading")}</p>}

        {!loading && error && (
          <div className="report-empty">
            <p className="text-ink-light">{error}</p>
            {!auth?.authenticated && (
              <button className="btn btn-primary mt-6" onClick={() => setAuthOpen(true)}>
                {tAuth("signIn")}
              </button>
            )}
            {auth?.authenticated && !auth.pro && (
              <Link href={`/${locale}#pricing`} className="btn btn-primary mt-6 inline-block">
                {t("upgradePro")}
              </Link>
            )}
          </div>
        )}

        {!loading && !error && revisions.length === 0 && (
          <div className="report-empty">
            <p className="text-ink-light">{t("empty")}</p>
            <Link href={`/${locale}#upload`} className="btn btn-primary mt-6 inline-block">
              {t("scanFirst")}
            </Link>
          </div>
        )}

        {!loading && !error && revisions.length > 0 && (
          <ul className="report-list">
            {revisions.map((r) => (
              <li key={r.id} className="report-item">
                <div className="report-item-main">
                  <h3 className="font-sans font-semibold text-ink">{r.title}</h3>
                  <p className="text-xs text-ink-muted mt-1 font-sans">
                    {t("changeCount", { count: r.changeCount })}
                  </p>
                  <p className="text-xs text-ink-muted mt-2 font-sans">{formatDate(r.createdAt)}</p>
                </div>
                <div className="report-item-meta">
                  <div className="report-actions flex-wrap">
                    <a
                      href={`/api/revisions/${r.id}/download?format=pdf`}
                      className="btn btn-primary text-xs"
                    >
                      {t("suggestionsPdf")}
                    </a>
                    <a
                      href={`/api/revisions/${r.id}/download?format=docx`}
                      className="btn btn-outline text-xs"
                    >
                      {t("suggestionsDocx")}
                    </a>
                  </div>
                </div>
              </li>
            ))}
          </ul>
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
