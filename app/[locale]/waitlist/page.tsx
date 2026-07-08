import { redirect } from "next/navigation";

/** Legacy URL — paid plans use WeChat on /pricing */
export default async function WaitlistPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ plan?: string }>;
}) {
  const { locale } = await params;
  const { plan } = await searchParams;
  const q =
    plan === "boost" || plan === "pro" ? `?plan=${plan}` : "";
  redirect(`/${locale}/pricing${q}`);
}
