"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

type PlanKey = "experience" | "pro" | "boost";

interface MatrixRow {
  label: string;
  experience: string;
  pro: string;
  boost: string;
}

const MATRIX_PLAN_KEYS: PlanKey[] = ["experience", "pro", "boost"];

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

interface PricingSectionProps {
  locale: string;
  isPro: boolean;
  scrollTo?: (id: string) => void;
  compact?: boolean;
  onPayPlan?: (plan: "pro" | "boost") => void;
  payingPlan?: "pro" | "boost" | null;
}

export default function PricingSection({
  locale,
  isPro,
  scrollTo,
  compact = false,
  onPayPlan,
  payingPlan = null,
}: PricingSectionProps) {
  const router = useRouter();
  const t = useTranslations();

  const matrixRows = t.raw("pricing.matrix.rows") as MatrixRow[];
  const matrixPlans = t.raw("pricing.matrix.plans") as Record<PlanKey, string>;
  const deliverables = t.raw("pricing.deliverables") as string[];

  const handlePaidPlan = (plan: "pro" | "boost") => {
    if (onPayPlan) {
      onPayPlan(plan);
    } else {
      router.push(`/${locale}/waitlist?plan=${plan}`);
    }
  };

  const planCards: Array<{
    key: PlanKey;
    featured?: boolean;
    boost?: boolean;
    price: string;
    period: string;
    onAction: () => void;
    ctaClass: string;
  }> = [
    {
      key: "experience",
      price: t("pricing.experience.price"),
      period: t("pricing.experience.period"),
      onAction: () => {
        if (scrollTo) scrollTo("upload");
        else router.push(`/${locale}#upload`);
      },
      ctaClass: "btn btn-outline w-full",
    },
    {
      key: "pro",
      featured: true,
      price: t("pricing.pro.price"),
      period: t("pricing.pro.period"),
      onAction: () => handlePaidPlan("pro"),
      ctaClass: "btn btn-primary w-full",
    },
    {
      key: "boost",
      boost: true,
      price: t("pricing.boost.price"),
      period: t("pricing.boost.period"),
      onAction: () => handlePaidPlan("boost"),
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
          {!compact && (
            <p className="text-sm text-ink-muted font-sans leading-relaxed">
              {t("pricing.disclaimer")}
            </p>
          )}
        </div>

        {!compact && (
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
            </div>
          </div>
        ) : (
          <>
            {!compact && (
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
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              {planCards.map((card) => {
                const planKey = card.key;
                const highlights = t.raw(`pricing.${planKey}.highlights`) as string[];
                return (
                  <div
                    key={planKey}
                    className={`pricing-card pricing-card-v2 ${card.featured ? "featured" : ""} ${card.boost ? "pricing-card-boost" : ""}`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className="text-xl">{t(`pricing.${planKey}.name`)}</h3>
                      {card.featured && (
                        <span className="pricing-badge">{t("pricing.pro.badge")}</span>
                      )}
                      {card.boost && (
                        <span className="pricing-badge pricing-badge-boost">
                          {t("pricing.boost.badge")}
                        </span>
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
                    <button
                      type="button"
                      onClick={card.onAction}
                      disabled={
                        payingPlan != null &&
                        (planKey === "pro" || planKey === "boost") &&
                        payingPlan === planKey
                      }
                      className={`${card.ctaClass} ${
                        payingPlan === planKey ? "opacity-70 cursor-wait" : ""
                      }`}
                    >
                      {payingPlan === planKey && (planKey === "pro" || planKey === "boost")
                        ? t("payment.processing")
                        : t(`pricing.${planKey}.cta`)}
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
