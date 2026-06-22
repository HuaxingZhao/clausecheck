import type { ScanResult } from "./types";

const DEMO_ZH: ScanResult = {
  scoreNum: 72,
  scoreText: "中风险",
  contractType: "软件外包服务合同（B2B）",
  executiveSummary:
    "本合同为软件定制开发服务协议，整体偏向服务方。最大风险集中在违约金畸高（200%）与竞业限制过宽，若触发可能导致远超项目价值的损失。建议在签署前完成至少 3 项核心条款修订，否则不建议按现稿签署。",
  signingRecommendation: "sign_with_changes",
  signingRationale:
    "合同框架可接受，但第 5、8、12 条存在实质性不公平条款。完成红线修订后可签署；未修订前财务与合规敞口过高。",
  dimensions: { fairness: 78, compliance: 45, financial: 82 },
  flags: [
      {
        icon: "⚠️",
        text: "第 5 条：违约金为合同总额的 200%，远超行业标准",
        suggestion: "建议将违约金上限修订为：「任何一方违约，违约金总额不超过该违约事项所涉合同金额的 30%，且双方对等适用。」",
        level: "high",
        category: "违约金",
        quote: "违约方应向守约方支付相当于合同总额200%的违约金",
        legalBasis: "民法典第 585 条允许法院调整过分高于损失的违约金",
        impact: "若项目金额 100 万，单次违约可能面临 200 万索赔",
      },
    {
      icon: "⛔",
      text: "第 8 条：竞业限制范围覆盖全球、期限 5 年",
      suggestion: "建议竞业范围缩小至核心业务区域，期限缩短至不超过 2 年",
      level: "high",
      category: "竞业限制",
    },
    {
      icon: "🔄",
      text: "第 12 条：到期自动续约 1 年，需提前 90 天书面通知终止",
      suggestion: "建议改为到期前 30 天双方确认续约，或加入 30 天灵活退出条款",
      level: "medium",
      category: "自动续约",
    },
    {
      icon: "⚖️",
      text: "第 3 条：争议管辖权在对方所在地法院",
      suggestion: "建议争取约定己方所在地或合同签订地法院管辖，降低维权成本",
      level: "medium",
      category: "管辖权",
    },
    {
      icon: "💰",
      text: "第 7 条：付款后不退不换，无服务质量保障条款",
      suggestion: "建议增加服务质量 SLA 条款，并约定未达标可部分退款",
      level: "medium",
      category: "付款",
    },
  ],
  timeTerms: [
    {
      type: "auto_renewal",
      description: "第 12 条：合同到期自动续约 1 年，需提前 90 天书面通知方可终止",
      risk: "medium",
    },
    {
      type: "notice_period",
      description: "第 12 条：终止合同需提前 90 天书面通知，远长于常规的 30 天",
      risk: "medium",
    },
  ],
  negotiations: [
    {
      priority: 1,
      clause: "第 5 条",
      current: "违约金为合同总额的 200%",
      suggested: "违约金上限降至合同总额的 30%",
      reason: "不合理的违约金条款可能在诉讼中被认定无效，且一旦触发将造成重大财务损失",
    },
    {
      priority: 2,
      clause: "第 8 条",
      current: "竞业限制全球范围、期限 5 年",
      suggested: "缩小至核心业务区域、期限 2 年",
      reason: "过宽的竞业限制可能被法院调整，但诉讼成本高昂，不如事前谈妥",
    },
    {
      priority: 3,
      clause: "第 12 条",
      current: "自动续约 1 年 + 90 天通知期",
      suggested: "改为双方确认续约制 + 30 天通知期",
      reason: "避免在不知情下被长期绑定，保留灵活退出权利",
    },
  ],
  worstCase:
    "若同时触发 200% 违约金、全球 5 年竞业限制及自动续约条款，用户可能面临超过合同总额 2 倍的财务索赔，并被锁定额外 1 年服务义务，退出成本极高。",
  strengths: [
    "第 2 条：知识产权在全额付款后归客户所有，有利于保护交付成果",
    "第 9 条：服务方提供 90 天免费缺陷修复期，高于行业常见的 30 天",
  ],
  missingClauses: [
    {
      name: "服务等级协议（SLA）",
      importance: "软件开发合同应明确响应时间、可用性标准及未达标的补救措施",
      suggestion: "增加 SLA 条款：P1 故障 4 小时响应、99.5% 月度可用性，未达标按服务费 5% 抵扣",
    },
    {
      name: "验收标准与流程",
      importance: "无明确验收标准将导致交付争议和付款纠纷",
      suggestion: "约定分阶段验收标准、验收期限（15 个工作日）及视为验收通过的条件",
    },
  ],
  actionItems: [
    "立即重谈第 5 条违约金上限至 30% 并确保双方对等",
    "将第 8 条竞业限制缩小至核心区域、期限不超过 2 年",
    "第 12 条改为到期前 30 天双方确认续约制",
    "补充 SLA 与验收标准条款",
    "争取将争议管辖改至己方所在地",
  ],
  summary:
    "风险排序：① 违约金畸高（最严重）→ ② 竞业限制过宽 → ③ 自动续约缺少弹性 → ④ 管辖权不利于你 → ⑤ 退款保障缺失。\n下一步建议：(1) 首先重谈第 5 条违约金比例，这是最大的财务风险；(2) 然后争取竞业范围缩小至合理范围；(3) 最后把到期续约改为双方确认制，避免被自动锁定。",
};

const DEMO_EN: ScanResult = {
  scoreNum: 72,
  scoreText: "中风险",
  contractType: "Software Development Agreement (B2B)",
  executiveSummary:
    "This is a custom software development agreement that favors the service provider. Critical exposure lies in 200% liquidated damages and an overbroad worldwide non-compete. At least three core clauses must be renegotiated before signing; signing as-is is not recommended.",
  signingRecommendation: "sign_with_changes",
  signingRationale:
    "The overall framework is workable, but Sections 5, 8, and 12 contain materially unfair terms. Sign only after redlines are accepted; current financial and compliance exposure is too high.",
  dimensions: { fairness: 78, compliance: 45, financial: 82 },
  flags: [
      {
        icon: "⚠️",
        text: "Section 5: Liquidated damages set at 200% of contract value — far above industry norms",
        suggestion:
          "Revise to: \"Either party's liability for breach shall not exceed 30% of the contract value attributable to that breach, applied symmetrically to both parties.\"",
        level: "high",
        category: "Liquidated damages",
        quote: "The breaching party shall pay liquidated damages equal to 200% of the total contract value",
        legalBasis: "Courts routinely reduce penalties grossly disproportionate to actual harm",
        impact: "On a $100K project, a single breach could trigger a $200K claim",
      },
    {
      icon: "⛔",
      text: "Section 8: Non-compete covers worldwide scope for 5 years",
      suggestion: "Narrow scope to core business regions and limit duration to 2 years or less",
      level: "high",
      category: "Non-compete",
    },
    {
      icon: "🔄",
      text: "Section 12: Auto-renews for 1 year; requires 90-day written notice to terminate",
      suggestion: "Switch to mutual renewal confirmation 30 days before expiry, or add a 30-day exit clause",
      level: "medium",
      category: "Auto-renewal",
    },
    {
      icon: "⚖️",
      text: "Section 3: Disputes must be heard in the counterparty's home jurisdiction",
      suggestion: "Negotiate your jurisdiction or the place of signing to reduce enforcement cost",
      level: "medium",
      category: "Jurisdiction",
    },
    {
      icon: "💰",
      text: "Section 7: No refunds after payment; no service-level guarantees",
      suggestion: "Add SLA terms with partial refund if service standards are not met",
      level: "medium",
      category: "Payment",
    },
  ],
  timeTerms: [
    {
      type: "auto_renewal",
      description: "Section 12: Contract auto-renews for 1 year unless 90-day written notice is given",
      risk: "medium",
    },
    {
      type: "notice_period",
      description: "Section 12: 90-day termination notice — much longer than the typical 30 days",
      risk: "medium",
    },
  ],
  negotiations: [
    {
      priority: 1,
      clause: "Section 5",
      current: "Liquidated damages at 200% of contract value",
      suggested: "Cap at 30% of contract value",
      reason: "Excessive penalties may be struck down in court and can cause severe financial loss if triggered",
    },
    {
      priority: 2,
      clause: "Section 8",
      current: "Worldwide non-compete for 5 years",
      suggested: "Core business region only, 2-year maximum",
      reason: "Overbroad restrictions are often reduced by courts — better to negotiate upfront than litigate",
    },
    {
      priority: 3,
      clause: "Section 12",
      current: "Auto-renewal + 90-day notice",
      suggested: "Mutual renewal confirmation + 30-day notice",
      reason: "Avoid being locked in without realizing it; preserve flexibility to exit",
    },
  ],
  worstCase:
    "If 200% liquidated damages, worldwide 5-year non-compete, and auto-renewal all trigger together, exposure may exceed 2× contract value with an additional year of locked-in obligations.",
  strengths: [
    "Section 2: IP transfers to client upon full payment — protects deliverables",
    "Section 9: 90-day defect remediation period exceeds the typical 30-day industry standard",
  ],
  missingClauses: [
    {
      name: "Service Level Agreement (SLA)",
      importance: "Development contracts should define response times, uptime, and remedies for underperformance",
      suggestion: "Add SLA: P1 incidents within 4 hours, 99.5% monthly uptime, 5% fee credit for misses",
    },
    {
      name: "Acceptance criteria & process",
      importance: "Without clear acceptance standards, delivery disputes and payment conflicts are likely",
      suggestion: "Define milestone acceptance criteria, 15-business-day review period, and deemed-accepted conditions",
    },
  ],
  actionItems: [
    "Renegotiate Section 5 damages cap to 30% with mutual application",
    "Narrow Section 8 non-compete to core regions, max 2 years",
    "Replace Section 12 auto-renewal with mutual confirmation + 30-day notice",
    "Add SLA and acceptance criteria clauses",
    "Negotiate jurisdiction to your home venue",
  ],
  summary:
    "Risk ranking: ① Excessive liquidated damages (highest) → ② Overbroad non-compete → ③ Inflexible auto-renewal → ④ Unfavorable jurisdiction → ⑤ No refund protection.\nNext steps: (1) Renegotiate Section 5 damages first — biggest financial exposure; (2) Narrow non-compete scope; (3) Replace auto-renewal with mutual confirmation to avoid silent lock-in.",
};

/** Demo result when OpenAI key is not configured */
export function getDemoResult(locale: "zh" | "en" = "zh"): ScanResult {
  return locale === "en" ? DEMO_EN : DEMO_ZH;
}
