import type { BlockEvalContext, LayoutLoopContext, ParagraphRole } from "./types";

const CN_NUM = "一二三四五六七八九十百千零〇两";

export function detectParagraphRole(
  text: string,
  ctx: Pick<LayoutLoopContext, "locale" | "inSignatureBlock" | "inPreamble">,
  index: number
): ParagraphRole {
  const line = text.trim();
  if (!line) return "blank";

  const zh = ctx.locale === "zh";

  if (index === 0 && !ctx.inSignatureBlock) {
    return "documentTitle";
  }

  if (/^(签署|签字|盖章|签署页|签字页|IN WITNESS WHEREOF|EXECUTED|Signature)/i.test(line)) {
    return "signature";
  }
  if (ctx.inSignatureBlock) return "signature";

  if (/^(附件|附录|Appendix|Schedule|Exhibit)\b/i.test(line)) {
    return "appendix";
  }

  if (zh) {
    if (/^鉴于[：:]/.test(line) || /^双方[（(]?以下简称/.test(line)) {
      return "preamble";
    }
    if (/^(甲方|乙方|丙方|丁方)[（(]/.test(line) || /^[甲乙丙丁]方[：:]/.test(line)) {
      return "partyBlock";
    }
    if (new RegExp(`^第\\s*[${CN_NUM}\\d]+\\s*[条章节款项]`).test(line)) {
      return "articleHeading";
    }
    if (/^\d{1,2}(?:\.\d{1,2})+\s/.test(line)) {
      return (line.match(/^\d{1,2}\.\d{1,2}\.\d{1,2}/) ? "subClause" : "clauseNumber") as ParagraphRole;
    }
    if (/^[（(][一二三四五六七八九十\d]+[）)]/.test(line)) {
      return "listItem";
    }
    if (/^\d{1,2}[、.)]\s*[\u4e00-\u9fff]/.test(line)) {
      return "listItem";
    }
  } else {
    if (/^WHEREAS\b/i.test(line) || /^NOW[, ]+THEREFORE/i.test(line)) {
      return "enRecital";
    }
    if (/^Party\s+[A-D]\b/i.test(line) || /^(Landlord|Tenant|Buyer|Seller|Licensor|Licensee)\b/i.test(line)) {
      return "partyBlock";
    }
    if (/^(Article|ARTICLE)\s+[IVXLC\d]+/i.test(line)) {
      return "enArticle";
    }
    if (/^(Section|SECTION|Clause|CLAUSE|Part|PART)\s+[\d.IVXLC]+/i.test(line)) {
      return "enSection";
    }
    if (/^\d{1,2}(?:\.\d{1,2})+\s+[A-Za-z]/.test(line)) {
      return line.match(/^\d{1,2}\.\d{1,2}\.\d{1,2}/) ? "subClause" : "clauseNumber";
    }
    if (/^[a-z]\)\s/i.test(line) || /^\(\d+\)\s/.test(line)) {
      return "listItem";
    }
  }

  return "body";
}

/** Update loop context after a block is styled (for next iteration). */
export function advanceLayoutContext(
  ctx: LayoutLoopContext,
  block: { text: string; role: ParagraphRole },
  styleId: string
): void {
  ctx.previousRole = block.role;
  ctx.previousStyle = styleId as LayoutLoopContext["previousStyle"];

  if (block.role === "signature" || styleId === "signature") {
    ctx.inSignatureBlock = true;
  }

  if (
    block.role === "articleHeading" ||
    block.role === "enArticle" ||
    block.role === "enSection" ||
    styleId === "articleHeading"
  ) {
    ctx.lastHeadingIndex = ctx.lastHeadingIndex; // set by engine with index
    ctx.paragraphsSinceHeading = 0;
    ctx.inPreamble = false;
    ctx.currentSectionLabel = block.text.slice(0, 32);
  } else if (block.role !== "blank") {
    ctx.paragraphsSinceHeading += 1;
  }

  if (
    block.role === "documentTitle" ||
    block.role === "preamble" ||
    block.role === "partyBlock"
  ) {
    /* stay in preamble until first article */
  }
}

export function createInitialContext(locale: "zh" | "en"): LayoutLoopContext {
  return {
    locale,
    lastHeadingIndex: -1,
    paragraphsSinceHeading: 0,
    inPreamble: true,
    inSignatureBlock: false,
    currentSectionLabel: null,
    previousRole: null,
    previousStyle: null,
  };
}

export function buildBlockEvalContext(
  block: { index: number; text: string; role: ParagraphRole; isEmpty: boolean },
  loop: LayoutLoopContext,
  total: number
): BlockEvalContext {
  return {
    ...loop,
    block,
    index: block.index,
    total,
    isFirst: block.index === 0,
    isLast: block.index === total - 1,
  };
}
