import type { LayoutStyleId, LayoutTemplateId, ParagraphStyleSpec } from "./types";

function baseStyles(
  locale: "zh" | "en",
  serif: string,
  sans: string,
  bodyPt: number,
  titlePt: number
): Record<LayoutStyleId, ParagraphStyleSpec> {
  const zh = locale === "zh";
  return {
    title: {
      id: "title",
      align: "center",
      fontFamily: serif,
      fontSizePt: titlePt,
      bold: true,
      lineHeight: zh ? 1.5 : 1.4,
      textIndent: "0",
      marginTopEm: 0,
      marginBottomEm: 1,
      headingLevel: null,
    },
    preamble: {
      id: "preamble",
      align: "justify",
      fontFamily: serif,
      fontSizePt: bodyPt,
      bold: false,
      lineHeight: zh ? 1.75 : 1.5,
      textIndent: zh ? "2em" : "0",
      marginTopEm: 0.25,
      marginBottomEm: 0.35,
    },
    partyBlock: {
      id: "partyBlock",
      align: "left",
      fontFamily: sans,
      fontSizePt: bodyPt,
      bold: false,
      lineHeight: 1.75,
      textIndent: "0",
      marginTopEm: 0.35,
      marginBottomEm: 0.25,
    },
    articleHeading: {
      id: "articleHeading",
      align: "left",
      fontFamily: serif,
      fontSizePt: bodyPt,
      bold: true,
      lineHeight: zh ? 1.75 : 1.5,
      textIndent: "0",
      marginTopEm: zh ? 0.85 : 1,
      marginBottomEm: 0.35,
      headingLevel: 2,
    },
    clauseHeading: {
      id: "clauseHeading",
      align: "left",
      fontFamily: serif,
      fontSizePt: bodyPt,
      bold: true,
      lineHeight: zh ? 1.75 : 1.5,
      textIndent: "0",
      marginTopEm: 0.5,
      marginBottomEm: 0.25,
      headingLevel: 3,
    },
    subClause: {
      id: "subClause",
      align: "justify",
      fontFamily: serif,
      fontSizePt: bodyPt,
      bold: false,
      lineHeight: zh ? 1.75 : 1.5,
      textIndent: zh ? "2em" : "0",
      marginTopEm: 0.25,
      marginBottomEm: 0.25,
    },
    listItem: {
      id: "listItem",
      align: "justify",
      fontFamily: serif,
      fontSizePt: bodyPt,
      bold: false,
      lineHeight: zh ? 1.75 : 1.5,
      textIndent: "0",
      marginTopEm: 0.15,
      marginBottomEm: 0.15,
    },
    body: {
      id: "body",
      align: "justify",
      fontFamily: serif,
      fontSizePt: bodyPt,
      bold: false,
      lineHeight: zh ? 1.75 : 1.5,
      textIndent: zh ? "2em" : "0",
      marginTopEm: 0,
      marginBottomEm: 0.35,
    },
    bodyFirstInSection: {
      id: "bodyFirstInSection",
      align: "justify",
      fontFamily: serif,
      fontSizePt: bodyPt,
      bold: false,
      lineHeight: zh ? 1.75 : 1.5,
      textIndent: zh ? "2em" : "0",
      marginTopEm: 0.15,
      marginBottomEm: 0.35,
    },
    signature: {
      id: "signature",
      align: "right",
      fontFamily: serif,
      fontSizePt: bodyPt,
      bold: false,
      lineHeight: 1.75,
      textIndent: "0",
      marginTopEm: 1.5,
      marginBottomEm: 0.35,
    },
    appendix: {
      id: "appendix",
      align: "left",
      fontFamily: serif,
      fontSizePt: bodyPt,
      bold: true,
      lineHeight: 1.75,
      textIndent: "0",
      marginTopEm: 1,
      marginBottomEm: 0.5,
      headingLevel: 2,
    },
  };
}

export const STYLE_REGISTRY: Record<
  LayoutTemplateId,
  { locale: "zh" | "en"; styles: Record<LayoutStyleId, ParagraphStyleSpec> }
> = {
  "zh-standard": {
    locale: "zh",
    styles: baseStyles("zh", "SimSun, STSong, serif", '"Microsoft YaHei", "PingFang SC", sans-serif', 12, 16),
  },
  "zh-formal": {
    locale: "zh",
    styles: baseStyles("zh", '"SimHei", "Microsoft YaHei", sans-serif', '"Microsoft YaHei", sans-serif', 11, 18),
  },
  "en-standard": {
    locale: "en",
    styles: baseStyles("en", "Calibri, Arial, sans-serif", "Calibri, Arial, sans-serif", 11, 16),
  },
  "en-formal": {
    locale: "en",
    styles: baseStyles("en", '"Times New Roman", Times, serif', "Calibri, Arial, sans-serif", 12, 18),
  },
};

export function getParagraphStyleSpec(
  templateId: LayoutTemplateId,
  styleId: LayoutStyleId
): ParagraphStyleSpec {
  return STYLE_REGISTRY[templateId]?.styles[styleId] ?? STYLE_REGISTRY["zh-standard"].styles.body;
}

export function styleSpecToCss(spec: ParagraphStyleSpec): string {
  const parts = [
    `text-align: ${spec.align}`,
    `font-family: ${spec.fontFamily}`,
    `font-size: ${spec.fontSizePt}pt`,
    `line-height: ${spec.lineHeight}`,
    `text-indent: ${spec.textIndent}`,
    `margin-top: ${spec.marginTopEm}em`,
    `margin-bottom: ${spec.marginBottomEm}em`,
  ];
  return parts.join("; ");
}

export function layoutStyleIdToParagraphStyleId(
  styleId: LayoutStyleId
): "normal" | "title" | "articleHeading" | "clauseHeading" | "partyBlock" | "signature" {
  switch (styleId) {
    case "title":
      return "title";
    case "articleHeading":
    case "appendix":
      return "articleHeading";
    case "clauseHeading":
    case "subClause":
      return "clauseHeading";
    case "partyBlock":
    case "preamble":
      return "partyBlock";
    case "signature":
      return "signature";
    default:
      return "normal";
  }
}
