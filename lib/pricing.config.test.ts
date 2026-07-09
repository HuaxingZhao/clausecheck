import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  ADD_ON_CONFIG,
  ANNUAL_DISCOUNT,
  CNY_RATE,
  addOnTotalPrice,
  annualBilledTotal,
  cnyFromUsd,
  isCheckoutEnabled,
  monthlyUnitPrice,
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

  it("computes annual billed totals as 12 × discounted monthly", () => {
    assert.equal(annualBilledTotal("pro", "USD"), 295.8);
    assert.equal(annualBilledTotal("team", "CNY"), 5088);
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
