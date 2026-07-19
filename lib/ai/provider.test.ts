import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeReviewChunk,
  isRetryableProviderError,
  type AIProvider,
  type ReviewChunk,
} from "./provider";
import {
  CONTRACT_REVIEW_PROMPT_CN,
  CONTRACT_REVIEW_PROMPT_GLOBAL,
  REVIEW_CHUNK_JSON_SCHEMA_INSTRUCTION,
} from "./prompts/contract-review";
import { resolveForcedRegion } from "./router";

function assertChunkShape(chunk: ReviewChunk) {
  assert.equal(typeof chunk.sectionId, "string");
  assert.ok(["HIGH", "MEDIUM", "LOW"].includes(chunk.riskLevel));
  assert.equal(typeof chunk.summary, "string");
  assert.equal(typeof chunk.suggestion, "string");
  assert.ok(chunk.summary.length > 0);
  assert.ok(chunk.suggestion.length > 0);
}

describe("ReviewChunk normalize", () => {
  it("accepts valid HIGH chunk", () => {
    const c = normalizeReviewChunk(
      {
        sectionId: "c1",
        riskLevel: "HIGH",
        summary: "Uncapped liability",
        suggestion: "Liability shall not exceed fees paid in 12 months.",
      },
      0
    );
    assert.ok(c);
    assertChunkShape(c!);
  });

  it("rejects invalid riskLevel", () => {
    assert.equal(
      normalizeReviewChunk(
        { sectionId: "x", riskLevel: "critical", summary: "a", suggestion: "b" },
        0
      ),
      null
    );
  });
});

describe("dual prompts JSON schema lockstep", () => {
  it("embeds identical schema instruction in CN and GLOBAL", () => {
    assert.ok(CONTRACT_REVIEW_PROMPT_CN.includes(REVIEW_CHUNK_JSON_SCHEMA_INSTRUCTION));
    assert.ok(
      CONTRACT_REVIEW_PROMPT_GLOBAL.includes(REVIEW_CHUNK_JSON_SCHEMA_INSTRUCTION)
    );
  });
});

describe("mocked providers yield identical ReviewChunk shape", () => {
  it("CN mock and GLOBAL mock chunks share the same fields", async () => {
    const sample: ReviewChunk = {
      sectionId: "s1",
      riskLevel: "MEDIUM",
      summary: "Auto-renewal without notice window",
      suggestion:
        "Either party may non-renew by written notice at least 30 days before term end.",
    };

    const cnMock: AIProvider = {
      id: "mock-cn",
      async *streamReview() {
        yield { ...sample };
      },
    };
    const globalMock: AIProvider = {
      id: "mock-global",
      async *streamReview() {
        yield { ...sample, sectionId: "s1" };
      },
    };

    const cnChunks: ReviewChunk[] = [];
    const globalChunks: ReviewChunk[] = [];
    for await (const c of cnMock.streamReview("contract", "zh")) cnChunks.push(c);
    for await (const c of globalMock.streamReview("contract", "en"))
      globalChunks.push(c);

    assert.equal(cnChunks.length, 1);
    assert.equal(globalChunks.length, 1);
    assertChunkShape(cnChunks[0]!);
    assertChunkShape(globalChunks[0]!);
    assert.deepEqual(Object.keys(cnChunks[0]!).sort(), Object.keys(globalChunks[0]!).sort());
  });
});

describe("FORCE_AI_REGION", () => {
  it("reads CN / GLOBAL override", () => {
    assert.equal(resolveForcedRegion({ FORCE_AI_REGION: "CN" }), "CN");
    assert.equal(resolveForcedRegion({ FORCE_AI_REGION: "global" }), "GLOBAL");
    assert.equal(resolveForcedRegion({}), null);
  });
});

describe("failover wrapper", () => {
  it("falls back when primary throws retryable 5xx", async () => {
    const primary: AIProvider = {
      id: "boom",
      async *streamReview() {
        const err = new Error("upstream 503");
        (err as { status?: number }).status = 503;
        throw err;
      },
    };
    const fallback: AIProvider = {
      id: "ok",
      async *streamReview() {
        yield {
          sectionId: "fb",
          riskLevel: "LOW",
          summary: "Fallback ok",
          suggestion: "Keep clause as-is with notice period.",
        };
      },
    };

    assert.equal(isRetryableProviderError({ status: 503 }), true);

    async function* withFailover(
      p: AIProvider,
      f: AIProvider,
      contract: string,
      lang: string
    ) {
      try {
        yield* p.streamReview(contract, lang);
      } catch (e) {
        if (!isRetryableProviderError(e)) throw e;
        yield* f.streamReview(contract, lang);
      }
    }

    const out: ReviewChunk[] = [];
    for await (const c of withFailover(primary, fallback, "x", "zh")) out.push(c);
    assert.equal(out[0]?.sectionId, "fb");
    assertChunkShape(out[0]!);
  });
});
