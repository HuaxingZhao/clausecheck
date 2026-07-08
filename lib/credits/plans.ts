export type TopupPlan = "pro" | "boost";

export interface TopupPlanConfig {
  plan: TopupPlan;
  amountCents: number;
  creditsAmount: number;
  label: string;
}

/** All amounts in integer fen (CNY cents). */
export const TOPUP_PLANS: Record<TopupPlan, TopupPlanConfig> = {
  pro: {
    plan: "pro",
    amountCents: 4900,
    creditsAmount: 30,
    label: "专业版 · 30 份额度",
  },
  boost: {
    plan: "boost",
    amountCents: 2900,
    creditsAmount: 1,
    label: "单次加油包 · 1 份额度",
  },
};

export function getTopupPlan(plan: TopupPlan): TopupPlanConfig {
  return TOPUP_PLANS[plan];
}
