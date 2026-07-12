import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { asciiSafeUploadName } from "./upload-safe";

describe("asciiSafeUploadName", () => {
  it("preserves simple ascii names", () => {
    assert.equal(asciiSafeUploadName("contract.pdf"), "contract.pdf");
  });

  it("sanitizes CJK filenames for Safari FormData", () => {
    const out = asciiSafeUploadName("股份代持协议.pdf");
    assert.match(out, /^[A-Za-z0-9._-]+\.pdf$/);
    assert.ok(out.endsWith(".pdf"));
  });
});
