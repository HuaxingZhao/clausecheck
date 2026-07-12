import {
  COMMON_LAW_BOILERPLATE,
  commonLawCitationAddon,
  globalCommonLawAddons,
  signingRecommendationAddon,
} from "../common-law-shared";
import type { JurisdictionPack, PromptLocale } from "../types";

export function getUsCaPack(locale: PromptLocale): JurisdictionPack {
  const focus =
    locale === "zh"
      ? `
【Jurisdiction Pack: us-ca — California, US】
detectedJurisdiction 必须为 us_california。
审查重点：提高对 PII / CPRA / 消费者隐私与数据出境的敏感度；关注加州商业合同中常见的责任上限、赔偿与 Termination for Convenience。`
      : `
【Jurisdiction Pack: us-ca — California, US】
You MUST set detectedJurisdiction to us_california.
Focus: heighten PII / CPRA / consumer privacy & cross-border transfer sensitivity; scrutinize liability caps, indemnity, and Termination for Convenience typical of CA commercial deals.`;

  return {
    id: "us-ca",
    displayName: "California, US",
    governingLawPatterns: [
      "laws of the state of california",
      "state of california",
      "california law",
      "governing law.*california",
      "cpra",
      "ccpa",
      "san francisco, california",
      "los angeles, california",
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
