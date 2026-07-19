import type { NextRequest } from "next/server";
import { resolveForcedRegion, type AiRegion } from "@/lib/ai/router";

/**
 * Resolve CN vs GLOBAL for dual-model routing.
 *
 * FIXME — 确认生产环境区域识别数据源（Cloudflare Header / 自建 IP 库）并提供配置示例：
 *
 * Cloudflare（推荐，若站前有 CF）：
 *   - 信任请求头 `CF-IPCountry`（如 `CN`）
 *   - Dashboard → Rules 可附加自定义头 `X-User-Region: CN|GLOBAL`
 *
 * Vercel：
 *   - `x-vercel-ip-country`（平台注入）
 *
 * 客户端显式声明（调试 / App）：
 *   - `X-User-Region: CN` 或 `GLOBAL`
 *
 * 强制覆盖（本地）：
 *   - `FORCE_AI_REGION=CN|GLOBAL`
 *
 * 示例（Cloudflare Transform Rule）：
 *   If `ip.geoip.country eq "CN"` → Set static header `X-User-Region` = `CN`
 *   Else → `X-User-Region` = `GLOBAL`
 */
export function resolveAiRegion(req: NextRequest): AiRegion {
  const forced = resolveForcedRegion();
  if (forced) return forced;

  const header = req.headers.get("x-user-region")?.trim().toUpperCase();
  if (header === "CN" || header === "GLOBAL") return header;

  const cf = req.headers.get("cf-ipcountry")?.trim().toUpperCase();
  if (cf === "CN") return "CN";

  const vercelCountry = req.headers.get("x-vercel-ip-country")?.trim().toUpperCase();
  if (vercelCountry === "CN") return "CN";

  return "GLOBAL";
}
