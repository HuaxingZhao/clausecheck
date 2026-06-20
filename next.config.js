const { withSentryConfig } = require("@sentry/nextjs");

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  compress: true,
  experimental: {
    // 自动 tree-shake 第三方包的未使用代码
    optimizePackageImports: ["@stripe/stripe-js"],
  },
  compiler: {
    removeConsole:
      process.env.NODE_ENV === "production"
        ? { exclude: ["error", "warn"] }
        : false,
  },
};

module.exports = withSentryConfig(
  nextConfig,
  {
    // Sentry webpack plugin — 静默模式，不打断构建
    silent: true,
  },
  {
    // 生产环境隐藏 source map
    hideSourceMaps: true,
    // 减少构建日志
    disableLogger: true,
    // Vercel 自动关联部署事件到 Sentry release
    automaticVercelMonitors: true,
    // 自动注入 Sentry.init 到浏览器端（无需手动调）
    autoInstrumentServerFunctions: true,
    autoInstrumentMiddleware: true,
    autoInstrumentAppDirectory: true,
    // 排除 next dev 的 turbopack 相关文件
    excludeServerRoutes: [],
  }
);
