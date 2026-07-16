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

  it("false when flag on but production has no cashier", () => {
    assert.equal(
      isWechatPayUiEnabled({
        NODE_ENV: "production",
        WECHAT_PAY_ENABLED: "true",
      }),
      false
    );
  });

  it("true when flag on and WECHAT_PAY_QR_BASE set", () => {
    assert.equal(
      isWechatPayUiEnabled({
        NODE_ENV: "production",
        WECHAT_PAY_ENABLED: "true",
        WECHAT_PAY_QR_BASE: "https://pay.example/qr",
      }),
      true
    );
  });

  it("true when NEXT_PUBLIC flag on and QR base set", () => {
    assert.equal(
      isWechatPayUiEnabled({
        NODE_ENV: "production",
        NEXT_PUBLIC_WECHAT_PAY_ENABLED: "true",
        WECHAT_PAY_QR_BASE: "https://pay.example/qr",
      }),
      true
    );
  });

  it("true on client when mirrored ENABLED + CONFIGURED (no QR URL in bundle)", () => {
    assert.equal(
      isWechatPayUiEnabled({
        NODE_ENV: "production",
        NEXT_PUBLIC_WECHAT_PAY_ENABLED: "true",
        NEXT_PUBLIC_WECHAT_PAY_CONFIGURED: "true",
      }),
      true
    );
  });

  it("false on client when ENABLED mirrored but cashier not configured", () => {
    assert.equal(
      isWechatPayUiEnabled({
        NODE_ENV: "production",
        NEXT_PUBLIC_WECHAT_PAY_ENABLED: "true",
        NEXT_PUBLIC_WECHAT_PAY_CONFIGURED: "false",
      }),
      false
    );
  });

  it("false for non-true flag values even with QR base", () => {
    assert.equal(
      isWechatPayUiEnabled({
        WECHAT_PAY_ENABLED: "1",
        WECHAT_PAY_QR_BASE: "https://pay.example/qr",
      }),
      false
    );
    assert.equal(
      isWechatPayUiEnabled({
        WECHAT_PAY_ENABLED: "false",
        WECHAT_PAY_QR_BASE: "https://pay.example/qr",
      }),
      false
    );
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
