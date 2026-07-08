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
    amountCents: 19900,
    creditsAmount: 10,
    label: "专业版 · 10 份/周期",
  },
  boost: {
    plan: "boost",
    amountCents: 3900,
    creditsAmount: 1,
    label: "加油包 · +1 份（当前周期）",
  },
};

export function getTopupPlan(plan: TopupPlan): TopupPlanConfig {
  return TOPUP_PLANS[plan];
}
