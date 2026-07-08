import type { Currency } from "./plans";
import { ADD_ON_PLAN, monthlyPrice, annualTotal } from "./plans";
import type { BillingCycle, Plan } from "./plans";

export function detectCurrencyFromLocale(locale: string): Currency {
  return locale === "zh" ? "CNY" : "USD";
}

export function formatMoney(amount: number, currency: Currency): string {
  if (currency === "USD") {
    const hasCents = Math.round(amount * 100) % 100 !== 0;
    return `$${amount.toLocaleString("en-US", {
      minimumFractionDigits: hasCents ? 2 : 0,
      maximumFractionDigits: 2,
    })}`;
  }
  return `¥${Math.round(amount).toLocaleString("zh-CN")}`;
}

export function formatPlanPrice(
  plan: Exclude<Plan, "enterprise" | "trial">,
  currency: Currency,
  cycle: BillingCycle
): { main: string; period: string; sub?: string } {
  const perMonth = monthlyPrice(plan, currency, cycle);
  const main = formatMoney(perMonth, currency);
  const period = cycle === "annual" ? "/mo" : "/mo";

  if (cycle === "annual") {
    const total = annualTotal(plan, currency);
    return {
      main,
      period,
      sub:
        currency === "USD"
          ? `Billed ${formatMoney(total, currency)}/yr · save 15%`
          : `按年付 ${formatMoney(total, currency)} · 省 15%`,
    };
  }

  return { main, period };
}

export function formatAddOnPrice(currency: Currency): string {
  const amount = currency === "USD" ? ADD_ON_PLAN.usd : ADD_ON_PLAN.cny;
  return formatMoney(amount, currency);
}
