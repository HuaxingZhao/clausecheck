/**
 * Bump when expert-system-prompt / pack semantics change materially.
 * Optional git SHA from VERCEL_GIT_COMMIT_SHA or GIT_COMMIT_SHA.
 */
export const EXPERT_PROMPT_VERSION_BASE = "expert-v3-packs-20260712";

export function getExpertPromptVersion(): string {
  const sha =
    process.env.VERCEL_GIT_COMMIT_SHA ||
    process.env.GIT_COMMIT_SHA ||
    process.env.NEXT_PUBLIC_GIT_SHA ||
    "";
  const short = sha.trim().slice(0, 7);
  return short
    ? `${EXPERT_PROMPT_VERSION_BASE}+${short}`
    : EXPERT_PROMPT_VERSION_BASE;
}
