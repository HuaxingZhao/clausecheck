import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import FAQItem from "../../components/faq-item";
import { Link } from "@/i18n/routing";
import {
  BOUNTY_LISTINGS,
  CONTRIBUTING_DOC_PATH,
  DISCORD_INVITE_URL,
  EXAMPLE_PACK_PATH,
  GITHUB_REPO_URL,
  claimIssueUrl,
  type BountyListing,
  type BountyPriority,
  type BountyStatus,
} from "@/lib/community/bounty-catalog";
import { resolveBountyListings } from "@/lib/community/fetch-bounty-issues";

/** ISR: refresh GitHub assignee/status hourly; catalog itself is static. */
export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "communityBounty" });
  return {
    title: t("meta.title"),
    description: t("meta.description"),
    openGraph: {
      title: t("meta.title"),
      description: t("meta.description"),
    },
  };
}

function priorityClass(p: BountyPriority) {
  if (p === "High") return "bounty-priority bounty-priority-high";
  if (p === "Medium") return "bounty-priority bounty-priority-med";
  return "bounty-priority bounty-priority-low";
}

function statusClass(s: BountyStatus) {
  if (s === "Open") return "bounty-status bounty-status-open";
  if (s === "Completed") return "bounty-status bounty-status-done";
  return "bounty-status bounty-status-claimed";
}

function BountyTable({
  rows,
  t,
}: {
  rows: BountyListing[];
  t: Awaited<ReturnType<typeof getTranslations>>;
}) {
  return (
    <div className="bounty-table-wrap">
      <table className="bounty-table">
        <thead>
          <tr>
            <th>{t("colJurisdiction")}</th>
            <th>{t("colPriority")}</th>
            <th>{t("colReward")}</th>
            <th>{t("colStatus")}</th>
            <th>{t("colAssignee")}</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.map((b) => (
            <tr key={b.id}>
              <td className="bounty-jurisdiction">{b.jurisdiction}</td>
              <td>
                <span className={priorityClass(b.priority)}>
                  {t(`priority.${b.priority}`)}
                </span>
              </td>
              <td className="bounty-reward">{b.reward}</td>
              <td>
                <span className={statusClass(b.status)}>
                  {t(`status.${b.status}`)}
                </span>
              </td>
              <td className="bounty-assignee">{b.assignee || "—"}</td>
              <td className="bounty-row-cta">
                {b.status === "Open" ? (
                  <a
                    className="bounty-claim-link"
                    href={claimIssueUrl(b)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {t("claim")}
                  </a>
                ) : b.issueNumber ? (
                  <a
                    className="bounty-claim-link bounty-claim-link-muted"
                    href={`${GITHUB_REPO_URL}/issues/${b.issueNumber}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {t("issue", { number: b.issueNumber })}
                  </a>
                ) : (
                  <span className="text-ink-muted text-xs">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function CommunityBountyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "communityBounty" });
  const rows = await resolveBountyListings();
  const openCount = rows.filter((r) => r.status === "Open").length;
  const primaryClaim = claimIssueUrl(BOUNTY_LISTINGS[0]);
  const steps = t.raw("steps") as { n: string; title: string; body: string }[];
  const faqItems = t.raw("faq.items") as { q: string; a: string }[];

  return (
    <div className="bounty-page min-h-screen bg-paper">
      <nav className="border-b border-border bg-paper/80 backdrop-blur sticky top-0 z-40">
        <div className="nav-inner">
          <Link
            href="/"
            className="font-sans font-semibold text-lg tracking-tight text-legal-navy"
          >
            ClauseCheck
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/community/bounty"
              locale={locale === "zh" ? "en" : "zh"}
              className="text-xs font-sans text-ink-muted hover:text-ink"
            >
              {locale === "zh" ? "EN" : "中文"}
            </Link>
            <a
              href={primaryClaim}
              className="btn btn-primary text-xs"
              target="_blank"
              rel="noopener noreferrer"
            >
              {t("navClaim")}
            </a>
          </div>
        </div>
      </nav>

      <header className="bounty-hero">
        <p className="bounty-brand">{t("brand")}</p>
        <h1 className="bounty-hero-title">{t("heroTitle")}</h1>
        <p className="bounty-hero-sub">{t("heroSub", { openCount })}</p>
        <div className="bounty-hero-actions">
          <a
            href={primaryClaim}
            className="btn btn-primary"
            target="_blank"
            rel="noopener noreferrer"
          >
            {t("navClaim")}
          </a>
          <a
            href={`${GITHUB_REPO_URL}/blob/main/${CONTRIBUTING_DOC_PATH}`}
            className="btn btn-outline"
            target="_blank"
            rel="noopener noreferrer"
          >
            {t("readGuide")}
          </a>
        </div>
        <p className="bounty-disclaimer">{t("disclaimer")}</p>
      </header>

      <section className="bounty-section">
        <div className="page-content-wide">
          <p className="section-label">{t("boardLabel")}</p>
          <h2 className="bounty-section-title">{t("boardTitle")}</h2>
          <p className="bounty-section-lead">
            {t("boardLead")}
            <code className="bounty-code">{t("boardLeadCode")}</code>
            {t("boardLeadAfter")}
          </p>
          <BountyTable rows={rows} t={t} />
        </div>
      </section>

      <section className="bounty-section bounty-section-alt">
        <div className="page-content-wide">
          <p className="section-label">{t("stepsLabel")}</p>
          <h2 className="bounty-section-title">{t("stepsTitle")}</h2>
          <ol className="bounty-steps">
            {steps.map((s) => (
              <li key={s.n} className="bounty-step">
                <span className="bounty-step-n" aria-hidden>
                  {s.n}
                </span>
                <div>
                  <h3 className="bounty-step-title">{s.title}</h3>
                  <p className="bounty-step-body">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="bounty-section">
        <div className="page-content-wide">
          <p className="section-label">{t("resourcesLabel")}</p>
          <h2 className="bounty-section-title">{t("resourcesTitle")}</h2>
          <ul className="bounty-resources">
            <li>
              <a
                href={`${GITHUB_REPO_URL}/blob/main/${CONTRIBUTING_DOC_PATH}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                {t("resContributing")}
              </a>
              <span>{t("resContributingHint")}</span>
            </li>
            <li>
              <code className="bounty-code">
                npm run new-pack -- --id=sg --name=&quot;Singapore&quot;
              </code>
              <span>{t("resScaffoldHint")}</span>
            </li>
            <li>
              <a
                href={`${GITHUB_REPO_URL}/blob/main/${EXAMPLE_PACK_PATH}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                {t("resExample")}
              </a>
              <span>{t("resExampleHint")}</span>
            </li>
            <li>
              <a
                href={DISCORD_INVITE_URL}
                target="_blank"
                rel="noopener noreferrer"
              >
                {t("resDiscord")}
              </a>
              <span>{t("resDiscordHint")}</span>
            </li>
          </ul>
        </div>
      </section>

      <section className="bounty-section bounty-section-alt">
        <div className="page-content-wide max-w-2xl mx-auto">
          <p className="section-label">{t("faqLabel")}</p>
          <h2 className="bounty-section-title mb-6">{t("faqTitle")}</h2>
          <div className="space-y-0">
            {faqItems.map((item) => (
              <FAQItem key={item.q} q={item.q} a={item.a} />
            ))}
          </div>
        </div>
      </section>

      <section className="bounty-footer-cta">
        <div className="page-content-wide max-w-xl mx-auto text-center">
          <h2 className="bounty-section-title mb-3">{t("footerTitle")}</h2>
          <p className="bounty-footer-lead">{t("footerLead")}</p>
          <a
            href={primaryClaim}
            className="btn btn-primary"
            target="_blank"
            rel="noopener noreferrer"
          >
            {t("navClaim")}
          </a>
          <p className="bounty-disclaimer mt-6">{t("footerDisclaimer")}</p>
          <Link
            href="/"
            className="inline-block mt-6 text-xs font-sans text-ink-muted hover:text-ink"
          >
            {t("backHome")}
          </Link>
        </div>
      </section>
    </div>
  );
}
