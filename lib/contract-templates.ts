import type { ReportLocale } from "@/lib/pdf-export";

/** Professional rebuild templates — final contract is always regenerated in this layout. */
export type ContractTemplateId = "formal-zh" | "standard-zh" | "standard-en";

export interface ContractTemplateStyle {
  id: ContractTemplateId;
  label: Record<ReportLocale, string>;
  description: Record<ReportLocale, string>;
  font: Record<ReportLocale, string>;
  titleSizeHalfPt: number;
  headingSizeHalfPt: number;
  bodySizeHalfPt: number;
  lineSpacingTwips: number;
  pdfTitleSize: number;
  pdfHeadingSize: number;
  pdfBodySize: number;
  pdfLineGap: number;
  marginsMm: { top: number; right: number; bottom: number; left: number };
  /** First-line indent for body paragraphs (mm), e.g. 2 Chinese chars */
  bodyFirstLineIndentMm: number;
  spacingBeforeHeadingTwips: number;
  spacingAfterTitleTwips: number;
}

export const CONTRACT_TEMPLATES: ContractTemplateStyle[] = [
  {
    id: "formal-zh",
    label: { zh: "中文正式合同", en: "Formal Chinese" },
    description: {
      zh: "宋体、居中标题、条款首行缩进，标准商业合同版式。",
      en: "SimSun, centered title, indented clauses — standard Chinese commercial layout.",
    },
    font: { zh: "SimSun", en: "SimSun" },
    titleSizeHalfPt: 36,
    headingSizeHalfPt: 28,
    bodySizeHalfPt: 24,
    lineSpacingTwips: 480,
    pdfTitleSize: 18,
    pdfHeadingSize: 12,
    pdfBodySize: 10.5,
    pdfLineGap: 7,
    marginsMm: { top: 28, right: 28, bottom: 28, left: 30 },
    bodyFirstLineIndentMm: 8,
    spacingBeforeHeadingTwips: 360,
    spacingAfterTitleTwips: 480,
  },
  {
    id: "standard-zh",
    label: { zh: "中文标准合同", en: "Standard Chinese" },
    description: {
      zh: "微软雅黑、清晰段落间距，便于阅读与后续编辑。",
      en: "Microsoft YaHei, clear spacing — easy to read and edit.",
    },
    font: { zh: "Microsoft YaHei", en: "Microsoft YaHei" },
    titleSizeHalfPt: 32,
    headingSizeHalfPt: 26,
    bodySizeHalfPt: 22,
    lineSpacingTwips: 400,
    pdfTitleSize: 16,
    pdfHeadingSize: 11,
    pdfBodySize: 10,
    pdfLineGap: 6,
    marginsMm: { top: 25, right: 25, bottom: 25, left: 25 },
    bodyFirstLineIndentMm: 0,
    spacingBeforeHeadingTwips: 280,
    spacingAfterTitleTwips: 360,
  },
  {
    id: "standard-en",
    label: { zh: "英文标准合同", en: "Standard English" },
    description: {
      zh: "Calibri、美式合同常用版式与段落结构。",
      en: "Calibri, common US/UK contract layout and paragraph structure.",
    },
    font: { zh: "Calibri", en: "Calibri" },
    titleSizeHalfPt: 32,
    headingSizeHalfPt: 26,
    bodySizeHalfPt: 22,
    lineSpacingTwips: 360,
    pdfTitleSize: 16,
    pdfHeadingSize: 11,
    pdfBodySize: 10,
    pdfLineGap: 5,
    marginsMm: { top: 25, right: 25, bottom: 25, left: 25 },
    bodyFirstLineIndentMm: 0,
    spacingBeforeHeadingTwips: 240,
    spacingAfterTitleTwips: 320,
  },
];

export const PROFESSIONAL_TEMPLATES = CONTRACT_TEMPLATES;

export function getContractTemplate(id: ContractTemplateId): ContractTemplateStyle {
  return CONTRACT_TEMPLATES.find((t) => t.id === id) ?? CONTRACT_TEMPLATES[0]!;
}

export function defaultTemplateForLocale(locale: ReportLocale): ContractTemplateId {
  return locale === "zh" ? "formal-zh" : "standard-en";
}

export function templateCssClass(id: ContractTemplateId): string {
  return `contract-template contract-template--${id}`;
}

export function isProfessionalTemplate(id: string): id is ContractTemplateId {
  return id === "formal-zh" || id === "standard-zh" || id === "standard-en";
}
