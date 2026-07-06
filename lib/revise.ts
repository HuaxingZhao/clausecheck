import OpenAI from "openai";
import type { ScanResult, ReviseResult, ContractChange, SkippedChangeSummary } from "./types";
import { buildRedlinedDocument, snapChangesToSource } from "./redline";
import {
  repairChangesFromAccepted,
  validateLocatableChanges,
} from "./change-validation";

export interface AcceptedRevision {
  type: "flag" | "negotiation" | "missing_clause";
  index: number;
  label: string;
  original?: string;
  suggestion: string;
}

const REVISE_PROMPT_ZH = `你是资深合同律师。你将收到一份合同的完整原文，以及用户选定的修订建议。

你的唯一任务：输出一组「精确替换编辑」(edits)，用于在原文上做最小化改动。绝对不要重写或重新排版整份合同。

每条编辑包含：
- "section"：所在条款编号或标题（便于人工核对）
- "original"：从原文中**逐字复制**的连续片段，必须与原文完全一致（含标点、数字、空格），可在原文中精确找到。长度 8-150 字。
- "revised"：替换后的文本（仅该片段，专业、对称、可执行）
- "reason"：一句话修订理由

关键规则：
1. "original" 必须是原文的真实子串，禁止改写、缩写或凭空编造；若找不到可精确复制的片段，则跳过该建议。
2. 只针对被选中的建议生成编辑，未涉及的条款一律不动。
3. 对"缺失条款"类建议：将 original 设为应插入位置**前一句的原文结尾片段**（必须逐字复制），revised 设为「该原文片段 + 新增条款的完整法律条文」（可直接粘贴进合同）。禁止在 revised 中写「合同中未提及…」「建议增加…」等说明性文字。
4. revised 必须是可直接写入合同的条文，禁止任何元评论、摘要或评价（如「未提及 SLA」「缺少验收标准」等）。
5. 不要返回整份合同，只返回 edits 数组。

仅输出严格 JSON（无 markdown）：
{
  "changes": [
    { "section": "第X条 …", "original": "原文逐字片段", "revised": "替换后文本", "reason": "理由" }
  ]
}`;

const REVISE_PROMPT_EN = `You are a senior contract attorney. You will receive the full original contract text and the user's selected revision suggestions.

Your ONLY task: output a set of precise find/replace EDITS that make minimal changes to the original. Never rewrite or reformat the whole contract.

Each edit contains:
- "section": clause number or heading (for human cross-check)
- "original": a contiguous excerpt COPIED VERBATIM from the original text — it must match the source exactly (punctuation, numbers, spacing) so it can be located precisely. 8-150 characters.
- "revised": the replacement text for that excerpt only (professional, balanced, enforceable)
- "reason": one-sentence rationale

Critical rules:
1. "original" MUST be a real substring of the source. Do not paraphrase, shorten, or invent it. If you cannot copy an exact excerpt, skip that suggestion.
2. Only produce edits for the selected suggestions; leave all other clauses untouched.
3. For "missing clause" suggestions: set original to the verbatim END of the sentence before the insertion point, and set revised to "that excerpt + the FULL new clause text" (ready to paste into the contract). Never write "the contract does not mention…" or "recommend adding…" in revised.
4. revised must be enforceable contract language only — no meta-commentary, summaries, or observations (e.g. "SLA is missing", "no acceptance criteria").
5. Do not return the whole contract — only the edits array.

Output strict JSON only (no markdown):
{
  "changes": [
    { "section": "Section X …", "original": "verbatim excerpt", "revised": "replacement text", "reason": "rationale" }
  ]
}`;

export function buildAcceptedRevisions(
  result: ScanResult,
  accepted: {
    flags: number[];
    negotiations: number[];
    missingClauses: number[];
  }
): AcceptedRevision[] {
  const items: AcceptedRevision[] = [];

  accepted.flags.forEach((i) => {
    const f = result.flags[i];
    if (!f?.suggestion) return;
    items.push({
      type: "flag",
      index: i,
      label: f.text,
      original: f.quote,
      suggestion: f.suggestion,
    });
  });

  (result.negotiations || []).forEach((n, i) => {
    if (!accepted.negotiations.includes(i)) return;
    items.push({
      type: "negotiation",
      index: i,
      label: n.clause,
      original: n.current,
      suggestion: n.suggested,
    });
  });

  (result.missingClauses || []).forEach((c, i) => {
    if (!accepted.missingClauses.includes(i)) return;
    items.push({
      type: "missing_clause",
      index: i,
      label: c.name,
      suggestion: c.suggestion,
    });
  });

  return items;
}

async function requestEdits(
  openai: OpenAI,
  systemPrompt: string,
  userPrompt: string
): Promise<ContractChange[]> {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    temperature: 0.1,
    max_tokens: 6000,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    response_format: { type: "json_object" },
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) return [];

  let parsed: { changes?: unknown };
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }

  if (!Array.isArray(parsed.changes)) return [];

  return parsed.changes
    .map((c) => {
      const obj = c as Record<string, unknown>;
      return {
        section: obj.section ? String(obj.section).trim() : undefined,
        original: String(obj.original ?? "").trim(),
        revised: String(obj.revised ?? "").trim(),
        reason: obj.reason ? String(obj.reason).trim() : undefined,
      } as ContractChange;
    })
    .filter((c) => c.original && c.revised);
}

export async function reviseContract(
  contractText: string,
  acceptedRevisions: AcceptedRevision[],
  apiKey: string,
  options: { locale?: "zh" | "en"; maxChars?: number } = {}
): Promise<ReviseResult> {
  const { locale = "zh", maxChars = 80000 } = options;

  if (acceptedRevisions.length === 0) {
    throw new Error(
      locale === "en" ? "Select at least one revision to apply." : "请至少选择一项修订建议。"
    );
  }

  const openai = new OpenAI({ apiKey });
  const truncated = contractText.slice(0, maxChars);
  const systemPrompt = locale === "en" ? REVISE_PROMPT_EN : REVISE_PROMPT_ZH;

  const payload = JSON.stringify({
    contractText: truncated,
    selectedSuggestions: acceptedRevisions,
  });

  const userPrompt =
    locale === "en"
      ? `Original contract and selected suggestions:\n\n${payload}\n\nReturn the edits JSON.`
      : `以下是合同原文与选定建议：\n\n${payload}\n\n请返回 edits JSON。`;

  let changes = await requestEdits(openai, systemPrompt, userPrompt);

  // Validate against the ORIGINAL text; retry once if nothing matched.
  let doc = buildRedlinedDocument(truncated, changes);
  if (doc.matched === 0 && changes.length >= 0) {
    const retryNote =
      locale === "en"
        ? `\n\nIMPORTANT: Your previous "original" excerpts could NOT be found verbatim in the contract. Copy exact substrings character-for-character from the contractText above. Try again.`
        : `\n\n重要：你上次提供的 "original" 片段无法在合同原文中逐字找到。请从上面的 contractText 中**逐字符精确复制**子串。请重试。`;
    const retryChanges = await requestEdits(openai, systemPrompt, userPrompt + retryNote);
    const retryDoc = buildRedlinedDocument(truncated, retryChanges);
    if (retryDoc.matched > doc.matched) {
      changes = retryChanges;
      doc = retryDoc;
    }
  }

  // Fallback: if the AI produced no usable edits (e.g. it could not copy a
  // verbatim excerpt from messy extracted text), derive the suggestions
  // directly from the user's selected revisions so the report is never empty.
  if (changes.length === 0) {
    changes = fallbackChangesFromAccepted(acceptedRevisions, locale);
  }

  changes = snapChangesToSource(truncated, changes);
  changes = repairChangesFromAccepted(truncated, changes, acceptedRevisions, locale);
  changes = snapChangesToSource(truncated, changes);

  const { valid, skipped } = validateLocatableChanges(truncated, changes, locale);
  changes = valid;

  const skippedChanges: SkippedChangeSummary[] = skipped.map((s) => ({
    section: s.change.section,
    reason: s.reason,
  }));

  doc = buildRedlinedDocument(truncated, changes);
  const revisedContract = doc.matched > 0 ? doc.plainRevised : truncated;

  return { revisedContract, changes, skippedChanges };
}

/** Build suggestion changes straight from the accepted revisions (no AI). */
function fallbackChangesFromAccepted(
  accepted: AcceptedRevision[],
  locale: "zh" | "en"
): ContractChange[] {
  return accepted
    .filter((r) => r.suggestion)
    .map((r) => ({
      section: r.label,
      original: r.original ?? "",
      revised: r.suggestion,
      reason: locale === "en" ? "Selected suggestion." : "所选建议。",
    }));
}

/** Demo result when OPENAI_API_KEY is missing — builds matchable edits from the actual text. */
export function getDemoReviseResult(
  contractText: string,
  accepted: AcceptedRevision[],
  locale: "zh" | "en"
): ReviseResult {
  // Show every selected suggestion (old -> new). Use the verbatim quote as the
  // "removed" text when available so the report mirrors the on-screen diff.
  const changes: ContractChange[] = accepted
    .filter((item) => item.suggestion)
    .map((item) => ({
      section: item.label,
      original: item.original ?? "",
      revised: item.suggestion,
      reason: locale === "en" ? "Selected suggestion." : "所选建议。",
    }));

  const snapped = snapChangesToSource(contractText, changes);
  let repaired = repairChangesFromAccepted(contractText, snapped, accepted, locale);
  repaired = snapChangesToSource(contractText, repaired);
  const { valid, skipped } = validateLocatableChanges(contractText, repaired, locale);
  const finalDoc = buildRedlinedDocument(contractText, valid);
  return {
    revisedContract: finalDoc.matched > 0 ? finalDoc.plainRevised : contractText,
    changes: valid,
    skippedChanges: skipped.map((s) => ({ section: s.change.section, reason: s.reason })),
  };
}
