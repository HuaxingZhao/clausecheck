import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { isMockWechatPayAllowed } from "./mock-pay";

describe("isMockWechatPayAllowed", () => {
  it("allows mock outside production", () => {
    assert.equal(isMockWechatPayAllowed({ NODE_ENV: "development" }), true);
  });

  it("blocks mock in production by default", () => {
    assert.equal(isMockWechatPayAllowed({ NODE_ENV: "production" }), false);
  });

  it("allows mock in production only with ALLOW_MOCK_WECHAT_PAY=1", () => {
    assert.equal(
      isMockWechatPayAllowed({
        NODE_ENV: "production",
        ALLOW_MOCK_WECHAT_PAY: "1",
      }),
      true
    );
  });
});
