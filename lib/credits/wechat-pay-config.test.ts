import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { isWechatPayConfigured } from "./wechat-pay-config";

describe("isWechatPayConfigured", () => {
  it("true when WECHAT_PAY_QR_BASE is set", () => {
    assert.equal(
      isWechatPayConfigured({
        NODE_ENV: "production",
        WECHAT_PAY_QR_BASE: "https://pay.example/qr",
      }),
      true
    );
  });

  it("false in production without QR base or mock flag", () => {
    assert.equal(isWechatPayConfigured({ NODE_ENV: "production" }), false);
  });

  it("true in development via mock path", () => {
    assert.equal(isWechatPayConfigured({ NODE_ENV: "development" }), true);
  });
});
