import OpenAI from "openai";
import type { ScanResult, RiskFlag } from "./types";

const SYSTEM_PROMPT_ZH = `你是一位资深合同审查律师。你的任务：
1. 通读用户提供的合同文本
2. 标记高风险条款（赔偿、竞业限制、自动续约、单方解约权、违约金、知识产权归属等）
3. 打分（0=极公平，100=极度危险）
4. 用 JSON 输出结果

输出格式（严格 JSON，不要多余文字）：
{
  "scoreNum": 数字(0-100),
  "scoreText": "高风险" | "中风险" | "低风险",
  "flags": [{ "icon": "emoji图标", "text": "条款说明" }],
  "summary": "2-3句中文总评"
}

请全部使用中文输出。`;

const SYSTEM_PROMPT_EN = `You are a senior contract review attorney. Your task:
1. Read the user's contract text thoroughly
2. Flag high-risk clauses (indemnification, non-compete, auto-renewal, unilateral termination, liquidated damages, IP ownership, etc.)
3. Score the contract (0 = perfectly fair, 100 = extremely dangerous)
4. Output your results as JSON

Output format (strict JSON, no extra text):
{
  "scoreNum": number(0-100),
  "scoreText": "High Risk" | "Medium Risk" | "Low Risk",
  "flags": [{ "icon": "emoji icon", "text": "clause explanation" }],
  "summary": "2-3 sentence overall assessment"
}

Please output everything in English.`;

const SYSTEM_PROMPTS: Record<string, string> = {
  zh: SYSTEM_PROMPT_ZH,
  en: SYSTEM_PROMPT_EN,
};

export async function analyzeContract(
  text: string,
  openaiApiKey: string,
  locale: string = "en"
): Promise<ScanResult> {
  const openai = new OpenAI({ apiKey: openaiApiKey });
  const systemPrompt = SYSTEM_PROMPTS[locale] || SYSTEM_PROMPTS.en;

  // 截断过长的文本（合同关键条款通常在开头）
  const truncated = text.slice(0, 12000);

  const userPrompt =
    locale === "zh"
      ? `请分析以下合同：\n\n${truncated}`
      : `Please analyze the following contract:\n\n${truncated}`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.1,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    response_format: { type: "json_object" },
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) throw new Error(locale === "zh" ? "AI 返回为空" : "AI returned empty");

  return JSON.parse(raw) as ScanResult;
}

/** 不调用 AI 时用的 demo 结果 */
export function getDemoResult(locale: string = "en"): ScanResult {
  if (locale === "zh") {
    return {
      scoreNum: 72,
      scoreText: "中风险",
      flags: [
        { icon: "⚠️", text: "第 5 条：违约金为合同总额的 200%，远超行业标准", suggestion: "建议将违约金上限降至合同总额的 30% 以内" },
        { icon: "⛔", text: "第 8 条：竞业限制范围覆盖全球、期限 5 年，可能无效", suggestion: "建议竞业限制期限缩短至 2 年，范围限定为中国大陆" },
        { icon: "📌", text: "第 12 条：知识产权归属不明确，建议补充", suggestion: "建议明确约定知识产权归出资方所有" },
      ],
      summary:
        "本合同整体风险中等偏高。违约金设置不合理，竞业限制范围过大可能被法院认定为无效。建议在签署前修改这三条，尤其是违约金条款。",
    };
  }

  return {
    scoreNum: 72,
    scoreText: "中风险",
    flags: [
      { icon: "⚠️", text: "Clause 5: Liquidated damages at 200% of contract value — far exceeds industry standard", suggestion: "Cap liquidated damages at 30% of contract value" },
      { icon: "⛔", text: "Clause 8: Non-compete covers worldwide scope for 5 years — likely unenforceable", suggestion: "Limit non-compete to 2 years, mainland China only" },
      { icon: "📌", text: "Clause 12: IP ownership is ambiguous — needs clarification", suggestion: "Clarify that IP belongs to the paying party" },
    ],
    summary:
      "This contract presents medium-to-high overall risk. The liquidated damages clause is unreasonable, and the non-compete is overly broad and may be struck down by a court. We recommend revising these three clauses before signing, especially the damages provision.",
  };
}
