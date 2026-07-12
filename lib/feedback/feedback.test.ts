/**
 * Feedback helpers — hash + prompt version (offline).
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { hashContractText, normalizeContractText } from "./contract-hash";
import {
  EXPERT_PROMPT_VERSION_BASE,
  getExpertPromptVersion,
} from "./prompt-version";

describe("contract-hash", () => {
  it("normalizes whitespace before hashing", () => {
    assert.equal(normalizeContractText("a  b\n\nc"), "a b c");
  });

  it("produces stable SHA-256 hex", async () => {
    const a = await hashContractText("Hello  world");
    const b = await hashContractText("Hello world");
    assert.equal(a, b);
    assert.match(a, /^[a-f0-9]{64}$/);
  });
});

describe("prompt-version", () => {
  it("exports a non-empty base version", () => {
    assert.ok(EXPERT_PROMPT_VERSION_BASE.length > 0);
    assert.match(getExpertPromptVersion(), /^expert-v3/);
  });
});
