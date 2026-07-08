import { create } from "zustand";
import {
  getQuotaForPlan,
  tierToPlan,
  type BillingCycle,
  type Currency,
  type Plan,
} from "@/lib/pricing/plans";

interface PricingState {
  selectedPlan: Plan;
  billingCycle: BillingCycle;
  currency: Currency;
  addOnCount: number;
  usedQuota: number;
  quotaLimit: number;
}

interface PricingActions {
  setSelectedPlan: (plan: Plan) => void;
  setBillingCycle: (cycle: BillingCycle) => void;
  setCurrency: (currency: Currency) => void;
  setAddOnCount: (count: number) => void;
  setUsedQuota: (used: number) => void;
  setQuotaLimit: (limit: number) => void;
  syncQuotaFromBalance: (remaining: number | null, tier: string | undefined, isPro: boolean) => void;
}

export const usePricingStore = create<PricingState & PricingActions>((set) => ({
  selectedPlan: "trial",
  billingCycle: "annual",
  currency: "USD",
  addOnCount: 0,
  usedQuota: 0,
  quotaLimit: 1,

  setSelectedPlan: (selectedPlan) => set({ selectedPlan }),
  setBillingCycle: (billingCycle) => set({ billingCycle }),
  setCurrency: (currency) => set({ currency }),
  setAddOnCount: (addOnCount) => set({ addOnCount }),
  setUsedQuota: (usedQuota) => set({ usedQuota }),
  setQuotaLimit: (quotaLimit) => set({ quotaLimit }),

  syncQuotaFromBalance: (remaining, tier, isPro) => {
    const plan = tierToPlan(tier, isPro);
    const quotaLimit = getQuotaForPlan(plan);
    const usedQuota =
      remaining == null ? 0 : Math.max(0, quotaLimit - remaining);
    set({ quotaLimit, usedQuota, selectedPlan: plan });
  },
}));

export function canPurchaseAddOn(
  state: Pick<PricingState, "usedQuota" | "quotaLimit">
): boolean {
  return state.quotaLimit > 0 && state.usedQuota >= state.quotaLimit;
}
