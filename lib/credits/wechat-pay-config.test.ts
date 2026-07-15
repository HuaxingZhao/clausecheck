import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  isWechatPayConfigured,
  isWechatPayUiEnabled,
} from "./wechat-pay-config";

describe("isWechatPayUiEnabled", () => {
  it("false by default", () => {
    assert.equal(isWechatPayUiEnabled({}), false);
  });

  it("true when WECHAT_PAY_ENABLED=true", () => {
    assert.equal(isWechatPayUiEnabled({ WECHAT_PAY_ENABLED: "true" }), true);
  });

  it("true when NEXT_PUBLIC_WECHAT_PAY_ENABLED=true", () => {
    assert.equal(
      isWechatPayUiEnabled({ NEXT_PUBLIC_WECHAT_PAY_ENABLED: "true" }),
      true
    );
  });

  it("false for non-true values", () => {
    assert.equal(isWechatPayUiEnabled({ WECHAT_PAY_ENABLED: "1" }), false);
    assert.equal(isWechatPayUiEnabled({ WECHAT_PAY_ENABLED: "false" }), false);
  });
});

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
