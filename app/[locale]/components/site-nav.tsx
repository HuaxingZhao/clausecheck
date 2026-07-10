"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import LangSwitch from "./lang-switch";

interface SiteNavProps {
  locale: string;
  authUser?: { email?: string | null; phone?: string | null; pro: boolean } | null;
  showProBadge?: boolean;
  onSignIn: () => void;
  onLogout: () => void;
}

export default function SiteNav({
  locale,
  authUser,
  showProBadge = false,
  onSignIn,
  onLogout,
}: SiteNavProps) {
  const t = useTranslations();
  const displayName = authUser?.email || authUser?.phone || null;

  return (
    <nav className="border-b border-border bg-paper/80 backdrop-blur sticky top-0 z-40">
      <div className="nav-inner">
        <Link href={`/${locale}`} className="font-sans font-semibold text-lg tracking-tight">
          {t("nav.brand")}
          {showProBadge && (
            <span className="ml-2.5 inline-flex items-center gap-1 text-xs bg-accent/15 text-[#8B3A0E] px-2 py-0.5 rounded-full font-sans font-semibold align-middle">
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
              {t("nav.proBadge")}
            </span>
          )}
        </Link>

        <div className="flex items-center gap-3 sm:gap-4 text-sm font-sans">
          <LangSwitch />
          {authUser ? (
            <>
              {displayName && (
                <Link
                  href={`/${locale}/account`}
                  className="hidden sm:inline text-xs text-ink-muted max-w-[140px] truncate hover:text-ink transition-colors"
                >
                  {displayName}
                </Link>
              )}
              <Link
                href={`/${locale}/account`}
                className="text-xs hover:text-ink transition-colors font-medium"
              >
                {t("nav.account")}
              </Link>
              <button
                type="button"
                onClick={onLogout}
                className="text-xs text-ink-light hover:text-ink transition-colors"
              >
                {t("auth.logout")}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onSignIn}
              className="btn btn-outline text-xs px-4 py-2"
            >
              {t("auth.signInRegister")}
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
