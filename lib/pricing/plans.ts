export type Plan = "trial" | "pro" | "team" | "enterprise";
export type BillingCycle = "monthly" | "annual";
export type Currency = "USD" | "CNY";

/** Fixed display rate — USD primary */
export const USD_CNY_RATE = 7.25;

export const ANNUAL_DISCOUNT = 0.15;

export interface PlanQuotaConfig {
  plan: Plan;
  quotaPerCycle: number;
  monthlyUsd: number | null;
  monthlyCny: number | null;
  selfServe: boolean;
}

export const PLAN_QUOTAS: Record<Exclude<Plan, "enterprise">, PlanQuotaConfig> = {
  trial: {
    plan: "trial",
    quotaPerCycle: 1,
    monthlyUsd: 0,
    monthlyCny: 0,
    selfServe: true,
  },
  pro: {
    plan: "pro",
    quotaPerCycle: 10,
    monthlyUsd: 29,
    monthlyCny: 199,
    selfServe: true,
  },
  team: {
    plan: "team",
    quotaPerCycle: 30,
    monthlyUsd: 79,
    monthlyCny: 499,
    selfServe: true,
  },
};

export const ADD_ON_PLAN = {
  id: "boost" as const,
  /** +1 contract, valid for current billing cycle only */
  quota: 1,
  usd: 5,
  cny: 39,
};

export function tierToPlan(tier: string | undefined, isPro: boolean): Plan {
  if (tier === "team") return "team";
  if (isPro || tier === "pro") return "pro";
  return "trial";
}

export function getQuotaForPlan(plan: Plan): number {
  if (plan === "enterprise") return 0;
  return PLAN_QUOTAS[plan].quotaPerCycle;
}

export function monthlyPrice(
  plan: Exclude<Plan, "enterprise" | "trial">,
  currency: Currency,
  cycle: BillingCycle
): number {
  const cfg = PLAN_QUOTAS[plan];
  const base = currency === "USD" ? cfg.monthlyUsd! : cfg.monthlyCny!;
  if (cycle === "annual") {
    return Math.round(base * (1 - ANNUAL_DISCOUNT) * 100) / 100;
  }
  return base;
}

export function annualTotal(
  plan: Exclude<Plan, "enterprise" | "trial">,
  currency: Currency
): number {
  const perMonth = monthlyPrice(plan, currency, "annual");
  return Math.round(perMonth * 12 * 100) / 100;
}

export function checkoutPriceId(
  plan: "pro" | "team",
  cycle: BillingCycle
): string {
  return `${plan}_${cycle}`;
}

export function stripeCurrencyKey(currency: Currency): "usd" | "cny" {
  return currency === "USD" ? "usd" : "cny";
}
