import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ClauseCheck — AI 合同风险扫描",
  description:
    "签合同前，用 AI 扫一遍。上传劳动合同、租房协议、服务合同，3 分钟出风险报告：逐条分析 + 修改建议 + 谈判优先级。免费试用。",
  metadataBase: new URL("https://www.clausecheck.cc"),
  openGraph: {
    type: "website",
    siteName: "ClauseCheck",
    locale: "zh_CN",
    title: "ClauseCheck — AI 合同风险扫描",
    description:
      "签合同前，用 AI 扫一遍。上传合同，30 秒发现隐藏陷阱，逐条给出修改建议。免费试用。",
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
    title: "ClauseCheck — AI 合同风险扫描",
    description: "签合同前，用 AI 扫一遍。上传合同，30 秒发现隐藏陷阱。免费试用。",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <head>
        {/* Stripe 预连接 — 消除渲染阻塞请求 (~300ms) */}
        <link rel="preconnect" href="https://js.stripe.com" />
        <link rel="dns-prefetch" href="https://js.stripe.com" />
        <link rel="preconnect" href="https://api.stripe.com" />
        <link rel="dns-prefetch" href="https://api.stripe.com" />

        {/* 浏览器元数据 */}
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
