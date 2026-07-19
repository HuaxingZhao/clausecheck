import createNextIntlPlugin from "next-intl/plugin";
import { withSentryConfig } from "@sentry/nextjs";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const monitoringOn =
  process.env.MONITORING_ENABLED === "true" ||
  (process.env.NODE_ENV === "production" && !!process.env.SENTRY_DSN);

/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_SENTRY_DSN: process.env.SENTRY_DSN ?? "",
    NEXT_PUBLIC_MONITORING_ENABLED: monitoringOn ? "true" : "false",
    NEXT_PUBLIC_SENTRY_ENVIRONMENT:
      process.env.SENTRY_ENVIRONMENT || process.env.VERCEL_ENV || process.env.NODE_ENV || "development",
    // Mirror server flags so client pricing UI can gate WeChat CTAs without leaking QR URLs.
    NEXT_PUBLIC_WECHAT_PAY_ENABLED:
      process.env.NEXT_PUBLIC_WECHAT_PAY_ENABLED === "true" ||
      process.env.WECHAT_PAY_ENABLED === "true"
        ? "true"
        : "false",
    NEXT_PUBLIC_WECHAT_PAY_CONFIGURED:
      Boolean(process.env.WECHAT_PAY_QR_BASE?.trim()) ||
      process.env.ALLOW_MOCK_WECHAT_PAY === "1"
        ? "true"
        : "false",
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "3mb",
    },
    serverComponentsExternalPackages: ["pdf-parse"],
    optimizePackageImports: ["openai"],
    instrumentationHook: true,
  },
  poweredByHeader: false,
  /**
   * Dual-region contract API upstream split (optional multi-origin deploy).
   *
   * TODO — 替换占位符为实际国内/海外服务器域名，并附 DNS 智能解析配置指引：
   * - 设置 `AI_CONTRACT_CN_UPSTREAM` = `https://cn-api.example.com`（国内机房）
   * - 设置 `AI_CONTRACT_GLOBAL_UPSTREAM` = `https://global-api.example.com`（海外机房）
   * - 仅当请求带 `X-User-Region: CN|GLOBAL` 时转发；未设置 upstream 时走本应用内 router
   * - DNS 智能解析参考：Cloudflare Geo Steering / 阿里云云解析「智能解析」文档
   *   https://developers.cloudflare.com/traffic-policies/traffic-steering/geo-steering/
   *   https://help.aliyun.com/document_detail/29778.html
   */
  async rewrites() {
    const rules = [];
    const cn = process.env.AI_CONTRACT_CN_UPSTREAM?.replace(/\/$/, "");
    const global = process.env.AI_CONTRACT_GLOBAL_UPSTREAM?.replace(/\/$/, "");
    if (cn) {
      rules.push({
        source: "/api/contract/:path*",
        has: [{ type: "header", key: "x-user-region", value: "CN" }],
        destination: `${cn}/api/contract/:path*`,
      });
    }
    if (global) {
      rules.push({
        source: "/api/contract/:path*",
        has: [{ type: "header", key: "x-user-region", value: "GLOBAL" }],
        destination: `${global}/api/contract/:path*`,
      });
    }
    return rules;
  },
  webpack(config) {
    // Bundle fixture .txt as UTF-8 strings for client demo samples.
    config.module.rules.push({
      test: /\.txt$/i,
      type: "asset/source",
    });
    return config;
  },
};

export default withSentryConfig(withNextIntl(nextConfig), {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  disableLogger: true,
  tunnelRoute: "/monitoring",
  hideSourceMaps: true,
});
