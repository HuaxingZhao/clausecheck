"use client";

import { FormEvent, useState, Suspense } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Link } from "@/i18n/routing";
import SiteNav from "../components/site-nav";

function ResetPasswordForm() {
  const t = useTranslations("auth");
  const locale = useLocale();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password, confirmPassword, locale }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("resetFailed"));
      setDone(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("resetFailed"));
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="max-w-md mx-auto px-6 py-16">
        <h1 className="text-2xl font-semibold mb-3">{t("resetTitle")}</h1>
        <p className="text-ink-light mb-6">{t("resetMissingToken")}</p>
        <Link href="/account" className="btn btn-primary">
          {t("signIn")}
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="max-w-md mx-auto px-6 py-16">
        <h1 className="text-2xl font-semibold mb-3">{t("resetSuccessTitle")}</h1>
        <p className="text-ink-light mb-6">{t("resetSuccessBody")}</p>
        <Link href="/account" className="btn btn-primary">
          {t("signIn")}
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-6 py-16">
      <h1 className="text-2xl font-semibold mb-2">{t("resetTitle")}</h1>
      <p className="text-ink-light mb-8">{t("resetSubtitle")}</p>
      <form onSubmit={handleSubmit}>
        <label className="block text-sm font-sans font-medium mb-2">{t("passwordLabel")}</label>
        <input
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={t("passwordPlaceholder")}
          className="auth-input"
        />
        <label className="block text-sm font-sans font-medium mb-2 mt-4">
          {t("confirmPasswordLabel")}
        </label>
        <input
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder={t("confirmPasswordPlaceholder")}
          className="auth-input"
        />
        {error && <p className="text-red-600 text-sm mt-3 font-sans">{error}</p>}
        <button type="submit" disabled={loading} className="btn btn-primary w-full mt-6">
          {loading ? t("submitting") : t("resetButton")}
        </button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  const t = useTranslations("auth");
  const locale = useLocale();

  return (
    <>
      <SiteNav
        locale={locale}
        authUser={null}
        showProBadge={false}
        onSignIn={() => {
          window.location.href = "/account";
        }}
        onLogout={() => {}}
      />
      <Suspense
        fallback={
          <div className="max-w-md mx-auto px-6 py-16 text-ink-light font-sans">
            {t("submitting")}
          </div>
        }
      >
        <ResetPasswordForm />
      </Suspense>
    </>
  );
}
