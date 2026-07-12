import type { Metadata } from "next";
import Link from "next/link";
import FAQItem from "../../components/faq-item";
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

export const metadata: Metadata = {
  title: "Jurisdiction Pack Bounty | ClauseCheck Community",
  description:
    "Help ClauseCheck cover your legal system. Claim a bounty, scaffold a Jurisdiction Pack, and earn Lifetime Pro (and cash for High priority).",
  openGraph: {
    title: "Jurisdiction Pack Bounty | ClauseCheck",
    description:
      "Community packs for New York, England & Wales, Singapore, Germany, Australia (NSW). Co-create — not cheap outsourcing.",
  },
};

const STEPS = [
  {
    n: "1",
    title: "Read Docs",
    body: "Learn the Pack interface, naming, and review constraints.",
  },
  {
    n: "2",
    title: "Scaffold",
    body: "Generate pack + tests + registry wiring with one command.",
  },
  {
    n: "3",
    title: "Test",
    body: "Add ± pattern tests and pass AI / local pre-check.",
  },
  {
    n: "4",
    title: "PR",
    body: "Open a pull request; CI validates packs/ changes.",
  },
];

const FAQ = [
  {
    q: "What are the review standards?",
    a: "We check (1) jurisdiction-specific guidance without restating Base, (2) distinctive governing-law patterns with ± tests, (3) token budget and validate:pack, (4) paste-ready suggestion norms. Legal accuracy is reviewed in good faith by maintainers and community peers — not a bar certification.",
  },
  {
    q: "When are rewards paid?",
    a: "After your PR merges and the pack ships to production (or is marked Completed on the bounty issue). Lifetime / 1-year Pro is provisioned within 7 business days; cash rewards for High priority are paid after a short verification email.",
  },
  {
    q: "Can multiple people collaborate?",
    a: "Yes — claim the bounty issue first (assign yourself), then collaborate on one PR. Split credit in the PR description; we list all named contributors on the pack credits page. First clear claim on an Open bounty is respected unless abandoned (>14 days with no PR).",
  },
  {
    q: "Who owns the intellectual property?",
    a: "By opening a PR you license your contribution under the same terms as the repository (see LICENSE). You retain credit as author. Do not paste confidential client work or copyrighted statute text verbatim beyond short fair-use citations.",
  },
];

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

function BountyTable({ rows }: { rows: BountyListing[] }) {
  return (
    <div className="bounty-table-wrap">
      <table className="bounty-table">
        <thead>
          <tr>
            <th>Jurisdiction</th>
            <th>Priority</th>
            <th>Reward</th>
            <th>Status</th>
            <th>Assignee</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.map((b) => (
            <tr key={b.id}>
              <td className="bounty-jurisdiction">{b.jurisdiction}</td>
              <td>
                <span className={priorityClass(b.priority)}>{b.priority}</span>
              </td>
              <td className="bounty-reward">{b.reward}</td>
              <td>
                <span className={statusClass(b.status)}>{b.status}</span>
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
                    Claim
                  </a>
                ) : b.issueNumber ? (
                  <a
                    className="bounty-claim-link bounty-claim-link-muted"
                    href={`${GITHUB_REPO_URL}/issues/${b.issueNumber}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Issue #{b.issueNumber}
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
  const rows = await resolveBountyListings();
  const openCount = rows.filter((r) => r.status === "Open").length;
  const primaryClaim = claimIssueUrl(BOUNTY_LISTINGS[0]);

  return (
    <div className="bounty-page min-h-screen bg-paper">
      <nav className="border-b border-border bg-paper/80 backdrop-blur sticky top-0 z-40">
        <div className="nav-inner">
          <Link
            href={`/${locale}`}
            className="font-sans font-semibold text-lg tracking-tight text-legal-navy"
          >
            ClauseCheck
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href={`/${locale === "zh" ? "en" : "zh"}/community/bounty`}
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
              Claim a Bounty
            </a>
          </div>
        </div>
      </nav>

      <header className="bounty-hero">
        <p className="bounty-brand">ClauseCheck Community</p>
        <h1 className="bounty-hero-title">
          Jurisdiction Pack Bounty: Help Us Cover Your Legal System
        </h1>
        <p className="bounty-hero-sub">
          Co-create decision-support Packs with practitioners who know the law
          on the ground. {openCount} open {openCount === 1 ? "slot" : "slots"} —
          High priority includes Lifetime Pro and a cash thank-you.
        </p>
        <div className="bounty-hero-actions">
          <a
            href={primaryClaim}
            className="btn btn-primary"
            target="_blank"
            rel="noopener noreferrer"
          >
            Claim a Bounty
          </a>
          <a
            href={`${GITHUB_REPO_URL}/blob/main/${CONTRIBUTING_DOC_PATH}`}
            className="btn btn-outline"
            target="_blank"
            rel="noopener noreferrer"
          >
            Read contributing guide
          </a>
        </div>
        <p className="bounty-disclaimer">
          Community packs are reviewed but not guaranteed. Always verify. Not
          legal advice.
        </p>
      </header>

      <section className="bounty-section">
        <div className="page-content-wide">
          <p className="section-label">Open bounties</p>
          <h2 className="bounty-section-title">Bounty board</h2>
          <p className="bounty-section-lead">
            Status refreshes from GitHub Issues labeled{" "}
            <code className="bounty-code">bounty</code> (hourly). Claim via
            Issue before starting work.
          </p>
          <BountyTable rows={rows} />
        </div>
      </section>

      <section className="bounty-section bounty-section-alt">
        <div className="page-content-wide">
          <p className="section-label">How to participate</p>
          <h2 className="bounty-section-title">Four steps</h2>
          <ol className="bounty-steps">
            {STEPS.map((s) => (
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
          <p className="section-label">Resources</p>
          <h2 className="bounty-section-title">Start with these</h2>
          <ul className="bounty-resources">
            <li>
              <a
                href={`${GITHUB_REPO_URL}/blob/main/${CONTRIBUTING_DOC_PATH}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Contributing Jurisdiction Packs
              </a>
              <span> — interface, naming, PR flow</span>
            </li>
            <li>
              <code className="bounty-code">
                npm run new-pack -- --id=sg --name=&quot;Singapore&quot;
              </code>
              <span> — scaffold pack + tests + registry</span>
            </li>
            <li>
              <a
                href={`${GITHUB_REPO_URL}/blob/main/${EXAMPLE_PACK_PATH}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Example Pack (us-ca)
              </a>
              <span> — reference implementation</span>
            </li>
            <li>
              <a
                href={DISCORD_INVITE_URL}
                target="_blank"
                rel="noopener noreferrer"
              >
                Discord — #jurisdiction-packs
              </a>
              <span> — ask questions, find collaborators</span>
            </li>
          </ul>
        </div>
      </section>

      <section className="bounty-section bounty-section-alt">
        <div className="page-content-wide max-w-2xl mx-auto">
          <p className="section-label">FAQ</p>
          <h2 className="bounty-section-title mb-6">Before you claim</h2>
          <div className="space-y-0">
            {FAQ.map((item) => (
              <FAQItem key={item.q} q={item.q} a={item.a} />
            ))}
          </div>
        </div>
      </section>

      <section className="bounty-footer-cta">
        <div className="page-content-wide max-w-xl mx-auto text-center">
          <h2 className="bounty-section-title mb-3">Ready to claim?</h2>
          <p className="bounty-footer-lead">
            Open a GitHub Issue with the bounty template — we will coordinate
            review and reward fulfillment from there.
          </p>
          <a
            href={primaryClaim}
            className="btn btn-primary"
            target="_blank"
            rel="noopener noreferrer"
          >
            Claim a Bounty
          </a>
          <p className="bounty-disclaimer mt-6">
            Community packs are reviewed but not guaranteed. Always verify.
          </p>
          <Link
            href={`/${locale}`}
            className="inline-block mt-6 text-xs font-sans text-ink-muted hover:text-ink"
          >
            ← Back to ClauseCheck
          </Link>
        </div>
      </section>
    </div>
  );
}
