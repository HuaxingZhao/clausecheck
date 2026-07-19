import OpenAI from "openai";
import {
  CONTRACT_REVIEW_PROMPT_CN,
  CONTRACT_REVIEW_PROMPT_GLOBAL,
} from "@/lib/ai/prompts/contract-review";

export type RiskLevel = "HIGH" | "MEDIUM" | "LOW";

/** Fixed streaming chunk contract — must stay identical across all providers. */
export interface ReviewChunk {
  sectionId: string;
  riskLevel: RiskLevel;
  summary: string;
  suggestion: string;
}

export interface AIProvider {
  readonly id: string;
  streamReview(contract: string, lang: string): AsyncGenerator<ReviewChunk>;
}

export class MissingAiEnvError extends Error {
  constructor(public readonly envVar: string) {
    super(`Missing required environment variable: ${envVar}`);
    this.name = "MissingAiEnvError";
  }
}

export function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new MissingAiEnvError(name);
  return value;
}

const RISK_LEVELS = new Set<RiskLevel>(["HIGH", "MEDIUM", "LOW"]);

export function normalizeReviewChunk(raw: unknown, index: number): ReviewChunk | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const risk = String(o.riskLevel ?? "").toUpperCase() as RiskLevel;
  if (!RISK_LEVELS.has(risk)) return null;
  const summary = String(o.summary ?? "").trim();
  const suggestion = String(o.suggestion ?? "").trim();
  if (!summary || !suggestion) return null;
  return {
    sectionId: String(o.sectionId ?? `section-${index + 1}`),
    riskLevel: risk,
    summary,
    suggestion,
  };
}

function injectLang(template: string, lang: string): string {
  return template.replace(/\$\{lang\}/g, lang || "").replace(/\{\{LANG\}\}/g, lang || "");
}

async function* streamChatJsonChunks(opts: {
  client: OpenAI;
  model: string;
  system: string;
  contract: string;
  timeoutMs: number;
}): AsyncGenerator<ReviewChunk> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs);
  try {
    const stream = await opts.client.chat.completions.create(
      {
        model: opts.model,
        temperature: 0.2,
        stream: true,
        messages: [
          { role: "system", content: opts.system },
          {
            role: "user",
            content: `CONTRACT TEXT:\n\n${opts.contract.slice(0, 120_000)}`,
          },
        ],
      },
      { signal: controller.signal }
    );

    let buffer = "";
    for await (const part of stream) {
      buffer += part.choices[0]?.delta?.content ?? "";
    }

    const jsonText = extractJsonArray(buffer);
    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      yield {
        sectionId: "parse-error",
        riskLevel: "MEDIUM",
        summary: "Model returned non-JSON output; partial parse failed.",
        suggestion:
          "Please retry the review. If this persists, contact support@clausecheck.cc.",
      };
      return;
    }

    const items = Array.isArray(parsed) ? parsed : [parsed];
    let i = 0;
    for (const item of items) {
      const chunk = normalizeReviewChunk(item, i);
      if (chunk) {
        yield chunk;
        i += 1;
      }
    }
    if (i === 0) {
      yield {
        sectionId: "empty",
        riskLevel: "LOW",
        summary: "No structured risk chunks were returned.",
        suggestion: "Re-run with a clearer contract excerpt or different scenario.",
      };
    }
  } finally {
    clearTimeout(timer);
  }
}

function extractJsonArray(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = (fenced?.[1] ?? trimmed).trim();
  const start = body.indexOf("[");
  const end = body.lastIndexOf("]");
  if (start >= 0 && end > start) return body.slice(start, end + 1);
  return body;
}

/**
 * TODO — OpenAI GPT (GLOBAL primary)
 * - API docs: https://platform.openai.com/docs/api-reference/chat
 * - Key: https://platform.openai.com/api-keys → create secret key → set OPENAI_API_KEY in Vercel
 * - Rate limits: tier-based RPM/TPM — https://platform.openai.com/docs/guides/rate-limits
 * - Billing: https://platform.openai.com/settings/organization/billing
 */
export class OpenAIProvider implements AIProvider {
  readonly id = "openai";
  private readonly client: OpenAI;
  private readonly model: string;

  constructor(model = process.env.OPENAI_REVIEW_MODEL?.trim() || "gpt-4o") {
    this.client = new OpenAI({ apiKey: requireEnv("OPENAI_API_KEY") });
    this.model = model;
  }

  async *streamReview(contract: string, lang: string): AsyncGenerator<ReviewChunk> {
    yield* streamChatJsonChunks({
      client: this.client,
      model: this.model,
      system: injectLang(CONTRACT_REVIEW_PROMPT_GLOBAL, lang),
      contract,
      timeoutMs: 30_000,
    });
  }
}

/**
 * TODO — 通义千问 Qwen (CN primary via DashScope compatible mode)
 * - API docs: https://help.aliyun.com/zh/model-studio/developer-reference/compatibility-of-openai-with-dashscope
 * - Key: 阿里云百炼 / DashScope 控制台创建 API-KEY → 设置 QWEN_API_KEY（或 DASHSCOPE_API_KEY）
 * - Rate limits: 以阿里云控制台配额为准；超限返回 429
 * - Billing: 按 token 计费，见百炼计费说明 https://help.aliyun.com/zh/model-studio/billing-for-model-studio
 */
export class QwenProvider implements AIProvider {
  readonly id = "qwen";
  private readonly client: OpenAI;
  private readonly model: string;

  constructor(model = process.env.QWEN_REVIEW_MODEL?.trim() || "qwen-plus") {
    const apiKey =
      process.env.QWEN_API_KEY?.trim() || process.env.DASHSCOPE_API_KEY?.trim();
    if (!apiKey) {
      throw new MissingAiEnvError("QWEN_API_KEY");
    }
    const baseURL =
      process.env.QWEN_BASE_URL?.trim() ||
      "https://dashscope.aliyuncs.com/compatible-mode/v1";
    this.client = new OpenAI({ apiKey, baseURL });
    this.model = model;
  }

  async *streamReview(contract: string, lang: string): AsyncGenerator<ReviewChunk> {
    yield* streamChatJsonChunks({
      client: this.client,
      model: this.model,
      system: injectLang(CONTRACT_REVIEW_PROMPT_CN, lang),
      contract,
      timeoutMs: 30_000,
    });
  }
}

/**
 * TODO — DeepSeek-V3 (CN fallback)
 * - API docs: https://api-docs.deepseek.com/
 * - Key: https://platform.deepseek.com/api_keys → set DEEPSEEK_API_KEY
 * - Rate limits: platform quota; see dashboard
 * - Billing: https://platform.deepseek.com/usage
 *
 * Also used pattern for GLOBAL mini fallback via OpenAI gpt-4o-mini (see router).
 */
export class DeepSeekFallbackProvider implements AIProvider {
  readonly id = "deepseek-fallback";
  private readonly client: OpenAI;
  private readonly model: string;

  constructor(model = process.env.DEEPSEEK_REVIEW_MODEL?.trim() || "deepseek-chat") {
    this.client = new OpenAI({
      apiKey: requireEnv("DEEPSEEK_API_KEY"),
      baseURL: process.env.DEEPSEEK_BASE_URL?.trim() || "https://api.deepseek.com",
    });
    this.model = model;
  }

  async *streamReview(contract: string, lang: string): AsyncGenerator<ReviewChunk> {
    yield* streamChatJsonChunks({
      client: this.client,
      model: this.model,
      system: injectLang(CONTRACT_REVIEW_PROMPT_CN, lang),
      contract,
      timeoutMs: 30_000,
    });
  }
}

/** GLOBAL timeout/5xx fallback — keeps GPT family, uses gpt-4o-mini. */
export class OpenAIMiniFallbackProvider implements AIProvider {
  readonly id = "openai-mini-fallback";
  private readonly inner: OpenAIProvider;

  constructor() {
    this.inner = new OpenAIProvider(
      process.env.OPENAI_FALLBACK_MODEL?.trim() || "gpt-4o-mini"
    );
  }

  async *streamReview(contract: string, lang: string): AsyncGenerator<ReviewChunk> {
    yield* this.inner.streamReview(contract, lang);
  }
}

export function isRetryableProviderError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as { status?: number; statusCode?: number; name?: string; code?: string };
  if (e.name === "AbortError" || e.code === "ABORT_ERR") return true;
  const status = e.status ?? e.statusCode;
  if (typeof status === "number" && status >= 500) return true;
  const msg = err instanceof Error ? err.message : String(err);
  return /timeout|ETIMEDOUT|ECONNRESET|5\d\d/i.test(msg);
}
