/**
 * Jurisdiction Pack plugin contract for expert system prompts.
 * Base prompt is jurisdiction-agnostic; only one pack is loaded per review.
 */

/**
 * Pack id — lowercase kebab-case.
 * Built-ins: cn | us-ca | us-ny | uk | intl
 * Community: {iso-country}-{subdivision?} e.g. sg, ae-dubai, au-nsw
 */
export type JurisdictionPackId = string;

/**
 * Plugin unit: jurisdiction-specific review instructions.
 * Loaded after the shared base prompt; never mix multiple packs in one call.
 */
export interface JurisdictionPack {
  /** e.g. "us-ca", "cn", "uk", "sg" */
  id: JurisdictionPackId;
  /** e.g. "California, US" */
  displayName: string;
  /** Patterns used for heuristic auto-detect (case-insensitive substring / simple regex). */
  governingLawPatterns: string[];
  /** Jurisdiction-specific review instructions appended to the base prompt. */
  systemPromptAddon: string;
  /** Mandatory boilerplate checklist for this jurisdiction (missing → missingClauses). */
  boilerplateRequirements: string[];
  /** Optional overrides for signing recommendation score bands (reserved / meta). */
  defaultSigningThresholds?: {
    doNotSignScore?: number;
    signWithChangesScore?: number;
  };
}

export type PromptLocale = "zh" | "en";

/** How the pack was chosen for this review. */
export type PackResolveSource = "override" | "heuristic" | "default";

export interface ResolveJurisdictionPackResult {
  pack: JurisdictionPack;
  source: PackResolveSource;
}
