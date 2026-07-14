import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  generateRevisionDocx,
  estimateRevisionDocxBytes,
  RevisionDocxExportError,
  REVISION_DOCX_MAX_BYTES,
} from "./generateRevisionDocx";
import type { ContractChange } from "./types";

function minimalChange(overrides: Partial<ContractChange> = {}): ContractChange {
  return {
    original: "甲方应在 30 个自然日内付款。",
    revised: "甲方应在 60 个自然日内付款。",
    reason: "延长付款期限",
    section: "付款",
    ...overrides,
  };
}

describe("generateRevisionDocx", () => {
  it("exports a valid DOCX for empty changes list", async () => {
    const contractText = "本合同由甲乙双方签署。";
    const result = await generateRevisionDocx({
      contractText,
      changes: [],
      locale: "zh",
    });

    assert.ok(result.bytes.byteLength > 1000);
    assert.equal(result.prepared.length, 0);
    assert.equal(result.appliedCount, 0);
    assert.equal(result.bytes[0], 0x50); // PK zip header 'P'
    assert.equal(result.bytes[1], 0x4b);
  });

  it("handles ~80k character contract without exceeding size estimate", async () => {
    const paragraph =
      "第{{n}}条 双方确认，就合同履行过程中的通知、交付、验收及争议解决事项，应遵循诚实信用原则，并在约定期限内完成相应义务。";
    const repeats = Math.ceil(80_000 / paragraph.length);
    const contractText = Array.from({ length: repeats }, (_, i) =>
      paragraph.replace("{{n}}", String(i + 1))
    ).join("\n\n");

    assert.ok(contractText.length >= 80_000);

    const changes: ContractChange[] = [
      minimalChange({
        original: contractText.slice(0, 40),
        revised: contractText.slice(0, 40).replace("30", "45"),
      }),
    ];

    const estimate = estimateRevisionDocxBytes({ contractText, changes });
    assert.ok(estimate < REVISION_DOCX_MAX_BYTES);

    const result = await generateRevisionDocx({
      contractText,
      changes,
      locale: "zh",
      timeoutMs: 60_000,
    });

    assert.ok(result.bytes.byteLength > 10_000);
    assert.ok(result.bytes.byteLength < REVISION_DOCX_MAX_BYTES);
    assert.ok(result.prepared.length >= 1);
  });

  it("rejects corrupted changes without throwing unhandled errors", async () => {
    const contractText = "有效合同正文。";
    const corrupted = [
      {
        id: "bad",
        original: "x",
        revised: "y",
        reason: "z",
        // locatable getter throws when accessed by prepare pipeline
        get section() {
          throw new Error("corrupt change payload");
        },
      },
    ] as unknown as ContractChange[];

    await assert.rejects(
      () =>
        generateRevisionDocx({
          contractText,
          changes: corrupted,
          locale: "zh",
        }),
      (err: unknown) => {
        assert.ok(err instanceof RevisionDocxExportError);
        assert.equal(err.code, "INVALID_INPUT");
        return true;
      }
    );
  });

  it("rejects when pre-export size estimate exceeds limit", async () => {
    const huge = "字".repeat(30_000_000);
    await assert.rejects(
      () =>
        generateRevisionDocx({
          contractText: huge,
          changes: [minimalChange()],
          maxBytes: REVISION_DOCX_MAX_BYTES,
        }),
      (err: unknown) => {
        assert.ok(err instanceof RevisionDocxExportError);
        assert.equal(err.code, "SIZE_ESTIMATE_EXCEEDED");
        return true;
      }
    );
  });
});
