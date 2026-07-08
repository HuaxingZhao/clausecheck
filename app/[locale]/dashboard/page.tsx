import { redirect } from "next/navigation";

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  // localePrefix: "as-needed" — 默认 en 不带 /en 前缀
  redirect(locale === "en" ? "/account" : `/${locale}/account`);
}
