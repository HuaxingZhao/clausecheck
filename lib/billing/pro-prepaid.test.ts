import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  computeProUntilFromCycle,
  prepaidDaysForCycle,
} from "./pro-prepaid";

describe("prepaidDaysForCycle", () => {
  it("monthly = 30, annual = 365", () => {
    assert.equal(prepaidDaysForCycle("monthly"), 30);
    assert.equal(prepaidDaysForCycle("annual"), 365);
  });
});

describe("computeProUntilFromCycle", () => {
  it("adds 30 days from now when no existing Pro", () => {
    const now = new Date("2026-07-16T00:00:00.000Z");
    const until = computeProUntilFromCycle("monthly", null, now);
    assert.equal(until, "2026-08-15T00:00:00.000Z");
  });

  it("adds 365 days for annual", () => {
    const now = new Date("2026-01-01T00:00:00.000Z");
    const until = computeProUntilFromCycle("annual", null, now);
    assert.equal(until, "2027-01-01T00:00:00.000Z");
  });

  it("stacks from existing unexpired proUntil", () => {
    const now = new Date("2026-07-16T00:00:00.000Z");
    const existing = "2026-08-01T00:00:00.000Z";
    const until = computeProUntilFromCycle("monthly", existing, now);
    assert.equal(until, "2026-08-31T00:00:00.000Z");
  });

  it("ignores expired existing proUntil", () => {
    const now = new Date("2026-07-16T00:00:00.000Z");
    const existing = "2026-07-01T00:00:00.000Z";
    const until = computeProUntilFromCycle("monthly", existing, now);
    assert.equal(until, "2026-08-15T00:00:00.000Z");
  });
});
