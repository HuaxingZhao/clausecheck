import OpenAI from "openai";
import type { ScanResult } from "./types";

/* ================================================================== */
/*  System Prompts                                                     */
/* ================================================================== */

const BASIC_PROMPT = `你是一位资深合同审查律师，拥有 15 年商业合同谈判经验。

你的任务：
1. 通读用户提供的全部合同文本
2. 标记高风险条款（赔偿、竞业限制、自动续约、单方解约权、违约金、知识产权归属、责任不对等、隐私泄露、管辖法院、付款条款等）
3. 对每条风险条款给出具体可操作的修改建议（1-2句）
4. 从三个维度独立评分（0=完美，100=极度危险）
5. 识别时间敏感条款（自动续约、通知期限、到期日等）
6. 输出谈判优先级清单

⸻
评分标准：
- 公平性 (fairness)：双方权利义务对等程度。单方免责条款、不对等赔偿 → 高分（危险）
- 合规性 (compliance)：符合中国合同法/民法典/个人信息保护法等。模糊表述、法律漏洞 → 高分
- 财务风险 (financial)：潜在经济损失。过高违约金、无限责任、不退费 → 高分

综合分 = round(fairness*0.35 + compliance*0.25 + financial*0.40)

时间条款类型枚举：
- auto_renewal: 自动续约
- deadline: 硬性截止日
- expiration: 到期/失效日
- notice_period: 通知期限

风险等级枚举：
- high: 修改前不应签署
- medium: 建议修改但可接受
- low: 提醒注意即可

⸻
输出格式（严格 JSON，不要多余文字）：
{
  "scoreNum": 数字(0-100),
  "scoreText": "高风险" | "中风险" | "低风险",
  "dimensions": {
    "fairness": 数字(0-100),
    "compliance": 数字(0-100),
    "financial": 数字(0-100)
  },
  "flags": [
    {
      "icon": "单个emoji图标",
      "text": "条款风险说明（含条款编号，如有）",
      "suggestion": "具体可行的修改建议（1-2句中文）",
      "level": "high" | "medium" | "low",
      "category": "风险类别，如：违约金、竞业限制、管辖权、隐私、付款、知识产权等"
    }
  ],
  "timeTerms": [
    {
      "type": "auto_renewal" | "deadline" | "expiration" | "notice_period",
      "description": "具体描述",
      "date": "日期（如有，格式YYYY-MM-DD）",
      "risk": "high" | "medium" | "low"
    }
  ],
  "negotiations": [
    {
      "priority": 数字(1开始),
      "clause": "涉及条款编号",
      "current": "当前表述（简述）",
      "suggested": "建议改为（简述）",
      "reason": "谈判理由（1句话）"
    }
  ],
  "summary": "先按风险高低排序，再给出3条具体的下一步行动建议（每条以数字开头）"
}`;

/* 第二轮：交叉验证 —— 只对 Pro/按次用户使用 */
const REFINE_PROMPT = `你是另一位资深合同审查律师。你现在要**交叉验证**另一位律师的审查结果。

你的任务：
1. 对照原文，检查第一轮结果是否有**遗漏的高风险条款**
2. 评估三维评分是否合理 —— 如果觉得偏高或偏低，给出修正值
3. 对谈判优先级重新排序（基于你的判断）
4. 如果发现第一轮遗漏，追加新的 flags
5. 输出**修正后的完整 JSON**（不是 diff，是完整结果）

⸻
输入格式：
{
  "original": { /* 合同原文 */ },
  "firstPass": { /* 第一轮结果 */ }
}

输出格式（与第一轮相同的严格 JSON）：
{
  "scoreNum": 修正后数字,
  "scoreText": "高风险" | "中风险" | "低风险",
  "dimensions": { "fairness": 数字, "compliance": 数字, "financial": 数字 },
  "flags": [ /* 合并 + 补充后的完整列表 */ ],
  "timeTerms": [ /* 可能的补充 */ ],
  "negotiations": [ /* 重新排序后的列表 */ ],
  "summary": "包含交叉验证结论的总结（标注是否修正了第一轮结果）"
}`;

/* ================================================================== */
/*  Analyze                                                            */
/* ================================================================== */

export interface AnalyzeOptions {
  /** 启用两轮交叉验证（Pro / 按次） */
  deep?: boolean;
  /** 最大字符数（免费 12000，Pro 80000） */
  maxChars?: number;
}

export async function analyzeContract(
  text: string,
  openaiApiKey: string,
  options: AnalyzeOptions = {}
): Promise<ScanResult> {
  const { deep = false, maxChars = 12000 } = options;
const openai = new OpenAI({ apiKey: openaiApiKey });

  const truncated = text.slice(0, maxChars);

  // --- 第一轮：基础分析 ---
  const firstPass = await openai.chat.completions.create({
    model: deep ? "gpt-4o" : "gpt-4o-mini",
    temperature: 0.1,
    messages: [
      { role: "system", content: deep ? BASIC_PROMPT : BASIC_PROMPT },
      { role: "user", content: `请分析以下合同：\n\n${truncated}` },
    ],
    response_format: { type: "json_object" },
  });

  const raw = firstPass.choices[0]?.message?.content;
  if (!raw) throw new Error("AI 返回为空");

  let parsed = JSON.parse(raw) as ScanResult;

  // 免费版到此为止
  if (!deep) return normalize(parsed);

  // --- 第二轮：交叉验证（仅 Pro / 按次） ---
  const refinePayload = JSON.stringify({
    original: truncated,
    firstPass: parsed,
  });

  const secondPass = await openai.chat.completions.create({
    model: "gpt-4o",
    temperature: 0.2,
    messages: [
      { role: "system", content: REFINE_PROMPT },
      { role: "user", content: refinePayload },
    ],
    response_format: { type: "json_object" },
  });

  const refinedRaw = secondPass.choices[0]?.message?.content;
  if (refinedRaw) {
    try {
      parsed = JSON.parse(refinedRaw) as ScanResult;
    } catch {
      // 第二轮解析失败 → 退回第一轮结果
      console.warn("Deep analysis refinement parse failed, falling back to first pass");
    }
  }

  return normalize(parsed);
}

/* ================================================================== */
/*  Backward-compat normalization                                      */
/* ================================================================== */

function normalize(parsed: ScanResult): ScanResult {
  if (!parsed.dimensions) {
    parsed.dimensions = {
      fairness: parsed.scoreNum,
      compliance: parsed.scoreNum,
      financial: parsed.scoreNum,
    };
  }
  if (!parsed.timeTerms) parsed.timeTerms = [];
  if (!parsed.negotiations) parsed.negotiations = [];
  return parsed;
}
