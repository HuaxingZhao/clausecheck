/**
 * Independent DPA draft generator prompt (not the main review expert prompt).
 * Decision support only — not legal advice.
 */

export type DpaJurisdictionHint =
  | "us_california"
  | "us_general"
  | "england_wales"
  | "china_prc"
  | "international_commercial"
  | "eu_gdpr"
  | "auto"
  | string;

export interface DpaGeneratorInput {
  jurisdiction: DpaJurisdictionHint;
  dataCategories: string[];
  processingPurpose: string;
  controllerName: string;
  processorName: string;
  locale?: "zh" | "en";
}

function legalBasisBlock(jurisdiction: string, locale: "zh" | "en"): string {
  const j = jurisdiction.toLowerCase();
  const isZh = locale === "zh";

  if (j.includes("china") || j === "china_prc" || j.includes("pipl")) {
    return isZh
      ? `法律依据侧重：《个人信息保护法》第21条（委托处理）、第38条（跨境）、第51条（安全措施）；配套《数据安全法》相关义务。引用须标注「参考框架」，禁止编造条号细节。`
      : `Legal framework focus: PIPL Art. 21 (entrusted processing), Art. 38 (cross-border), Art. 51 (security measures); reference Data Security Law duties. Label cites as reference framework only — do not invent article details.`;
  }
  if (j.includes("california") || j === "us_california" || j.includes("cpra")) {
    return isZh
      ? `法律依据侧重：CPRA / CCPA — 尤其 §1798.140(j)（service provider / contractor）、合同要求与目的限制；可参考一般美国隐私合同实践。禁止编造判例名。`
      : `Legal framework focus: CPRA/CCPA — especially §1798.140(j) (service provider / contractor), contractual requirements and purpose limitation; general US privacy contracting practice. No fabricated case names.`;
  }
  if (
    j.includes("england") ||
    j.includes("uk") ||
    j === "england_wales" ||
    j.includes("gdpr") ||
    j === "eu_gdpr"
  ) {
    return isZh
      ? `法律依据侧重：GDPR Art. 28（处理器合同）及 UK GDPR 对等条款；跨境可用 SCCs / IDTA 占位。禁止编造具体监管决定编号。`
      : `Legal framework focus: GDPR Art. 28 (processor contracts) and UK GDPR equivalents; cross-border: SCCs / IDTA placeholders. Do not invent regulator decision numbers.`;
  }
  return isZh
    ? `法律依据侧重：国际商业数据处理惯例 + GDPR Art. 28 风格结构（若适用欧盟数据主体）；无明确法域时用通用框架并标注 [TO BE NEGOTIATED]。`
    : `Legal framework focus: international commercial data-processing practice + GDPR Art. 28-style structure (if EU data subjects may apply); when jurisdiction is unclear, use a generic framework and mark [TO BE NEGOTIATED].`;
}

/** System prompt for DPA markdown generation. */
export function buildDpaGeneratorSystemPrompt(locale: "zh" | "en" = "en"): string {
  if (locale === "zh") {
    return `你是资深数据合规顾问，专门起草《数据处理协议 / Data Processing Agreement》（DPA）草稿。
输出仅为决策支持草稿，不构成法律意见。

硬性规则：
1. 只输出 Markdown 正文（不要 JSON、不要代码围栏包裹全文）。
2. 必须包含标准章节：适用范围、各方角色、处理目的与数据类别、处理器义务、安全措施、分包处理、跨境传输机制、审计权、协助义务、违约与责任、期限与终止、一般条款。
3. 所有商业数字、赔偿上限、通知时限、审计频率等用 [TO BE NEGOTIATED] 占位，禁止编造具体商业条款。
4. 文末必须附加免责声明段落（见用户消息要求）。
5. 语气专业、可直接进入律师审阅流程。`;
  }

  return `You are a senior data-protection counsel drafting a Data Processing Agreement (DPA) template.
Output is decision-support draft only — not legal advice.

Hard rules:
1. Output Markdown body only (no JSON; do not wrap the entire document in a code fence).
2. Must include standard sections: Scope, Roles, Purpose & data categories, Processor obligations, Security measures, Sub-processors, Cross-border transfer mechanisms, Audit rights, Assistance, Breach & liability, Term & termination, General.
3. All commercial numbers, liability caps, notice periods, audit frequency, etc. MUST use [TO BE NEGOTIATED] placeholders — never invent deal terms.
4. End with the mandatory disclaimer paragraph (see user message).
5. Professional tone suitable for counsel review.`;
}

/** User prompt with party / jurisdiction context. */
export function buildDpaGeneratorUserPrompt(input: DpaGeneratorInput): string {
  const locale = input.locale ?? "en";
  const categories =
    input.dataCategories.length > 0
      ? input.dataCategories.map((c) => `- ${c}`).join("\n")
      : "- [TO BE NEGOTIATED]";

  const basis = legalBasisBlock(input.jurisdiction, locale);
  const disclaimer =
    locale === "zh"
      ? "AI-generated draft. Review by qualified counsel before use.（本文件为 AI 生成草稿，使用前须经具备资质的律师审阅。）"
      : "AI-generated draft. Review by qualified counsel before use.";

  if (locale === "zh") {
    return `请根据以下参数起草一份独立 DPA 附件草稿（Markdown）：

- 管辖区 / 法律框架提示：${input.jurisdiction}
- ${basis}
- 控制者（Controller）：${input.controllerName || "[Controller Name — TO BE NEGOTIATED]"}
- 处理者（Processor）：${input.processorName || "[Processor Name — TO BE NEGOTIATED]"}
- 处理目的：${input.processingPurpose || "[TO BE NEGOTIATED]"}
- 数据类别：
${categories}

要求：
- 章节标题清晰（可用 ##）
- 引用法律依据时仅用参考框架表述
- 底部单独一节「Disclaimer / 免责声明」，全文为：
${disclaimer}`;
  }

  return `Draft a standalone Data Processing Agreement (DPA) schedule in Markdown with these parameters:

- Jurisdiction / legal framework hint: ${input.jurisdiction}
- ${basis}
- Controller: ${input.controllerName || "[Controller Name — TO BE NEGOTIATED]"}
- Processor: ${input.processorName || "[Processor Name — TO BE NEGOTIATED]"}
- Processing purpose: ${input.processingPurpose || "[TO BE NEGOTIATED]"}
- Data categories:
${categories}

Requirements:
- Clear section headings (##)
- Legal cites only as reference framework language
- Final section titled "Disclaimer" whose body is exactly:
${disclaimer}`;
}
