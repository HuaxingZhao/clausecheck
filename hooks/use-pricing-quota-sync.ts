"use client";

import { useEffect } from "react";
import { usePricingStore } from "@/stores/usePricingStore";
import { useCredits } from "@/hooks/use-credits";
import { detectCurrencyFromLocale } from "@/lib/pricing/currency";

/** Sync Zustand usedQuota + default currency from entitlements API & locale */
export function usePricingQuotaSync(locale: string) {
  const { balance, authenticated, refresh } = useCredits();
  const syncQuotaFromBalance = usePricingStore((s) => s.syncQuotaFromBalance);
  const setCurrency = usePricingStore((s) => s.setCurrency);
  const setResetDate = usePricingStore((s) => s.setResetDate);

  useEffect(() => {
    setCurrency(detectCurrencyFromLocale(locale));
  }, [locale, setCurrency]);

  useEffect(() => {
    if (!authenticated) {
      syncQuotaFromBalance(null, "trial", false);
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/entitlements", { credentials: "include" });
        const data = (await res.json()) as {
          pro?: boolean;
          tier?: string;
          plan?: string;
          quotaRemaining?: number;
          quotaUsed?: number;
          quotaLimit?: number;
          resetAt?: string | null;
        };
        if (!cancelled) {
          const remaining =
            typeof data.quotaRemaining === "number" ? data.quotaRemaining : balance;
          syncQuotaFromBalance(
            remaining,
            data.plan ?? data.tier,
            !!data.pro,
            data.resetAt ?? null,
            {
              used: data.quotaUsed,
              limit: data.quotaLimit,
            }
          );
          if (data.resetAt) setResetDate(data.resetAt);
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
  }, [authenticated, balance, syncQuotaFromBalance, setResetDate]);

  return { refreshQuota: refresh };
}
