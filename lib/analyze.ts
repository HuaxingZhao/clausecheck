import OpenAI from "openai";
import { buildContractIndex, formatClauseIndexForPrompt } from "./contract-index";
import {
  type ContractScenarioId,
  DEFAULT_SCENARIO_ID,
  getScenario,
  getScenarioPromptOverlay,
  isValidScenarioId,
} from "./contract-scenarios";
import { formatScenarioKnowledgeForPrompt } from "./scenario-rag";
import {
  runAnalysisPipeline,
  pipelineRefineNeeded,
  type PipelineOptions,
} from "./analysis-pipeline";
import { annotateScanConfidence, computeQualityStats } from "./confidence";
import { snapScanResultToSource } from "./snap-scan-quotes";
import { buildContractReview } from "./lock-suggestions";
import type {
  ScanResult,
  RiskFlag,
  TimeTerm,
  MissingClause,
  SigningRecommendation,
  NegotiationPoint,
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

const CLAUSE_INDEX_RULES_ZH = `
⸻
四步审阅流程（必须遵守）：
1. 下方 CLAUSE INDEX 是从合同原文自动解析的条款索引（含 id 与 excerpt）。
2. 每条 flag / negotiation 必须填写 clauseId（与 INDEX 中 id 完全一致）。
3. quote 必须从该 clauseId 对应条款原文逐字复制（20–60 字），不可改写或概括。
4. 若无法对应任何 clauseId，则不要输出该条。`;

const CLAUSE_INDEX_RULES_EN = `
---
Four-step review (mandatory):
1. CLAUSE INDEX below is auto-parsed from the contract (id + excerpt).
2. Every flag / negotiation MUST include clauseId matching an INDEX id exactly.
3. quote MUST be copy-pasted verbatim from that clause (20–60 words/chars). No paraphrase.
4. If no clause applies, omit that item.`;

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
      "clauseId": "条款索引 id（必填，来自 CLAUSE INDEX）",
      "text": "条款位置 + 风险说明（含条款编号）",
      "quote": "原文逐字引用 20-60 字（必须从 clauseId 对应条款复制）",
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
      "clauseId": "条款索引 id（必填，来自 CLAUSE INDEX）",
      "quote": "原文逐字引用 20-60 字（必填，从 clauseId 条款复制）",
      "current": "可选：quote 的简短说明",
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
      "clauseId": "Clause index id (required — from CLAUSE INDEX)",
      "text": "Clause reference + risk explanation",
      "quote": "Verbatim quote 20-60 words (copy from clauseId clause only)",
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
      "clauseId": "Clause index id (required — from CLAUSE INDEX)",
      "quote": "Verbatim quote 20-60 words (required — from clauseId clause)",
      "current": "Optional brief summary",
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
- 至少识别 6 个 flags（含全部 high 风险）；少于 6 条视为不合格
- 每条 high/medium flag 必须含 clauseId、quote、legalBasis、impact、suggestion
- negotiations 至少 3 条，按 priority 排序；每条必须含 clauseId 与 quote
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
- Minimum 6 flags (cover all high-severity issues); fewer than 6 is unacceptable
- Every high/medium flag must include clauseId, quote, legalBasis, impact, suggestion
- Minimum 3 negotiations, priority-sorted; each must include clauseId and quote
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
  scenarioId?: ContractScenarioId;
}

export async function analyzeContract(
  text: string,
  apiKey: string,
  options: AnalyzeOptions = {}
): Promise<ScanResult> {
  const {
    deep = false,
    maxChars = 12000,
    locale = "zh",
    scenarioId = DEFAULT_SCENARIO_ID,
  } = options;

  const openai = new OpenAI({ apiKey });
  const truncated = text.slice(0, maxChars);
  const scenario = getScenario(scenarioId);
  const scenarioOverlay = getScenarioPromptOverlay(scenario.id, locale);
  const knowledgeBlock = formatScenarioKnowledgeForPrompt(scenario.id, locale);

  // Step 1 — build clause index from extracted text
  const clauseIndex = buildContractIndex(truncated);
  const indexJson = formatClauseIndexForPrompt(clauseIndex, 80, 100);
  const indexRules = locale === "en" ? CLAUSE_INDEX_RULES_EN : CLAUSE_INDEX_RULES_ZH;

  const baseSystemPrompt = deep
    ? locale === "en"
      ? DEEP_FIRST_PROMPT_EN
      : DEEP_FIRST_PROMPT_ZH
    : locale === "en"
      ? BASIC_PROMPT_EN
      : BASIC_PROMPT_ZH;

  const systemPrompt = [baseSystemPrompt, scenarioOverlay, knowledgeBlock]
    .filter(Boolean)
    .join("\n\n");

  const scenarioLine =
    scenario.id !== "general"
      ? locale === "en"
        ? `\nReview scenario: ${scenario.id}. Apply scenario-specific expertise — not generic boilerplate.\n`
        : `\n审阅场景：${scenario.id}。须按该场景专业标准输出，避免泛泛而谈。\n`
      : "";

  const userPrompt =
    locale === "en"
      ? `Analyze the following contract. Apply the full review checklist.${scenarioLine}${indexRules}

CLAUSE INDEX:
${indexJson}

CONTRACT TEXT:
---
${truncated}
---`
      : `请分析以下合同，逐项适用审查清单。${scenarioLine}${indexRules}

条款索引 CLAUSE INDEX：
${indexJson}

合同原文：
---
${truncated}
---`;

  const firstPass = await openai.chat.completions.create({
    model: deep ? "gpt-4o" : "gpt-4o-mini",
    temperature: deep ? 0.2 : 0.15,
    max_tokens: deep ? 5500 : 3800,
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
  parsed.scenarioId = isValidScenarioId(scenarioId) ? scenarioId : DEFAULT_SCENARIO_ID;

  const minFlags = deep ? 8 : 6;
  if (parsed.flags.length < minFlags - 2) {
    const retry = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.2,
      max_tokens: 3800,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content:
            locale === "en"
              ? `Your previous analysis had only ${parsed.flags.length} flags. Re-analyze and return at least ${minFlags} distinct flags with quotes. Contract:\n\n---\n${truncated}\n---`
              : `上次分析仅 ${parsed.flags.length} 条 flags。请重新分析，至少返回 ${minFlags} 条不同风险条款并含原文引用。合同：\n\n---\n${truncated}\n---`,
        },
      ],
      response_format: { type: "json_object" },
    });
    const retryRaw = retry.choices[0]?.message?.content;
    if (retryRaw) {
      const retried = normalize(JSON.parse(retryRaw) as ScanResult, locale);
      if (retried.flags.length > parsed.flags.length) parsed = retried;
    }
  }

  if (parsed.flags.length === 0) {
    throw new Error(
      locale === "en"
        ? "Analysis returned no risk flags. Please retry."
        : "分析未识别到风险条款，请重试。"
    );
  }

  return finalizeFirstPass(clauseIndex, truncated, parsed);
}

/** Phase 1 — main AI pass + quote snap + review lock (fast path). */
export async function analyzeContractFirstPass(
  text: string,
  apiKey: string,
  options: AnalyzeOptions = {}
): Promise<ScanResult> {
  return analyzeContract(text, apiKey, options);
}

/** Phase 2 — critic + rewrite + re-lock (same quality as full synchronous scan). */
export async function refineScanResult(
  contractText: string,
  apiKey: string,
  result: ScanResult,
  options: AnalyzeOptions = {}
): Promise<ScanResult> {
  const {
    deep = false,
    maxChars = 12000,
    locale = "zh",
    scenarioId = DEFAULT_SCENARIO_ID,
  } = options;

  const openai = new OpenAI({ apiKey });
  const truncated = contractText.slice(0, maxChars);
  const clauseIndex = buildContractIndex(truncated);
  const pipeOpts: PipelineOptions = {
    deep,
    locale,
    scenarioId: isValidScenarioId(scenarioId) ? scenarioId : DEFAULT_SCENARIO_ID,
  };

  if (!pipelineRefineNeeded(result, pipeOpts)) {
    return attachContractReview(clauseIndex, result);
  }

  const piped = await runAnalysisPipeline(openai, truncated, result, pipeOpts);
  return attachContractReview(clauseIndex, piped.result);
}

export { pipelineRefineNeeded };

function finalizeFirstPass(
  clauseIndex: ReturnType<typeof buildContractIndex>,
  contractText: string,
  parsed: ScanResult
): ScanResult {
  let current = snapScanResultToSource(contractText, parsed);
  current = annotateScanConfidence(current, contractText);
  current.qualityStats = computeQualityStats(current);
  return attachContractReview(clauseIndex, current);
}

function attachContractReview(
  clauseIndex: ReturnType<typeof buildContractIndex>,
  parsed: ScanResult
): ScanResult {
  const contractReview = buildContractReview(clauseIndex, parsed);
  return { ...parsed, contractReview };
}

/** Full synchronous scan (first pass + refine). */
export async function analyzeContractFull(
  text: string,
  apiKey: string,
  options: AnalyzeOptions = {}
): Promise<ScanResult> {
  const first = await analyzeContractFirstPass(text, apiKey, options);
  return refineScanResult(text, apiKey, first, options);
}

/* ================================================================== */
/*  Normalize                                                          */
/* ================================================================== */

function normalize(parsed: ScanResult, locale: "zh" | "en"): ScanResult {
  parsed.flags = ensureFlagsArray(parsed.flags).map(normalizeFlag).filter((f) => f.text.trim());
  parsed.timeTerms = normalizeTimeTerms(parsed.timeTerms);
  parsed.negotiations = (parsed.negotiations || [])
    .map(normalizeNegotiation)
    .sort((a, b) => a.priority - b.priority);
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

  parsed.executiveSummary = toTextField(parsed.executiveSummary) || undefined;
  parsed.signingRationale = toTextField(parsed.signingRationale) || undefined;
  parsed.summary = toTextField(parsed.summary) || parsed.summary || "";
  parsed.worstCase = toTextField(parsed.worstCase) || undefined;
  parsed.refineNotes = toTextField(parsed.refineNotes) || undefined;
  parsed.contractType = toTextField(parsed.contractType) || undefined;
  parsed.actionItems = (parsed.actionItems || []).map(toTextField).filter(Boolean);
  parsed.strengths = (parsed.strengths || []).map(toTextField).filter(Boolean);

  if (!parsed.executiveSummary && parsed.summary) {
    parsed.executiveSummary = parsed.summary.split("\n")[0]?.slice(0, 500);
  }

  if (parsed.actionItems.length === 0 && parsed.summary) {
    parsed.actionItems = extractActionItems(parsed.summary);
  }

  return parsed;
}

function normalizeFlag(f: RiskFlag): RiskFlag {
  const raw = f as RiskFlag & { clauseId?: string };
  return {
    icon: f.icon || "⚠️",
    text: toTextField(f.text),
    suggestion: toTextField(f.suggestion),
    level: f.level || "medium",
    category: f.category ? toTextField(f.category) : undefined,
    clauseId: raw.clauseId ? toTextField(raw.clauseId) : undefined,
    quote: f.quote ? toTextField(f.quote) : undefined,
    legalBasis: f.legalBasis ? toTextField(f.legalBasis) : undefined,
    impact: f.impact ? toTextField(f.impact) : undefined,
    confidence: f.confidence,
  };
}

function normalizeNegotiation(n: NegotiationPoint): NegotiationPoint {
  const raw = n as NegotiationPoint & { clauseId?: string };
  return {
    priority: n.priority,
    clause: toTextField(n.clause),
    clauseId: raw.clauseId ? toTextField(raw.clauseId) : undefined,
    quote: n.quote ? toTextField(n.quote) : undefined,
    current: n.current ? toTextField(n.current) : undefined,
    suggested: toTextField(n.suggested),
    reason: toTextField(n.reason),
    confidence: n.confidence,
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

function ensureFlagsArray(flags: unknown): RiskFlag[] {
  if (Array.isArray(flags)) return flags as RiskFlag[];
  if (flags && typeof flags === "object") {
    return Object.values(flags as Record<string, RiskFlag>);
  }
  return [];
}

function toTextField(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map(toTextField).filter(Boolean).join("\n");
  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .map(([k, v]) => {
        const inner = toTextField(v);
        return inner ? `${k}: ${inner}` : "";
      })
      .filter(Boolean)
      .join("\n");
  }
  return String(value);
}
