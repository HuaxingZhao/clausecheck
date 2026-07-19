/**
 * Dual-region AI provider router (CN → Qwen, GLOBAL → OpenAI).
 *
 * ## Required / optional environment variables
 *
 * | Variable | Region | How to obtain |
 * |----------|--------|----------------|
 * | `OPENAI_API_KEY` | GLOBAL (+ mini fallback) | https://platform.openai.com/api-keys |
 * | `QWEN_API_KEY` or `DASHSCOPE_API_KEY` | CN primary | 阿里云百炼 / DashScope 控制台创建 API-KEY：https://bailian.console.aliyun.com/ |
 * | `DEEPSEEK_API_KEY` | CN fallback | https://platform.deepseek.com/api_keys |
 * | `FORCE_AI_REGION` | debug | Set `CN` or `GLOBAL` to override header/IP detection (local only recommended) |
 * | `QWEN_BASE_URL` | optional | Default `https://dashscope.aliyuncs.com/compatible-mode/v1` |
 * | `DEEPSEEK_BASE_URL` | optional | Default `https://api.deepseek.com` |
 * | `OPENAI_REVIEW_MODEL` | optional | Default `gpt-4o` |
 * | `QWEN_REVIEW_MODEL` | optional | Default `qwen-plus` |
 * | `DEEPSEEK_REVIEW_MODEL` | optional | Default `deepseek-chat` |
 * | `OPENAI_FALLBACK_MODEL` | optional | Default `gpt-4o-mini` |
 * | `AI_CONTRACT_CN_UPSTREAM` | multi-region deploy | Domestic origin for next.config rewrites |
 * | `AI_CONTRACT_GLOBAL_UPSTREAM` | multi-region deploy | Overseas origin for next.config rewrites |
 *
 * Apply keys via Vercel → Settings → Environment Variables (Production/Preview), then Redeploy.
 * Never commit secrets to git.
 */

import {
  type AIProvider,
  type ReviewChunk,
  DeepSeekFallbackProvider,
  OpenAIMiniFallbackProvider,
  OpenAIProvider,
  QwenProvider,
  isRetryableProviderError,
} from "@/lib/ai/provider";

export type AiRegion = "CN" | "GLOBAL";

export function resolveForcedRegion(
  env: Partial<NodeJS.ProcessEnv> = process.env
): AiRegion | null {
  const raw = env.FORCE_AI_REGION?.trim().toUpperCase();
  if (raw === "CN" || raw === "GLOBAL") return raw;
  return null;
}

/**
 * Primary provider for region. Does not wrap fallback — use {@link getActiveProvider}.
 */
export function getPrimaryProvider(region: AiRegion): AIProvider {
  return region === "CN" ? new QwenProvider() : new OpenAIProvider();
}

export function getFallbackProvider(region: AiRegion): AIProvider {
  return region === "CN"
    ? new DeepSeekFallbackProvider()
    : new OpenAIMiniFallbackProvider();
}

/**
 * Returns a provider that tries the regional primary, then auto-falls back on
 * timeout (>30s inside provider) or 5xx / network errors.
 * CN → DeepSeek-V3；GLOBAL → GPT-4o-mini.
 */
export function getActiveProvider(region: AiRegion): AIProvider {
  const forced = resolveForcedRegion();
  const effective = forced ?? region;
  const primary = getPrimaryProvider(effective);
  const fallback = getFallbackProvider(effective);
  return new FailoverProvider(primary, fallback, effective);
}

class FailoverProvider implements AIProvider {
  readonly id: string;

  constructor(
    private readonly primary: AIProvider,
    private readonly fallback: AIProvider,
    region: AiRegion
  ) {
    this.id = `router:${region}:${primary.id}->${fallback.id}`;
  }

  async *streamReview(contract: string, lang: string): AsyncGenerator<ReviewChunk> {
    try {
      yield* this.primary.streamReview(contract, lang);
    } catch (err) {
      if (!isRetryableProviderError(err)) throw err;
      yield* this.fallback.streamReview(contract, lang);
    }
  }
}

/** Build-time / CI helper: validate env for a target region (throws MissingAiEnvError). */
export function assertAiRouterEnv(region: AiRegion): void {
  if (region === "CN") {
    getPrimaryProvider("CN");
    getFallbackProvider("CN");
  } else {
    getPrimaryProvider("GLOBAL");
    getFallbackProvider("GLOBAL");
  }
}
