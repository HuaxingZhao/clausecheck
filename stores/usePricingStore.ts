"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  getQuotaForPlan,
  tierToPlan,
  type BillingCycle,
  type Currency,
  type PlanId,
} from "@/lib/pricing.config";

interface PricingState {
  selectedPlan: PlanId;
  billingCycle: BillingCycle;
  currency: Currency;
  addOnCount: number;
  usedQuota: number;
  quotaLimit: number;
  /** ISO date when quota resets (subscription anniversary). */
  resetDate: string | null;
  _hasHydrated: boolean;
}

interface PricingActions {
  setSelectedPlan: (plan: PlanId) => void;
  setBillingCycle: (cycle: BillingCycle) => void;
  setCurrency: (currency: Currency) => void;
  setAddOnCount: (count: number) => void;
  setUsedQuota: (used: number) => void;
  setQuotaLimit: (limit: number) => void;
  setResetDate: (date: string | null) => void;
  setHasHydrated: (hydrated: boolean) => void;
  syncQuotaFromBalance: (
    remaining: number | null,
    tier: string | undefined,
    isPro: boolean,
    resetDate?: string | null,
    serverQuota?: { used?: number; limit?: number } | null
  ) => void;
  incrementUsedQuota: (by?: number) => void;
}

export const usePricingStore = create<PricingState & PricingActions>()(
  persist(
    (set, get) => ({
      selectedPlan: "trial",
      billingCycle: "annual",
      currency: "USD",
      addOnCount: 0,
      usedQuota: 0,
      quotaLimit: 1,
      resetDate: null,
      _hasHydrated: false,

      setSelectedPlan: (selectedPlan) => set({ selectedPlan }),
      setBillingCycle: (billingCycle) => set({ billingCycle }),
      setCurrency: (currency) => set({ currency }),
      setAddOnCount: (addOnCount) => set({ addOnCount }),
      setUsedQuota: (usedQuota) => set({ usedQuota }),
      setQuotaLimit: (quotaLimit) => set({ quotaLimit }),
      setResetDate: (resetDate) => set({ resetDate }),
      setHasHydrated: (_hasHydrated) => set({ _hasHydrated }),

      syncQuotaFromBalance: (remaining, tier, isPro, resetDate, serverQuota) => {
        const plan = tierToPlan(tier, isPro);
        const addOnCount = get().addOnCount;
        const baseLimit = getQuotaForPlan(plan);
        const quotaLimit =
          typeof serverQuota?.limit === "number" && serverQuota.limit >= 0
            ? serverQuota.limit
            : baseLimit + addOnCount;
        const usedQuota =
          typeof serverQuota?.used === "number" && serverQuota.used >= 0
            ? serverQuota.used
            : remaining == null
              ? 0
              : Math.max(0, quotaLimit - remaining);
        set({
          quotaLimit,
          usedQuota,
          selectedPlan: plan,
          ...(resetDate !== undefined ? { resetDate } : {}),
        });
      },

      incrementUsedQuota: (by = 1) => {
        const { usedQuota, quotaLimit } = get();
        set({ usedQuota: Math.min(quotaLimit, usedQuota + by) });
      },
    }),
    {
      name: "clausecheck-pricing-v2",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        selectedPlan: state.selectedPlan,
        billingCycle: state.billingCycle,
        currency: state.currency,
        addOnCount: state.addOnCount,
        usedQuota: state.usedQuota,
        quotaLimit: state.quotaLimit,
        resetDate: state.resetDate,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);

export function canPurchaseAddOn(
  state: Pick<PricingState, "usedQuota" | "quotaLimit">
): boolean {
  return state.quotaLimit > 0 && state.usedQuota >= state.quotaLimit;
}

export function quotaUsagePercent(
  state: Pick<PricingState, "usedQuota" | "quotaLimit">
): number {
  if (state.quotaLimit <= 0) return 0;
  return Math.min(100, Math.round((state.usedQuota / state.quotaLimit) * 100));
}

/** Wait for zustand persist hydration before reading stored values on client. */
export function usePricingHydrated(): boolean {
  return usePricingStore((s) => s._hasHydrated);
}
