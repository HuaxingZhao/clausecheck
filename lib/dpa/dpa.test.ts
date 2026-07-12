/**
 * DPA detect + preview gating (offline).
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isDpaMissingClause,
  isDpaMissingFlag,
  scanHasMissingDpa,
} from "./detect-dpa";
import { buildDpaPreview, generateDpaDraftStub } from "./generate-dpa";
import {
  buildDpaGeneratorSystemPrompt,
  buildDpaGeneratorUserPrompt,
} from "@/lib/prompts/dpa-generator";

describe("detect DPA", () => {
  it("detects missingClause type dpa and name heuristics", () => {
    assert.equal(
      isDpaMissingClause({
        name: "Data Processing Agreement (DPA)",
        importance: "Required for personal data",
        suggestion: "Attach a DPA",
        type: "dpa",
      }),
      true
    );
    assert.equal(
      isDpaMissingClause({
        name: "Severability",
        importance: "Boilerplate",
        suggestion: "Add severability",
      }),
      false
    );
  });

  it("detects MISSING_DPA flag code", () => {
    assert.equal(
      isDpaMissingFlag({
        icon: "⚠️",
        text: "No standalone DPA",
        suggestion: "Add DPA",
        code: "MISSING_DPA",
      }),
      true
    );
  });

  it("scanHasMissingDpa on result", () => {
    assert.equal(
      scanHasMissingDpa({
        scoreNum: 70,
        scoreText: "高风险",
        flags: [],
        summary: "",
        missingClauses: [
          {
            name: "缺少独立 DPA 附件",
            importance: "数据处理",
            suggestion: "补充 DPA",
          },
        ],
      }),
      true
    );
  });
});

describe("DPA preview gating", () => {
  it("locks fullContent for free preview (~30%)", () => {
    const stub = generateDpaDraftStub(
      {
        jurisdiction: "us_california",
        dataCategories: ["PII"],
        processingPurpose: "SaaS",
        controllerName: "Acme",
        processorName: "Vendor",
        locale: "en",
      },
      false
    );
    assert.equal(stub.fullContent, "");
    assert.match(stub.preview, /Full document available for Pro/);
    assert.ok(stub.watermarkText.length > 0);
    assert.ok(stub.preview.includes("🔒"));
    assert.match(stub.preview, /Disclaimer|qualified counsel|Scope/i);
  });

  it("unlocks full content for Pro", () => {
    const stub = generateDpaDraftStub(
      {
        jurisdiction: "eu_gdpr",
        dataCategories: ["PII"],
        processingPurpose: "Hosting",
        controllerName: "Ctrl",
        processorName: "Proc",
        locale: "en",
      },
      true
    );
    assert.ok(stub.fullContent.length > 500);
    assert.equal(stub.watermarkText, "");
    assert.match(stub.fullContent, /\[TO BE NEGOTIATED\]/);
    assert.match(stub.fullContent, /qualified counsel/);
  });

  it("buildDpaPreview respects ratio", () => {
    const full = "A".repeat(1000) + "\n\n## Disclaimer\n\nAI-generated draft. Review by qualified counsel before use.\n";
    const free = buildDpaPreview(full, false);
    assert.ok(free.preview.length < full.length);
    assert.equal(free.fullContent, "");
  });
});

describe("DPA generator prompt", () => {
  it("includes jurisdiction-specific legal framework and placeholders", () => {
    const sys = buildDpaGeneratorSystemPrompt("en");
    assert.match(sys, /not legal advice/i);
    const user = buildDpaGeneratorUserPrompt({
      jurisdiction: "us_california",
      dataCategories: ["Customer PII"],
      processingPurpose: "Analytics",
      controllerName: "Buyer Co",
      processorName: "CloudForge",
      locale: "en",
    });
    assert.match(user, /1798\.140\(j\)|CPRA/);
    assert.match(user, /Buyer Co/);
    assert.match(user, /TO BE NEGOTIATED|qualified counsel/);
  });
});
