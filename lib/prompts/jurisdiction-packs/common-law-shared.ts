/**
 * Shared common-law / international blocks reused by non-CN packs.
 * Still loaded only via a single pack — not mixed with China track.
 */

import type { PromptLocale } from "./types";

export const COMMON_LAW_BOILERPLATE = [
  "Severability",
  "Entire Agreement",
  "Waiver",
  "Force Majeure",
] as const;

export function commonLawCitationAddon(locale: PromptLocale): string {
  if (locale === "zh") {
    return `
【本 Pack：普通法 / 国际轨法律依据】
- 每条 high/medium flag **必须**填 riskRationale；同时将同一文案写入 legalBasis（兼容旧前端）。
- **绝对禁止**引用具体判例名称（如 Smith v Jones）或捏造 Statute / USC / CFR Section 编号。
- **禁止**输出《民法典》/Civil Code Article X（本 Pack 非中国法）。
- 强制使用安全模板之一：
  · "Under general principles of [Jurisdiction] contract law, …"
  · "Standard market practice for [Industry] in [Region], …"
  · "Potential enforceability risk due to unconscionability/ambiguity/…"
  · 中文合同语境可用：「根据【管辖区】合同法一般原则…」「【行业】在【地区】的市场惯例…」
输出仅为决策支持，不构成法律意见。`;
  }

  return `
【This Pack: Common Law / International citation rules】
- Every high/medium flag MUST set riskRationale AND copy the same text into legalBasis (UI compatibility).
- NEVER cite specific case names or fabricated statute/USC/CFR section numbers.
- NEVER emit PRC Civil Code Article X (this pack is not china_prc).
- Use one of these safe templates:
  · "Under general principles of [Jurisdiction] contract law, …"
  · "Standard market practice for [Industry] in [Region], …"
  · "Potential enforceability risk due to unconscionability/ambiguity/…"
Output is decision support only — not legal advice.`;
}

export function globalCommonLawAddons(locale: PromptLocale): string {
  if (locale === "zh") {
    return `
【Global / Common Law Add-ons — 在 12 类之外必须检查】
A. Limitation of Liability Cap — 责任上限是否排除 Consequential / Indirect / Special Damages；上限是否过低或单方
B. Indemnification Scope — 赔偿是否过宽、无上限、含律师费/第三方主张
C. Termination for Convenience — 是否存在单方无理由终止及后果（费用/数据返还）
D. Data Protection & Cross-border Transfer — GDPR/UK GDPR/CCPA/CPRA；是否缺失 SCCs / DPA / 处理目的限制
E. Boilerplate Completeness — **强制输出**：
   - 逐项检查 Severability（可分割）、Entire Agreement（完整协议）、Waiver（弃权）、Force Majeure（不可抗力）。
   - 若合同缺失上述任意一项，**必须**在 missingClauses 中单独列出该项（name 须含对应英文或中文关键词），即使 flags 已满额、即使「Entire Agreement」残缺或存在口头变更漏洞。
   - Notices / Assignment 不对等可作为额外 missingClauses，不替代上述四项。
A–D 须在 flags 或 missingClauses 中覆盖；E 四项缺失则只能用 missingClauses 强制上报。`;
  }

  return `
【Global / Common Law Add-ons — mandatory beyond the 12 categories】
A. Limitation of Liability Cap — caps; carve-outs of consequential/indirect/special damages; one-sided or tiny caps
B. Indemnification Scope — overbroad, uncapped, fee-shifting, third-party claims
C. Termination for Convenience — unilateral no-fault exit and wind-down (fees, data return)
D. Data Protection & Cross-border Transfer — GDPR/UK GDPR/CCPA/CPRA; missing SCCs/DPA/purpose limits
E. Boilerplate Completeness — **MANDATORY OUTPUT**:
   - Check each of: Severability, Entire Agreement, Waiver, Force Majeure.
   - If ANY of these four is absent (or Entire Agreement is defective / allows informal oral email amendments without mutual signed writing), you MUST list each gap as its own entry in missingClauses — even when flags already hit the minimum.
   - Notices / Assignment asymmetry may be additional missingClauses; they do not replace the four required items.
Cover A–D in flags or missingClauses; missing E items MUST appear in missingClauses.`;
}

export function signingRecommendationAddon(locale: PromptLocale): string {
  if (locale === "zh") {
    return `
【签署建议校准 — Signing Recommendation（本 Pack）】
当合同为 SaaS / 技术服务 / 软件许可时：
- 区分「行业常见不利条款」(industry-standard unfavorable) 与「交易破裂级风险」(deal-breaking)：
  · 前者示例：责任上限 = 过去 12 个月费用 和/或 5–6 位数地板（如 US$50,000–US$250,000）、客户赔偿受同一上限约束、典型交叉赔偿、附 SLA 的有限 as-is、合理自动续约/30 日便利终止、72 小时安全事件通知 → 应给 **sign_with_changes**，在 negotiations 列出红线。
  · 后者示例：客户侧无上限 IP/第三方赔偿、单方任意涨价、数据泄露通知豁免或无跨境保障、责任上限名义化（如 $100）且含重大过失、客户数据/反馈归供应商独占、仅供应商有 Termination for Convenience、网站单方改约即视为接受 → 存在任一项才可给 **do_not_sign**。
- 关键：「过去 12 个月费用或 US$50,000 取其高」属中端 SaaS 行业惯例 → **sign_with_changes**，禁止据此 do_not_sign。
- 仅有前者、无后者时：禁止因「整体偏供应商」就输出 do_not_sign。
- 若输出 do_not_sign：signingRationale 首句必须点名至少一项符合上述 deal-breaker 清单的风险（不得仅写「上限偏低」）。`;
  }

  return `
【Signing Recommendation calibration — this Pack】
For SaaS/Tech agreements, distinguish between:
- "industry-standard unfavorable" (e.g., liability caps equal to fees paid in the prior 12 months and/or a five- or six-figure floor such as US$50,000–US$250,000; capped Customer indemnity tied to that same cap; typical mutual/cross indemnity; limited as-is disclaimers with an SLA; ordinary auto-renewal / 30-day Termination for Convenience; 72-hour security-incident notice) → use **sign_with_changes** and put fixes in negotiations; do NOT choose do_not_sign solely because the paper is vendor-leaning.
- "deal-breaking risks" (e.g., uncapped Customer IP/third-party indemnity, unilateral price changes >15% mid-term, data-breach notification waiver / no cross-border safeguards, nominal liability caps such as US$100 including for gross negligence, Provider ownership of all Customer Data/feedback, Provider-only Termination for Convenience with days of notice, unilateral website amendments binding Customer) → **do_not_sign** only when at least one deal-breaker is present.
CRITICAL: A liability cap of "fees paid in prior 12 months or US$50,000, whichever is greater" is industry-standard for mid-market SaaS — treat as sign_with_changes, NOT do_not_sign.
If you output do_not_sign, the first sentence of signingRationale MUST name the deal-breaking risk(s) that meet the deal-breaker list above (not merely "cap feels low").`;
}
