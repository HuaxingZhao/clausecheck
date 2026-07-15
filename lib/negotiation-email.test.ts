import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildNegotiationEmail } from "./negotiation-email";
import { getAiDisclaimerExport } from "./ai-disclaimer";
import type { ScanResult } from "./types";

const baseResult = {
  signingRecommendation: "sign_with_changes",
  signingRationale: "Need payment terms fix",
  flags: [],
  negotiations: [],
  missingClauses: [],
  summary: "",
} as unknown as ScanResult;

describe("buildNegotiationEmail disclaimer", () => {
  it("appends zh AI disclaimer at the end", () => {
    const email = buildNegotiationEmail({
      result: baseResult,
      changes: [
        {
          section: "付款",
          original: "30 日",
          revised: "60 日",
          reason: "延长付款期",
        },
      ],
      acceptedItems: [],
      locale: "zh",
      fileName: "nda.docx",
    });
    const disclaimer = getAiDisclaimerExport("zh");
    assert.ok(email.endsWith(disclaimer));
    assert.ok(email.includes("---\n" + disclaimer));
  });

  it("appends en AI disclaimer at the end", () => {
    const email = buildNegotiationEmail({
      result: baseResult,
      changes: [
        {
          section: "Payment",
          original: "30 days",
          revised: "60 days",
          reason: "Extend payment window",
        },
      ],
      acceptedItems: [],
      locale: "en",
    });
    const disclaimer = getAiDisclaimerExport("en");
    assert.ok(email.endsWith(disclaimer));
    assert.match(email, /does not constitute legal advice/i);
  });
});
