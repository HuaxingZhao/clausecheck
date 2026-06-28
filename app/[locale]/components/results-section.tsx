"use client";

import { useTranslations } from "next-intl";
import type { ScanResult, RiskFlag, SigningRecommendation } from "@/lib/types";

import UpgradeBanner from "./upgrade-banner";
import ReportDeliverySection from "./report-delivery-section";
import ReviseSection from "./revise-section";

interface ResultsSectionProps {
  result: ScanResult;
  contractText?: string | null;
  riskCls: string;
  isPro: boolean;
  locale: string;
  onDownload: () => void;
  scrollTo: (id: string) => void;
  onUpgradePro?: () => void;
  onPayPerUse?: () => void;
  sectionRef?: React.RefObject<HTMLElement>;
}

export default function ResultsSection({
  result,
  contractText,
  riskCls,
  isPro,
  locale,
  onDownload,
  scrollTo,
  onUpgradePro,
  onPayPerUse,
  sectionRef,
}: ResultsSectionProps) {
  const t = useTranslations();

  function levelLabel(level: string) {
    if (level === "high") return t("results.riskLevelHigh");
    if (level === "medium") return t("results.riskLevelMedium");
    if (level === "low") return t("results.riskLevelLow");
    return "";
  }

  function signingLabel(rec: SigningRecommendation) {
    if (rec === "sign") return t("results.signingSign");
    if (rec === "sign_with_changes") return t("results.signingSignWithChanges");
    return t("results.signingDoNotSign");
  }

  return (
    <section ref={sectionRef} id="results" className="py-20 bg-paper-dark fade-section">
      <div className="max-w-6xl mx-auto px-6">
        <div className="section-label">{t("results.label")}</div>
        <h2 className="mb-6">{t("results.title")}</h2>

        {!isPro && onUpgradePro && (
          <UpgradeBanner
            result={result}
            onUpgrade={onUpgradePro}
            onPayPerUse={onPayPerUse}
          />
        )}

        {result.contractType && (
          <span className="contract-type-badge">
            {t("results.contractType")}: {result.contractType}
          </span>
        )}

        {result.signingRecommendation && (
          <div className={`signing-banner ${result.signingRecommendation}`}>
            <div className="font-sans font-semibold text-ink mb-1">
              {t("results.signingRecTitle")}: {signingLabel(result.signingRecommendation)}
            </div>
            {result.signingRationale && (
              <p className="text-sm text-ink-light leading-relaxed">{result.signingRationale}</p>
            )}
          </div>
        )}

        {result.executiveSummary && (
          <div className="summary-card mb-6">
            <h4 className="mb-3">{t("results.executiveSummary")}</h4>
            <p className="text-ink-light leading-relaxed">{result.executiveSummary}</p>
          </div>
        )}

        <div className="results-grid mb-6">
          <div className="result-card">
            <div className="risk-score">
              <div className={`risk-ring ${riskCls} count-animate`}>
                <span>{result.scoreNum}</span>
              </div>
              <div>
                <h4 className="mb-0.5">{t("results.riskScore")}</h4>
                <span className="risk-label">{localizeScoreText(result.scoreText, t)}</span>
              </div>
            </div>
            <p className="text-sm text-ink-light mt-2">{t("results.scoreDesc")}</p>
          </div>

          {result.dimensions && (
            <div className="result-card lg:col-span-2">
              <h4 className="mb-5 text-sm font-sans text-ink-light">
                {t("results.dimensionsTitle")}
              </h4>
              <div className="dimensions-grid">
                <DimensionBar
                  label={t("results.dimensionFairness")}
                  value={result.dimensions.fairness}
                  kind="fairness"
                />
                <DimensionBar
                  label={t("results.dimensionCompliance")}
                  value={result.dimensions.compliance}
                  kind="compliance"
                />
                <DimensionBar
                  label={t("results.dimensionFinancial")}
                  value={result.dimensions.financial}
                  kind="financial"
                />
              </div>
              <p className="text-xs text-ink-muted mt-2 font-sans">
                {t("results.dimensionsHint")}
              </p>
            </div>
          )}
        </div>

        <div className="results-grid mb-6">
          <div className="result-card lg:col-span-2">
            <h4 className="mb-4">
              {t("results.flagsFound", { count: result.flags.length })}
            </h4>
            {result.flags.map((f, i) => (
              <div key={i} className={`flag-item ${flagCls(f)}`}>
                <span className="flag-icon">{f.icon}</span>
                <div className="flex-1 min-w-0">
                  {f.category && (
                    <span className="flag-category">{f.category}</span>
                  )}
                  <span className="flag-text">{f.text}</span>
                  {f.level && (
                    <span className={`flag-level-badge ${f.level}`}>
                      {levelLabel(f.level)}
                    </span>
                  )}
                  {f.quote && (
                    <span className="flag-quote">
                      「{f.quote}」
                    </span>
                  )}
                  {f.legalBasis && (
                    <span className="flag-meta">
                      <strong>{t("results.legalBasis")}:</strong> {f.legalBasis}
                    </span>
                  )}
                  {f.impact && (
                    <span className="flag-meta">
                      <strong>{t("results.impact")}:</strong> {f.impact}
                    </span>
                  )}
                  {f.suggestion && (
                    <span className="flag-suggestion">💡 {f.suggestion}</span>
                  )}
                </div>
              </div>
            ))}
            {result.flags.length === 0 && (
              <p className="text-sm text-ink-light font-sans py-4">
                {t("results.noFlags")}
              </p>
            )}
          </div>

          {result.timeTerms && result.timeTerms.length > 0 && (
            <div className="result-card">
              <h4 className="mb-4 text-sm font-sans text-ink-light">
                {t("results.timeTermsTitle")}
              </h4>
              <div className="time-terms-grid">
                {result.timeTerms.map((term, i) => (
                  <div key={i} className="time-term">
                    <span className="time-term-icon">
                      {timeIcons[term.type] || "📌"}
                    </span>
                    <div>
                      <span className="text-xs text-ink-muted font-sans">
                        {t(`timeTerms.${term.type}`)}
                      </span>
                      <p className="text-sm text-ink-light leading-relaxed mt-0.5">
                        {term.description}
                        {term.date ? ` · ${term.date}` : ""}
                      </p>
                      <span className={`time-badge ${term.risk}`}>
                        {levelLabel(term.risk)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {result.negotiations && result.negotiations.length > 0 && (
          <div className="summary-card mb-6">
            <h4 className="mb-5">{t("results.negotiationsTitle")}</h4>
            <div className="negotiations-list">
              {result.negotiations.map((n) => (
                <div key={n.priority} className="nego-item">
                  <div className="nego-priority">{n.priority}</div>
                  <div className="nego-body">
                    <div className="nego-clause">{n.clause}</div>
                    <div className="nego-rows">
                      <div className="nego-row">
                        <span className="nego-label">{t("results.negoCurrent")}</span>
                        <span>{n.current}</span>
                      </div>
                      <div className="nego-row">
                        <span className="nego-label">{t("results.negoSuggested")}</span>
                        <span className="text-accent-dark font-medium">{n.suggested}</span>
                      </div>
                    </div>
                    <div className="nego-reason">💬 {n.reason}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {result.worstCase && (
          <div className="summary-card mb-6 border-l-4 border-red-400">
            <h4 className="mb-3">{t("results.worstCaseTitle")}</h4>
            <p className="text-ink-light leading-relaxed">{result.worstCase}</p>
          </div>
        )}

        {result.strengths && result.strengths.length > 0 && (
          <div className="summary-card mb-6">
            <h4 className="mb-3">{t("results.strengthsTitle")}</h4>
            <ul className="space-y-2">
              {result.strengths.map((s, i) => (
                <li key={i} className="strength-item">{s}</li>
              ))}
            </ul>
          </div>
        )}

        {result.missingClauses && result.missingClauses.length > 0 && (
          <div className="summary-card mb-6">
            <h4 className="mb-4">{t("results.missingClausesTitle")}</h4>
            {result.missingClauses.map((c, i) => (
              <div key={i} className="missing-clause-item">
                <div className="font-sans font-semibold text-sm text-ink mb-1">{c.name}</div>
                <p className="text-sm text-ink-light mb-1">{c.importance}</p>
                <p className="text-sm text-accent-dark">💡 {c.suggestion}</p>
              </div>
            ))}
          </div>
        )}

        {result.actionItems && result.actionItems.length > 0 && (
          <div className="summary-card mb-6">
            <h4 className="mb-4">{t("results.actionItemsTitle")}</h4>
            <ol className="action-list">
              {result.actionItems.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ol>
          </div>
        )}

        <div className="summary-card mb-6">
          <h4 className="mb-3">{t("results.overallAssessment")}</h4>
          <p className="text-ink-light leading-relaxed whitespace-pre-line">
            {result.summary}
          </p>
        </div>

        {result.refineNotes && (
          <div className="summary-card mb-6 bg-paper border-dashed">
            <h4 className="mb-3 text-sm font-sans text-ink-muted">
              {t("results.refineNotesTitle")}
            </h4>
            <p className="text-sm text-ink-light leading-relaxed">{result.refineNotes}</p>
          </div>
        )}

        <ReportDeliverySection
          result={result}
          locale={locale}
          isPro={isPro}
          onDownload={onDownload}
        />

        <ReviseSection
          result={result}
          contractText={contractText ?? null}
          isPro={isPro}
          locale={locale}
          onUpgradePro={onUpgradePro}
          onPayPerUse={onPayPerUse}
        />

        {!isPro && (
          <div className="text-center mt-12">
            <p className="text-sm text-ink-light mb-4 font-sans">
              {t("results.trialHint")}
            </p>
            <button
              onClick={() => scrollTo("pricing")}
              className="btn btn-primary btn-lg"
            >
              {t("results.viewPricing")}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

const timeIcons: Record<string, string> = {
  auto_renewal: "🔄",
  deadline: "⏰",
  expiration: "📅",
  notice_period: "📬",
};

function localizeScoreText(
  text: string,
  t: ReturnType<typeof useTranslations>
): string {
  const map: Record<string, string> = {
    高风险: t("results.scoreHigh"),
    中风险: t("results.scoreMedium"),
    低风险: t("results.scoreLow"),
    "High Risk": t("results.scoreHigh"),
    "Medium Risk": t("results.scoreMedium"),
    "Low Risk": t("results.scoreLow"),
  };
  return map[text] || text;
}

function flagCls(f: RiskFlag): string {
  if (f.level === "high") return "flag-high";
  if (f.level === "medium") return "flag-medium";
  if (f.level === "low") return "flag-low";
  return "";
}

function DimensionBar({
  label,
  value,
  kind,
}: {
  label: string;
  value: number;
  kind: "fairness" | "compliance" | "financial";
}) {
  return (
    <div className="dim-item">
      <div className="dim-label">{label}</div>
      <div className="dim-bar-wrap">
        <div className={`dim-bar-fill ${kind}`} style={{ width: `${value}%` }} />
      </div>
      <div className={`dim-val ${kind}`}>{value}</div>
    </div>
  );
}
