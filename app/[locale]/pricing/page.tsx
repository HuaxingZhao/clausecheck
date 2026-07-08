"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import PricingSection from "../components/pricing-section";
import SiteNav from "../components/site-nav";
import AuthPanel from "../components/auth-panel";
import WechatPayModal from "../components/wechat-pay-modal";
import CreditsRemainingBadge from "../components/credits-remaining-badge";
import { useTopupPayment } from "@/hooks/use-topup-payment";

export default function PricingPage() {
  const t = useTranslations("nav");
  const locale = useLocale();
  const [authUser, setAuthUser] = useState<{ email: string; pro: boolean } | null>(null);
  const [authOpen, setAuthOpen] = useState(false);

  const payment = useTopupPayment({
    locale,
    onRequireAuth: () => setAuthOpen(true),
  });

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

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setAuthUser(null);
    window.location.href = `/${locale}/pricing`;
  }

  return (
    <>
      {payment.toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] bg-ink text-white text-sm px-4 py-2 rounded-full shadow-lg font-sans max-w-[90vw] text-center">
          {payment.toast}
        </div>
      )}

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
        isPro={!!authUser?.pro}
        compact
        onPayPlan={(plan) => void payment.startPayment(plan)}
        payingPlan={payment.payingPlan}
      />

      <WechatPayModal
        open={payment.modalOpen}
        plan={payment.activePlan ?? payment.pendingPlan}
        status={payment.modalStatus}
        qrCodeUrl={payment.qrCodeUrl}
        orderId={payment.orderId}
        errorMessage={payment.errorMessage}
        onClose={payment.closeModal}
        onRetry={payment.retryPayment}
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
              if (payment.pendingPlan) {
                void payment.startPayment(payment.pendingPlan);
              }
            });
        }}
      />
    </>
  );
}
