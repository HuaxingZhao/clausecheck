/**
 * Overlay bounty Open/Claimed status from GitHub Issues (label: bounty).
 * Fails soft — page stays fully static with catalog defaults.
 */

import {
  BOUNTY_LISTINGS,
  GITHUB_REPO,
  type BountyListing,
  type BountyStatus,
} from "./bounty-catalog";

interface GhIssue {
  number: number;
  title: string;
  state: string;
  html_url: string;
  user?: { login: string } | null;
  assignees?: { login: string }[];
  labels?: { name: string }[];
}

function inferStatus(issue: GhIssue): BountyStatus {
  const labelNames = (issue.labels || []).map((l) => l.name.toLowerCase());
  if (labelNames.includes("completed") || issue.state === "closed") {
    return "Completed";
  }
  if (labelNames.includes("in-review") || labelNames.includes("in review")) {
    return "In Review";
  }
  if (
    (issue.assignees && issue.assignees.length > 0) ||
    labelNames.includes("claimed")
  ) {
    return "Claimed";
  }
  return "Open";
}

function matchListing(issue: GhIssue): BountyListing | undefined {
  const t = issue.title.toLowerCase();
  return BOUNTY_LISTINGS.find((b) => {
    if (t.includes(b.packId.toLowerCase())) return true;
    if (t.includes(b.jurisdiction.toLowerCase())) return true;
    // loose tokens
    const tokens = b.jurisdiction.toLowerCase().split(/[\s,()&]+/).filter(Boolean);
    return tokens.every((tok) => tok.length < 3 || t.includes(tok));
  });
}

export async function resolveBountyListings(): Promise<BountyListing[]> {
  const base = BOUNTY_LISTINGS.map((b) => ({ ...b }));

  try {
    const res = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/issues?labels=bounty&state=all&per_page=50`,
      {
        headers: {
          Accept: "application/vnd.github+json",
          "User-Agent": "clausecheck-bounty-page",
          ...(process.env.GITHUB_TOKEN
            ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }
            : {}),
        },
        next: { revalidate: 3600 },
      }
    );
    if (!res.ok) return base;

    const issues = (await res.json()) as GhIssue[];
    if (!Array.isArray(issues)) return base;

    for (const issue of issues) {
      const hit = matchListing(issue);
      if (!hit) continue;
      const row = base.find((b) => b.id === hit.id);
      if (!row) continue;
      row.issueNumber = issue.number;
      row.status = inferStatus(issue);
      const assignee =
        issue.assignees?.[0]?.login || issue.user?.login || null;
      row.assignee =
        row.status === "Open" ? null : assignee ? `@${assignee}` : null;
    }
  } catch {
    /* keep static defaults */
  }

  return base;
}
