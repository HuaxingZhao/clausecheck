import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ClauseCheck",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
