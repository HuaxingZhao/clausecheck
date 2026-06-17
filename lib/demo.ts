import type { ScanResult } from "./types";

/** 不调用 AI 时用的 demo 结果（纯客户端安全，无服务端依赖） */
export function getDemoResult(): ScanResult {
  return {
    scoreNum: 72,
    scoreText: "中风险",
    dimensions: {
      fairness: 78,
      compliance: 45,
      financial: 82,
    },
    flags: [
      {
        icon: "⚠️",
        text: "第 5 条：违约金为合同总额的 200%，远超行业标准",
        suggestion: "建议将违约金上限降至合同总额的 30%-50%，并约定双方对等承担",
        level: "high",
        category: "违约金",
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
        date: undefined,
        risk: "medium",
      },
      {
        type: "notice_period",
        description: "第 12 条：终止合同需提前 90 天书面通知，远长于常规的 30 天",
        date: undefined,
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
    summary:
      "风险排序：① 违约金畸高（最严重）→ ② 竞业限制过宽 → ③ 自动续约缺少弹性 → ④ 管辖权不利于你 → ⑤ 退款保障缺失。\n下一步建议：(1) 首先重谈第 5 条违约金比例，这是最大的财务风险；(2) 然后争取竞业范围缩小至合理范围；(3) 最后把到期续约改为双方确认制，避免被自动锁定。",
  };
}
