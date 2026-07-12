/**
 * Client + API jurisdiction selection for multi-jurisdiction review.
 * Maps UI values to ScanResult.detectedJurisdiction overrides.
 */

export const CLIENT_JURISDICTION_VALUES = [
  "auto",
  "us_california",
  "us_new_york",
  "england_wales",
  "china_prc",
  "international_commercial",
] as const;

export type ClientJurisdiction = (typeof CLIENT_JURISDICTION_VALUES)[number];

/** Values that override AI auto-detect (excludes auto). */
export type JurisdictionOverride =
  | "us_california"
  | "us_new_york"
  | "england_wales"
  | "china_prc"
  | "international_commercial";

/** Stored on ScanResult.detectedJurisdiction after override. */
export type DetectedJurisdiction =
  | "china_prc"
  | "us_california"
  | "us_general"
  | "england_wales"
  | "common_law_other"
  | "international_commercial"
  | "unknown";

export function isClientJurisdiction(v: unknown): v is ClientJurisdiction {
  return (
    typeof v === "string" &&
    (CLIENT_JURISDICTION_VALUES as readonly string[]).includes(v)
  );
}

/** Parse optional form/JSON jurisdiction; empty/auto → undefined (AI detect). */
export function parseJurisdictionParam(
  raw: unknown
): JurisdictionOverride | undefined {
  if (raw == null) return undefined;
  const s = String(raw).trim().toLowerCase();
  if (!s || s === "auto") return undefined;
  if (s === "us_california") return "us_california";
  if (s === "us_new_york" || s === "us_ny" || s === "new_york") return "us_new_york";
  if (s === "england_wales" || s === "uk" || s === "england") return "england_wales";
  if (s === "china_prc" || s === "china" || s === "prc") return "china_prc";
  if (
    s === "international_commercial" ||
    s === "international" ||
    s === "intl"
  ) {
    return "international_commercial";
  }
  return undefined;
}

/** Map client override → detectedJurisdiction field value. */
export function toDetectedJurisdiction(
  override: JurisdictionOverride
): DetectedJurisdiction {
  if (override === "us_new_york") return "us_general";
  return override;
}

/** Prompt line forcing AI to honor client selection. */
export function jurisdictionOverridePromptBlock(
  override: JurisdictionOverride,
  locale: "zh" | "en"
): string {
  const detected = toDetectedJurisdiction(override);
  const label =
    override === "us_california"
      ? "US — California"
      : override === "us_new_york"
        ? "US — New York"
        : override === "england_wales"
          ? "England & Wales"
          : override === "china_prc"
            ? "China PRC"
            : "International Commercial";

  if (locale === "zh") {
    return `
【用户指定适用法律 OVERRIDE — 优先于合同自动检测】
用户已选择 Governing Law = ${label}。
必须将 detectedJurisdiction 设为 "${detected}"，并按该轨双轨制引用规范输出。
仍须填写 governingLawQuote / disputeResolutionQuote（可摘自合同；若合同另有约定，在 text 中注明与用户选择的差异）。
`;
  }

  return `
【USER-SELECTED GOVERNING LAW OVERRIDE — takes priority over auto-detect】
The user selected Governing Law = ${label}.
You MUST set detectedJurisdiction to "${detected}" and apply that track's citation rules.
Still populate governingLawQuote / disputeResolutionQuote from the contract (note any conflict with the user selection in flag text).
`;
}

export type DisclaimerVariant =
  | "china_prc"
  | "us"
  | "england_wales"
  | "international";

export function disclaimerVariantFor(
  jurisdiction: ClientJurisdiction
): DisclaimerVariant {
  if (jurisdiction === "china_prc") return "china_prc";
  if (jurisdiction === "us_california" || jurisdiction === "us_new_york") {
    return "us";
  }
  if (jurisdiction === "england_wales") return "england_wales";
  return "international";
}

export const DISCLAIMER_COPY: Record<DisclaimerVariant, string> = {
  china_prc:
    "本工具提供的分析仅供参考，不构成法律意见。如需正式法律服务，请咨询执业律师。",
  us: "This tool provides informational analysis only and does not constitute legal advice or establish an attorney-client relationship. Consult a qualified attorney for legal matters.",
  england_wales:
    "This tool is for informational purposes only and does not constitute legal advice. No solicitor-client relationship is created.",
  international:
    "This tool provides informational analysis only and does not constitute legal advice. Consult a qualified attorney licensed in the relevant jurisdiction for formal legal advice.",
};

export function getDisclaimerText(jurisdiction: ClientJurisdiction): string {
  return DISCLAIMER_COPY[disclaimerVariantFor(jurisdiction)];
}
