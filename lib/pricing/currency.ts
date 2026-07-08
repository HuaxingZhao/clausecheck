import {
  ADD_ON_CONFIG,
  annualBilledTotal,
  monthlyUnitPrice,
  type BillingCycle,
  type Currency,
  type PaidPlanId,
} from "@/lib/pricing.config";

export function detectCurrencyFromLocale(locale: string): Currency {
  return locale === "zh" ? "CNY" : "USD";
}

const FORMAT_LOCALE: Record<Currency, string> = {
  USD: "en-US",
  CNY: "zh-CN",
};

export function formatMoney(
  amount: number,
  currency: Currency,
  locale?: string
): string {
  const loc = locale ?? FORMAT_LOCALE[currency];
  const hasCents = currency === "USD" && Math.round(amount * 100) % 100 !== 0;
  return new Intl.NumberFormat(loc, {
    style: "currency",
    currency,
    minimumFractionDigits: currency === "CNY" ? 0 : hasCents ? 2 : 0,
    maximumFractionDigits: currency === "CNY" ? 0 : 2,
  }).format(amount);
}

export function formatPlanPrice(
  plan: PaidPlanId,
  currency: Currency,
  cycle: BillingCycle,
  locale?: string
): { main: string; period: string; sub?: string } {
  const perMonth = monthlyUnitPrice(plan, currency, cycle);
  const main = formatMoney(perMonth, currency, locale);
  const period = "/mo";

  if (cycle === "annual") {
    const total = annualBilledTotal(plan, currency);
    const isZh = (locale ?? FORMAT_LOCALE[currency]) === "zh-CN";
    return {
      main,
      period,
      sub: isZh
        ? `按年付 ${formatMoney(total, currency, locale)} · 省 15%`
        : `Billed ${formatMoney(total, currency, locale)}/yr · save 15%`,
    };
  }

  return { main, period };
}

export function formatAddOnPrice(currency: Currency, locale?: string): string {
  const amount = currency === "USD" ? ADD_ON_CONFIG.priceUsd : ADD_ON_CONFIG.priceCny;
  return formatMoney(amount, currency, locale);
}

export function formatAddOnPackTotal(
  packs: number,
  currency: Currency,
  locale?: string
): string {
  const unit = currency === "USD" ? ADD_ON_CONFIG.priceUsd : ADD_ON_CONFIG.priceCny;
  return formatMoney(unit * packs, currency, locale);
}
