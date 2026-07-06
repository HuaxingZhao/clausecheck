import type { ContractScenarioId } from "./contract-scenarios";

/** 扫描结果 */
export interface ScanResult {
  /** 0-100 */
  scoreNum: number;
  scoreText: "高风险" | "中风险" | "低风险";
  flags: RiskFlag[];
  summary: string;
  /** 分维度评分 */
  dimensions?: DimensionScores;
  /** 谈判优先级 */
  negotiations?: NegotiationPoint[];
  /** 时间敏感条款 */
  timeTerms?: TimeTerm[];

  /** 高管摘要（2-4 句，决策层可读） */
  executiveSummary?: string;
  /** 签署建议 */
  signingRecommendation?: SigningRecommendation;
  /** 签署建议理由 */
  signingRationale?: string;
  /** 结构化行动项（5 条） */
  actionItems?: string[];

  /* ––––– 深度分析专属字段（Pro / 按次付费） ––––– */

  /** 合同类型，如"软件外包服务合同""劳动合同""NDA 保密协议" */
  contractType?: string;
  /** 最坏情况分析：如果所有不利条款同时生效，可能发生的最严重后果 */
  worstCase?: string;
  /** 对用户有利的条款（谈判筹码） */
  strengths?: string[];
  /** 缺失的关键条款 */
  missingClauses?: MissingClause[];
  /** 交叉验证修正说明（第二轮追加） */
  refineNotes?: string;
  /** 四步审阅流水线输出：抓取 → 建议 → 锁定 → 展示 */
  contractReview?: ContractReviewData;
  /** 用户选择的审阅场景 */
  scenarioId?: ContractScenarioId;
  /** 分析质量统计（管线 v2） */
  qualityStats?: AnalysisQualityStats;
}

export type ConfidenceLevel = "high" | "medium" | "low";

export interface AnalysisQualityStats {
  totalFlags: number;
  highConfidence: number;
  needsReview: number;
  quoteVerified: number;
  clauseReadySuggestions: number;
}

export type SigningRecommendation = "sign" | "sign_with_changes" | "do_not_sign";

/** 审阅流水线 — 步骤 3 锁定后的建议项（含原文坐标） */
export type LockedReviewKind = "flag" | "negotiation" | "missing";

export interface LockedReviewItem {
  id: string;
  index: number;
  kind: LockedReviewKind;
  title: string;
  level?: "high" | "medium" | "low";
  clauseId?: string;
  clauseLabel?: string;
  originalText: string;
  suggestionText: string;
  reason?: string;
  start: number;
  end: number;
  matched: boolean;
  navigable: boolean;
  /** 分析置信度：high=可优先采纳，low=需人工核实 */
  confidence?: ConfidenceLevel;
}

export interface ContractReviewData {
  source: string;
  items: LockedReviewItem[];
  clauseCount: number;
  pipeline: {
    extracted: boolean;
    analyzed: boolean;
    locked: boolean;
    ready: boolean;
  };
  stats: {
    matched: number;
    navigable: number;
    total: number;
    /** 可对照原文修改（风险 + 谈判） */
    editable: number;
    /** 建议新增（原文不存在） */
    missing: number;
    /** 有原文但未能锁定位置 */
    unlocated: number;
  };
}

/** 分维度风险评分 (0-100) */
export interface DimensionScores {
  fairness: number;
  compliance: number;
  financial: number;
}

export interface RiskFlag {
  icon: string;
  text: string;
  /** 修改建议 / 红线修订语言 */
  suggestion: string;
  /** 风险等级 */
  level?: "high" | "medium" | "low";
  /** 风险类别 */
  category?: string;
  /** 相关原文引用（深度模式） */
  quote?: string;
  /** 条款索引 id（来自 contract-index，分析时必须填写） */
  clauseId?: string;
  /** 法律依据或商业影响（深度模式） */
  legalBasis?: string;
  /** 若不修改的潜在后果 */
  impact?: string;
  /** 分析置信度 */
  confidence?: ConfidenceLevel;
}

/** 谈判要点 */
export interface NegotiationPoint {
  /** 优先级 1=最高 */
  priority: number;
  /** 涉及条款 */
  clause: string;
  /** 条款索引 id（分析时必须与 CLAUSE INDEX 中的 id 一致） */
  clauseId?: string;
  /** 原文逐字引用（20–60 字/词，从该条款复制） */
  quote?: string;
  /** 当前表述摘要（可选；展示以 quote 为准） */
  current?: string;
  /** 建议改为 */
  suggested: string;
  /** 为什么重要 */
  reason: string;
  /** 分析置信度 */
  confidence?: ConfidenceLevel;
}

/** 时间敏感条款 */
export interface TimeTerm {
  type: "auto_renewal" | "deadline" | "expiration" | "notice_period";
  description: string;
  date?: string;
  risk: "high" | "medium" | "low";
}

/** 缺失的关键条款（深度模式） */
export interface MissingClause {
  /** 条款名称 */
  name: string;
  /** 为什么这份合同需要它 */
  importance: string;
  /** 建议增加的条款内容模板 */
  suggestion: string;
}

export interface ScanError {
  error: string;
}

/** Single tracked change from contract revision */
export interface ContractChange {
  section?: string;
  original: string;
  revised: string;
  reason?: string;
}

/** Result of applying accepted suggestions to a contract */
export interface ReviseResult {
  revisedContract: string;
  changes: ContractChange[];
  /** Suggestions that could not be mapped to the contract text (not shown in editor). */
  skippedChanges?: SkippedChangeSummary[];
}

export interface SkippedChangeSummary {
  section?: string;
  reason: "not_located" | "meta_commentary" | "empty_revised";
}

/** 从文件提取的原始文本 */
export interface ExtractedText {
  text: string;
  sourceType: "pdf" | "docx" | "txt" | "unknown";
  pageCount?: number;
}
