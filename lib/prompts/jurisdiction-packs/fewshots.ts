/**
 * Format auto few-shots into a prompt block (token-capped).
 */

import { readFileSync, existsSync } from "fs";
import path from "path";
import {
  estimateTokenCount,
  MAX_PACK_ADDON_TOKENS,
} from "@/lib/prompts/jurisdiction-packs/pack-limits";

export const MAX_FEWSHOT_TOKENS = 800;

export interface FewshotExample {
  inputSnippet: string;
  expectedBehavior: string;
  reasoning: string;
}

export interface FewshotAutoFile {
  jurisdiction: string;
  packId: string;
  feedbackType: string;
  generatedAt: string;
  examples: FewshotExample[];
}

export function fewshotsAutoPath(packId: string): string {
  return path.join(
    process.cwd(),
    "lib/prompts/jurisdiction-packs/packs",
    packId,
    "fewshots-auto.json"
  );
}

export function loadFewshotsAuto(packId: string): FewshotAutoFile | null {
  const p = fewshotsAutoPath(packId);
  if (!existsSync(p)) return null;
  try {
    return JSON.parse(readFileSync(p, "utf8")) as FewshotAutoFile;
  } catch {
    return null;
  }
}

/** Deterministic format; trims examples to stay under MAX_FEWSHOT_TOKENS. */
export function formatFewshotsPromptBlock(
  data: FewshotAutoFile
): { block: string; injectedCount: number } {
  const header = `## Learned from User Feedback
(Auto-extracted from ${data.feedbackType} signals for ${data.jurisdiction} / pack ${data.packId}. Decision support only — not legal advice.)
`;
  const parts: string[] = [];
  let used = estimateTokenCount(header);
  let injected = 0;

  for (let i = 0; i < data.examples.length; i++) {
    const ex = data.examples[i];
    const piece = `
### Example ${i + 1}
Q (issue observed): ${ex.inputSnippet}
A (expected behavior): ${ex.expectedBehavior}
Why: ${ex.reasoning}
`;
    const t = estimateTokenCount(piece);
    if (used + t > MAX_FEWSHOT_TOKENS) break;
    parts.push(piece);
    used += t;
    injected += 1;
  }

  if (injected === 0) {
    return { block: "", injectedCount: 0 };
  }

  return {
    block: `${header}${parts.join("")}`,
    injectedCount: injected,
  };
}

/** Soft cap reminder — few-shots share budget with pack addon overall soft limit. */
export function assertFewshotBudget(block: string): void {
  const tokens = estimateTokenCount(block);
  if (tokens > MAX_FEWSHOT_TOKENS) {
    throw new Error(
      `Few-shot block ${tokens} tokens exceeds ${MAX_FEWSHOT_TOKENS}`
    );
  }
  // Keep room under pack addon ceiling when combined elsewhere
  if (tokens > MAX_PACK_ADDON_TOKENS) {
    throw new Error("Few-shot block exceeds pack addon ceiling");
  }
}
