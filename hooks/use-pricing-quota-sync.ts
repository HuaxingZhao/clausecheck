"use client";

import { useEffect } from "react";
import { usePricingStore } from "@/stores/usePricingStore";
import { useCredits } from "@/hooks/use-credits";
import { detectCurrencyFromLocale } from "@/lib/pricing/currency";

/** Sync Zustand usedQuota + default currency from credits API & locale */
export function usePricingQuotaSync(locale: string) {
  const { balance, authenticated, refresh } = useCredits();
  const syncQuotaFromBalance = usePricingStore((s) => s.syncQuotaFromBalance);
  const setCurrency = usePricingStore((s) => s.setCurrency);

  useEffect(() => {
    setCurrency(detectCurrencyFromLocale(locale));
  }, [locale, setCurrency]);

  useEffect(() => {
    if (!authenticated) {
      syncQuotaFromBalance(null, "free", false);
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/entitlements", { credentials: "include" });
        const data = (await res.json()) as {
          pro?: boolean;
          tier?: string;
        };
        if (!cancelled) {
          syncQuotaFromBalance(balance, data.tier, !!data.pro);
        }
      } catch {
        if (!cancelled) {
          syncQuotaFromBalance(balance, undefined, false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authenticated, balance, syncQuotaFromBalance]);

  return { refreshQuota: refresh };
}
