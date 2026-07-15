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
    // Mirror server flag so client pricing UI can gate WeChat CTAs without a rebuild rename.
    NEXT_PUBLIC_WECHAT_PAY_ENABLED:
      process.env.NEXT_PUBLIC_WECHAT_PAY_ENABLED === "true" ||
      process.env.WECHAT_PAY_ENABLED === "true"
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
