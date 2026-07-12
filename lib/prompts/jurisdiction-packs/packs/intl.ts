import {
  COMMON_LAW_BOILERPLATE,
  commonLawCitationAddon,
  globalCommonLawAddons,
  signingRecommendationAddon,
} from "../common-law-shared";
import type { JurisdictionPack, PromptLocale } from "../types";

export function getIntlPack(locale: PromptLocale): JurisdictionPack {
  const focus =
    locale === "zh"
      ? `
【Jurisdiction Pack: intl — International Commercial / 未约定或跨国惯例】
detectedJurisdiction 设为 international_commercial（或合同明示其他普通法辖区时用 common_law_other）。
审查重点：General International Commercial Practice；禁止惯性输出《民法典》；使用普通法安全模板。`
      : `
【Jurisdiction Pack: intl — International Commercial / silent choice-of-law】
Set detectedJurisdiction to international_commercial (or common_law_other if another common-law forum is express).
Focus: General International Commercial Practice; never habitually emit PRC Civil Code articles; use common-law safe templates.`;

  return {
    id: "intl",
    displayName: "International Commercial",
    governingLawPatterns: [
      "international commercial",
      "uncitral",
      "cisg",
      "general principles of international",
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
