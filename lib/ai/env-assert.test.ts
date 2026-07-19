import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { MissingAiEnvError, requireEnv } from "./provider";

describe("AI env assertion (TC-AI-05)", () => {
  it("throws with exact variable name when missing", () => {
    const key = `__MISSING_AI_VAR_${Date.now()}__`;
    delete process.env[key];
    assert.throws(
      () => requireEnv(key),
      (err: unknown) =>
        err instanceof MissingAiEnvError &&
        err.envVar === key &&
        err.message.includes(key)
    );
  });
});
