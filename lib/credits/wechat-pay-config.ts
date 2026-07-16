import { isMockWechatPayAllowed } from "@/lib/credits/mock-pay";

/**
 * Frontend gate for independent WeChat merchant / top-up CTAs.
 * Requires BOTH:
 *   - WECHAT_PAY_ENABLED=true (or NEXT_PUBLIC_WECHAT_PAY_ENABLED=true), and
 *   - a real cashier (WECHAT_PAY_QR_BASE / NEXT_PUBLIC_WECHAT_PAY_CONFIGURED) or allowed mock.
 * Default off — never expose wallet UI that would 503 via /api/credits/topup.
 * Stripe Payment Element WeChat (CNY prepaid) is separate and unaffected.
 */
export function isWechatPayUiEnabled(
  env: Partial<NodeJS.ProcessEnv> = process.env
): boolean {
  const flagOn =
    env.NEXT_PUBLIC_WECHAT_PAY_ENABLED === "true" ||
    env.WECHAT_PAY_ENABLED === "true";
  if (!flagOn) return false;
  return isWechatPayConfigured(env as NodeJS.ProcessEnv);
}

/** True when production/dev can actually open a WeChat cashier URL. */
export function isWechatPayConfigured(
  env: NodeJS.ProcessEnv = process.env
): boolean {
  if (env.WECHAT_PAY_QR_BASE?.trim()) return true;
  // Client bundles only see the mirrored boolean (never the QR URL).
  if (env.NEXT_PUBLIC_WECHAT_PAY_CONFIGURED === "true") return true;
  return isMockWechatPayAllowed(env);
}
