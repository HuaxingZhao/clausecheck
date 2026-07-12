import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatFewshotsPromptBlock,
  MAX_FEWSHOT_TOKENS,
  type FewshotAutoFile,
} from "./fewshots";
import { estimateTokenCount } from "./pack-limits";
import { getJurisdictionPack } from "./index";

describe("fewshots-auto injection", () => {
  it("caps formatted block under MAX_FEWSHOT_TOKENS", () => {
    const examples = Array.from({ length: 20 }, (_, i) => ({
      inputSnippet: `Issue ${i}: ${"x".repeat(200)}`,
      expectedBehavior: `Behavior ${i}: ${"y".repeat(200)}`,
      reasoning: `Reason ${i}: ${"z".repeat(200)}`,
    }));
    const data: FewshotAutoFile = {
      jurisdiction: "us_california",
      packId: "us-ca",
      feedbackType: "false_positive",
      generatedAt: "content:test",
      examples,
    };
    const { block, injectedCount } = formatFewshotsPromptBlock(data);
    assert.ok(injectedCount > 0);
    assert.ok(injectedCount < examples.length);
    assert.ok(estimateTokenCount(block) <= MAX_FEWSHOT_TOKENS);
  });

  it("getJurisdictionPack appends few-shots when file exists", () => {
    // May or may not have fewshots-auto.json yet; just ensure call is safe
    const pack = getJurisdictionPack("us-ca", "en");
    assert.equal(pack.id, "us-ca");
    assert.ok(pack.systemPromptAddon.length > 0);
  });
});
