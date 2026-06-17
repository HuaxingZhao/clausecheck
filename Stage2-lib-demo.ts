import type { ScanResult } from "./types";

/**
 * 不调用 AI 时用的 demo 结果。
 * 模拟一份「软件开发外包合同」的 AI 审查结果。
 */
export function getDemoResult(): ScanResult {
  return {
    scoreNum: 68,
    scoreText: "中风险",
    dimensions: {
      fairness: 75,
      compliance: 52,
      financial: 72,
    },
    flags: [
      {
        icon: "💰",
        text: "第 4.2 条：知识产权全部归属甲方，乙方不保留任何使用权",
        suggestion:
          "建议争取乙方保留通用组件/工具库的版权，或约定双方共享项目衍生知识产权。完全交出 IP 会削弱你的技术资产积累。",
        level: "high",
        category: "知识产权",
      },
      {
        icon: "⏳",
        text: "第 3.1 条：项目延期交付每日罚款合同总额的 0.5%，无上限",
        suggestion:
          "建议设置罚款上限（如合同总额的 10%-20%），同时明确因甲方变更需求导致的延期不计入罚款。",
        level: "high",
        category: "违约金",
      },
      {
        icon: "🔒",
        text: "第 7.3 条：验收后仍承担 24 个月无限责任质保",
        suggestion:
          "建议限定质保范围为重大缺陷，期限缩短至 6-12 个月，并排除因甲方自行修改导致的故障。",
        level: "high",
        category: "责任不对等",
      },
      {
        icon: "💳",
        text: "第 5.1 条：付款节点全部绑定甲方单方验收，无客观标准",
        suggestion:
          "建议将至少 50% 款项绑定到客观里程碑（代码交付、测试通过、部署上线），而非主观验收。",
        level: "medium",
        category: "付款",
      },
      {
        icon: "🚫",
        text: "第 8.2 条：乙方 2 年内不得服务任何「竞争性客户」，定义模糊",
        suggestion:
          "建议将竞争性客户明确定义为附件中的具体名单（不超过 5 家），避免被宽泛解释。",
        level: "medium",
        category: "竞业限制",
      },
      {
        icon: "⚖️",
        text: "第 10.1 条：争议由甲方所在地法院专属管辖",
        suggestion:
          "建议改为合同签订地或约定仲裁（如 CIETAC），减少异地诉讼的时间和金钱成本。",
        level: "medium",
        category: "管辖权",
      },
      {
        icon: "📄",
        text: "第 6.4 条：甲方可单方变更需求且不调整预算和工期",
        suggestion:
          "建议增加变更控制流程：任何需求变更需双方书面确认，并根据工作量重新评估预算和排期。",
        level: "low",
        category: "单方权利",
      },
    ],
    timeTerms: [
      {
        type: "deadline",
        description:
          "第 3.1 条：项目交付截止日为合同生效后 90 个自然日，不含需求变更缓冲",
        date: undefined,
        risk: "high",
      },
      {
        type: "notice_period",
        description: "第 9.2 条：任意方终止合同需提前 60 天书面通知",
        date: undefined,
        risk: "medium",
      },
      {
        type: "expiration",
        description: "第 1.2 条：合同有效期 3 年，到期前 30 天内双方协商续签",
        date: undefined,
        risk: "low",
      },
    ],
    negotiations: [
      {
        priority: 1,
        clause: "第 4.2 条",
        current: "知识产权全部归甲方，开发方无任何使用权",
        suggested: "核心业务 IP 归甲方，通用组件/工具版权双方共享",
        reason:
          "IP 条款影响深远，一旦签署你将失去积累技术资产的可能，这是最大的长期风险",
      },
      {
        priority: 2,
        clause: "第 3.1 条",
        current: "延期罚款每日 0.5%，无上限",
        suggested: "罚款上限设为合同总额 15%，需求变更导致的延期不计罚",
        reason:
          "无上限罚款在软件开发中极不合理，一个需求变更可能导致数周延期和天价罚金",
      },
      {
        priority: 3,
        clause: "第 7.3 条",
        current: "验收后 24 个月无限责任质保",
        suggested: "质保期 12 个月，限定重大缺陷，排除甲方自行修改部分",
        reason:
          "24 个月质保周期远超行业惯例（通常 3-6 个月），会长期占用维护资源",
      },
      {
        priority: 4,
        clause: "第 5.1 条",
        current: "付款全部绑定甲方验收通过",
        suggested: "50% 绑定里程碑，30% 绑定交付，20% 绑定验收",
        reason:
          "全部付款依赖主观验收意味着你的现金流完全被对方控制，必须引入客观标准",
      },
    ],
    summary:
      "这是一份典型的「甲方强势」外包合同，风险集中在三个核心领域：\n\n" +
      "① 知识产权归属完全偏向甲方——这是最大的长期风险，建议作为谈判第一优先级；\n" +
      "② 延期罚款和质保条款存在重大财务敞口，必须在签署前设置上限；\n" +
      "③ 付款和需求变更完全由甲方单方控制，建议引入客观里程碑和变更流程。\n\n" +
      "整体来看，这份合同并非不能签，但以上三条如果不改，后续履约风险很高。建议按谈判优先级逐条争取，底线是罚款设上限 + 付款绑里程碑。",
  };
}
