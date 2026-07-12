import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  getDisclaimerText,
  parseJurisdictionParam,
  toDetectedJurisdiction,
} from "./jurisdiction";

describe("jurisdiction helpers", () => {
  it("parses overrides and maps NY to us_general", () => {
    assert.equal(parseJurisdictionParam("auto"), undefined);
    assert.equal(parseJurisdictionParam(""), undefined);
    assert.equal(parseJurisdictionParam("us_california"), "us_california");
    assert.equal(parseJurisdictionParam("us_new_york"), "us_new_york");
    assert.equal(toDetectedJurisdiction("us_new_york"), "us_general");
    assert.equal(toDetectedJurisdiction("china_prc"), "china_prc");
  });

  it("returns jurisdiction-specific disclaimer copy", () => {
    assert.match(getDisclaimerText("china_prc"), /不构成法律意见/);
    assert.match(getDisclaimerText("us_california"), /attorney-client/);
    assert.match(getDisclaimerText("england_wales"), /solicitor-client/);
    assert.match(getDisclaimerText("auto"), /informational analysis only/);
  });
});
