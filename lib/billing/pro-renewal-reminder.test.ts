import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildRenewUrl,
  reminderWindowForProUntil,
} from "./pro-renewal-reminder";

describe("reminderWindowForProUntil", () => {
  const now = new Date("2026-07-17T00:00:00.000Z");

  it("returns 1d when under ~1.5 days left", () => {
    assert.equal(
      reminderWindowForProUntil("2026-07-18T00:00:00.000Z", now),
      "1d"
    );
  });

  it("returns 7d when between ~1.5 and 7.5 days", () => {
    assert.equal(
      reminderWindowForProUntil("2026-07-22T00:00:00.000Z", now),
      "7d"
    );
  });

  it("returns null when more than a week left", () => {
    assert.equal(
      reminderWindowForProUntil("2026-08-01T00:00:00.000Z", now),
      null
    );
  });

  it("returns null when already expired", () => {
    assert.equal(
      reminderWindowForProUntil("2026-07-16T00:00:00.000Z", now),
      null
    );
  });
});

describe("buildRenewUrl", () => {
  it("builds zh pricing deep link", () => {
    assert.equal(
      buildRenewUrl("https://www.clausecheck.cc", "zh"),
      "https://www.clausecheck.cc/zh/pricing?plan=pro"
    );
  });

  it("omits /en for default locale", () => {
    assert.equal(
      buildRenewUrl("https://www.clausecheck.cc", "en"),
      "https://www.clausecheck.cc/pricing?plan=pro"
    );
  });
});
