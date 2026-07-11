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
      flags,
      qualityStats: { totalFlags: 6, clauseReadySuggestions: 3 },
    });
    assert.equal(report.ok, true);
    assert.equal(report.issues.length, 0);
  });
});
