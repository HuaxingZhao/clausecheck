/**
 * Detect Missing DPA signals on scan results (flags / missingClauses).
 */

import type { MissingClause, RiskFlag, ScanResult } from "@/lib/types";

const DPA_RE =
  /\bDPA\b|data\s+processing\s+agreement|数据处理协议|数据保护协议|数据处理附件|独立\s*DPA|missing\s+dpa|缺少.{0,12}DPA|缺少.{0,12}数据处理/i;

export function isDpaMissingClause(c: MissingClause): boolean {
  if (c.type === "dpa") return true;
  return DPA_RE.test([c.name, c.importance, c.suggestion].filter(Boolean).join(" "));
}

export function isDpaMissingFlag(f: RiskFlag): boolean {
  if (f.code === "MISSING_DPA") return true;
  return DPA_RE.test(
    [f.category, f.text, f.suggestion, f.impact].filter(Boolean).join(" ")
  );
}

export function scanHasMissingDpa(result: ScanResult): boolean {
  return (
    (result.missingClauses ?? []).some(isDpaMissingClause) ||
    result.flags.some(isDpaMissingFlag)
  );
}

/** Infer data categories from review text for DPA form defaults. */
export function extractDataCategoriesHint(result: ScanResult): string[] {
  const blob = [
    result.executiveSummary,
    result.summary,
    ...result.flags.map((f) => `${f.text} ${f.suggestion}`),
    ...(result.missingClauses ?? []).map((c) => `${c.name} ${c.importance}`),
  ]
    .filter(Boolean)
    .join("\n")
    .toLowerCase();

  const found: string[] = [];
  const candidates: [RegExp, string][] = [
    [/personal\s+information|pii|个人信息|个人数据/, "Personal information / PII"],
    [/customer\s+data|客户数据/, "Customer data"],
    [/usage\s+data|analytics|使用数据|行为数据/, "Usage / analytics data"],
    [/payment|financial|支付|财务/, "Payment / financial data"],
    [/employee|hr|员工|人事/, "Employee / HR data"],
    [/health|医疗|健康/, "Health data"],
  ];
  for (const [re, label] of candidates) {
    if (re.test(blob)) found.push(label);
  }
  if (found.length === 0) found.push("Personal information / Customer data [TO BE CONFIRMED]");
  return found;
}

export function tagDpaOnResult(result: ScanResult): ScanResult {
  const missingClauses = (result.missingClauses ?? []).map((c) =>
    isDpaMissingClause(c) ? { ...c, type: "dpa" as const } : c
  );
  const flags = result.flags.map((f) => {
    if (f.code === "MISSING_DPA") return f;
    if (isDpaMissingFlag(f) && /miss|缺|absent|without|没有|未提供/i.test(`${f.text} ${f.suggestion}`)) {
      return { ...f, code: "MISSING_DPA" as const };
    }
    return f;
  });
  return { ...result, missingClauses, flags };
}
