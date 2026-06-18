import type { Metadata } from "next";
import "./globals.css";

const BASE_URL = "https://clausecheck.cc";

export const metadata: Metadata = {
  title: "ClauseCheck — AI 合同风险扫描",
  description:
    "签合同前，用 AI 扫一遍。上传合同，3 分钟出风险报告：逐条分析 + 修改建议 + 谈判优先级。免费试用。",
  keywords: [
    "合同审查",
    "AI合同",
    "合同风险",
    "法律AI",
    "合同扫描",
    "法律科技",
    "risk check",
    "contract review",
  ],
  metadataBase: new URL(BASE_URL),
  alternates: {
    canonical: "/",
    languages: {
      "zh-CN": "/",
      "en-US": "/en",
    },
  },
  openGraph: {
    type: "website",
    siteName: "ClauseCheck",
    locale: "zh_CN",
    url: BASE_URL,
    title: "ClauseCheck — 签合同前，用 AI 扫一遍",
    description:
      "上传合同，AI 逐条分析风险条款。违约金、竞业限制、自动续约、管辖权……一目了然的风险报告 + 谈判建议。",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "ClauseCheck — AI 合同风险扫描",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ClauseCheck — 签合同前，用 AI 扫一遍",
    description:
      "上传合同，AI 逐条分析风险条款。免费试用，无需注册。",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <head>
        {/* 额外的 meta（Next.js metadata API 已覆盖大部分） */}
        <meta name="application-name" content="ClauseCheck" />
        <meta name="theme-color" content="#111018" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />

        {/* 结构化数据：SoftwareApplication */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              name: "ClauseCheck",
              applicationCategory: "BusinessApplication",
              operatingSystem: "Web",
              description:
                "AI 合同风险扫描工具。上传合同，3 分钟出风险报告。",
              offers: {
                "@type": "Offer",
                price: "0",
                priceCurrency: "CNY",
              },
            }),
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
