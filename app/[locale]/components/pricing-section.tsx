"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

type CurrencyKey = "cny" | "usd" | "sgd";

interface PricingSectionProps {
  locale: string;
  isPro: boolean;
  scrollTo: (id: string) => void;
  onCheckout: (priceId: "pro_monthly" | "pay_per_use", currency: CurrencyKey) => void;
}

type MatrixPlanKey = "free" | "payPerUse" | "pro";

interface MatrixRow {
  label: string;
  free: string;
  payPerUse: string;
  pro: string;
}

const MATRIX_PLAN_KEYS: MatrixPlanKey[] = ["free", "payPerUse", "pro"];

function CellValue({ value }: { value: string }) {
  const v = value.trim();
  if (v === "✓" || v === "yes") {
    return (
      <span className="pricing-matrix-yes" aria-label="included">
        ✓
      </span>
    );
  }
  if (v === "—" || v === "-" || v === "no") {
    return <span className="pricing-matrix-no">—</span>;
  }
  return <span className="pricing-matrix-text">{value}</span>;
}

export default function PricingSection({
  locale,
  isPro,
  scrollTo,
  onCheckout,
}: PricingSectionProps) {
  const t = useTranslations();
  const isZh = locale === "zh";
  const [enCurrency, setEnCurrency] = useState<"usd" | "sgd">("usd");
  const currency: CurrencyKey = isZh ? "cny" : enCurrency;
  const enCurrencies = ["usd", "sgd"] as const;

  const cur = t.raw(`pricing.currencies.${currency}`) as {
    free: { price: string; period: string };
    pro: { price: string; period: string };
    payPerUse: { price: string; period: string };
    label: string;
    flag: string;
  };

  const matrixRows = t.raw("pricing.matrix.rows") as MatrixRow[];
  const matrixPlans = t.raw("pricing.matrix.plans") as Record<MatrixPlanKey, string>;
  const deliverables = t.raw("pricing.deliverables") as string[];

  const planCards: Array<{
    key: MatrixPlanKey;
    featured?: boolean;
    price: string;
    period: string;
    onAction: () => void;
    ctaClass: string;
  }> = [
    {
      key: "free",
      price: cur.free.price,
      period: cur.free.period,
      onAction: () => scrollTo("upload"),
      ctaClass: "btn btn-outline w-full",
    },
    {
      key: "pro",
      featured: true,
      price: cur.pro.price,
      period: cur.pro.period,
      onAction: () => onCheckout("pro_monthly", currency),
      ctaClass: "btn btn-primary w-full",
    },
    {
      key: "payPerUse",
      price: cur.payPerUse.price,
      period: cur.payPerUse.period,
      onAction: () => onCheckout("pay_per_use", currency),
      ctaClass: "btn btn-outline w-full",
    },
  ];

  return (
    <section id="pricing" className="py-20 bg-paper-dark/40">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <div className="section-label">{t("pricing.label")}</div>
          <h2 className="mb-3">{t("pricing.title")}</h2>
          <p className="text-ink-light mb-4">{t("pricing.subtitle")}</p>
          <p className="text-sm text-ink-muted font-sans leading-relaxed">
            {t("pricing.disclaimer")}
          </p>
        </div>

        <div className="pricing-deliverables mb-10">
          <p className="text-xs font-sans font-semibold uppercase tracking-wide text-ink-muted mb-3 text-center">
            {t("pricing.deliverablesTitle")}
          </p>
          <ul className="flex flex-wrap justify-center gap-x-4 gap-y-2">
            {deliverables.map((item) => (
              <li key={item} className="text-sm text-ink-light font-sans">
                ✓ {item}
              </li>
            ))}
          </ul>
        </div>

        {!isZh && (
          <div className="flex justify-center mb-8">
            <div className="currency-switcher">
              {enCurrencies.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setEnCurrency(c)}
                  className={`currency-btn ${enCurrency === c ? "active" : ""}`}
                >
                  <span className="mr-1.5">{t(`pricing.currencies.${c}.flag`)}</span>
                  {t(`pricing.currencies.${c}.label`)}
                </button>
              ))}
            </div>
          </div>
        )}

        {isPro ? (
          <div className="max-w-xl mx-auto">
            <div className="pricing-card featured text-center !scale-100 hover:!scale-[1.02]">
              <div className="flex items-center justify-center gap-2 mb-2">
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-accent"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <h3 className="text-xl">{t("pricing.subscribed.title")}</h3>
              </div>
              <p className="text-sm text-ink-light mb-5 font-sans leading-relaxed">
                {t("pricing.subscribed.desc")}
              </p>
              <p className="text-xs text-ink-muted font-sans leading-relaxed">
                {t("pricing.subscribed.managePrefix")}{" "}
                <a
                  href="https://billing.stripe.com/p/login/dRm3cveQW6Bg6Gz7xh00000"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent underline hover:text-[#8B3A0E] transition-colors"
                >
                  {t("pricing.subscribed.manageLink")}
                </a>{" "}
                {t("pricing.subscribed.manageSuffix")}
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="pricing-matrix-wrap mb-10">
              <h3 className="text-center font-sans font-semibold text-ink mb-4">
                {t("pricing.matrix.title")}
              </h3>
              <div className="pricing-matrix-scroll">
                <table className="pricing-matrix">
                  <thead>
                    <tr>
                      <th scope="col">{t("pricing.matrix.featureCol")}</th>
                      {MATRIX_PLAN_KEYS.map((plan) => (
                        <th key={plan} scope="col">
                          {matrixPlans[plan]}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {matrixRows.map((row) => (
                      <tr key={row.label}>
                        <th scope="row">{row.label}</th>
                        {MATRIX_PLAN_KEYS.map((plan) => (
                          <td key={plan}>
                            <CellValue value={row[plan]} />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              {planCards.map((card) => {
                const planKey = card.key;
                const highlights = t.raw(`pricing.${planKey}.highlights`) as string[];
                return (
                  <div
                    key={planKey}
                    className={`pricing-card pricing-card-v2 ${card.featured ? "featured" : ""}`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className="text-xl">{t(`pricing.${planKey}.name`)}</h3>
                      {card.featured && (
                        <span className="pricing-badge">{t("pricing.pro.badge")}</span>
                      )}
                    </div>
                    <p className="text-xs text-ink-muted mb-1 font-sans">
                      {t(`pricing.${planKey}.audience`)}
                    </p>
                    <p className="text-xs text-ink-light mb-4 font-sans">
                      {t(`pricing.${planKey}.note`)}
                    </p>
                    <div className="text-4xl font-light font-sans mb-5">
                      {card.price}
                      <span className="text-lg text-ink-muted">{card.period}</span>
                    </div>
                    <ul className="space-y-2.5 mb-6 text-sm text-ink-light font-sans">
                      {highlights.map((feat) => (
                        <li key={feat}>{feat}</li>
                      ))}
                    </ul>
                    <button type="button" onClick={card.onAction} className={card.ctaClass}>
                      {t(`pricing.${planKey}.cta`)}
                    </button>
                  </div>
                );
              })}
            </div>

            <p className="text-xs text-center text-ink-muted font-sans leading-relaxed max-w-3xl mx-auto">
              {t("pricing.footnote")}
            </p>
          </>
        )}
      </div>
    </section>
  );
}
