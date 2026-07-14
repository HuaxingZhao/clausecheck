import { isMockWechatPayAllowed } from "@/lib/credits/mock-pay";

/** True when production/dev can actually open a WeChat cashier URL. */
export function isWechatPayConfigured(
  env: NodeJS.ProcessEnv = process.env
): boolean {
  if (env.WECHAT_PAY_QR_BASE?.trim()) return true;
  return isMockWechatPayAllowed(env);
}
