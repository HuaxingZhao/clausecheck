import { isMockWechatPayAllowed } from "@/lib/credits/mock-pay";

/**
 * Frontend gate for WeChat Pay CTAs.
 * Default off — set WECHAT_PAY_ENABLED=true (mirrored to NEXT_PUBLIC_ via next.config)
 * or NEXT_PUBLIC_WECHAT_PAY_ENABLED=true to show WeChat / wallet notes again.
 * API topup stays available; this only controls UI so users never hit 503.
 */
export function isWechatPayUiEnabled(
  env: Partial<NodeJS.ProcessEnv> = process.env
): boolean {
  return (
    env.NEXT_PUBLIC_WECHAT_PAY_ENABLED === "true" ||
    env.WECHAT_PAY_ENABLED === "true"
  );
}

/** True when production/dev can actually open a WeChat cashier URL. */
export function isWechatPayConfigured(
  env: NodeJS.ProcessEnv = process.env
): boolean {
  if (env.WECHAT_PAY_QR_BASE?.trim()) return true;
  return isMockWechatPayAllowed(env);
}
