import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  computeProUntilFromCycle,
  parseBillingCycle,
  prepaidDaysForCycle,
} from "./pro-prepaid";

describe("prepaidDaysForCycle", () => {
  it("maps all prepaid cycles", () => {
    assert.equal(prepaidDaysForCycle("monthly"), 30);
    assert.equal(prepaidDaysForCycle("quarterly"), 90);
    assert.equal(prepaidDaysForCycle("semi_annual"), 182);
    assert.equal(prepaidDaysForCycle("annual"), 365);
  });
});

describe("parseBillingCycle", () => {
  it("accepts known cycles and defaults unknown", () => {
    assert.equal(parseBillingCycle("quarterly"), "quarterly");
    assert.equal(parseBillingCycle("semi_annual"), "semi_annual");
    assert.equal(parseBillingCycle("nope"), "monthly");
  });
});

describe("computeProUntilFromCycle", () => {
  it("adds 90 days for quarterly", () => {
    const now = new Date("2026-07-16T00:00:00.000Z");
    assert.equal(
      computeProUntilFromCycle("quarterly", null, now),
      "2026-10-14T00:00:00.000Z"
    );
  });

  it("adds 182 days for semi_annual", () => {
    const now = new Date("2026-01-01T00:00:00.000Z");
    assert.equal(
      computeProUntilFromCycle("semi_annual", null, now),
      "2026-07-02T00:00:00.000Z"
    );
  });

  it("stacks from existing unexpired proUntil", () => {
    const now = new Date("2026-07-16T00:00:00.000Z");
    const existing = "2026-08-01T00:00:00.000Z";
    assert.equal(
      computeProUntilFromCycle("monthly", existing, now),
      "2026-08-31T00:00:00.000Z"
    );
  });
});
