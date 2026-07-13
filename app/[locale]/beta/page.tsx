import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getQuotaForPlan } from "@/lib/pricing.config";
import { Link } from "@/i18n/routing";
import BetaSubscribeForm from "../components/beta-subscribe-form";
import FAQItem from "../components/faq-item";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "beta" });
  return {
    title: t("meta.title"),
    description: t("meta.description"),
    openGraph: {
      title: t("meta.title"),
      description: t("meta.description"),
    },
  };
}

export default async function BetaPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "beta" });
  const faqItems = t.raw("faq.items") as { q: string; a: string }[];
  const perks = t.raw("perks.items") as string[];
  const freeScanCount = getQuotaForPlan("trial");
  const values = [
    {
      title: t("values.risk.title"),
      body: t("values.risk.body"),
      img: "/beta/risk-grading.svg",
      alt: t("values.risk.alt"),
    },
    {
      title: t("values.jurisdiction.title"),
      body: t("values.jurisdiction.body"),
      img: "/beta/jurisdiction-safe.svg",
      alt: t("values.jurisdiction.alt"),
    },
    {
      title: t("values.dpa.title"),
      body: t("values.dpa.body"),
      img: "/beta/dpa-preview.png",
      alt: t("values.dpa.alt"),
    },
  ];

  return (
    <div className="beta-page min-h-screen bg-paper">
      <nav className="border-b border-border bg-paper/80 backdrop-blur sticky top-0 z-40">
        <div className="nav-inner">
          <Link
            href="/"
            className="font-sans font-semibold text-lg tracking-tight text-legal-navy"
          >
            ClauseCheck
          </Link>
          <div className="beta-nav-actions">
            <div className="beta-nav-actions-row">
              <Link
                href="/beta"
                locale={locale === "zh" ? "en" : "zh"}
                className="beta-lang-switch text-xs font-sans text-ink-muted hover:text-ink"
                prefetch={false}
              >
                {locale === "zh" ? "EN" : "中文"}
              </Link>
              <Link href="/#upload" className="btn btn-outline text-xs">
                {t("nav.tryProduct")}
              </Link>
            </div>
            <p className="beta-nav-try-hint">
              {t("nav.tryProductHint", { count: freeScanCount })}
            </p>
          </div>
        </div>
      </nav>

      {/* Hero — brand first, one headline, one support, one CTA, one visual */}
      <section className="beta-hero">
        <div className="beta-hero-copy">
          <p className="beta-brand">ClauseCheck</p>
          <p className="hero-badge w-fit mb-4">
            <span className="dot-pulse" />
            {t("hero.badge")}
          </p>
          <h1 className="beta-hero-title">{t("hero.title")}</h1>
          <p className="beta-hero-sub">{t("hero.subtitle")}</p>
          <BetaSubscribeForm variant="hero" />
          <p className="beta-hero-fine">{t("hero.finePrint")}</p>
        </div>
        <div className="beta-hero-media">
          <Link
            href="/#upload"
            className="beta-demo-frame beta-demo-link"
            aria-label={t("demo.cta")}
          >
            {/* No video file yet — real product screenshot + CTA, not a fake player */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/beta/dpa-preview.png"
              alt={t("demo.aria")}
              width={800}
              height={450}
              className="beta-demo-video"
            />
            <span className="beta-demo-cta">{t("demo.cta")}</span>
            <p className="beta-demo-caption">{t("demo.caption")}</p>
          </Link>
        </div>
      </section>

      {/* Value points */}
      <section className="beta-section bg-paper-dark/40">
        <div className="page-content-wide">
          <div className="section-label">{t("values.label")}</div>
          <h2 className="beta-section-title mb-8">{t("values.title")}</h2>
          <div className="beta-value-grid">
            {values.map((v) => (
              <article key={v.title} className="beta-value-item">
                <div className="beta-value-media">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={v.img}
                    alt={v.alt}
                    width={800}
                    height={480}
                    className="beta-value-img"
                    loading="lazy"
                    decoding="async"
                  />
                </div>
                <h3 className="beta-value-heading">{v.title}</h3>
                <p className="beta-value-body">{v.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Perks */}
      <section className="beta-section">
        <div className="page-content-wide max-w-3xl mx-auto text-center">
          <div className="section-label mx-auto">{t("perks.label")}</div>
          <h2 className="beta-section-title mb-6">{t("perks.title")}</h2>
          <ul className="beta-perks-list">
            {perks.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p className="beta-perks-disclaimer" role="note">
            <span className="beta-perks-disclaimer-icon" aria-hidden="true">
              i
            </span>
            <span>{t("benefits.disclaimer")}</span>
          </p>
        </div>
      </section>

      {/* Trust */}
      <section className="beta-trust">
        <p className="beta-trust-line">{t("trust.line")}</p>
      </section>

      {/* FAQ */}
      <section className="beta-section bg-paper-dark/30">
        <div className="page-content-wide max-w-2xl mx-auto">
          <div className="section-label">{t("faq.label")}</div>
          <h2 className="beta-section-title mb-6">{t("faq.title")}</h2>
          <div className="space-y-0">
            {faqItems.map((item) => (
              <FAQItem key={item.q} q={item.q} a={item.a} />
            ))}
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="beta-footer-cta">
        <div className="page-content-wide max-w-xl mx-auto text-center">
          <h2 className="beta-section-title mb-3">{t("footerCta.title")}</h2>
          <p className="text-ink-light font-sans mb-6">{t("footerCta.subtitle")}</p>
          <BetaSubscribeForm variant="footer" />
          <p className="mt-6 text-sm font-sans text-ink-muted">
            {t("footerCta.questions")}{" "}
            <a
              className="text-legal-navy underline underline-offset-2"
              href={`mailto:${t("footerCta.email")}`}
            >
              {t("footerCta.email")}
            </a>
          </p>
          <Link
            href="/"
            className="inline-block mt-8 text-xs font-sans text-ink-muted hover:text-ink"
          >
            {t("footerCta.backHome")}
          </Link>
        </div>
      </section>
    </div>
  );
}
