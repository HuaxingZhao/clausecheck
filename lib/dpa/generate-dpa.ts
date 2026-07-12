/**
 * Generate a DPA markdown draft via OpenAI (independent of review prompt).
 */

import OpenAI from "openai";
import {
  buildDpaGeneratorSystemPrompt,
  buildDpaGeneratorUserPrompt,
  type DpaGeneratorInput,
} from "@/lib/prompts/dpa-generator";

export const DPA_DISCLAIMER_EN =
  "AI-generated draft. Review by qualified counsel before use.";

const FREE_LOCK =
  "\n\n---\n🔒 Full document available for Pro subscribers";

const WATERMARK =
  "ClauseCheck FREE PREVIEW — Upgrade to Pro for the full DPA download";

export interface GenerateDpaResult {
  preview: string;
  fullContent: string;
  watermarkText: string;
  unlocked: boolean;
}

function ensureDisclaimer(markdown: string, locale: "zh" | "en"): string {
  const tip = DPA_DISCLAIMER_EN;
  if (markdown.includes(tip) || markdown.includes("qualified counsel")) {
    return markdown.trim();
  }
  const heading = locale === "zh" ? "## Disclaimer / 免责声明" : "## Disclaimer";
  return `${markdown.trim()}\n\n${heading}\n\n${tip}\n`;
}

/** First ~30% of content, ending on a paragraph boundary when possible. */
export function buildDpaPreview(full: string, unlocked: boolean): {
  preview: string;
  watermarkText: string;
  fullContent: string;
} {
  const text = full.trim();
  if (unlocked) {
    return { preview: text, watermarkText: "", fullContent: text };
  }

  const target = Math.max(400, Math.floor(text.length * 0.3));
  let cut = text.slice(0, target);
  const nextBreak = text.indexOf("\n\n", target);
  if (nextBreak > 0 && nextBreak < target + 280) {
    cut = text.slice(0, nextBreak);
  }
  const preview = `${cut.trim()}${FREE_LOCK}`;
  return {
    preview,
    watermarkText: WATERMARK,
    fullContent: "",
  };
}

export async function generateDpaDraft(
  input: DpaGeneratorInput,
  options: { apiKey: string; unlocked: boolean }
): Promise<GenerateDpaResult> {
  const locale = input.locale ?? "en";
  const openai = new OpenAI({ apiKey: options.apiKey });

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.25,
    max_tokens: 4500,
    messages: [
      { role: "system", content: buildDpaGeneratorSystemPrompt(locale) },
      { role: "user", content: buildDpaGeneratorUserPrompt(input) },
    ],
  });

  const raw = completion.choices[0]?.message?.content?.trim();
  if (!raw) {
    throw new Error(locale === "zh" ? "DPA 生成失败：空响应" : "DPA generation returned empty");
  }

  const full = ensureDisclaimer(raw, locale);
  const gated = buildDpaPreview(full, options.unlocked);
  return {
    ...gated,
    unlocked: options.unlocked,
  };
}

/** Deterministic offline stub for tests / demo without API key. */
export function generateDpaDraftStub(
  input: DpaGeneratorInput,
  unlocked: boolean
): GenerateDpaResult {
  const locale = input.locale ?? "en";
  const controller = input.controllerName || "[Controller Name — TO BE NEGOTIATED]";
  const processor = input.processorName || "[Processor Name — TO BE NEGOTIATED]";
  const cats = input.dataCategories.join(", ") || "[TO BE NEGOTIATED]";
  const purpose = input.processingPurpose || "[TO BE NEGOTIATED]";

  const body =
    locale === "zh"
      ? `# 数据处理协议（DPA）草稿

## 1. 适用范围
本附件适用于 ${controller}（控制者）与 ${processor}（处理者）之间就下列个人数据处理活动。管辖区提示：${input.jurisdiction}。

## 2. 各方角色
控制者决定处理目的与方式；处理者仅按书面指示处理。[TO BE NEGOTIATED]

## 3. 处理目的与数据类别
- 目的：${purpose}
- 数据类别：${cats}

## 4. 处理者义务
处理者应：仅按指示处理；保密；协助合规请求；不得擅自再识别。[TO BE NEGOTIATED]

## 5. 安全措施
采取与风险相称的技术与组织措施，包括访问控制、加密与日志。[TO BE NEGOTIATED]

## 6. 分包处理
未经控制者事先书面同意不得更换分包处理者；名单与变更通知流程 [TO BE NEGOTIATED]。

## 7. 跨境传输机制
若传输至第三国，采用 SCCs / 标准合同 / PIPL 出境机制等适用工具，细节 [TO BE NEGOTIATED]。

## 8. 审计权
控制者有权按 [TO BE NEGOTIATED] 频率进行审计或索取第三方报告。

## 9. 协助义务
处理者应合理协助 DPIA、数据主体请求与监管问询。[TO BE NEGOTIATED]

## 10. 违约与责任
责任上限与除外情形 [TO BE NEGOTIATED]。

## 11. 期限与终止
本 DPA 随主协议生效；终止后按指示返还或删除数据，时限 [TO BE NEGOTIATED]。

## 12. 一般条款
可分割性、完整协议、弃权等 [TO BE NEGOTIATED]。

## Disclaimer / 免责声明

${DPA_DISCLAIMER_EN}
`
      : `# Data Processing Agreement (Draft)

## 1. Scope
This schedule applies to personal-data processing between ${controller} (Controller) and ${processor} (Processor). Jurisdiction hint: ${input.jurisdiction}.

## 2. Roles
Controller determines purposes and means; Processor processes only on documented instructions. [TO BE NEGOTIATED]

## 3. Purpose & data categories
- Purpose: ${purpose}
- Categories: ${cats}

## 4. Processor obligations
Process only on instructions; confidentiality; assist with compliance requests; no unauthorized re-identification. [TO BE NEGOTIATED]

## 5. Security measures
Implement risk-appropriate technical and organisational measures, including access control, encryption, and logging. [TO BE NEGOTIATED]

## 6. Sub-processors
No replacement of sub-processors without prior written approval; notice process [TO BE NEGOTIATED].

## 7. Cross-border transfer mechanisms
Where transfers occur, use SCCs / standard contracts / applicable PIPL export mechanisms; details [TO BE NEGOTIATED].

## 8. Audit rights
Controller may audit or obtain third-party reports at frequency [TO BE NEGOTIATED].

## 9. Assistance
Processor shall reasonably assist with DPIAs, data-subject requests, and regulatory inquiries. [TO BE NEGOTIATED]

## 10. Breach & liability
Liability caps and exclusions [TO BE NEGOTIATED].

## 11. Term & termination
This DPA follows the main agreement; upon termination, return or delete data within [TO BE NEGOTIATED].

## 12. General
Severability, entire agreement, waiver [TO BE NEGOTIATED].

## Disclaimer

${DPA_DISCLAIMER_EN}
`;

  const gated = buildDpaPreview(body, unlocked);
  return { ...gated, unlocked };
}
