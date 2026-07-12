/**
 * Unit tests: Base + Jurisdiction Pack isolation.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import {
  buildExpertBasePrompt,
  buildExpertSystemPrompt,
  buildExpertSystemPromptDetailed,
} from "@/lib/ai/expert-system-prompt";
import {
  detectPackIdFromText,
  resolveJurisdictionPack,
} from "@/lib/prompts/jurisdiction-packs";

const NDA_ZH = join(process.cwd(), "fixtures/contracts/nda-risky-zh.txt");
const SAAS_CA = join(process.cwd(), "fixtures/contracts/saas-ca-risky-en.txt");

describe("jurisdiction pack resolve", () => {
  it("heuristic detects China NDA as cn", () => {
    const text = readFileSync(NDA_ZH, "utf8");
    assert.equal(detectPackIdFromText(text), "cn");
    const r = resolveJurisdictionPack({ locale: "zh", contractText: text });
    assert.equal(r.pack.id, "cn");
    assert.equal(r.source, "heuristic");
  });

  it("heuristic detects California SaaS as us-ca", () => {
    const text = readFileSync(SAAS_CA, "utf8");
    assert.equal(detectPackIdFromText(text), "us-ca");
  });

  it("override beats heuristic", () => {
    const text = readFileSync(SAAS_CA, "utf8");
    const r = resolveJurisdictionPack({
      locale: "en",
      jurisdiction: "china_prc",
      contractText: text,
    });
    assert.equal(r.pack.id, "cn");
    assert.equal(r.source, "override");
  });
});

describe("expert prompt Base + Pack isolation", () => {
  it("California pack excludes PRC Civil Code whitelist articles", () => {
    const text = readFileSync(SAAS_CA, "utf8");
    const { prompt, pack } = buildExpertSystemPromptDetailed({
      locale: "en",
      jurisdiction: "us_california",
      contractText: text,
    });
    assert.equal(pack.id, "us-ca");
    assert.match(prompt, /Jurisdiction Pack: us-ca|Loaded Jurisdiction Pack/);
    assert.match(prompt, /CPRA/);
    assert.match(prompt, /Under general principles of \[Jurisdiction\] contract law/);
    assert.match(prompt, /Severability/);
    assert.doesNotMatch(prompt, /第501条/);
    assert.doesNotMatch(prompt, /Arts\. 501/);
    assert.doesNotMatch(prompt, /民事诉讼法/);
  });

  it("China pack excludes CPRA / common-law mandatory boilerplate E", () => {
    const text = readFileSync(NDA_ZH, "utf8");
    const { prompt, pack } = buildExpertSystemPromptDetailed({
      locale: "zh",
      jurisdiction: "china_prc",
      contractText: text,
    });
    assert.equal(pack.id, "cn");
    assert.match(prompt, /第501条/);
    assert.match(prompt, /民事诉讼法/);
    assert.doesNotMatch(prompt, /CPRA/);
    assert.doesNotMatch(prompt, /Boilerplate Completeness — \*\*强制输出\*\*/);
    assert.doesNotMatch(prompt, /Signing Recommendation calibration/);
  });

  it("auto/heuristic China text loads cn without US-CA focus", () => {
    const text = readFileSync(NDA_ZH, "utf8");
    const prompt = buildExpertSystemPrompt({
      locale: "zh",
      contractText: text,
    });
    assert.match(prompt, /Jurisdiction Pack: cn|已加载 Jurisdiction Pack[\s\S]*cn/);
    assert.doesNotMatch(prompt, /Jurisdiction Pack: us-ca/);
  });

  it("base alone has no Civil Code whitelist or CPRA", () => {
    const base = buildExpertBasePrompt("en", false);
    assert.doesNotMatch(base, /第501条|Arts\. 501/);
    assert.doesNotMatch(base, /CPRA/);
    assert.match(base, /Apply ONLY the Jurisdiction Pack loaded below/);
  });
});
