# Product Hunt Launch Kit — ClauseCheck

Copy-paste ready. Tone: professional, confident, co-create (not “please test for us”).  
Product stance: **decision support, not legal advice.**

---

## Taglines (≤60 characters)

| # | Tagline | Chars | Note |
|---|---------|------:|------|
| **1 ★** | **AI contract review, calibrated by real lawyers** | 48 | **Recommended** — clear + co-creation |
| 2 | Multi-jurisdiction contract risk, privacy-first | 49 | Emphasizes isolation + privacy |
| 3 | From missing DPA to draft — in one review flow | 49 | Outcome-oriented hook |

---

## Description (≤500 characters)

**Recommended (~420 chars):**

> ClauseCheck is AI contract review built for negotiation — not vague advice. Upload a PDF/DOCX, get severity-ranked risks with paste-ready redlines in ~30s. Jurisdiction Packs + RAG metadata keep California deals free of misplaced Civil Code cites. Spot a missing DPA? Generate a draft (free preview / Pro unlock). Beta founders co-create quality via Accurate / Missed / False Positive feedback. Privacy-first: feedback stores SHA-256 hashes, never contract bodies. Decision support only — not legal advice.

---

## First Comment (Maker)

```
Hey Product Hunt 👋

I'm the maker of ClauseCheck.

I've watched too many teams either rubber-stamp vendor paper or pay counsel for a first pass that still starts with “what does this even say?” ClauseCheck is the missing middle: AI risk grading with paste-ready redlines, multi-jurisdiction packs (so the wrong statute family doesn’t leak in), and a path from “missing DPA” to a draft you can actually negotiate.

Why now: we shipped Base + Jurisdiction Packs, a feedback loop for lawyer-calibrated golden data, and Pro-gated DPA generation. We’re opening beta to co-create the quality bar with practitioners — not to extract free QA.

Beta perks for founding members:
• Lifetime 30% off Pro
• 5 free DPA generations
• Founding Member badge

Join: https://www.clausecheck.cc/beta
Feedback channel: reply here or email support@clausecheck.cc

We’re especially looking for GCs, startup operators, and counsel who review SaaS / NDA / cross-border paper weekly. Tell us what we got wrong — that’s the product.

— not legal advice; decision support for humans who still decide.
```

---

## Maker Bio (≤150 words)

> Builder at the intersection of law-adjacent workflows and product engineering. I ship bilingual (EN/ZH) tools that turn opaque contracts into negotiation-ready risk reports — with jurisdiction isolation and privacy-first feedback (hash-only). Previously focused on making high-stakes documents usable for non-lawyers without pretending to replace counsel. Based in Singapore; shipping ClauseCheck as an independent maker.

(~70 words)

---

## Screenshot Specs (Product Hunt)

**Canvas:** 1270 × 760 px (PH gallery recommended), PNG or JPG, ≤5 MB each.

| # | Filename suggestion | Content |
|---|---------------------|---------|
| 1 | `ph-01-hero-report.png` | Report hero: signing verdict + score ring + 2–3 high flags |
| 2 | `ph-02-split-review.png` | Split review UI (source left / suggestions right, 82vh feel) |
| 3 | `ph-03-jurisdiction.png` | Governing Law picker + Pack isolation diagram (`/beta/jurisdiction-safe.svg` upscaled) |
| 4 | `ph-04-dpa-gate.png` | DPA free watermarked preview vs Pro unlock (`/beta/dpa-preview.png`) |
| 5 | `ph-05-feedback.png` | Accurate / Missed / False Positive feedback states (`/beta/feedback-loop.png`) |

**Tips:** No fake “100% accurate” claims. Include small footer: “Decision support — not legal advice.” Prefer real UI over mock dashboards.

---

## Launch Day Checklist

### T−24h
- [ ] `/beta` live; subscribe API smoke-tested
- [ ] PH gallery assets exported at 1270×760
- [ ] Tagline + description + first comment drafted in notes
- [ ] Soft ping 10–15 warm supporters (no vote farming)
- [ ] Demo video/GIF at `/assets/beta-demo.mp4` or poster OK

### Launch moment (hour 0)
- [ ] Submit / go live on PH
- [ ] Post first comment within 5 minutes
- [ ] Share to personal Twitter/X + LinkedIn
- [ ] Post Indie Hackers “Launch” thread
- [ ] Pin beta URL in relevant Slack/Discord (where allowed)

### T+6h
- [ ] Reply to every PH comment (substantive, not “thanks!!”)
- [ ] Fix any broken links / subscribe errors
- [ ] Post one “what we learned so far” update in PH thread

### T+24h
- [ ] Thank supporters; share top feedback themes
- [ ] Invite engaged commenters to beta with founding perk reminder
- [ ] Capture ranking screenshot for portfolio
- [ ] Schedule week-2 product update from feedback themes

---

## Social Copy Templates

### Twitter / X

```
Shipping ClauseCheck on Product Hunt today 🚀

AI contract review with:
• paste-ready redlines (not vague advice)
• jurisdiction packs (no statute leakage)
• missing DPA → draft generation

Beta founders co-create quality + get lifetime Pro perks.

→ https://www.clausecheck.cc/beta

#ProductHunt #LegalTech #SaaS #BuildInPublic
```

### LinkedIn

```
Excited to share ClauseCheck on Product Hunt.

We built AI contract review for people who negotiate — severity-ranked risks, paste-ready clause language, multi-jurisdiction isolation, and a path from “missing DPA” to a draft.

Beta is open for founding members who want to co-create the quality bar (Accurate / Missed Issue / False Positive feedback). Privacy-first: feedback stores hashes, not contract bodies.

Decision support only — not legal advice.

Join the beta: https://www.clausecheck.cc/beta
Would love feedback from GCs, founders, and counsel who live in MSAs and NDAs.
```

### Indie Hackers

```
🚀 Launched: ClauseCheck — AI contract review, calibrated with practitioner feedback

Problem: first-pass contract review is either too expensive or too shallow.
What I shipped: jurisdiction-aware risk grading + redlines + DPA draft hook + feedback golden-set loop.
Ask: beta users who review SaaS/NDA paper weekly — tell me what we miss.

Link: https://www.clausecheck.cc/beta
PH: [paste your PH URL]

Happy to share technical notes on Base+Pack prompts and hash-only feedback if useful.
```

---

## Links

- Beta landing: `/beta` (EN) · `/zh/beta` (ZH)
- Subscribe API: `POST /api/beta/subscribe`
- Pack contributions: `docs/contributing-jurisdiction-packs.md`
