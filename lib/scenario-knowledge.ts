import type { ContractScenarioId } from "./contract-scenarios";

export interface StatuteSnippet {
  title: string;
  summaryZh: string;
  summaryEn: string;
}

export interface ClauseTemplate {
  nameZh: string;
  nameEn: string;
  textZh: string;
  textEn: string;
}

export interface ScenarioKnowledgePack {
  mandatoryChecksZh: string[];
  mandatoryChecksEn: string[];
  statutes: StatuteSnippet[];
  templates: ClauseTemplate[];
}

const COMMON: ScenarioKnowledgePack = {
  mandatoryChecksZh: [
    "责任上限与间接损失排除",
    "单方解约权与通知期",
    "争议解决管辖与适用法律",
  ],
  mandatoryChecksEn: [
    "Liability caps and consequential damages carve-out",
    "Unilateral termination and notice",
    "Dispute resolution and governing law",
  ],
  statutes: [
    {
      title: "民法典 · 合同编",
      summaryZh: "格式条款提供方须合理提示免责/限责条款；显失公平可撤销。",
      summaryEn: "Adhesion contracts require conspicuous unfair terms; gross unfairness may be voidable.",
    },
  ],
  templates: [
    {
      nameZh: "责任上限",
      nameEn: "Liability cap",
      textZh: "任何一方对对方的累计赔偿责任不超过本合同项下已实际支付金额的百分之【  】。",
      textEn: "Aggregate liability shall not exceed 【  】% of fees actually paid under this Agreement.",
    },
  ],
};

const PACKS: Partial<Record<ContractScenarioId, ScenarioKnowledgePack>> = {
  equity_nominee: {
    mandatoryChecksZh: [
      "代持合法性及无效风险（上市公司、金融、外资准入）",
      "表决权/收益权/处分权的行使程序",
      "擅自转让或侵占分红的违约救济",
      "显名化/回购退出价格公式与触发条件",
      "税务与外汇登记义务",
    ],
    mandatoryChecksEn: [
      "Nominee legality and voidness risk",
      "Voting, economic rights, disposal procedures",
      "Remedies for unauthorized transfer or dividend diversion",
      "Formalization/buyback formula and triggers",
      "Tax and FX registration",
    ],
    statutes: [
      {
        title: "公司法 · 股东名册",
        summaryZh: "股东权利以股东名册/登记为准；名义股东与实际出资人不一致时对内关系依协议，但不得对抗善意第三人。",
        summaryEn: "Shareholder rights follow the register; nominee arrangements are internal but may not defeat bona fide third parties.",
      },
    ],
    templates: [
      {
        nameZh: "股权回转期限",
        nameEn: "Share reversion timeline",
        textZh: "自甲方取得【工作签证类型】之日起【  】个自然日内，乙方应配合完成代持股权转回登记手续。",
        textEn: "Within 【  】 calendar days after Party A obtains 【visa type】, Party B shall cooperate to re-register nominee shares to Party A.",
      },
      {
        nameZh: "禁止擅自处分",
        nameEn: "No unauthorized disposal",
        textZh: "未经甲方书面同意，乙方不得转让、质押、代持份额或以其他方式处分代持股权。",
        textEn: "Party B shall not transfer, pledge, or otherwise dispose of nominee shares without Party A's prior written consent.",
      },
    ],
  },
  employment: {
    mandatoryChecksZh: [
      "劳动合同类型与试用期",
      "社保公积金缴纳义务",
      "解除条件与经济补偿/赔偿金",
      "竞业限制期限、范围与补偿金标准",
      "加班与工时制度",
    ],
    mandatoryChecksEn: [
      "Contract type and probation",
      "Social insurance contributions",
      "Termination and severance",
      "Non-compete scope, term, and consideration",
      "Working hours and overtime",
    ],
    statutes: [
      {
        title: "劳动合同法",
        summaryZh: "竞业限制须约定补偿；违法解除可能面临2倍赔偿金；试用期有法定上限。",
        summaryEn: "Non-compete requires consideration; unlawful termination may trigger 2x severance; statutory probation caps.",
      },
    ],
    templates: [
      {
        nameZh: "竞业补偿",
        nameEn: "Non-compete pay",
        textZh: "离职后竞业限制期内，甲方按月支付乙方离职前十二个月平均工资的百分之三十作为补偿。",
        textEn: "During the non-compete period, Party A shall pay 30% of Party B's average monthly wage for the prior 12 months.",
      },
    ],
  },
  nda: {
    mandatoryChecksZh: [
      "保密信息定义是否过宽",
      "保密期限与终止后存续期",
      "例外情形（公开信息、独立开发、强制披露）",
      "返还/销毁义务",
    ],
    mandatoryChecksEn: [
      "Definition overbreadth",
      "Term and survival",
      "Carve-outs (public domain, independent dev, compelled disclosure)",
      "Return/destruction duties",
    ],
    statutes: [
      {
        title: "民法典 · 保密与诚信",
        summaryZh: "商业秘密保护须采取合理保密措施；保密义务范围应与信息价值相匹配。",
        summaryEn: "Trade secret protection requires reasonable measures; confidentiality scope must match information value.",
      },
    ],
    templates: [
      {
        nameZh: "保密例外",
        nameEn: "Confidentiality carve-outs",
        textZh: "下列信息不属于保密信息：（一）接收前已为公众所知；（二）接收方独立开发；（三）依法强制披露。",
        textEn: "Excluded: (1) public domain before receipt; (2) independently developed; (3) legally compelled disclosure.",
      },
    ],
  },
  cross_border_ecommerce: {
    mandatoryChecksZh: [
      "关税/增值税承担与 Incoterms",
      "退货退款与跨境运费",
      "个人信息出境与平台规则变更",
      "支付拒付与汇率",
    ],
    mandatoryChecksEn: [
      "Duties/VAT and Incoterms",
      "Returns and cross-border freight",
      "Cross-border data and marketplace policy changes",
      "Chargebacks and FX",
    ],
    statutes: [
      {
        title: "个人信息保护法",
        summaryZh: "向境外提供个人信息须满足法定条件；跨境传输应签署标准合同或通过评估。",
        summaryEn: "Cross-border personal data transfer requires lawful basis and appropriate safeguards.",
      },
    ],
    templates: [
      {
        nameZh: "退货政策",
        nameEn: "Returns policy",
        textZh: "消费者无理由退货期内，卖方承担退货运费；退款应于收到退货后【  】个工作日内原路退回。",
        textEn: "Seller bears return shipping during cooling-off; refund within 【  】 business days after receipt of goods.",
      },
    ],
  },
  rental: {
    mandatoryChecksZh: ["押金扣减与退还时限", "维修义务划分", "提前解约违约金", "转租限制"],
    mandatoryChecksEn: ["Deposit deductions and return", "Repair duties", "Early termination penalty", "Sublease"],
    statutes: [
      {
        title: "民法典 · 租赁合同",
        summaryZh: "租赁期限六个月以上应采用书面形式；一方违约应承担继续履行、采取补救措施或赔偿损失。",
        summaryEn: "Leases over six months should be written; breach triggers performance, cure, or damages.",
      },
    ],
    templates: [
      {
        nameZh: "押金退还",
        nameEn: "Deposit return",
        textZh: "合同终止且房屋验收合格后【  】日内，出租人无息退还全部押金。",
        textEn: "Deposit returned in full within 【  】 days after termination and satisfactory inspection.",
      },
    ],
  },
  investment: {
    mandatoryChecksZh: ["对赌/回购触发与可执行性", "清算优先与反稀释", "一票否决范围", "陈述保证"],
    mandatoryChecksEn: ["Ratchets/buyback triggers", "Liquidation preference", "Veto rights", "Reps & warranties"],
    statutes: [
      {
        title: "九民纪要 · 对赌",
        summaryZh: "与目标公司对赌须审查效力；回购价格应合理可执行，避免显失公平。",
        summaryEn: "Valuation adjustment with the target company requires enforceability review; buyback pricing must be reasonable.",
      },
    ],
    templates: [
      {
        nameZh: "回购触发",
        nameEn: "Buyback trigger",
        textZh: "若公司未在【  】年前完成合格IPO，投资人有权要求创始人按【公式】回购其股权。",
        textEn: "If no qualified IPO by 【  】, investors may require founders to repurchase shares at 【formula】.",
      },
    ],
  },
  general: {
    mandatoryChecksZh: [
      "责任上限与间接损失排除",
      "单方解约权与通知期",
      "争议解决管辖与适用法律",
      "违约金是否过高（民法典 585 条）",
    ],
    mandatoryChecksEn: [
      "Liability caps and consequential damages carve-out",
      "Unilateral termination and notice",
      "Dispute resolution and governing law",
      "Liquidated damages reasonableness",
    ],
    statutes: [
      {
        title: "民法典 · 合同编",
        summaryZh: "格式条款提供方须合理提示免责/限责条款；过分高于损失的违约金可请求调减。",
        summaryEn: "Adhesion contracts require conspicuous unfair terms; excessive liquidated damages may be reduced.",
      },
    ],
    templates: [
      {
        nameZh: "责任上限",
        nameEn: "Liability cap",
        textZh: "任何一方对对方的累计赔偿责任不超过本合同项下已实际支付金额的百分之【  】。",
        textEn: "Aggregate liability shall not exceed 【  】% of fees actually paid under this Agreement.",
      },
    ],
  },
  multilingual: {
    mandatoryChecksZh: [
      "语言版本效力与冲突解释规则",
      "关键术语跨语言是否不等价",
      "附件/签署页语言一致性",
      "通知与争议文件提交语言",
    ],
    mandatoryChecksEn: [
      "Governing language and conflict resolution",
      "Key term equivalence across languages",
      "Schedule and signature page consistency",
      "Notice and dispute filing language",
    ],
    statutes: [
      {
        title: "国际商事合同 · 解释原则",
        summaryZh: "多语言文本冲突时应约定优先语言；无约定时可能按缔约意图或不利解释原则处理。",
        summaryEn: "Multilingual conflicts require a controlling language clause; absent that, contra proferentem or intent may apply.",
      },
    ],
    templates: [
      {
        nameZh: "语言优先",
        nameEn: "Controlling language",
        textZh: "本合同以【中文/英文】版本为准；各语言版本不一致时，以该版本解释并执行。",
        textEn: "This Agreement is executed in 【language】; if versions conflict, the 【language】 text prevails.",
      },
    ],
  },
  procurement_sales: {
    mandatoryChecksZh: [
      "标的物规格与验收标准",
      "交付风险转移与检验期",
      "付款账期与所有权保留",
      "迟延违约金与替代采购赔偿",
      "定制产品知识产权归属",
    ],
    mandatoryChecksEn: [
      "Specifications and acceptance criteria",
      "Delivery, risk of loss, inspection window",
      "Payment terms and retention of title",
      "Delay LDs and cover damages",
      "Custom product IP ownership",
    ],
    statutes: [
      {
        title: "民法典 · 买卖合同",
        summaryZh: "买受人应在约定期限内检验；隐蔽瑕疵应在发现后合理期限内通知。",
        summaryEn: "Buyers must inspect within agreed periods; latent defects require timely notice after discovery.",
      },
    ],
    templates: [
      {
        nameZh: "验收期限",
        nameEn: "Inspection period",
        textZh: "买方应于货到后【  】个工作日内完成验收；逾期未提出书面异议视为验收合格。",
        textEn: "Buyer shall complete acceptance within 【  】 business days after delivery; silence constitutes acceptance.",
      },
    ],
  },
  creator_merchant: {
    mandatoryChecksZh: [
      "内容授权范围（平台/地域/期限/独家）",
      "广告标识与虚假宣传风险",
      "KPI 未达标违约金与补拍义务",
      "品牌安全与删帖/下架权",
      "坑位费+佣金+CPS 与税务发票",
    ],
    mandatoryChecksEn: [
      "Content license scope (platform, territory, term, exclusivity)",
      "Sponsored disclosure and false advertising",
      "KPI shortfall penalties and reshoot duties",
      "Brand safety and takedown rights",
      "Fee structure, tax, and invoicing",
    ],
    statutes: [
      {
        title: "广告法",
        summaryZh: "广告应可识别为「广告」；不得对商品或服务作虚假或引人误解的宣传。",
        summaryEn: "Ads must be identifiable as advertising; false or misleading claims are prohibited.",
      },
    ],
    templates: [
      {
        nameZh: "授权范围",
        nameEn: "License scope",
        textZh: "达人授予商家在【平台名称】上于【  】个月内非独家使用推广素材的权利，地域限于【  】。",
        textEn: "Creator grants a non-exclusive license to use promotional assets on 【platform】 for 【  】 months within 【territory】.",
      },
    ],
  },
  account_opening: {
    mandatoryChecksZh: [
      "账户操作权限与代操作边界",
      "KYC/受益所有人披露与更新义务",
      "冻结/扣划与异常交易限制条件",
      "费率单方调价与隐性收费",
      "销户与资料返还",
    ],
    mandatoryChecksEn: [
      "Operating authority and POA limits",
      "KYC/beneficial owner disclosure and updates",
      "Freeze/seizure and suspicious activity limits",
      "Unilateral fee changes and hidden charges",
      "Account closure and document return",
    ],
    statutes: [
      {
        title: "反洗钱法",
        summaryZh: "金融机构应履行客户身份识别；客户应保证所提供信息真实、完整。",
        summaryEn: "Financial institutions must perform CDD; customers must warrant accurate identification information.",
      },
    ],
    templates: [
      {
        nameZh: "冻结通知",
        nameEn: "Freeze notice",
        textZh: "因监管要求或可疑交易需限制账户功能时，机构应在【  】个工作日内书面通知客户并说明理由。",
        textEn: "If account functions are restricted for regulatory or AML reasons, the institution shall notify the customer in writing within 【  】 business days with reasons.",
      },
    ],
  },
  corporate_services: {
    mandatoryChecksZh: [
      "服务范围（年报/税务/秘书/变更登记）",
      "延误/错误导致罚款的责任归属",
      "印章证照账册保管与交接",
      "自动续约与隐性政府规费",
      "终止交接清单",
    ],
    mandatoryChecksEn: [
      "Scope (filings, tax, secretarial, changes)",
      "Liability for regulatory penalties from errors/delays",
      "Custody and handback of chops, licenses, books",
      "Auto-renewal and hidden government fees",
      "Termination handover checklist",
    ],
    statutes: [
      {
        title: "代理记账管理办法",
        summaryZh: "代理记账机构应对会计资料真实性、完整性负责；委托方应提供真实原始凭证。",
        summaryEn: "Bookkeeping agencies are responsible for authenticity of records; clients must provide genuine source documents.",
      },
    ],
    templates: [
      {
        nameZh: "交接清单",
        nameEn: "Handover schedule",
        textZh: "合同终止后【  】个工作日内，服务商应向委托方移交全部印章、证照、账册及未申报事项清单。",
        textEn: "Within 【  】 business days after termination, the provider shall hand over all chops, licenses, books, and a list of pending filings.",
      },
    ],
  },
  tech_saas: {
    mandatoryChecksZh: [
      "许可范围（用户数/部署/地域/再许可）",
      "SLA 可用性与赔偿上限",
      "数据归属、导出/删除与跨境传输",
      "定制开发 IP 与开源义务",
      "终止后数据迁移与源码托管",
    ],
    mandatoryChecksEn: [
      "License scope (seats, deployment, territory, sublicense)",
      "SLA uptime and credit caps",
      "Data ownership, export/deletion, cross-border transfer",
      "Custom IP and open-source compliance",
      "Post-termination migration and escrow",
    ],
    statutes: [
      {
        title: "个人信息保护法",
        summaryZh: "处理个人信息应具有合法基础；向境外提供须满足法定条件并采取保护措施。",
        summaryEn: "Personal data processing requires lawful basis; cross-border transfer needs legal grounds and safeguards.",
      },
    ],
    templates: [
      {
        nameZh: "SLA 可用性",
        nameEn: "SLA uptime",
        textZh: "服务月度可用性不低于【  】%；未达标时客户有权获得服务费【  】%的抵扣。",
        textEn: "Monthly uptime shall be at least 【  】%; if not met, customer receives a service credit of 【  】% of monthly fees.",
      },
    ],
  },
  ip_license: {
    mandatoryChecksZh: [
      "许可标的与独占/排他/普通许可",
      "地域、领域、期限与分许可",
      "不侵权担保与第三方索赔辩护",
      "开源传染性（GPL/AGPL）",
      "改进成果与终止后停止使用",
    ],
    mandatoryChecksEn: [
      "Licensed rights and exclusivity type",
      "Territory, field, term, and sublicense",
      "Non-infringement warranty and defense",
      "Copyleft/open-source contagion",
      "Improvements and post-termination cease-use",
    ],
    statutes: [
      {
        title: "著作权法 · 许可",
        summaryZh: "许可使用应明确权利种类、地域、期限；未约定许可方式的视为普通许可。",
        summaryEn: "Licenses should specify rights, territory, and term; absent exclusivity language, licenses are non-exclusive.",
      },
    ],
    templates: [
      {
        nameZh: "侵权赔偿",
        nameEn: "Infringement indemnity",
        textZh: "许可方保证许可标的不侵犯第三方知识产权；因第三方索赔导致被许可方损失的，许可方应赔偿并负责抗辩。",
        textEn: "Licensor warrants the licensed rights do not infringe third-party IP and shall defend and indemnify licensee against third-party claims.",
      },
    ],
  },
  construction: {
    mandatoryChecksZh: [
      "工期顺延与逾期违约金上限",
      "设计变更/现场签证程序",
      "进度款与质保金返还",
      "隐蔽工程与竣工验收",
      "施工安全与第三者责任保险",
    ],
    mandatoryChecksEn: [
      "Schedule extensions and delay LD cap",
      "Change orders and site instructions",
      "Progress payments and retention release",
      "Concealed works and completion acceptance",
      "Site safety and third-party liability insurance",
    ],
    statutes: [
      {
        title: "民法典 · 建设工程合同",
        summaryZh: "竣工后应验收；承包人对因施工造成的质量缺陷在合理期限内承担责任。",
        summaryEn: "Completion requires acceptance; contractors remain liable for construction defects for a reasonable period.",
      },
    ],
    templates: [
      {
        nameZh: "签证程序",
        nameEn: "Variation procedure",
        textZh: "任何设计变更或现场签证须经发包人书面确认后方可计入结算；未签证的变更费用由施工方自行承担。",
        textEn: "Design changes or site instructions require the employer's written confirmation before payment; unsigned variations are at the contractor's cost.",
      },
    ],
  },
  franchise: {
    mandatoryChecksZh: [
      "特许人备案与信息披露",
      "加盟费/保证金/管理费与单方调价",
      "商圈/区域保护与同品牌竞业",
      "运营手册单方变更权",
      "退出转让与剩余库存处理",
    ],
    mandatoryChecksEn: [
      "Franchisor registration and disclosure",
      "Initial fees, deposit, royalty, unilateral increases",
      "Territory protection and channel conflicts",
      "Unilateral operations manual changes",
      "Exit, transfer restrictions, inventory",
    ],
    statutes: [
      {
        title: "商业特许经营管理条例",
        summaryZh: "特许人应向被特许人披露特许经营信息；未披露重大信息可能影响合同效力或赔偿责任。",
        summaryEn: "Franchisors must disclose material franchise information; failure may affect enforceability or liability.",
      },
    ],
    templates: [
      {
        nameZh: "区域保护",
        nameEn: "Territory protection",
        textZh: "在加盟商门店【  】公里半径内，特许人不得再授权第三方经营同品牌同类业务。",
        textEn: "Within 【  】 km of the franchisee's store, franchisor shall not authorize another outlet of the same brand for the same business.",
      },
    ],
  },
  medical_education: {
    mandatoryChecksZh: [
      "办学/执业许可与超范围经营",
      "效果承诺与虚假宣传",
      "预付式消费退费规则",
      "格式条款提示说明义务",
      "病历/学员信息与未成年人保护",
    ],
    mandatoryChecksEn: [
      "School/clinic licenses and scope of practice",
      "Efficacy promises and false advertising",
      "Prepaid refund rules",
      "Conspicuous consumer terms",
      "Health/education data and minors protection",
    ],
    statutes: [
      {
        title: "消费者权益保护法",
        summaryZh: "经营者不得以格式条款作出排除消费者权利、减轻自身责任的规定；预付式消费应保障退费权利。",
        summaryEn: "Standard terms may not exclude consumer rights; prepaid services must provide fair refund mechanisms.",
      },
    ],
    templates: [
      {
        nameZh: "退费规则",
        nameEn: "Refund policy",
        textZh: "学员/消费者未消费部分应在提出退费申请后【  】个工作日内按实际未消费金额无息退还。",
        textEn: "Unused prepaid amounts shall be refunded without interest within 【  】 business days of a valid refund request.",
      },
    ],
  },
  eor: {
    mandatoryChecksZh: [
      "客户/EOR/雇员三角关系与指令权",
      "常设机构（PE）与假外包真雇佣风险",
      "跨境个税社保与发薪合规",
      "工作签证/居留协助",
      "当地法定解除与经济补偿",
    ],
    mandatoryChecksEn: [
      "Client/EOR/employee roles and control",
      "PE risk and sham outsourcing",
      "Cross-border payroll, tax, and social contributions",
      "Work visa/residence support",
      "Local statutory termination and severance",
    ],
    statutes: [
      {
        title: "国际税法 · 常设机构",
        summaryZh: "在东道国构成常设机构可能触发企业所得税义务；用工安排应避免客户过度行使日常管理权。",
        summaryEn: "Permanent establishment may trigger corporate tax; client day-to-day control increases PE and employment reclassification risk.",
      },
    ],
    templates: [
      {
        nameZh: "关系界定",
        nameEn: "Relationship characterization",
        textZh: "EOR 为名义雇主，客户仅就业务结果提出工作要求，不直接向雇员发出人事任免、考勤与薪酬指令。",
        textEn: "EOR is the legal employer; the client directs business outcomes only and does not issue HR, attendance, or payroll instructions to the employee.",
      },
    ],
  },
};

export function getScenarioKnowledge(scenarioId: ContractScenarioId): ScenarioKnowledgePack {
  return PACKS[scenarioId] ?? COMMON;
}
