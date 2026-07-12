import type { JurisdictionPack, PromptLocale } from "../types";

/** Article numbers allowed when China pack is active. */
export const LEGAL_BASIS_ARTICLE_WHITELIST = [
  151, // 显失公平
  496, 497, 498, // 格式条款
  501, // 缔约保密
  585, 586, 587, // 违约金/违约责任
] as const;

export function getCnPack(locale: PromptLocale): JurisdictionPack {
  const addon =
    locale === "zh"
      ? `
【Jurisdiction Pack: cn — 中国法（PRC）】
detectedJurisdiction 必须为 china_prc。

■ 中国轨法律依据
- 每条 high/medium flag 必须填 legalBasis；riskRationale 可空或与 legalBasis 同义复述。
- 不确定条号时，**只能**写：「基于商业惯例：…」或「《民法典》总则/合同编（不写条号）」。
- 高频白名单（仅场景匹配时写条号）：第501条（缔约保密）、第151条（显失公平）、第496–498条（格式条款）、第585–587条（违约金）。
- 管辖写「《民事诉讼法》协议管辖」或商业惯例；**禁止**将管辖归于《民法典》。
- 禁止编造条号；禁止把显失公平写成第52/545条。
- 关注个保法 / 数据出境（若合同涉个人信息）。

■ 本 Pack 不适用
- 禁止输出其他法域专属隐私法规条文编号或普通法判例名。
- Boilerplate 四项（Severability 等）**不强制**写入 missingClauses（可扫描对等中文条款缺失，但不适用普通法 E 强制规则）。
- 签署建议保持对中国法路径的严格标准（不套用美式 SaaS sign_with_changes 校准）。

输出仅为决策支持，不构成法律意见。`
      : `
【Jurisdiction Pack: cn — China PRC】
You MUST set detectedJurisdiction to china_prc.

■ China-track legal basis
- Every high/medium flag MUST set legalBasis; riskRationale may mirror it.
- When unsure of article numbers, ONLY write commercial practice or "PRC Civil Code — General Provisions / Contracts Book (no article number)".
- Whitelist when truly matching: Arts. 501, 151, 496–498, 585–587.
- Forum: PRC Civil Procedure Law agreed jurisdiction or commercial practice — never Civil Code for forum.
- Do not invent article numbers.
- Heighten PIPL / cross-border personal-information sensitivity when relevant.

■ Out of scope for this pack
- Do NOT emit foreign privacy-statute section numbers or common-law case names.
- Severability / Entire Agreement / Waiver / Force Majeure are NOT mandatory missingClauses under this pack.
- Keep China-track strict signing posture (do not apply US SaaS sign_with_changes calibration).

Output is decision support only — not legal advice.`;

  return {
    id: "cn",
    displayName: "China (PRC)",
    governingLawPatterns: [
      "中华人民共和国法律",
      "中国法律",
      "中华人民共和国",
      "适用中华人民共和国",
      "prc law",
      "laws of the people's republic of china",
      "laws of china",
      "governing law.*china",
      "china law",
      "people's republic of china",
    ],
    systemPromptAddon: addon,
    boilerplateRequirements: [],
  };
}
