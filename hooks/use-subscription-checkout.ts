"use client";

import { useCallback } from "react";
import { checkoutPriceId, stripeCurrencyKey, type BillingCycle, type Currency } from "@/lib/pricing.config";

export function useSubscriptionCheckout(locale: string) {
  return useCallback(
    async (plan: "pro" | "team", cycle: BillingCycle, currency: Currency) => {
      const res = await fetch("/api/checkout", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          priceId: checkoutPriceId(plan, cycle),
          currency: stripeCurrencyKey(currency),
          successUrl: `${window.location.origin}/${locale}/account?checkout=success`,
          cancelUrl: window.location.href,
        }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      throw new Error(data.error || "Checkout failed");
    },
    [locale]
  );
}
