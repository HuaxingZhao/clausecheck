import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  CONTRACT_BODY_MAX_AGE_MS,
  contractBodyCutoffDate,
  sanitizeScanResultForPersistence,
} from "./contract-retention";
import type { ScanResult } from "@/lib/types";

function sampleResult(): ScanResult {
  return {
    contractType: "NDA",
    scoreNum: 60,
    scoreText: "C",
    signingRecommendation: "sign_with_changes",
    executiveSummary: "summary",
    summary: "summary",
    flags: [
      {
        icon: "!",
        text: "risk",
        suggestion: "A".repeat(200),
        quote: "Q".repeat(200),
      },
    ],
    negotiations: [
      {
        priority: 1,
        clause: "§1",
        quote: "quote-long-" + "x".repeat(200),
        suggested: "S".repeat(200),
        reason: "why",
      },
    ],
    contractReview: {
      source: "FULL CONTRACT BODY SHOULD NOT PERSIST",
      items: [
        {
          id: "1",
          index: 0,
          kind: "flag",
          title: "t",
          originalText: "O".repeat(200),
          suggestionText: "R".repeat(200),
          start: 0,
          end: 1,
          matched: true,
          navigable: true,
        },
      ],
      clauseCount: 1,
      pipeline: { extracted: true, analyzed: true, locked: true, ready: true },
      stats: {
        matched: 1,
        navigable: 1,
        total: 1,
        editable: 1,
        missing: 0,
        unlocated: 0,
      },
    },
  } as unknown as ScanResult;
}

describe("sanitizeScanResultForPersistence", () => {
  it("removes full contract source and truncates quotes", () => {
    const out = sanitizeScanResultForPersistence(sampleResult());
    assert.equal(out.contractReview?.source, "");
    assert.ok((out.flags[0]?.quote?.length ?? 0) <= 121);
    assert.ok((out.flags[0]?.suggestion?.length ?? 0) <= 121);
    assert.ok(!("contractText" in (out as object)));
  });

  it("does not mutate the input object", () => {
    const input = sampleResult();
    sanitizeScanResultForPersistence(input);
    assert.equal(input.contractReview?.source, "FULL CONTRACT BODY SHOULD NOT PERSIST");
  });
});

describe("contractBodyCutoffDate", () => {
  it("is 24h before now by default", () => {
    const now = new Date("2026-07-15T12:00:00.000Z");
    const cutoff = contractBodyCutoffDate(now);
    assert.equal(cutoff.toISOString(), "2026-07-14T12:00:00.000Z");
    assert.equal(CONTRACT_BODY_MAX_AGE_MS, 24 * 60 * 60 * 1000);
  });
});
