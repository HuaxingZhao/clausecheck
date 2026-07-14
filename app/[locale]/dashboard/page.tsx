import { redirect } from "next/navigation";
import { localizedPath } from "@/i18n/routing";

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect(localizedPath("/account", locale));
}
