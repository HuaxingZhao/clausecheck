import { NextIntlClientProvider, useTranslations } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { Noto_Serif_SC } from "next/font/google";
import Link from "next/link";
import type { Metadata } from "next";
import "./globals.css";

const displaySerif = Noto_Serif_SC({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-display",
  display: "swap",
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const messages = (await import(`../../messages/${locale}.json`)).default;
  return {
    title: messages.meta.title,
    description: messages.meta.description,
  };
}

function Footer({ locale }: { locale: string }) {
  const isZh = locale === "zh";
  return (
    <footer className="border-t border-gray-200 mt-20 py-8 text-center text-sm text-gray-500">
      <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2 mb-4 px-4">
        <Link href={`/${locale}#how`} className="hover:text-gray-700 transition-colors">
          {isZh ? "怎么用" : "How it works"}
        </Link>
        <Link href={`/${locale}#pricing`} className="hover:text-gray-700 transition-colors">
          {isZh ? "定价" : "Pricing"}
        </Link>
        <Link href={`/${locale}#faq`} className="hover:text-gray-700 transition-colors">
          FAQ
        </Link>
        <Link href={`/${locale}/privacy`} className="hover:text-gray-700 transition-colors">
          {isZh ? "隐私政策" : "Privacy"}
        </Link>
        <Link href={`/${locale}/terms`} className="hover:text-gray-700 transition-colors">
          {isZh ? "用户协议" : "Terms"}
        </Link>
        <Link href={`/${locale}/about`} className="hover:text-gray-700 transition-colors">
          {isZh ? "关于" : "About"}
        </Link>
      </nav>
      <p>
        &copy; {new Date().getFullYear()} ClauseCheck.{" "}
        {locale === "zh" ? "保留所有权利。" : "All rights reserved."}
      </p>
    </footer>
  );
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!routing.locales.includes(locale as "en" | "zh")) notFound();

  const messages = await getMessages();

  return (
    <html lang={locale === "zh" ? "zh-CN" : "en"}>
      <body className={displaySerif.variable}>
        <NextIntlClientProvider messages={messages}>
          <div className="flex flex-col min-h-screen">
            <main className="flex-1">{children}</main>
            <Footer locale={locale} />
          </div>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
