import OpenAI from "openai";
import type {
  ScanResult,
  RiskFlag,
  TimeTerm,
  MissingClause,
  SigningRecommendation,
} from "./types";

/* ================================================================== */
/*  Shared methodology (embedded in prompts)                            */
/* ================================================================== */

const REVIEW_CHECKLIST_ZH = `
必查 12 类风险（逐项扫描，不可遗漏）：
1. 责任与赔偿（免责、赔偿上限、间接损失、交叉赔偿）
2. 终止与退出（单方解约、自动续约、通知期、退出成本）
3. 付款与财务（预付款、不退款、滞纳金、审计权、价格调整）
4. 知识产权（归属、许可范围、背景 IP、成果交付）
5. 保密与数据（保密期限、数据使用、跨境传输、个人信息）
6. 竞业与非招揽（范围、期限、地域、补偿）
7. 保证与陈述（免责声明、「现状交付」、保证上限）
8. 争议解决（管辖、仲裁、适用法律、律师费）
9. 转让与分包（禁止/限制转让、转包责任）
10. 不可抗力（定义过宽、通知义务）
11. 变更与整份协议（口头变更、优先级冲突）
12. 缺失条款（SLA、验收标准、不可抗力、争议升级机制等）`;

const REVIEW_CHECKLIST_EN = `
Mandatory 12-category review (scan each; do not skip):
1. Liability & indemnification (caps, carve-outs, consequential damages, cross-indemnity)
2. Termination & exit (unilateral termination, auto-renewal, notice, exit costs)
3. Payment & financial (prepayment, non-refund, late fees, audit rights, price escalation)
4. Intellectual property (ownership, license scope, background IP, deliverables)
5. Confidentiality & data (duration, use limits, cross-border transfer, personal data)
6. Non-compete & non-solicit (scope, duration, geography, consideration)
7. Warranties & representations (disclaimers, "as-is", warranty caps)
8. Dispute resolution (jurisdiction, arbitration, governing law, fee-shifting)
9. Assignment & subcontracting (restrictions, flow-down liability)
10. Force majeure (overbroad definition, notice duties)
11. Amendments & entire agreement (oral changes, conflicting clauses)
12. Missing clauses (SLA, acceptance criteria, escalation, business continuity)`;

const OUTPUT_SCHEMA_ZH = `{
  "contractType": "合同类型 + 行业/场景，如：SaaS 服务协议（B2B 软件订阅）",
  "executiveSummary": "4 句高管摘要：合同性质、核心风险、财务敞口、签署建议（面向非法律背景的决策者）",
  "signingRecommendation": "sign" | "sign_with_changes" | "do_not_sign",
  "signingRationale": "2-3 句专业理由，说明为何给出该签署建议",
  "scoreNum": 0-100,
  "scoreText": "高风险" | "中风险" | "低风险",
  "dimensions": { "fairness": 0-100, "compliance": 0-100, "financial": 0-100 },
  "flags": [
    {
      "icon": "单个 emoji",
      "category": "风险类别",
      "text": "条款位置 + 风险说明（含条款编号）",
      "quote": "原文引用 20-60 字（深度模式必填；基础模式 high/medium 必填）",
      "legalBasis": "法律依据或商业惯例（1 句）",
      "impact": "不修改的潜在后果（1 句，尽量量化）",
      "suggestion": "可直接粘贴的红线修订建议（2-4 句，含建议措辞）",
      "level": "high" | "medium" | "low"
    }
  ],
  "timeTerms": [
    {
      "type": "auto_renewal" | "deadline" | "expiration" | "notice_period",
      "description": "条款说明（含编号）",
      "date": "日期或期限（如有）",
      "risk": "high" | "medium" | "low"
    }
  ],
  "negotiations": [
    {
      "priority": 1,
      "clause": "条款名/编号",
      "current": "当前表述摘要",
      "suggested": "建议修订措辞（可直接用于谈判）",
      "reason": "商业与法律理由（2 句）"
    }
  ],
  "actionItems": ["行动项1", "行动项2", "行动项3", "行动项4", "行动项5"],
  "summary": "综合评估（3-4 段）：风险排序、谈判策略、签署前必须完成的 3 项检查",
  "worstCase": "仅深度模式：若所有不利条款同时触发，最坏财务/法律后果（2-3 句，尽量量化）",
  "strengths": ["仅深度模式：对用户有利的条款，可作为谈判筹码"],
  "missingClauses": [
    {
      "name": "缺失条款名称",
      "importance": "为何该类型合同通常需要此条款",
      "suggestion": "建议增加的条款模板（1-2 句）"
    }
  ]
}`;

const OUTPUT_SCHEMA_EN = `{
  "contractType": "Contract type + context, e.g.: SaaS Agreement (B2B subscription)",
  "executiveSummary": "4-sentence executive summary for non-lawyer decision-makers",
  "signingRecommendation": "sign" | "sign_with_changes" | "do_not_sign",
  "signingRationale": "2-3 sentences explaining the signing recommendation",
  "scoreNum": 0-100,
  "scoreText": "High Risk" | "Medium Risk" | "Low Risk",
  "dimensions": { "fairness": 0-100, "compliance": 0-100, "financial": 0-100 },
  "flags": [
    {
      "icon": "single emoji",
      "category": "Risk category",
      "text": "Clause reference + risk explanation",
      "quote": "Original text quote 20-60 words (required for high/medium; all flags in deep mode)",
      "legalBasis": "Legal or commercial basis (1 sentence)",
      "impact": "Consequence if unchanged (1 sentence; quantify if possible)",
      "suggestion": "Redline-ready revision language (2-4 sentences)",
      "level": "high" | "medium" | "low"
    }
  ],
  "timeTerms": [
    {
      "type": "auto_renewal" | "deadline" | "expiration" | "notice_period",
      "description": "Clause explanation with reference",
      "date": "Date or period if any",
      "risk": "high" | "medium" | "low"
    }
  ],
  "negotiations": [
    {
      "priority": 1,
      "clause": "Clause name/section",
      "current": "Current language summary",
      "suggested": "Proposed revision (negotiation-ready)",
      "reason": "Business and legal rationale (2 sentences)"
    }
  ],
  "actionItems": ["Action 1", "Action 2", "Action 3", "Action 4", "Action 5"],
  "summary": "Comprehensive assessment (3-4 paragraphs): risk ranking, negotiation strategy, pre-signing checklist",
  "worstCase": "Deep mode only: worst-case if all adverse terms trigger (quantify if possible)",
  "strengths": ["Deep mode only: terms favorable to the reviewing party — negotiation leverage"],
  "missingClauses": [
    {
      "name": "Missing clause name",
      "importance": "Why this contract type typically needs it",
      "suggestion": "Suggested clause language (1-2 sentences)"
    }
  ]
}`;

const BASIC_PROMPT_ZH = `你是一家顶级律所的高级合伙人，专注商业合同审查 20 年。请以专业法律备忘录标准分析合同。

分析立场：假设用户是合同中的弱势方或首次审阅方，需保护其利益。

${REVIEW_CHECKLIST_ZH}

⸻
评分标准（0=无风险，100=极度危险）：
- fairness：权利义务对等性
- compliance：与中国民法典、个人信息保护法、行业监管要求的契合度
- financial：潜在经济损失（违约金、无限责任、不可退款项等）
综合分 = round(fairness×0.35 + compliance×0.25 + financial×0.40)

质量要求：
- 至少识别 6 个 flags（含全部 high 风险）
- 每条 high/medium flag 必须含 quote、legalBasis、impact、suggestion
- negotiations 至少 3 条，按 priority 排序
- actionItems 恰好 5 条，按优先级排列
- 语言专业、客观，避免模糊表述如「可能有问题」

输出严格 JSON（无 markdown、无多余文字）：
${OUTPUT_SCHEMA_ZH}

深度模式专属字段（worstCase、strengths、missingClauses）在基础模式可省略或留空数组。`;

const BASIC_PROMPT_EN = `You are a senior partner at a top-tier law firm with 20 years of commercial contract experience. Analyze as a professional legal memo.

Assume the user is the weaker or first-time reviewing party and needs protection.

${REVIEW_CHECKLIST_EN}

---
Scoring (0=no risk, 100=extreme danger):
- fairness: balance of rights and obligations
- compliance: alignment with applicable law and industry norms
- financial: economic exposure (penalties, unlimited liability, non-refundable sums)
Composite = round(fairness×0.35 + compliance×0.25 + financial×0.40)

Quality bar:
- Minimum 6 flags (cover all high-severity issues)
- Every high/medium flag must include quote, legalBasis, impact, suggestion
- Minimum 3 negotiations, priority-sorted
- Exactly 5 actionItems in priority order
- Professional, precise tone — no vague phrases like "might be problematic"

Output strict JSON only (no markdown):
${OUTPUT_SCHEMA_EN}

Omit worstCase/strengths/missingClauses in basic mode or use empty arrays.`;

const DEEP_FIRST_PROMPT_ZH = `你是一家顶级律所的高级合伙人，正在进行「深度合同尽职审查」。标准高于一般审阅，需达到向董事会汇报的质量。

${REVIEW_CHECKLIST_ZH}

额外深度要求：
1. 识别合同类型及行业特殊风险（劳动、租赁、SaaS、投资、NDA 等）
2. 每条 flag 必须引用原文 quote
3. worstCase：量化最坏情况（金额、期限、不可逆后果）
4. strengths：至少 2 条对用户有利的条款（谈判筹码）
5. missingClauses：至少 3 条该类型合同常见但本文缺失的条款
6. 检查条款之间的冲突（如 A 条与 B 条矛盾）

至少 10 个 flags，negotiations 至少 5 条。

输出严格 JSON：
${OUTPUT_SCHEMA_ZH}`;

const DEEP_FIRST_PROMPT_EN = `You are a senior partner performing DEEP contract due diligence — board-report quality.

${REVIEW_CHECKLIST_EN}

Additional depth requirements:
1. Identify contract type and industry-specific risks
2. Every flag must include an original-text quote
3. worstCase: quantify worst-case exposure where possible
4. strengths: at least 2 terms favorable to the reviewing party
5. missingClauses: at least 3 standard clauses absent from this contract
6. Check for internal conflicts between clauses

Minimum 10 flags, minimum 5 negotiations.

Output strict JSON only:
${OUTPUT_SCHEMA_EN}`;

const REFINE_PROMPT_ZH = `你是合同审查质量总监，对初版分析进行对抗性复核。

假设：对方律师刻意将不利条款埋藏在冗长表述或交叉引用中。

复核清单：
1. 是否遗漏 high 风险（尤其赔偿、IP、自动续约、单方终止）？
2. scoreNum 是否与 flags 严重程度一致？
3. 是否存在条款冲突未识别？
4. quote 是否准确对应原文？
5. suggestion 是否可直接用于红线修订？
6. 是否补充 missingClauses？
7. worstCase 是否足够具体？
8. negotiations 优先级是否合理？

输入：{"original": "合同原文", "firstPass": {初版结果}}

输出：与初版相同 JSON 结构，但数据已修正完善。必须包含 refineNotes 字段（80 字以上，说明修正内容与理由）。`;

const REFINE_PROMPT_EN = `You are a contract review QA director performing adversarial cross-validation.

Assume: counterparty counsel buried adverse terms in verbose or cross-referenced language.

Review checklist:
1. Any missed high-severity risks (indemnity, IP, auto-renewal, unilateral termination)?
2. Is scoreNum consistent with flag severity?
3. Internal clause conflicts identified?
4. Are quotes accurate?
5. Are suggestions redline-ready?
6. missingClauses supplemented?
7. Is worstCase specific enough?
8. Are negotiation priorities correct?

Input: {"original": "contract text", "firstPass": {first pass result}}

Output: same JSON structure, corrected and complete. Must include refineNotes (80+ words explaining corrections).`;

/* ================================================================== */
/*  Analyze                                                            */
/* ================================================================== */

export interface AnalyzeOptions {
  deep?: boolean;
  maxChars?: number;
  locale?: "zh" | "en";
}

export async function analyzeContract(
  text: string,
  apiKey: string,
  options: AnalyzeOptions = {}
): Promise<ScanResult> {
  const { deep = false, maxChars = 12000, locale = "zh" } = options;

  const openai = new OpenAI({ apiKey });
  const truncated = text.slice(0, maxChars);

  const systemPrompt = deep
    ? locale === "en"
      ? DEEP_FIRST_PROMPT_EN
      : DEEP_FIRST_PROMPT_ZH
    : locale === "en"
      ? BASIC_PROMPT_EN
      : BASIC_PROMPT_ZH;

  const userPrompt =
    locale === "en"
      ? `Analyze the following contract. Apply the full review checklist.\n\n---\n${truncated}\n---`
      : `请分析以下合同，逐项适用审查清单。\n\n---\n${truncated}\n---`;

  const firstPass = await openai.chat.completions.create({
    model: deep ? "gpt-4o" : "gpt-4o-mini",
    temperature: deep ? 0.2 : 0.15,
    max_tokens: deep ? 8000 : 5000,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    response_format: { type: "json_object" },
  });

  const raw = firstPass.choices[0]?.message?.content;
  if (!raw) {
    throw new Error(locale === "en" ? "AI returned empty response" : "AI 返回为空");
  }

  let parsed = normalize(JSON.parse(raw) as ScanResult, locale);

  if (!deep) return parsed;

  const refinePayload = JSON.stringify({ original: truncated, firstPass: parsed });
  const refinePrompt = locale === "en" ? REFINE_PROMPT_EN : REFINE_PROMPT_ZH;

  const secondPass = await openai.chat.completions.create({
    model: "gpt-4o",
    temperature: 0.1,
    max_tokens: 8000,
    messages: [
      { role: "system", content: refinePrompt },
      { role: "user", content: refinePayload },
    ],
    response_format: { type: "json_object" },
  });

  const refinedRaw = secondPass.choices[0]?.message?.content;
  if (refinedRaw) {
    try {
      parsed = normalize(JSON.parse(refinedRaw) as ScanResult, locale);
    } catch {
      console.warn("Deep analysis refinement parse failed, falling back to first pass");
    }
  }

  return parsed;
}

/* ================================================================== */
/*  Normalize                                                          */
/* ================================================================== */

function normalize(parsed: ScanResult, locale: "zh" | "en"): ScanResult {
  parsed.flags = (parsed.flags || []).map(normalizeFlag);
  parsed.timeTerms = normalizeTimeTerms(parsed.timeTerms);
  parsed.negotiations = (parsed.negotiations || []).sort(
    (a, b) => a.priority - b.priority
  );
  parsed.missingClauses = normalizeMissingClauses(parsed.missingClauses);
  parsed.strengths = parsed.strengths || [];
  parsed.actionItems = parsed.actionItems || [];

  if (!parsed.dimensions) {
    parsed.dimensions = {
      fairness: parsed.scoreNum ?? 50,
      compliance: parsed.scoreNum ?? 50,
      financial: parsed.scoreNum ?? 50,
    };
  }

  if (parsed.dimensions && parsed.scoreNum == null) {
    const d = parsed.dimensions;
    parsed.scoreNum = Math.round(d.fairness * 0.35 + d.compliance * 0.25 + d.financial * 0.4);
  }

  parsed.scoreNum = clamp(parsed.scoreNum ?? 50, 0, 100);
  parsed.scoreText = deriveScoreText(parsed.scoreNum, parsed.scoreText, locale);

  parsed.signingRecommendation = normalizeSigningRec(parsed.signingRecommendation);

  if (!parsed.executiveSummary && parsed.summary) {
    parsed.executiveSummary = parsed.summary.split("\n")[0]?.slice(0, 500);
  }

  if (parsed.actionItems.length === 0 && parsed.summary) {
    parsed.actionItems = extractActionItems(parsed.summary);
  }

  return parsed;
}

function normalizeFlag(f: RiskFlag): RiskFlag {
  return {
    icon: f.icon || "⚠️",
    text: f.text || "",
    suggestion: f.suggestion || "",
    level: f.level || "medium",
    category: f.category,
    quote: f.quote,
    legalBasis: f.legalBasis,
    impact: f.impact,
  };
}

function normalizeTimeTerms(terms?: TimeTerm[]): TimeTerm[] {
  if (!terms?.length) return [];
  return terms.map((t) => {
    const raw = t as TimeTerm & { clause?: string; risk?: string };
    const desc = raw.description || raw.clause || "";
    let risk = raw.risk;
    if (typeof risk === "string" && !["high", "medium", "low"].includes(risk)) {
      risk = "medium";
    }
    return {
      type: raw.type || "deadline",
      description: desc,
      date: raw.date,
      risk: (risk as TimeTerm["risk"]) || "medium",
    };
  });
}

function normalizeMissingClauses(clauses?: MissingClause[]): MissingClause[] {
  if (!clauses?.length) return [];
  return clauses.map((c) => {
    const raw = c as MissingClause & { clause?: string; risk?: string };
    return {
      name: raw.name || raw.clause || "",
      importance: raw.importance || raw.risk || "",
      suggestion: raw.suggestion || "",
    };
  });
}

function normalizeSigningRec(
  rec?: SigningRecommendation | string
): SigningRecommendation | undefined {
  if (!rec) return undefined;
  const s = String(rec).toLowerCase().replace(/[\s-]+/g, "_");
  if (s.includes("do_not") || s.includes("不要") || s.includes("不应")) return "do_not_sign";
  if (s.includes("with_change") || s.includes("修改") || s.includes("变更")) {
    return "sign_with_changes";
  }
  if (s.includes("sign") || s.includes("签署") || s.includes("可以签")) return "sign";
  return undefined;
}

function deriveScoreText(
  score: number,
  _existing: string | undefined,
  _locale: "zh" | "en"
): ScanResult["scoreText"] {
  if (score >= 70) return "高风险";
  if (score >= 40) return "中风险";
  return "低风险";
}

function extractActionItems(summary: string): string[] {
  const lines = summary.split(/\n/).flatMap((line) => {
    const m = line.match(/^\s*(?:\d+[\.\)、]|[-•])\s*(.+)/);
    return m ? [m[1].trim()] : [];
  });
  return lines.slice(0, 5);
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}
