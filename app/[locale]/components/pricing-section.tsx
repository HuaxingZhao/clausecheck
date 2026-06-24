"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

type CurrencyKey = "cny" | "usd" | "sgd";

interface PricingSectionProps {
  locale: string;
  isPro: boolean;
  scrollTo: (id: string) => void;
  onCheckout: (
    priceId: "pro_monthly" | "pay_per_use" | "team_monthly",
    currency: CurrencyKey
  ) => void;
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

  const freeFeatures = t.raw("pricing.free.features") as string[];
  const proFeatures = t.raw("pricing.pro.features") as string[];
  const payFeatures = t.raw("pricing.payPerUse.features") as string[];
  const teamFeatures = t.raw("pricing.team.features") as string[];
  const teamPrice = isZh
    ? t("pricing.team.priceCny")
    : enCurrency === "sgd"
      ? t("pricing.team.priceSgd")
      : t("pricing.team.priceUsd");
  const teamPeriod = t("pricing.team.period");

  return (
    <section id="pricing" className="py-20">
      <div className="max-w-5xl mx-auto px-6">
        <div className="section-label text-center">{t("pricing.label")}</div>
        <h2 className="text-center mb-4">{t("pricing.title")}</h2>
        <p className="text-center text-ink-light mb-8">{t("pricing.subtitle")}</p>

        {!isZh && (
          <div className="flex justify-center mb-10">
            <div className="currency-switcher">
              {enCurrencies.map((c) => (
                <button
                  key={c}
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
          <div className="md:col-span-3 max-w-xl mx-auto w-full">
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
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            <div className="pricing-card">
              <h3 className="text-xl mb-1">{t("pricing.free.name")}</h3>
              <p className="text-xs text-ink-muted mb-4 font-sans">{t("pricing.free.note")}</p>
              <div className="text-4xl font-light font-sans mb-5">
                {cur.free.price}
                <span className="text-lg text-ink-muted">{cur.free.period}</span>
              </div>
              <ul className="space-y-3 mb-6 text-sm text-ink-light">
                {freeFeatures.map((feat, i) => (
                  <li key={i}>{feat}</li>
                ))}
              </ul>
              <button onClick={() => scrollTo("upload")} className="btn btn-outline w-full">
                {t("pricing.free.cta")}
              </button>
            </div>

            <div className="pricing-card featured">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-xl">{t("pricing.pro.name")}</h3>
                <span className="text-xs bg-accent/20 text-[#8B3A0E] px-2 py-0.5 rounded-full font-sans">
                  {t("pricing.pro.badge")}
                </span>
              </div>
              <p className="text-xs text-ink-muted mb-4 font-sans">{t("pricing.pro.note")}</p>
              <div className="text-4xl font-light font-sans mb-5">
                {cur.pro.price}
                <span className="text-lg text-ink-muted">{cur.pro.period}</span>
              </div>
              <ul className="space-y-3 mb-6 text-sm text-ink-light">
                {proFeatures.map((feat, i) => (
                  <li key={i}>{feat}</li>
                ))}
              </ul>
              <button
                onClick={() => onCheckout("pro_monthly", currency)}
                className="btn btn-primary w-full"
              >
                {t("pricing.pro.cta")}
              </button>
            </div>

            <div className="pricing-card">
              <h3 className="text-xl mb-1">{t("pricing.payPerUse.name")}</h3>
              <p className="text-xs text-ink-muted mb-4 font-sans">
                {t("pricing.payPerUse.note")}
              </p>
              <div className="text-4xl font-light font-sans mb-5">
                {cur.payPerUse.price}
                <span className="text-lg text-ink-muted">{cur.payPerUse.period}</span>
              </div>
              <ul className="space-y-3 mb-6 text-sm text-ink-light">
                {payFeatures.map((feat, i) => (
                  <li key={i}>{feat}</li>
                ))}
              </ul>
              <button
                onClick={() => onCheckout("pay_per_use", currency)}
                className="btn btn-outline w-full"
              >
                {cur.payPerUse.price} {t("pricing.payPerUse.cta")}
              </button>
            </div>

            <div className="pricing-card">
              <h3 className="text-xl mb-1">{t("pricing.team.name")}</h3>
              <p className="text-xs text-ink-muted mb-4 font-sans">{t("pricing.team.note")}</p>
              <div className="text-4xl font-light font-sans mb-5">
                {teamPrice}
                <span className="text-lg text-ink-muted">{teamPeriod}</span>
              </div>
              <ul className="space-y-3 mb-6 text-sm text-ink-light">
                {teamFeatures.map((feat, i) => (
                  <li key={i}>{feat}</li>
                ))}
              </ul>
              <button
                onClick={() => onCheckout("team_monthly", currency)}
                className="btn btn-outline w-full"
              >
                {t("pricing.team.cta")}
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
