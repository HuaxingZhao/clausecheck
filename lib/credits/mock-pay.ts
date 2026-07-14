/**
 * Dev/demo WeChat mock cashier (`/api/webhooks/payment/mock-qr`).
 * Disabled in production unless ALLOW_MOCK_WECHAT_PAY=1 (never enable for real traffic).
 */
export function isMockWechatPayAllowed(
  env: NodeJS.ProcessEnv = process.env
): boolean {
  if (env.ALLOW_MOCK_WECHAT_PAY === "1") return true;
  return env.NODE_ENV !== "production";
}
