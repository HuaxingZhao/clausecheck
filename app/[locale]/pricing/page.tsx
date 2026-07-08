"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import PricingSection from "../components/pricing-section";
import SiteNav from "../components/site-nav";
import AuthPanel from "../components/auth-panel";
import WechatPayModal from "../components/wechat-pay-modal";
import CreditsRemainingBadge from "../components/credits-remaining-badge";
import { useTopupPayment } from "@/hooks/use-topup-payment";
import { usePricingStore } from "@/stores/pricingStore";
import { stripeCurrencyKey } from "@/lib/pricing/plans";
import { useSubscriptionCheckout } from "@/hooks/use-subscription-checkout";

export default function PricingPage() {
  const t = useTranslations("nav");
  const locale = useLocale();
  const [authUser, setAuthUser] = useState<{ email: string; pro: boolean } | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [payingPlan, setPayingPlan] = useState<"pro" | "team" | "boost" | null>(null);

  const billingCycle = usePricingStore((s) => s.billingCycle);
  const currency = usePricingStore((s) => s.currency);
  const checkout = useSubscriptionCheckout(locale);

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

  const handleAddOn = useCallback(async () => {
    setPayingPlan("boost");
    try {
      if (currency === "CNY") {
        await payment.startPayment("boost");
        return;
      }
      const res = await fetch("/api/checkout", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          priceId: "pay_per_use",
          currency: stripeCurrencyKey(currency),
          successUrl: `${window.location.origin}/${locale}/account?checkout=success`,
          cancelUrl: window.location.href,
        }),
      });
      const data = (await res.json()) as { url?: string };
      if (data.url) window.location.href = data.url;
    } finally {
      setPayingPlan(null);
    }
  }, [currency, locale, payment]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const plan = params.get("plan");
    if (plan !== "pro" && plan !== "team" && plan !== "boost") return;
    window.history.replaceState({}, "", `/${locale}/pricing`);
    if (plan === "boost") {
      void handleAddOn();
    } else {
      void checkout(plan, billingCycle, currency).catch(() => setAuthOpen(true));
    }
  }, [locale, billingCycle, currency, checkout, handleAddOn]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setAuthUser(null);
    window.location.href = `/${locale}/pricing`;
  }

  return (
    <>
      {(payment.toast || null) && (
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
        compact
        onAddOn={() => void handleAddOn()}
        onRequireAuth={() => setAuthOpen(true)}
        payingPlan={payingPlan ?? payment.payingPlan}
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
            });
        }}
      />
    </>
  );
}
