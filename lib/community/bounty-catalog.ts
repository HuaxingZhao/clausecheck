/**
 * Static catalog for Jurisdiction Pack Bounty campaign.
 * Status/assignee overlay comes from GitHub Issues when available.
 */

export type BountyPriority = "High" | "Medium" | "Low";
export type BountyStatus = "Open" | "Claimed" | "In Review" | "Completed";

export interface BountyListing {
  id: string;
  /** Pack id scaffold target, e.g. us-ny */
  packId: string;
  jurisdiction: string;
  priority: BountyPriority;
  reward: string;
  /** Default static status before GitHub overlay */
  status: BountyStatus;
  assignee: string | null;
  /** Optional GitHub issue number once seeded */
  issueNumber?: number;
}

export const GITHUB_REPO = "HuaxingZhao/clausecheck";
export const GITHUB_REPO_URL = `https://github.com/${GITHUB_REPO}`;
export const CONTRIBUTING_DOC_PATH = "docs/contributing-jurisdiction-packs.md";
export const EXAMPLE_PACK_PATH =
  "lib/prompts/jurisdiction-packs/packs/us-ca.ts";

/**
 * Real Discord invite only — set NEXT_PUBLIC_DISCORD_INVITE.
 * Empty when unset so the bounty page can hide a dead placeholder link.
 */
export const DISCORD_INVITE_URL =
  process.env.NEXT_PUBLIC_DISCORD_INVITE?.trim() || "";

export const BOUNTY_LISTINGS: BountyListing[] = [
  {
    id: "us-ny",
    packId: "us-ny",
    jurisdiction: "New York, US",
    priority: "High",
    reward: "Lifetime Pro + $100",
    status: "Open",
    assignee: null,
  },
  {
    id: "uk",
    packId: "uk",
    jurisdiction: "England & Wales",
    priority: "High",
    reward: "Lifetime Pro + $100",
    status: "Open",
    assignee: null,
  },
  {
    id: "sg",
    packId: "sg",
    jurisdiction: "Singapore",
    priority: "Medium",
    reward: "Lifetime Pro",
    status: "Open",
    assignee: null,
  },
  {
    id: "de",
    packId: "de",
    jurisdiction: "Germany (DE)",
    priority: "Medium",
    reward: "Lifetime Pro",
    status: "Open",
    assignee: null,
  },
  {
    id: "au-nsw",
    packId: "au-nsw",
    jurisdiction: "Australia (NSW)",
    priority: "Low",
    reward: "Pro 1-year",
    status: "Open",
    assignee: null,
  },
];

export function claimIssueUrl(bounty: BountyListing): string {
  const reserved = ["us-ny", "uk", "us-ca", "cn", "intl"].includes(bounty.packId);
  const title = encodeURIComponent(
    `[Bounty] ${bounty.jurisdiction} Jurisdiction Pack`
  );
  const labels = encodeURIComponent("bounty,jurisdiction-pack,help-wanted");
  const scaffoldLine = reserved
    ? `- [ ] I will expand the existing \`${bounty.packId}\` pack (patterns, addon depth, ± tests) — id is reserved; do not re-scaffold`
    : `- [ ] I will run \`npm run new-pack -- --id=${bounty.packId} --name="${bounty.jurisdiction}"\``;
  const body = encodeURIComponent(
    [
      `## Bounty claim`,
      ``,
      `- **Jurisdiction:** ${bounty.jurisdiction}`,
      `- **Pack id:** \`${bounty.packId}\``,
      `- **Priority:** ${bounty.priority}`,
      `- **Reward:** ${bounty.reward}`,
      `- **Mode:** ${reserved ? "Expand existing built-in pack" : "New community pack"}`,
      ``,
      `## Checklist`,
      ``,
      `- [ ] I read [Contributing Jurisdiction Packs](${CONTRIBUTING_DOC_PATH})`,
      scaffoldLine,
      `- [ ] I will pass \`npm run validate:pack -- --id=${bounty.packId}\``,
      `- [ ] I will add / strengthen positive + negative pattern tests`,
      `- [ ] (Optional) Brief note on legal / professional background`,
      ``,
      `## Notes`,
      ``,
      `_Community packs are reviewed but not guaranteed. Always verify._`,
      ``,
    ].join("\n")
  );
  return `${GITHUB_REPO_URL}/issues/new?template=pack-bounty.md&title=${title}&labels=${labels}&body=${body}`;
}
