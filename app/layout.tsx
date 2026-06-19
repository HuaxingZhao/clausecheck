import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ClauseCheck — AI 合同风险扫描",
  description: "上传合同，AI 逐条分析风险条款，3 分钟出报告",
  metadataBase: new URL("https://www.clausecheck.cc"),
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
      <body>{children}</body>
    </html>
  );
}
