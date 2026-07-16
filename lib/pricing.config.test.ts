import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  ADD_ON_CONFIG,
  ANNUAL_DISCOUNT,
  CNY_RATE,
  QUARTERLY_DISCOUNT,
  SEMI_ANNUAL_DISCOUNT,
  addOnTotalPrice,
  annualBilledTotal,
  coerceBillingCycleForCurrency,
  cnyFromUsd,
  getAddOnPaymentMethodTypes,
  getSubscriptionPaymentMethodTypes,
  PLAN_DEFINITIONS,
  isCheckoutEnabled,
  monthlyUnitPrice,
  prepaidBilledTotal,
  prepaidDaysForBillingCycle,
  usdFromCny,
  validatePricingConfig,
} from "./pricing.config";

describe("pricing.config validation", () => {
  it("passes immutable Plan A checks", () => {
    const result = validatePricingConfig();
    assert.equal(result.valid, true, result.errors.join("; "));
    assert.deepEqual(result.errors, []);
  });

  it("keeps fixed constants", () => {
    assert.equal(CNY_RATE, 7.25);
    assert.equal(ANNUAL_DISCOUNT, 0.85);
    assert.equal(ADD_ON_CONFIG.priceUsd, 5);
    assert.equal(ADD_ON_CONFIG.priceCny, 39);
  });

  it("enables checkout only for Pro in phase 1", () => {
    assert.equal(isCheckoutEnabled("trial"), false);
    assert.equal(isCheckoutEnabled("pro"), true);
    assert.equal(isCheckoutEnabled("team"), false);
    assert.equal(isCheckoutEnabled("enterprise"), false);
  });

  it("marks Team and Enterprise as coming soon", () => {
    assert.equal(PLAN_DEFINITIONS.team.isComingSoon, true);
    assert.equal(PLAN_DEFINITIONS.enterprise.isComingSoon, true);
  });

  it("uses card-only subscription payment methods (dashboard-gated wallets)", () => {
    assert.deepEqual(getSubscriptionPaymentMethodTypes("USD", "annual"), ["card"]);
    assert.deepEqual(getSubscriptionPaymentMethodTypes("CNY", "annual"), ["card"]);
    assert.deepEqual(getAddOnPaymentMethodTypes("CNY"), ["card"]);
  });
});

describe("pricing.config currency conversion", () => {
  it("computes Pro monthly USD and CNY", () => {
    assert.equal(monthlyUnitPrice("pro", "USD", "monthly"), 29);
    assert.equal(monthlyUnitPrice("pro", "CNY", "monthly"), 199);
  });

  it("applies annual discount multiplier", () => {
    assert.equal(monthlyUnitPrice("pro", "USD", "annual"), 24.65);
    assert.equal(monthlyUnitPrice("team", "CNY", "annual"), 424);
  });

  it("computes annual billed totals with cycle discount on full period", () => {
    assert.equal(annualBilledTotal("pro", "USD"), 295.8);
    // round(499 * 12 * 0.85) — discount applied to period total
    assert.equal(annualBilledTotal("team", "CNY"), 5090);
  });

  it("computes CNY prepaid quarterly and semi-annual totals", () => {
    assert.equal(prepaidBilledTotal("pro", "CNY", "quarterly"), Math.round(199 * 3 * QUARTERLY_DISCOUNT));
    assert.equal(
      prepaidBilledTotal("pro", "CNY", "semi_annual"),
      Math.round(199 * 6 * SEMI_ANNUAL_DISCOUNT)
    );
    assert.equal(prepaidDaysForBillingCycle("quarterly"), 90);
    assert.equal(prepaidDaysForBillingCycle("semi_annual"), 182);
  });

  it("coerces CNY-only cycles when switching to USD", () => {
    assert.equal(coerceBillingCycleForCurrency("quarterly", "USD"), "monthly");
    assert.equal(coerceBillingCycleForCurrency("semi_annual", "USD"), "annual");
    assert.equal(coerceBillingCycleForCurrency("quarterly", "CNY"), "quarterly");
  });

  it("converts between USD and CNY at fixed rate", () => {
    assert.equal(usdFromCny(199), 27.45);
    assert.equal(cnyFromUsd(29), 210);
  });

  it("computes add-on pack totals", () => {
    assert.equal(addOnTotalPrice(1, "USD"), 5);
    assert.equal(addOnTotalPrice(10, "CNY"), 390);
  });
});
