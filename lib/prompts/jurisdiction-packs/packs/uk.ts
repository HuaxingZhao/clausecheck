import {
  COMMON_LAW_BOILERPLATE,
  commonLawCitationAddon,
  globalCommonLawAddons,
  signingRecommendationAddon,
} from "../common-law-shared";
import type { JurisdictionPack, PromptLocale } from "../types";

export function getUkPack(locale: PromptLocale): JurisdictionPack {
  const focus =
    locale === "zh"
      ? `
【Jurisdiction Pack: uk — England & Wales】
detectedJurisdiction 必须为 england_wales。
审查重点：UK GDPR、不公平合同条款语境；若涉员工转移关注 TUPE；责任限制与赔偿须按英国商业惯例表述（禁止编造法条编号）。`
      : `
【Jurisdiction Pack: uk — England & Wales】
You MUST set detectedJurisdiction to england_wales.
Focus: UK GDPR, unfair-terms posture; TUPE if workforce transfer; liability and indemnity under English commercial practice (no fabricated section numbers).`;

  return {
    id: "uk",
    displayName: "England & Wales",
    governingLawPatterns: [
      "england and wales",
      "laws of england",
      "english law",
      "governing law.*england",
      "united kingdom",
      "uk gdpr",
      "laws of the united kingdom",
    ],
    systemPromptAddon: [
      focus,
      commonLawCitationAddon(locale),
      globalCommonLawAddons(locale),
      signingRecommendationAddon(locale),
    ].join("\n"),
    boilerplateRequirements: [...COMMON_LAW_BOILERPLATE],
    defaultSigningThresholds: {
      signWithChangesScore: 55,
      doNotSignScore: 75,
    },
  };
}
