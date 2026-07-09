/**
 * Plan A pricing — single source of truth.
 * Do not hardcode prices elsewhere.
 */

export const CNY_RATE = 7.25 as const;
/** Multiplier applied to monthly price when billing annually (15% off). */
export const ANNUAL_DISCOUNT = 0.85 as const;
export const ANNUAL_SAVINGS_PERCENT = Math.round((1 - ANNUAL_DISCOUNT) * 100);

export type PlanId = "trial" | "pro" | "team" | "enterprise";
export type SelfServePlanId = Exclude<PlanId, "enterprise">;
/** Plans with list prices shown on cards (includes future Team). */
export type PaidPlanId = "pro" | "team";
/** Phase 1: only Pro accepts real checkout. Team/Enterprise are visual placeholders. */
export type CheckoutPlanId = "pro";
export type BillingCycle = "monthly" | "annual";
export type Currency = "USD" | "CNY";
export type PurchaseType = "subscription" | "addon";

export interface PlanDefinition {
  id: PlanId;
  quotaPerCycle: number;
  monthlyUsd: number | null;
  monthlyCny: number | null;
  /** Reserved for future self-serve expansion. */
  selfServe: boolean;
  /** When true, Payment Element / Stripe APIs may be invoked for this plan. */
  checkoutEnabled: boolean;
  /** Phase 1 placeholder — show prices but block checkout. */
  isComingSoon?: boolean;
}

export const PLAN_DEFINITIONS: Record<PlanId, PlanDefinition> = {
  trial: {
    id: "trial",
    quotaPerCycle: 1,
    monthlyUsd: 0,
    monthlyCny: 0,
    selfServe: true,
    checkoutEnabled: false,
  },
  pro: {
    id: "pro",
    quotaPerCycle: 10,
    monthlyUsd: 29,
    monthlyCny: 199,
    selfServe: true,
    checkoutEnabled: true,
  },
  team: {
    id: "team",
    quotaPerCycle: 30,
    monthlyUsd: 79,
    monthlyCny: 499,
    selfServe: false,
    checkoutEnabled: false,
    isComingSoon: true,
  },
  enterprise: {
    id: "enterprise",
    quotaPerCycle: 0,
    monthlyUsd: null,
    monthlyCny: null,
    selfServe: false,
    checkoutEnabled: false,
    isComingSoon: true,
  },
};

export const CHECKOUT_ENABLED_PLANS: readonly CheckoutPlanId[] = ["pro"];

export function isCheckoutEnabled(plan: PlanId): boolean {
  return PLAN_DEFINITIONS[plan].checkoutEnabled;
}

export const ADD_ON_CONFIG = {
  quotaPerPack: 1,
  priceUsd: 5,
  priceCny: 39,
  packSizes: [1, 5, 10] as const,
};

export type AddOnPackSize = (typeof ADD_ON_CONFIG.packSizes)[number];

function roundMoney(amount: number, currency: Currency): number {
  if (currency === "CNY") return Math.round(amount);
  return Math.round(amount * 100) / 100;
}

export function monthlyUnitPrice(
  plan: PaidPlanId,
  currency: Currency,
  cycle: BillingCycle
): number {
  const def = PLAN_DEFINITIONS[plan];
  const base = currency === "USD" ? def.monthlyUsd! : def.monthlyCny!;
  if (cycle === "annual") {
    return roundMoney(base * ANNUAL_DISCOUNT, currency);
  }
  return base;
}

export function annualBilledTotal(plan: PaidPlanId, currency: Currency): number {
  return roundMoney(monthlyUnitPrice(plan, currency, "annual") * 12, currency);
}

export function addOnUnitPrice(currency: Currency): number {
  return currency === "USD" ? ADD_ON_CONFIG.priceUsd : ADD_ON_CONFIG.priceCny;
}

export function addOnTotalPrice(packs: number, currency: Currency): number {
  return roundMoney(addOnUnitPrice(currency) * packs, currency);
}

export function toStripeCents(amount: number, _currency: Currency): number {
  return Math.round(amount * 100);
}

export function checkoutPriceId(plan: CheckoutPlanId, cycle: BillingCycle): string {
  return `${plan}_${cycle}`;
}

export function stripeCurrencyKey(currency: Currency): "usd" | "cny" {
  return currency === "USD" ? "usd" : "cny";
}

export function tierToPlan(tier: string | undefined, isPro: boolean): PlanId {
  if (tier === "team") return "team";
  if (isPro || tier === "pro") return "pro";
  return "trial";
}

export function getQuotaForPlan(plan: PlanId): number {
  return PLAN_DEFINITIONS[plan].quotaPerCycle;
}

export function allowsWechatAlipay(
  currency: Currency,
  cycle: BillingCycle,
  purchaseType: PurchaseType
): boolean {
  if (currency !== "CNY") return false;
  if (purchaseType === "addon") return true;
  return cycle === "annual";
}

/**
 * Subscription checkout — card only by default.
 * Apple Pay / Google Pay / Link / WeChat appear in Payment Element when enabled in Stripe Dashboard.
 * Do not pass us_bank_account / wechat_pay here unless your account has them activated.
 */
export function getSubscriptionPaymentMethodTypes(
  _currency: Currency,
  _cycle: BillingCycle
): string[] {
  return ["card"];
}

/** @deprecated Add-ons use automatic_payment_methods in create-intent. */
export function getAddOnPaymentMethodTypes(_currency: Currency): string[] {
  return ["card"];
}

export function getPaymentMethodTypes(
  currency: Currency,
  cycle: BillingCycle,
  purchaseType: PurchaseType
): string[] {
  if (purchaseType === "addon") {
    return getAddOnPaymentMethodTypes(currency);
  }
  return getSubscriptionPaymentMethodTypes(currency, cycle);
}

export function usdFromCny(cny: number): number {
  return roundMoney(cny / CNY_RATE, "USD");
}

export function cnyFromUsd(usd: number): number {
  return roundMoney(usd * CNY_RATE, "CNY");
}

export function validatePricingConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  for (const [id, plan] of Object.entries(PLAN_DEFINITIONS)) {
    if (plan.id !== id) {
      errors.push(`Plan key "${id}" does not match id "${plan.id}"`);
    }
    if (plan.selfServe && id !== "enterprise") {
      const selfServe = plan as PlanDefinition & { monthlyUsd: number; monthlyCny: number };
      if (selfServe.monthlyUsd == null || selfServe.monthlyCny == null) {
        errors.push(`Self-serve plan "${id}" missing price`);
      }
    }
  }

  const pro = PLAN_DEFINITIONS.pro;
  const team = PLAN_DEFINITIONS.team;
  if (pro.monthlyUsd !== 29) errors.push("Pro USD must be 29");
  if (pro.monthlyCny !== 199) errors.push("Pro CNY must be 199");
  if (team.monthlyUsd !== 79) errors.push("Team USD must be 79");
  if (team.monthlyCny !== 499) errors.push("Team CNY must be 499");
  if (ADD_ON_CONFIG.priceUsd !== 5) errors.push("Add-on USD must be 5");
  if (ADD_ON_CONFIG.priceCny !== 39) errors.push("Add-on CNY must be 39");
  if (PLAN_DEFINITIONS.trial.quotaPerCycle !== 1) errors.push("Trial quota must be 1");
  if (pro.quotaPerCycle !== 10) errors.push("Pro quota must be 10");
  if (team.quotaPerCycle !== 30) errors.push("Team quota must be 30");

  if (ANNUAL_DISCOUNT <= 0 || ANNUAL_DISCOUNT >= 1) {
    errors.push("ANNUAL_DISCOUNT must be between 0 and 1");
  }

  if (!PLAN_DEFINITIONS.pro.checkoutEnabled) {
    errors.push("Pro must have checkoutEnabled");
  }
  if (PLAN_DEFINITIONS.team.checkoutEnabled || PLAN_DEFINITIONS.enterprise.checkoutEnabled) {
    errors.push("Team and Enterprise must not enable checkout in phase 1");
  }
  if (!PLAN_DEFINITIONS.team.isComingSoon) {
    errors.push("Team must be marked isComingSoon in phase 1");
  }

  return { valid: errors.length === 0, errors };
}

/** @deprecated Use PlanId */
export type Plan = PlanId;

/** @deprecated Use PLAN_DEFINITIONS */
export const PLAN_QUOTAS = {
  trial: PLAN_DEFINITIONS.trial,
  pro: PLAN_DEFINITIONS.pro,
  team: PLAN_DEFINITIONS.team,
} as const;

/** @deprecated Use ADD_ON_CONFIG */
export const ADD_ON_PLAN = {
  id: "boost" as const,
  quota: ADD_ON_CONFIG.quotaPerPack,
  usd: ADD_ON_CONFIG.priceUsd,
  cny: ADD_ON_CONFIG.priceCny,
};

/** @deprecated Use monthlyUnitPrice */
export function monthlyPrice(
  plan: PaidPlanId,
  currency: Currency,
  cycle: BillingCycle
): number {
  return monthlyUnitPrice(plan, currency, cycle);
}

/** @deprecated Use annualBilledTotal */
export function annualTotal(plan: PaidPlanId, currency: Currency): number {
  return annualBilledTotal(plan, currency);
}

/** @deprecated Use ANNUAL_SAVINGS_PERCENT — kept for callers expecting discount fraction */
export const LEGACY_ANNUAL_DISCOUNT_FRACTION = 1 - ANNUAL_DISCOUNT;
