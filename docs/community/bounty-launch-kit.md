# Jurisdiction Pack Bounty — Launch Kit

Operational kit for cold-starting community Pack contributions.  
Tone: open, respectful of professional expertise, co-creation — **not** cheap outsourcing.

> Community packs are reviewed but not guaranteed. Always verify.  
> ClauseCheck is decision support, **not legal advice**.

| Asset | Path / URL |
|-------|------------|
| Bounty page | `/en/community/bounty` (prod: `https://www.clausecheck.cc/en/community/bounty`) |
| Issue template | `.github/ISSUE_TEMPLATE/pack-bounty.md` |
| PR template | `.github/pull_request_template.md` |
| Contributing docs | `docs/contributing-jurisdiction-packs.md` |
| Discord invite env | `NEXT_PUBLIC_DISCORD_INVITE` (fallback placeholder on page) |

---

## 1. Announcement posts

### Twitter / X

```text
We're opening a Jurisdiction Pack Bounty.

If you practice (or deeply know) NY, England & Wales, Singapore, Germany, or NSW law — help ClauseCheck cover your system.

• Lifetime Pro (High priority also +$100)
• Scaffold in one command + automated pre-check
• Your name on the pack credits

This is co-creation with practitioners — not gig legal work.

Claim → https://www.clausecheck.cc/en/community/bounty

Community packs are reviewed but not guaranteed. Always verify.
```

### LinkedIn

```text
ClauseCheck is inviting practitioners to co-create Jurisdiction Packs — small, reviewable modules that teach our contract-risk scanner how a legal system actually behaves.

Why this matters:
• Buyers in your market get decision-support calibrated to local norms — not a one-size-fits-all checklist
• You keep authorship credit; we handle scaffolding, CI pre-check, and product integration
• High-priority packs (New York; England & Wales) include Lifetime Pro + a $100 thank-you; others include Lifetime or 1-year Pro

This is not outsourced memo writing. Packs are concise, testable, paste-ready guidance for negotiation — never a substitute for counsel.

Open board + claim flow: https://www.clausecheck.cc/en/community/bounty
Guide: https://github.com/HuaxingZhao/clausecheck/blob/main/docs/contributing-jurisdiction-packs.md

Community packs are reviewed but not guaranteed. Always verify.
```

### Discord (#announcements or #jurisdiction-packs)

```text
**Jurisdiction Pack Bounty is live**

We want people who know a legal system — not freelancers racing to fill a form.

Board: https://www.clausecheck.cc/en/community/bounty
1. Claim via GitHub Issue (template auto-fills)
2. `npm run new-pack` (or expand reserved packs like us-ny / uk)
3. `npm run validate:pack`
4. Open a PR — CI + maintainer review

Rewards: Lifetime Pro (+ $100 for High). Credits on the pack page.

Questions → thread here. Respectful critique of draft packs welcome.

_Community packs are reviewed but not guaranteed. Always verify._
```

---

## 2. Email template (Beta legal professionals)

**Subject:** Help ClauseCheck cover your jurisdiction — Pack Bounty

```text
Hi {{first_name}},

You’ve been in the ClauseCheck Beta. We’re launching a small, practitioner-led bounty to extend Jurisdiction Packs — the modules that keep reviews from leaking the wrong statute into the wrong deal.

We’re especially looking for people with NY, England & Wales, Singapore, Germany, or NSW depth. If that’s you (or a colleague you’d vouch for), we’d rather co-create with you than invent from afar.

What’s involved
• Claim an open bounty on the board
• Scaffold (or deepen) a Pack — patterns, focused prompt addon, ± tests
• Pass local pre-check; open a PR

What you get
• Lifetime Pro (High priority: also a $100 thank-you)
• Named credit on the pack
• A clear review checklist — we respect your time

Board: https://www.clausecheck.cc/en/community/bounty
Guide: https://github.com/HuaxingZhao/clausecheck/blob/main/docs/contributing-jurisdiction-packs.md

No pressure if the timing is wrong — a forward to the right person is equally helpful.

— The ClauseCheck team

P.S. Community packs are reviewed but not guaranteed. Always verify. ClauseCheck is decision support, not legal advice.
```

---

## 3. Maintainer Review Checklist

Use on every Pack PR (bounty or organic).

### Legal / product accuracy (good-faith review)

- [ ] Addon content is specific to this jurisdiction (regulators, citation style, local mandatory themes)
- [ ] No instruction to apply other jurisdictions’ statutes in the same review
- [ ] No claim of legal advice, fixed accuracy, or “guaranteed compliance”
- [ ] Short citations only — no pasted confidential client work or long copyrighted statute dumps
- [ ] Signing / severity calibration feels market-aware (not everything “High”)

### Technical norms

- [ ] `id` / file / registry wiring correct; reserved ids not re-created as new packs
- [ ] `governingLawPatterns` distinctive; unlikely to false-match other systems
- [ ] `systemPromptAddon` within ~2000-token estimate; no Base checklist restatement
- [ ] `boilerplateRequirements` format `Clause (basis)`; no Base 12-category titles
- [ ] CI `validate:pack` green

### Tests

- [ ] ≥1 positive pattern case
- [ ] ≥1 negative pattern case (another jurisdiction’s law text)
- [ ] Manual spot-check: sample contract snippet detects expected pack via heuristic (optional)

### Process

- [ ] Bounty Issue linked; status → In Review / Completed
- [ ] Contributor(s) listed for credits page
- [ ] Disclaimer preserved in user-facing surfaces

---

## 4. Reward Fulfillment SOP

1. **Merge gate** — PR merged; bounty Issue labeled `completed` or closed with comment linking the commit.
2. **Pro entitlement**
   - Locate or create user by email from Issue / PR.
   - Grant Lifetime Pro or Pro 1-year per bounty row (ops: credit / `pro_until` / plan flag — follow current billing SOP).
   - Confirm in Issue comment: “Pro provisioned on YYYY-MM-DD.”
3. **Cash (High only)** — Collect payout details via private email; record in internal ops sheet; pay within 14 days of merge; never post payment details publicly.
4. **Credits** — Add name (and optional LinkedIn) to community credits section / README Contributors; commit with `docs: credit @user for {pack}`.
5. **Thank-you tweet** (optional, ask permission):

```text
Thank you @{{handle}} for the {{jurisdiction}} Jurisdiction Pack on ClauseCheck — practitioner-built, CI-checked, now helping reviewers stay in the right legal system.

Board still open → https://www.clausecheck.cc/en/community/bounty

Community packs are reviewed but not guaranteed. Always verify.
```

6. **Close the loop** — Email contributor with Pro confirmation + credits link + invite to Discord `#jurisdiction-packs`.

---

## 5. Timeline

| Phase | When | Actions |
|-------|------|---------|
| **T0 — Announce** | Day 0 | Ship `/community/bounty`; post Twitter + LinkedIn + Discord; email Beta legal cohort; seed GitHub Issues for each open bounty (optional, labels already on template). |
| **T1 — First reminder** | Day 7 | Discord bump; reply to interested claimants; ensure scaffold docs are clear. |
| **T2 — Mid progress** | Day 21 | Public progress note (Issues claimed / PRs open); offer office-hours thread; re-prioritize if High slots idle. |
| **T3 — Soft deadline** | Day 45 | Reminder: abandon claims without PR after 14 idle days; keep board open for Medium/Low. |
| **T4 — Results** | Day 60 | Publish results: merged packs, credits, thank-yous; keep remaining Open bounties live as evergreen. |

Adjust dates for Product Hunt or conference moments; keep the disclaimer on every public post.

---

## 6. Operator notes

- **NY / England & Wales** packs already exist as built-ins (`us-ny`, `uk`). Bounties mean **expand & harden** (patterns, depth, tests), not duplicate ids.
- **Singapore / Germany / NSW** are net-new (`sg`, `de`, `au-nsw`) via `npm run new-pack`.
- Set `NEXT_PUBLIC_DISCORD_INVITE` before launch so the page does not hit a dead invite.
- Optional: `GITHUB_TOKEN` (read-only public_repo) improves Issue status overlay rate limits on the bounty page (ISR `revalidate: 3600`).
