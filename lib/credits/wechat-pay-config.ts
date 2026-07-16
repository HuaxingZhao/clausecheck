import { isMockWechatPayAllowed } from "@/lib/credits/mock-pay";

/**
 * Frontend gate for WeChat Pay CTAs.
 * Requires BOTH:
 *   - WECHAT_PAY_ENABLED=true (or NEXT_PUBLIC_WECHAT_PAY_ENABLED=true), and
 *   - a real cashier (WECHAT_PAY_QR_BASE) or allowed mock path.
 * Default off — never expose wallet UI that would 503 in production.
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
  return isMockWechatPayAllowed(env);
}
