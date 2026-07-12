/**
 * Automated quality gates for AI review JSON output.
 * Shared by CLI script and unit tests.
 * Jurisdiction-aware: China track vs common-law / international track.
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
    detectedJurisdiction: string | null;
    isChinaTrack: boolean;
    globalAddonCoverage: Record<string, boolean>;
  };
}

const WHITELIST = new Set<number>(LEGAL_BASIS_ARTICLE_WHITELIST);

const ADVISORY_START =
  /^(建议|应当考虑|应当|请|可以考虑|推荐|Advise|Suggest|Consider|Please|Should\b)/i;

/** Case-name hallucination pattern (e.g. "Smith v. Jones", "Acme v Beta Corp"). */
const CASE_NAME_RE =
  /\b([A-Z][A-Za-z0-9&.\-' ]{1,40})\s+v\.?\s+([A-Z][A-Za-z0-9&.\-' ]{1,40})\b/;

/** PRC Civil Code leakage on non-China tracks (not bare 「第X条」 alone). */
const PRC_CIVIL_CODE_LEAK_RE =
  /《\s*民法典\s*》|(?:PRC\s+)?Civil\s+Code(?:\s+of\s+the\s+People.?s\s+Republic\s+of\s+China)?|(?:Article|Art\.?)\s*\d+\s+of\s+(?:the\s+)?(?:PRC\s+)?Civil\s+Code|民法典.{0,12}第\s*\d+\s*条|第\s*\d+\s*条.{0,12}民法典/i;

const CHINA_JURISDICTIONS = new Set(["china_prc"]);

function extractArticles(text: string): number[] {
  const nums: number[] = [];
  const re = /第\s*(\d+)\s*条/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    nums.push(Number(m[1]));
  }
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

function asScanResult(input: unknown): {
  result: ScanResult;
  contractText?: string;
} {
  if (!input || typeof input !== "object") {
    throw new Error("Input must be a JSON object");
  }
  const root = input as Record<string, unknown>;
  if (root.result && typeof root.result === "object") {
    return {
      result: root.result as ScanResult,
      contractText:
        typeof root.contractText === "string" ? root.contractText : undefined,
    };
  }
  return {
    result: input as ScanResult,
    contractText:
      typeof root.contractText === "string" ? root.contractText : undefined,
  };
}

function resolveJurisdiction(result: ScanResult): {
  detected: string | null;
  isChina: boolean;
} {
  const raw = (result.detectedJurisdiction || "").trim().toLowerCase();
  if (raw && CHINA_JURISDICTIONS.has(raw)) {
    return { detected: raw, isChina: true };
  }
  if (raw) {
    return { detected: raw, isChina: false };
  }
  // Infer from governing-law quote when model omitted the field
  const gl = `${result.governingLawQuote || ""} ${result.summary || ""}`;
  if (
    /中华人民共和国|中国法律|PRC\s+law|laws?\s+of\s+(the\s+)?People.?s\s+Republic\s+of\s+China|中国\s*民法/i.test(
      gl
    )
  ) {
    return { detected: "china_prc", isChina: true };
  }
  if (
    /California|State\s+of\s+California|England\s+and\s+Wales|laws?\s+of\s+England|Delaware|New\s+York|Singapore|Hong\s+Kong|governing\s+law/i.test(
      gl
    )
  ) {
    return { detected: "inferred_non_china", isChina: false };
  }
  // Default: if locale-heavy Chinese Civil Code citations dominate, treat as China for whitelist-only warnings
  return { detected: null, isChina: true };
}

function flagCorpus(f: RiskFlag): string {
  return [
    f.category,
    f.text,
    f.suggestion,
    f.legalBasis,
    f.riskRationale,
    f.impact,
  ]
    .filter(Boolean)
    .join("\n");
}

function missingCorpus(result: ScanResult): string {
  return (result.missingClauses || [])
    .map((m) => `${m.name} ${m.importance} ${m.suggestion}`)
    .join("\n");
}

/** Heuristic coverage for Global / Common Law Add-ons. */
export function computeGlobalAddonCoverage(
  result: ScanResult,
  contractText?: string
): Record<string, boolean> {
  const blob = `${flagsBlob(result)}\n${missingCorpus(result)}`.toLowerCase();
  const coverage = {
    liability_cap:
      /liabilit|consequential|indirect\s+damages|limitation\s+of\s+liability|责任上限|间接损失|间接损害/.test(
        blob
      ),
    indemnification: /indemnif|hold\s+harmless|赔偿|交叉赔偿|indemnit/.test(blob),
    termination_convenience:
      /termination\s+for\s+convenience|for\s+convenience|无理由终止|任意终止|单方.*终止/.test(
        blob
      ),
    data_protection:
      /gdpr|ccpa|cpra|scc|standard\s+contractual|data\s+protect|cross[- ]border|personal\s+data|pii|privacy|subprocessor|个人信息|数据出境|跨境|数据使用|隐私/.test(
        blob
      ),
    boilerplate:
      /severabilit|entire\s+agreement|waiver|force\s+majeure|boilerplate|可分割|完整协议|弃权|不可抗力/.test(
        blob
      ),
  };

  // If we have the source contract: boilerplate is "covered" when all four exist
  // in the document (nothing to report) OR gaps are listed in the output.
  if (contractText) {
    const missing = missingBoilerplateItems(contractText);
    if (missing.length === 0) {
      coverage.boilerplate = true;
    } else {
      const reported = missing.every((item) =>
        boilerplateReported(result, item)
      );
      coverage.boilerplate = reported;
    }
  }

  return coverage;
}

const BOILERPLATE_CHECKS: Array<{ key: string; re: RegExp }> = [
  { key: "Severability", re: /severabilit|可分割/i },
  { key: "Entire Agreement", re: /entire\s+agreement|完整协议|全部协议/i },
  { key: "Waiver", re: /\bwaiver\b|弃权/i },
  { key: "Force Majeure", re: /force\s+majeure|不可抗力/i },
];

export function missingBoilerplateItems(contractText: string): string[] {
  return BOILERPLATE_CHECKS.filter((c) => !c.re.test(contractText)).map(
    (c) => c.key
  );
}

function boilerplateReported(result: ScanResult, item: string): boolean {
  const blob = `${flagsBlob(result)}\n${missingCorpus(result)}`;
  const map: Record<string, RegExp> = {
    Severability: /severabilit|可分割/i,
    "Entire Agreement": /entire\s+agreement|完整协议/i,
    Waiver: /\bwaiver\b|弃权/i,
    "Force Majeure": /force\s+majeure|不可抗力/i,
  };
  return map[item]?.test(blob) ?? false;
}

function flagsBlob(result: ScanResult): string {
  return (result.flags || []).map(flagCorpus).join("\n");
}

function rationaleText(f: RiskFlag): string {
  return `${f.riskRationale || ""}\n${f.legalBasis || ""}`;
}

export function validateReviewOutput(input: unknown): ValidateReviewOutputResult {
  const issues: ValidateIssue[] = [];
  const { result, contractText } = asScanResult(input);
  const flags = Array.isArray(result.flags) ? result.flags : [];
  const highMedium = flags.filter(
    (f) => f.level === "high" || f.level === "medium" || !f.level
  );

  const { detected, isChina } = resolveJurisdiction(result);
  const globalAddonCoverage = computeGlobalAddonCoverage(result, contractText);

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
    const basis = rationaleText(f);

    if (isChina) {
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

      if (
        /管辖|forum|jurisdiction/i.test(`${f.category || ""} ${f.text || ""}`) &&
        /民法典/.test(basis) &&
        !/民事诉讼法|民事訴訟法|Civil Procedure/i.test(basis)
      ) {
        issues.push({
          severity: "WARN",
          code: "JURISDICTION_CITED_CIVIL_CODE",
          message:
            "Jurisdiction risk cites Civil Code instead of Civil Procedure Law / commercial practice",
          path: `flags[${i}].legalBasis`,
        });
      }
    } else {
      // Non-China: FAIL on PRC Civil Code / Article X leakage
      if (PRC_CIVIL_CODE_LEAK_RE.test(basis)) {
        issues.push({
          severity: "FAIL",
          code: "PRC_LAW_LEAK_ON_NON_CHINA",
          message:
            "Non-China jurisdiction but legalBasis/riskRationale cites PRC Civil Code / Article X",
          path: `flags[${i}].legalBasis`,
        });
      }

      // FAIL on fabricated English case citations
      if (CASE_NAME_RE.test(basis)) {
        issues.push({
          severity: "FAIL",
          code: "CASE_NAME_HALLUCINATION",
          message: `Suspected case-name citation in rationale: "${basis.match(CASE_NAME_RE)?.[0]}"`,
          path: `flags[${i}].riskRationale`,
        });
      }

      // Soft: fabricated USC/CFR-style section numbers
      if (
        /\b(?:USC|C.F.R.|CFR)\s*§?\s*\d+/i.test(basis) ||
        /\bSection\s+\d{2,}(?:\.\d+)?\s+of\s+the\s+[A-Z]/i.test(basis)
      ) {
        issues.push({
          severity: "FAIL",
          code: "FABRICATED_STATUTE_SECTION",
          message: "Suspected fabricated statute section citation on common-law track",
          path: `flags[${i}].riskRationale`,
        });
      }
    }
  });

  // Global add-ons: core three WARN; boilerplate FAIL on non-China
  if (!isChina) {
    const requiredWarn: Array<keyof typeof globalAddonCoverage> = [
      "liability_cap",
      "indemnification",
      "data_protection",
    ];
    for (const key of requiredWarn) {
      if (!globalAddonCoverage[key]) {
        issues.push({
          severity: "WARN",
          code: "GLOBAL_ADDON_GAP",
          message: `Global Add-on "${key}" not clearly covered in flags or missingClauses`,
          path: "flags|missingClauses",
        });
      }
    }
    if (!globalAddonCoverage.boilerplate) {
      const missingHint = contractText
        ? missingBoilerplateItems(contractText).join(", ")
        : "Severability / Entire Agreement / Waiver / Force Majeure";
      issues.push({
        severity: "FAIL",
        code: "BOILERPLATE_NOT_REPORTED",
        message: `boilerplate missing but not reported — ${missingHint} must appear in missingClauses (or flags) on non-China track`,
        path: "missingClauses",
      });
    }
    if (!globalAddonCoverage.termination_convenience) {
      issues.push({
        severity: "WARN",
        code: "GLOBAL_ADDON_GAP",
        message: 'Global Add-on "termination_convenience" not clearly covered',
        path: "flags|missingClauses",
      });
    }
  }

  const clauseReady = result.qualityStats?.clauseReadySuggestions ?? null;
  if (highMedium.length > 0 && clauseReady === 0) {
    issues.push({
      severity: "FAIL",
      code: "NO_CLAUSE_READY_SUGGESTIONS",
      message:
        "qualityStats.clauseReadySuggestions === 0 while high/medium flags exist",
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
      detectedJurisdiction: detected,
      isChinaTrack: isChina,
      globalAddonCoverage,
    },
  };
}
