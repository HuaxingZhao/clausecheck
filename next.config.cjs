import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["pdf-parse"],
    optimizePackageImports: ["openai"],
  },
  poweredByHeader: false,
};

module.exports = withNextIntl(nextConfig);
