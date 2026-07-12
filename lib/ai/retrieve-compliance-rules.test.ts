/**
 * Jurisdiction isolation tests for RAG retrieval (offline).
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { retrieveComplianceRules } from "./retrieve-compliance-rules";
import { buildKnowledgeChunksForScenario } from "@/lib/rag/knowledge-chunks";

const CA_CONTRACT = `
SOFTWARE-AS-A-SERVICE AGREEMENT
Governing Law: State of California. Liability cap US$100. Uncapped indemnification.
Data transfer without SCCs. Termination for convenience.
`;

const CN_CONTRACT = `
保密协议
本协议适用中华人民共和国法律。保密期限二十年。管辖法院为披露方所在地人民法院。
违约金为合同金额十倍。
`;

describe("retrieveComplianceRules jurisdiction filter", () => {
  it("California filter excludes CN Civil Code statutes", () => {
    const out = retrieveComplianceRules(CA_CONTRACT, "tech_saas", "en", {
      jurisdiction: "us_california",
    });
    assert.equal(out.jurisdictionFilter, "US-CA");
    assert.equal(out.degraded, false);
    const blob = `${out.knowledgeBlock}\n${out.rules.map((r) => r.title).join("\n")}`;
    assert.doesNotMatch(blob, /民法典|Civil Code art|个人信息保护法/);
    assert.ok(
      out.rules.every(
        (r) =>
          !r.jurisdiction ||
          r.jurisdiction === "US-CA" ||
          r.jurisdiction === "US" ||
          r.jurisdiction === "GENERAL"
      )
    );
  });

  it("China filter excludes US-CA tagged chunks", () => {
    // Seed: ensure tech_saas CN statute is present in unfiltered pack
    const all = buildKnowledgeChunksForScenario("nda");
    assert.ok(all.some((c) => c.meta.jurisdiction === "CN"));

    const out = retrieveComplianceRules(CN_CONTRACT, "nda", "zh", {
      jurisdiction: "china_prc",
    });
    assert.equal(out.jurisdictionFilter, "CN");
    assert.ok(out.rules.some((r) => /民法典|501|保密/.test(`${r.title}${r.body}`)));
    assert.ok(
      out.rules.every(
        (r) =>
          !r.jurisdiction ||
          r.jurisdiction === "CN" ||
          r.jurisdiction === "GENERAL"
      )
    );
    assert.doesNotMatch(out.knowledgeBlock, /\[US-CA\]|CPRA|CCPA/);
  });

  it("auto/omitted filter logs warning path and does not throw", () => {
    const warnings: string[] = [];
    const orig = console.warn;
    console.warn = (...args: unknown[]) => {
      warnings.push(String(args[0] ?? ""));
    };
    try {
      const out = retrieveComplianceRules(CA_CONTRACT, "tech_saas", "en", {});
      assert.equal(out.jurisdictionFilter, null);
      assert.ok(out.rules.length >= 1);
      assert.ok(warnings.some((w) => /no jurisdiction filter/i.test(w)));
    } finally {
      console.warn = orig;
    }
  });

  it("never returns UNKNOWN jurisdiction chunks", () => {
    const out = retrieveComplianceRules(CA_CONTRACT, "tech_saas", "en", {
      jurisdiction: "auto",
    });
    assert.ok(out.rules.every((r) => r.jurisdiction !== "UNKNOWN"));
  });
});
