/**
 * Jurisdiction pack registry + resolve (override → heuristic → intl default).
 */

import type { JurisdictionOverride } from "@/lib/jurisdiction";
import {
  getPackFactory,
  listRegisteredPackIds,
  PACK_FACTORIES,
} from "./pack-registry";
import type {
  JurisdictionPack,
  JurisdictionPackId,
  PromptLocale,
  ResolveJurisdictionPackResult,
} from "./types";
import {
  formatFewshotsPromptBlock,
  loadFewshotsAuto,
} from "./fewshots";

export type {
  JurisdictionPack,
  JurisdictionPackId,
  PromptLocale,
  ResolveJurisdictionPackResult,
  PackResolveSource,
} from "./types";

export { LEGAL_BASIS_ARTICLE_WHITELIST } from "./packs/cn";
export { COMMON_LAW_BOILERPLATE } from "./common-law-shared";
export {
  BASE_RESERVED_BOILERPLATE_NAMES,
  MAX_PACK_ADDON_TOKENS,
  estimateTokenCount,
} from "./pack-limits";
export { listRegisteredPackIds, PACK_FACTORIES } from "./pack-registry";
export {
  MAX_FEWSHOT_TOKENS,
  loadFewshotsAuto,
  formatFewshotsPromptBlock,
  fewshotsAutoPath,
} from "./fewshots";

/**
 * Load pack and append auto few-shots from packs/{id}/fewshots-auto.json when present.
 * Few-shot block is capped at MAX_FEWSHOT_TOKENS (800).
 */
export function getJurisdictionPack(
  id: JurisdictionPackId,
  locale: PromptLocale = "en"
): JurisdictionPack {
  const factory = getPackFactory(id);
  if (!factory) {
    return getJurisdictionPack("intl", locale);
  }
  const pack = factory(locale);
  const auto = loadFewshotsAuto(pack.id);
  if (!auto?.examples?.length) {
    return pack;
  }
  const { block, injectedCount } = formatFewshotsPromptBlock(auto);
  if (!block || injectedCount === 0) {
    return pack;
  }
  console.info(
    `[jurisdiction-pack] injected ${injectedCount} auto few-shot(s) for pack=${pack.id} (cap ${800} tokens)`
  );
  return {
    ...pack,
    systemPromptAddon: `${pack.systemPromptAddon.trimEnd()}\n\n${block.trim()}\n`,
  };
}

export function listJurisdictionPackIds(): JurisdictionPackId[] {
  return listRegisteredPackIds();
}

/** Map client / detected jurisdiction → pack id. */
export function packIdFromJurisdiction(
  jurisdiction:
    | JurisdictionOverride
    | "us_general"
    | "common_law_other"
    | "unknown"
    | "auto"
    | undefined
    | null
): JurisdictionPackId | null {
  if (!jurisdiction || jurisdiction === "auto" || jurisdiction === "unknown") {
    return null;
  }
  switch (jurisdiction) {
    case "china_prc":
      return "cn";
    case "us_california":
      return "us-ca";
    case "us_new_york":
    case "us_general":
      return "us-ny";
    case "england_wales":
      return "uk";
    case "international_commercial":
    case "common_law_other":
      return "intl";
    default:
      return null;
  }
}

function patternScore(textLower: string, patterns: string[]): number {
  let score = 0;
  for (const raw of patterns) {
    const p = raw.toLowerCase();
    if (p.includes(".*")) {
      try {
        if (new RegExp(p, "i").test(textLower)) score += 2;
      } catch {
        /* ignore bad pattern */
      }
    } else if (textLower.includes(p)) {
      score += 2;
    }
  }
  return score;
}

/**
 * Cheap heuristic detect from contract text using pack governingLawPatterns.
 * Prefer more specific packs over intl.
 */
export function detectPackIdFromText(contractText: string): JurisdictionPackId {
  const textLower = (contractText || "").toLowerCase();
  if (!textLower.trim()) return "intl";

  const locale: PromptLocale = "en";
  const scored = listRegisteredPackIds()
    .filter((id) => id !== "intl")
    .map((id) => ({
      id,
      score: patternScore(
        textLower,
        getJurisdictionPack(id, locale).governingLawPatterns
      ),
    }));

  scored.sort((a, b) => b.score - a.score);
  if (scored[0] && scored[0].score > 0) {
    return scored[0].id;
  }
  return "intl";
}

export interface ResolveJurisdictionPackOptions {
  locale?: PromptLocale;
  jurisdiction?:
    | JurisdictionOverride
    | "us_general"
    | "common_law_other"
    | "unknown"
    | "auto"
    | null;
  contractText?: string;
}

/**
 * Resolve a single pack for this review.
 * Priority: explicit override → text heuristic → intl default.
 */
export function resolveJurisdictionPack(
  options: ResolveJurisdictionPackOptions = {}
): ResolveJurisdictionPackResult {
  const locale = options.locale ?? "en";
  const fromOverride = packIdFromJurisdiction(options.jurisdiction);
  if (fromOverride) {
    return {
      pack: getJurisdictionPack(fromOverride, locale),
      source: "override",
    };
  }

  if (options.contractText?.trim()) {
    const detected = detectPackIdFromText(options.contractText);
    return {
      pack: getJurisdictionPack(detected, locale),
      source: detected === "intl" ? "default" : "heuristic",
    };
  }

  return {
    pack: getJurisdictionPack("intl", locale),
    source: "default",
  };
}

/** True if id is registered (built-in or community). */
export function isRegisteredPackId(id: string): boolean {
  return id in PACK_FACTORIES;
}
