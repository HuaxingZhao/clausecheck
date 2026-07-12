/**
 * Extensible pack factory registry.
 * Community packs: add import + entry below (scaffolded by `npm run new-pack`).
 */

import type { JurisdictionPack, PromptLocale } from "./types";
import { getCnPack } from "./packs/cn";
import { getIntlPack } from "./packs/intl";
import { getUkPack } from "./packs/uk";
import { getUsCaPack } from "./packs/us-ca";
import { getUsNyPack } from "./packs/us-ny";

export type PackFactory = (locale: PromptLocale) => JurisdictionPack;

/**
 * Built-in + community Jurisdiction Packs.
 * Keep ids lowercase kebab-case: {iso}-{subdivision?} (e.g. us-ca, sg, ae-dubai).
 *
 * --- community packs (scaffolded) ---
 */
export const PACK_FACTORIES: Record<string, PackFactory> = {
  cn: getCnPack,
  "us-ca": getUsCaPack,
  "us-ny": getUsNyPack,
  uk: getUkPack,
  intl: getIntlPack,
};

export function listRegisteredPackIds(): string[] {
  return Object.keys(PACK_FACTORIES).sort();
}

export function getPackFactory(id: string): PackFactory | undefined {
  return PACK_FACTORIES[id];
}
