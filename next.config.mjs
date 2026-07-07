import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "3mb",
    },
    serverComponentsExternalPackages: ["pdf-parse"],
    optimizePackageImports: ["openai"],
  },
  poweredByHeader: false,
};

export default withNextIntl(nextConfig);
