/**
 * Automated quality gates for AI review JSON output.
 * Shared by CLI script and unit tests.
 */

import { LEGAL_BASIS_ARTICLE_WHITELIST } from "./expert-system-prompt";
import type { RiskFlag, ScanResult } from "@/lib/types";

export type ValidateSeverity = "PASS" | "WARN" | "FAIL";

export interface ValidateIssue {
  severity: "WARN" | "FAIL";
  code: string;
  message: string;
  path?: string;
}

export interface ValidateReviewOutputResult {
  ok: boolean;
  exitCode: number;
  issues: ValidateIssue[];
  summary: {
    flagCount: number;
    highMediumCount: number;
    clauseReadySuggestions: number | null;
    articleHits: number[];
    unknownArticles: number[];
  };
}

const WHITELIST = new Set<number>(LEGAL_BASIS_ARTICLE_WHITELIST);

const ADVISORY_START =
  /^(建议|应当考虑|应当|请|可以考虑|推荐|Advise|Suggest|Consider|Please|Should\b)/i;

function extractArticles(text: string): number[] {
  const nums: number[] = [];
  const re = /第\s*(\d+)\s*条/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    nums.push(Number(m[1]));
  }
  // Also match "Art. 501" / "arts. 496-498"
  const en = /(?:art(?:icle|\.)?s?\s*)(\d+)(?:\s*[-–—]\s*(\d+))?/gi;
  while ((m = en.exec(text))) {
    const a = Number(m[1]);
    const b = m[2] ? Number(m[2]) : a;
    for (let n = a; n <= b; n++) nums.push(n);
  }
  return nums;
}

function isAdvisorySuggestion(text: string | undefined): boolean {
  if (!text?.trim()) return true;
  return ADVISORY_START.test(text.trim());
}

function asScanResult(input: unknown): ScanResult {
  if (!input || typeof input !== "object") {
    throw new Error("Input must be a JSON object");
  }
  const root = input as Record<string, unknown>;
  // Accept { result: ScanResult } wrappers from tmp/nda-review-full.json
  if (root.result && typeof root.result === "object") {
    return root.result as ScanResult;
  }
  return input as ScanResult;
}

export function validateReviewOutput(input: unknown): ValidateReviewOutputResult {
  const issues: ValidateIssue[] = [];
  const result = asScanResult(input);
  const flags = Array.isArray(result.flags) ? result.flags : [];
  const highMedium = flags.filter(
    (f) => f.level === "high" || f.level === "medium" || !f.level
  );

  if (flags.length < 6) {
    issues.push({
      severity: "FAIL",
      code: "FLAGS_BELOW_MIN",
      message: `flags.length=${flags.length} < 6`,
      path: "flags",
    });
  }

  const articleHits: number[] = [];
  const unknownArticles: number[] = [];

  flags.forEach((f: RiskFlag, i: number) => {
    const basis = f.legalBasis || "";
    const articles = extractArticles(basis);
    for (const n of articles) {
      articleHits.push(n);
      if (!WHITELIST.has(n)) {
        unknownArticles.push(n);
        issues.push({
          severity: "WARN",
          code: "LEGAL_BASIS_UNKNOWN_ARTICLE",
          message: `legalBasis cites 第${n}条 which is not on the whitelist`,
          path: `flags[${i}].legalBasis`,
        });
      }
    }

    // Soft-hallucination: Civil Code used for jurisdiction
    if (
      /管辖|forum|jurisdiction/i.test(`${f.category || ""} ${f.text || ""}`) &&
      /民法典/.test(basis) &&
      !/民事诉讼法|民事訴訟法|Civil Procedure/i.test(basis)
    ) {
      issues.push({
        severity: "WARN",
        code: "JURISDICTION_CITED_CIVIL_CODE",
        message: "Jurisdiction risk cites Civil Code instead of Civil Procedure Law / commercial practice",
        path: `flags[${i}].legalBasis`,
      });
    }
  });

  const clauseReady = result.qualityStats?.clauseReadySuggestions ?? null;
  if (highMedium.length > 0 && clauseReady === 0) {
    issues.push({
      severity: "FAIL",
      code: "NO_CLAUSE_READY_SUGGESTIONS",
      message: "qualityStats.clauseReadySuggestions === 0 while high/medium flags exist",
      path: "qualityStats.clauseReadySuggestions",
    });
  }

  highMedium.forEach((f, i) => {
    if (isAdvisorySuggestion(f.suggestion)) {
      issues.push({
        severity: "FAIL",
        code: "ADVISORY_SUGGESTION",
        message: `suggestion starts with advisory wording or is empty: "${(f.suggestion || "").slice(0, 40)}"`,
        path: `flags[${i}].suggestion`,
      });
    }
  });

  const hasFail = issues.some((x) => x.severity === "FAIL");
  return {
    ok: !hasFail,
    exitCode: hasFail ? 1 : 0,
    issues,
    summary: {
      flagCount: flags.length,
      highMediumCount: highMedium.length,
      clauseReadySuggestions: clauseReady,
      articleHits: [...new Set(articleHits)],
      unknownArticles: [...new Set(unknownArticles)],
    },
  };
}
