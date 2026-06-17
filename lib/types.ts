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
  /** 修改建议 */
  suggestion: string;
  /** 风险等级 */
  level?: "high" | "medium" | "low";
  /** 风险类别 */
  category?: string;
}

/** 谈判要点 */
export interface NegotiationPoint {
  /** 优先级 1=最高 */
  priority: number;
  /** 涉及条款 */
  clause: string;
  /** 当前表述 */
  current: string;
  /** 建议改为 */
  suggested: string;
  /** 为什么重要 */
  reason: string;
}

/** 时间敏感条款 */
export interface TimeTerm {
  type: "auto_renewal" | "deadline" | "expiration" | "notice_period";
  description: string;
  date?: string;
  risk: "high" | "medium" | "low";
}

export interface ScanError {
  error: string;
}

/** 从文件提取的原始文本 */
export interface ExtractedText {
  text: string;
  sourceType: "pdf" | "docx" | "txt" | "unknown";
  pageCount?: number;
}
