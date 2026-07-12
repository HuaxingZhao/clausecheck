/**
 * Unit tests for review output quality gates (offline).
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { validateReviewOutput } from "./validate-review-output";

describe("validateReviewOutput", () => {
  it("FAILS advisory suggestions and low flag count", () => {
    const report = validateReviewOutput({
      flags: [
        {
          text: "a",
          suggestion: "建议修改本条",
          level: "high",
          legalBasis: "基于商业惯例：测试",
        },
      ],
      qualityStats: { totalFlags: 1, clauseReadySuggestions: 0 },
    });
    assert.equal(report.ok, false);
    assert.ok(report.issues.some((i) => i.code === "FLAGS_BELOW_MIN"));
    assert.ok(report.issues.some((i) => i.code === "ADVISORY_SUGGESTION"));
    assert.ok(report.issues.some((i) => i.code === "NO_CLAUSE_READY_SUGGESTIONS"));
  });

  it("WARNs on unknown Civil Code article numbers", () => {
    const flags = Array.from({ length: 6 }, (_, i) => ({
      text: `risk ${i}`,
      suggestion: `第${i + 1}条 保密信息指【双方书面确认】的非公开信息。`,
      level: "high" as const,
      legalBasis: i === 0 ? "《民法典》第999条" : "基于商业惯例：测试",
    }));
    const report = validateReviewOutput({
      flags,
      qualityStats: { totalFlags: 6, clauseReadySuggestions: 6 },
    });
    assert.equal(report.ok, true); // WARN only
    assert.equal(report.exitCode, 0);
    assert.ok(report.issues.some((i) => i.code === "LEGAL_BASIS_UNKNOWN_ARTICLE"));
  });

  it("PASS for whitelist articles and paste-ready clauses", () => {
    const flags = Array.from({ length: 6 }, (_, i) => ({
      text: `risk ${i}`,
      suggestion: `本协议项下保密义务自终止之日起继续有效【五】年。`,
      level: "medium" as const,
      legalBasis: "《民法典》第501条",
    }));
    const report = validateReviewOutput({
      detectedJurisdiction: "china_prc",
      flags,
      qualityStats: { totalFlags: 6, clauseReadySuggestions: 3 },
    });
    assert.equal(report.ok, true);
    assert.equal(report.issues.length, 0);
  });

  it("FAILs PRC Civil Code leakage and case names on non-China track", () => {
    const flags = Array.from({ length: 6 }, (_, i) => ({
      text: `risk ${i}`,
      suggestion: `Provider's aggregate liability shall not exceed fees paid in the prior twelve months.`,
      level: "high" as const,
      legalBasis:
        i === 0
          ? "Article 501 of Civil Code requires confidentiality."
          : i === 1
            ? "Under Smith v. Jones, uncapped indemnity is void."
            : "Under general principles of California contract law, one-sided caps are commercially unusual.",
      riskRationale:
        i === 0
          ? "Article 501 of Civil Code requires confidentiality."
          : i === 1
            ? "Under Smith v. Jones, uncapped indemnity is void."
            : "Under general principles of California contract law, one-sided caps are commercially unusual.",
      category:
        i === 0
          ? "Confidentiality"
          : i === 1
            ? "Indemnification"
            : "Limitation of Liability",
    }));
    const report = validateReviewOutput({
      detectedJurisdiction: "us_california",
      governingLawQuote: "laws of the State of California",
      flags,
      missingClauses: [
        {
          name: "DPA / SCCs",
          importance: "CPRA cross-border",
          suggestion: "Parties shall execute a DPA with SCCs.",
        },
        {
          name: "Severability",
          importance: "boilerplate",
          suggestion: "If any provision is held unenforceable, the remainder continues.",
        },
      ],
      qualityStats: { totalFlags: 6, clauseReadySuggestions: 6 },
    });
    assert.equal(report.ok, false);
    assert.ok(report.issues.some((i) => i.code === "PRC_LAW_LEAK_ON_NON_CHINA"));
    assert.ok(report.issues.some((i) => i.code === "CASE_NAME_HALLUCINATION"));
    assert.equal(report.summary.isChinaTrack, false);
  });

  it("FAILs when boilerplate is missing but not reported on California deals", () => {
    const flags = Array.from({ length: 6 }, (_, i) => ({
      text: `misc risk ${i}`,
      suggestion: `Customer may terminate for material breach uncured within thirty days.`,
      level: "medium" as const,
      legalBasis:
        "Under general principles of California contract law, notice periods should be mutual.",
      riskRationale:
        "Under general principles of California contract law, notice periods should be mutual.",
      category: "Termination",
    }));
    const report = validateReviewOutput({
      detectedJurisdiction: "us_california",
      flags,
      qualityStats: { totalFlags: 6, clauseReadySuggestions: 6 },
    });
    assert.equal(report.ok, false);
    assert.ok(report.issues.some((i) => i.code === "BOILERPLATE_NOT_REPORTED"));
    assert.ok(report.issues.some((i) => i.code === "GLOBAL_ADDON_GAP"));
  });

  it("PASSes when contract text already contains full boilerplate", () => {
    const flags = Array.from({ length: 6 }, (_, i) => ({
      text: `liability / indemnity / data risk ${i}`,
      suggestion: `Provider's aggregate liability shall not exceed fees paid in the prior twelve (12) months.`,
      level: "medium" as const,
      category:
        i === 0
          ? "Limitation of Liability"
          : i === 1
            ? "Indemnification"
            : i === 2
              ? "Data Protection CPRA"
              : "Termination for Convenience",
      legalBasis:
        "Under general principles of California contract law, market practice requires balanced caps.",
      riskRationale:
        "Under general principles of California contract law, market practice requires balanced caps.",
    }));
    const contractText = `
      ENTIRE AGREEMENT. This is the entire agreement.
      SEVERABILITY. If any provision is unenforceable, the rest continues.
      WAIVER. No waiver unless in writing.
      FORCE MAJEURE. Neither party liable for force majeure events.
    `;
    const report = validateReviewOutput({
      result: {
        detectedJurisdiction: "us_california",
        flags,
        qualityStats: { totalFlags: 6, clauseReadySuggestions: 6 },
      },
      contractText,
    });
    assert.equal(report.ok, true);
    assert.equal(report.summary.globalAddonCoverage.boilerplate, true);
  });
});
