"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import SiteNav from "../components/site-nav";
import AuthPanel from "../components/auth-panel";

/** Dedicated entry so email users can reset without digging into phone-default AuthPanel. */
export default function ForgotPasswordPage() {
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
      <main className="max-w-lg mx-auto px-6 py-12">
        <Link
          href="/account"
          className="text-sm font-sans text-ink-light hover:text-ink transition-colors"
        >
          ← {t("signIn")}
        </Link>
        {/* Title/subtitle live in AuthPanel (mode=forgot) — avoid duplicate page chrome. */}
      </main>
      <AuthPanel
        open
        onClose={() => {
          window.location.href = "/account";
        }}
        locale={locale}
        initialChannel="email"
        initialMode="forgot"
      />
    </>
  );
}
