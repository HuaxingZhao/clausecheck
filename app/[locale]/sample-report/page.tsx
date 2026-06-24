import { getTranslations } from "next-intl/server";
import Link from "next/link";

export default async function SampleReportPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "sample" });
  const pdfUrl = `/api/export/sample?locale=${locale === "en" ? "en" : "zh"}`;

  return (
    <>
      <nav className="border-b border-border bg-paper/80 backdrop-blur sticky top-0 z-40">
        <div className="nav-inner">
          <Link href={`/${locale}`} className="font-sans font-semibold text-lg tracking-tight">
            ClauseCheck
          </Link>
          <Link href={`/${locale}#upload`} className="btn btn-primary text-xs">
            {t("scanCta")}
          </Link>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-16">
        <div className="section-label">{t("label")}</div>
        <h1 className="mb-3">{t("title")}</h1>
        <p className="text-ink-light mb-8 leading-relaxed">{t("subtitle")}</p>

        <div className="flex flex-wrap gap-3 mb-10">
          <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
            {t("viewPdf")}
          </a>
          <a href={pdfUrl} download className="btn btn-outline">
            {t("downloadPdf")}
          </a>
          <Link href={`/${locale}#upload`} className="btn btn-outline">
            {t("scanYours")}
          </Link>
        </div>

        <div className="sample-trust grid gap-4 sm:grid-cols-3 mb-10">
          {(t.raw("trust") as string[]).map((item, i) => (
            <div key={i} className="sample-trust-item">
              {item}
            </div>
          ))}
        </div>

        <p className="text-xs text-ink-muted font-sans">{t("disclaimer")}</p>
      </main>
    </>
  );
}
