import {
  COMMON_LAW_BOILERPLATE,
  commonLawCitationAddon,
  globalCommonLawAddons,
  signingRecommendationAddon,
} from "../common-law-shared";
import type { JurisdictionPack, PromptLocale } from "../types";

export function getUsNyPack(locale: PromptLocale): JurisdictionPack {
  const focus =
    locale === "zh"
      ? `
【Jurisdiction Pack: us-ny — New York / US general commercial】
detectedJurisdiction 必须为 us_general。
审查重点：纽约州 / 美国一般商业合同惯例；关注责任上限、赔偿、数据与跨境传输；勿套用加州 CPRA 专属假定，除非合同明文涉及加州居民数据。`
      : `
【Jurisdiction Pack: us-ny — New York / US general commercial】
You MUST set detectedJurisdiction to us_general.
Focus: New York / US commercial norms; liability caps, indemnity, data & cross-border transfer. Do not assume CPRA-specific duties unless the contract expressly involves California resident data.`;

  return {
    id: "us-ny",
    displayName: "New York / US General",
    governingLawPatterns: [
      "laws of the state of new york",
      "state of new york",
      "new york law",
      "governing law.*new york",
      "laws of the united states",
      "delaware law",
      "laws of the state of delaware",
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
