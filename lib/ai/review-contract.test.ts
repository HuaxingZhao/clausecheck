/**
 * Unit tests for expert prompt + RAG retrieval (no OpenAI network).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import {
  buildExpertSystemPrompt,
  buildExpertSystemPromptDetailed,
} from "./expert-system-prompt";
import { retrieveComplianceRules } from "./retrieve-compliance-rules";
import {
  assembleReviewSystemPrompt,
  buildReviewMessagesPreview,
} from "./review-contract";

const FIXTURE = join(process.cwd(), "fixtures/contracts/nda-risky-zh.txt");

describe("expert system prompt", () => {
  it("embeds senior counsel persona and loads China pack for PRC NDA", () => {
    const text = readFileSync(FIXTURE, "utf8");
    const { prompt, pack } = buildExpertSystemPromptDetailed({
      locale: "zh",
      deep: false,
      contractText: text,
    });
    assert.equal(pack.id, "cn");
    assert.match(prompt, /20 年/);
    assert.match(prompt, /资深非诉律师/);
    assert.match(prompt, /Jurisdiction Detection|detectedJurisdiction/);
    assert.match(prompt, /第501条/);
    assert.match(prompt, /民事诉讼法/);
    assert.match(prompt, /禁止以「建议」/);
    assert.match(prompt, /"flags"/);
    assert.match(prompt, /不构成法律意见/);
    assert.doesNotMatch(prompt, /CPRA/);
  });

  it("EN California override loads us-ca pack without PRC whitelist", () => {
    const prompt = buildExpertSystemPrompt({
      locale: "en",
      deep: false,
      jurisdiction: "us_california",
    });
    assert.match(prompt, /Jurisdiction Pack: us-ca|Loaded Jurisdiction Pack/);
    assert.match(prompt, /riskRationale/);
    assert.match(prompt, /Under general principles of \[Jurisdiction\] contract law/);
    assert.match(prompt, /Limitation of Liability Cap/);
    assert.match(prompt, /us_california/);
    assert.doesNotMatch(prompt, /第501条/);
  });

  it("deep mode raises flag minimum guidance", () => {
    const prompt = buildExpertSystemPrompt({
      locale: "zh",
      deep: true,
      jurisdiction: "china_prc",
    });
    assert.match(prompt, /至少 10 个 flags/);
  });
});

describe("retrieveComplianceRules (NDA fixture)", () => {
  const text = readFileSync(FIXTURE, "utf8");

  it("returns NDA mandatory checks and statutes", () => {
    const retrieval = retrieveComplianceRules(text, "nda", "zh");
    assert.equal(retrieval.scenarioId, "nda");
    assert.ok(retrieval.mandatoryChecks.length >= 4);
    assert.ok(retrieval.rules.some((r) => r.kind === "statute"));
    assert.ok(
      retrieval.knowledgeBlock.includes("场景专业知识库") ||
        retrieval.knowledgeBlock.includes("必查")
    );
  });

  it("ranks confidentiality / jurisdiction related rules", () => {
    const retrieval = retrieveComplianceRules(text, "nda", "zh");
    const blob = retrieval.rules.map((r) => `${r.title} ${r.body}`).join("\n");
    assert.match(blob, /保密|管辖|期限/);
  });
});

describe("assembleReviewSystemPrompt", () => {
  it("combines persona, China pack, scenario overlay, and RAG block", () => {
    const text = readFileSync(FIXTURE, "utf8");
    const { systemPrompt, retrieval, pack } = assembleReviewSystemPrompt(text, {
      locale: "zh",
      scenarioId: "nda",
    });
    assert.equal(retrieval.scenarioId, "nda");
    assert.equal(pack.id, "cn");
    assert.match(systemPrompt, /NDA|保密/);
    assert.match(systemPrompt, /资深非诉律师/);
    assert.ok(systemPrompt.length > 800);
  });
});

describe("buildReviewMessagesPreview", () => {
  it("produces system+user messages with clause index for the NDA fixture", () => {
    const text = readFileSync(FIXTURE, "utf8");
    const preview = buildReviewMessagesPreview(text, {
      locale: "zh",
      scenarioId: "nda",
    });
    assert.match(preview.system, /legalBasis|法律依据/);
    assert.match(preview.user, /合同原文/);
    assert.match(preview.user, /CLAUSE INDEX/);
    assert.match(preview.user, /二十|20|管辖|违约金/);
  });
});
