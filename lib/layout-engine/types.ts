/** Paragraph semantic role — detected before rules run. */
export type ParagraphRole =
  | "documentTitle"
  | "preamble"
  | "partyBlock"
  | "articleHeading"
  | "clauseNumber"
  | "subClause"
  | "listItem"
  | "signature"
  | "appendix"
  | "enRecital"
  | "enArticle"
  | "enSection"
  | "body"
  | "blank";

/** Named paragraph style applied by the layout engine. */
export type LayoutStyleId =
  | "title"
  | "preamble"
  | "partyBlock"
  | "articleHeading"
  | "clauseHeading"
  | "subClause"
  | "listItem"
  | "body"
  | "bodyFirstInSection"
  | "signature"
  | "appendix";

export type LayoutTemplateId =
  | "zh-standard"
  | "zh-formal"
  | "en-standard"
  | "en-formal";

export interface ParagraphStyleSpec {
  id: LayoutStyleId;
  align: "left" | "center" | "right" | "justify";
  fontFamily: string;
  fontSizePt: number;
  bold: boolean;
  lineHeight: number;
  /** CSS text-indent value, e.g. "2em" or "0" */
  textIndent: string;
  marginTopEm: number;
  marginBottomEm: number;
  headingLevel?: 1 | 2 | 3 | null;
}

/** One paragraph block in document order. */
export interface LayoutBlock {
  index: number;
  text: string;
  role: ParagraphRole;
  isEmpty: boolean;
}

/** Mutable context updated as the engine loops through blocks. */
export interface LayoutLoopContext {
  locale: "zh" | "en";
  /** Index of the last article/section heading block. */
  lastHeadingIndex: number;
  /** Paragraphs since last heading. */
  paragraphsSinceHeading: number;
  /** Whether we are still in the preamble (before first article). */
  inPreamble: boolean;
  /** Whether signature block has started. */
  inSignatureBlock: boolean;
  /** Current article label, e.g. "第六条" or "Section 3". */
  currentSectionLabel: string | null;
  /** Roles seen so far (for `afterRole` conditions). */
  previousRole: ParagraphRole | null;
  /** Style ids applied so far. */
  previousStyle: LayoutStyleId | null;
}

/** Per-block evaluation context passed to condition rules. */
export interface BlockEvalContext extends LayoutLoopContext {
  block: LayoutBlock;
  index: number;
  total: number;
  isFirst: boolean;
  isLast: boolean;
}

/** Declarative condition — supports AND/OR/NOT and context checks. */
export type LayoutCondition =
  | { op: "role"; role: ParagraphRole | ParagraphRole[] }
  | { op: "regex"; pattern: string; flags?: string }
  | { op: "first" }
  | { op: "last" }
  | { op: "empty" }
  | { op: "notEmpty" }
  | { op: "indexEq"; value: number }
  | { op: "indexLt"; value: number }
  | { op: "indexGt"; value: number }
  | { op: "paragraphsSinceHeading"; eq?: number; lt?: number; gt?: number }
  | { op: "inPreamble" }
  | { op: "inSignatureBlock" }
  | { op: "afterRole"; role: ParagraphRole; within?: number }
  | { op: "previousStyle"; style: LayoutStyleId | LayoutStyleId[] }
  | { op: "and"; conditions: LayoutCondition[] }
  | { op: "or"; conditions: LayoutCondition[] }
  | { op: "not"; condition: LayoutCondition };

/** One layout rule — higher priority wins when multiple match. */
export interface LayoutRule {
  id: string;
  priority: number;
  when: LayoutCondition;
  style: LayoutStyleId;
  /** Stop evaluating lower-priority rules after match. */
  stop?: boolean;
}

export interface LayoutTemplate {
  id: LayoutTemplateId;
  locale: "zh" | "en";
  labelKey: string;
  descriptionKey: string;
  defaultStyle: LayoutStyleId;
  styles: Record<LayoutStyleId, ParagraphStyleSpec>;
  rules: LayoutRule[];
}

export interface StyledLayoutBlock extends LayoutBlock {
  styleId: LayoutStyleId;
  html: string;
  matchedRuleId: string | null;
}

export interface LayoutEngineResult {
  html: string;
  blocks: StyledLayoutBlock[];
  templateId: LayoutTemplateId;
  stats: Record<LayoutStyleId, number>;
}

export interface LayoutEngineOptions {
  templateId?: LayoutTemplateId;
  locale?: "zh" | "en";
}
