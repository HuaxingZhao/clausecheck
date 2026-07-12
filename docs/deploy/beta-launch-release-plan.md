# Beta Launch — Minimal Releasable Commit Plan + DB Gate

> Generated 2026-07-12 · Branch: `feat/supabase-phone-auth` (local WIP ahead of production `00d4d6f`)  
> Goal: ship `/beta`, Packs, feedback, DPA, bounty without unrelated noise.  
> **Do not commit yet from this doc alone — execute in order after review.**

Production today: `https://www.clausecheck.cc/beta` → **404**. Health OK on older SHA.

---

## 0. Exclude from all commits

| Path | Reason |
|------|--------|
| `.cursor/settings.json` | Local IDE |
| `supabase/.temp/**` | Linked-project secrets / pooler URLs |
| `tmp/**` | Review JSON dumps / debug artifacts |
| `data/feedback.json` | Local seed only (not production data) |
| `docs/screenshots/fewshots-auto-preview.html` | Local preview helper (optional) |
| `.env*` | Secrets (already gitignored) |
| Any `*_review-full.json` under `tmp/` | Contract output dumps |

**Optional defer (not blocking beta page):**

| Path | Note |
|------|------|
| `lib/prompts/jurisdiction-packs/packs/us-ca/fewshots-auto.json` | Generated from seed; include only if you want auto-fewshots live day-1 |
| `docs/screenshots/**` | Nice-to-have evidence; can follow in docs commit |
| `app/[locale]/dev/**` | Dev-only previews (`NODE_ENV===production` → 404 for dashboard preview). Safe to ship; or defer |

---

## 1. Commit plan (dependency order)

Execute on a clean release branch (recommended):

```bash
git fetch origin
git checkout -b release/beta-launch origin/main
# cherry-pick / merge feat/supabase-phone-auth after commits land there,
# OR apply the same file sets as staged commits below on current branch then PR → main.
```

### Commit A — DB migrations + ensureSchema hooks

| | |
|--|--|
| **Message** | `feat(db): add feedback and beta_waitlist tables` |
| **Risk** | **Med** — schema create only (`IF NOT EXISTS`); app also auto-ensures on boot |
| **Breaking** | No |
| **Env / secrets** | Requires existing `DATABASE_URL` (already on Vercel) |

**Files:**

```text
supabase/migrations/20260712_create_feedback.sql
supabase/migrations/20260712_create_beta_waitlist.sql
lib/db/ensure-feedback-schema.ts
lib/db/ensure-beta-waitlist-schema.ts
lib/db/pg.ts
```

**Pre-deploy (before or with first traffic):** run SQL in Supabase/Neon (see §2).  
`ensureSchema()` is a safety net but **explicit migration is required** for ops clarity / RLS policies later.

---

### Commit B — Jurisdiction Packs + RAG filter (core review engine)

| | |
|--|--|
| **Message** | `feat(ai): jurisdiction packs and RAG jurisdiction filter` |
| **Risk** | **High** — changes expert prompt assembly + knowledge retrieval for all scans |
| **Breaking** | Soft behavior change (pack isolation); API shape mostly additive (`jurisdiction`, `feedbackMeta`) |
| **Env / secrets** | None new. `OPENAI_API_KEY` already required |

**Files (illustrative — stage the whole trees):**

```text
lib/jurisdiction.ts
lib/jurisdiction.test.ts
lib/prompts/**                 # packs, registry, fewshots helpers, dpa-generator
lib/rag/**
lib/ai/expert-system-prompt.ts
lib/ai/retrieve-compliance-rules.ts
lib/ai/retrieve-compliance-rules.test.ts
lib/ai/review-contract.ts
lib/ai/review-contract.test.ts
lib/ai/validate-review-output.ts
lib/ai/validate-review-output.test.ts
lib/ai/index.ts
lib/analyze.ts
lib/scenario-knowledge.ts
lib/scenario-rag.ts
lib/types.ts
lib/credits/scan-form.ts
app/api/scan/route.ts
app/api/scan/refine/route.ts
app/api/review/route.ts
scripts/backfill-knowledge-jurisdiction.ts
scripts/new-pack.ts
scripts/validate-pack.ts
scripts/test-review-contract.ts
package.json                   # test + pack scripts only in this commit if possible
next.config.mjs                # .txt asset/source for fixtures
types/txt-modules.d.ts
src/prompts/jurisdiction-packs/types.ts   # re-export alias
tests/packs/.gitkeep
.github/workflows/validate-packs.yml
docs/contributing-jurisdiction-packs.md
docs/AI_REVIEW_ENGINE.md
fixtures/contracts/saas-ca-*.txt
fixtures/saas-ca-reasonable.json
```

**Gate before merge:**

```bash
npm test
npm run validate:pack -- --all
```

---

### Commit C — Review feedback loop (API + UI + i18n)

| | |
|--|--|
| **Message** | `feat(feedback): review golden-set feedback API and UI` |
| **Risk** | **Med** — new writes to `feedback`; hash-only (privacy OK) |
| **Breaking** | No |
| **Env / secrets** | None new |

**Files:**

```text
lib/feedback/**
lib/db/feedback-store.ts
lib/db/feedback-queries.ts
app/api/feedback/**
app/[locale]/components/review-feedback-*.tsx
app/[locale]/components/review-disclaimer.tsx
app/[locale]/components/results-*.tsx   # wire feedback on report
messages/en.json                         # feedback.* (+ shared keys touched)
messages/zh.json
supabase/migrations/20260712_create_feedback.sql  # if not in A yet
```

---

### Commit D — DPA generator + Pro gate

| | |
|--|--|
| **Message** | `feat(dpa): generate draft with free preview and Pro unlock` |
| **Risk** | **Med** — new OpenAI path + billing gate |
| **Breaking** | No |
| **Env / secrets** | Uses existing `OPENAI_API_KEY`; Pro check uses existing session/credits |

**Files:**

```text
lib/dpa/**
lib/prompts/dpa-generator.ts             # if not already in B
app/api/generate-dpa/**
app/[locale]/components/generate-dpa-*.tsx
messages/en.json / zh.json               # dpa.*
public/beta/dpa-preview.png              # optional asset
```

---

### Commit E — Upload UX: jurisdiction + sample contracts

| | |
|--|--|
| **Message** | `feat(upload): jurisdiction picker and sample contracts` |
| **Risk** | **Low–Med** — home upload flow UX |
| **Breaking** | No |
| **Env / secrets** | None |

**Files:**

```text
app/[locale]/components/jurisdiction-picker.tsx
app/[locale]/components/sample-contract-picker.tsx
lib/demo-samples.ts
app/[locale]/page.tsx
app/[locale]/globals.css                 # shared styles; may split if huge
messages/en.json / zh.json               # sample.*, upload.*
fixtures/contracts/**                    # if not in B
```

---

### Commit F — Beta landing + waitlist API

| | |
|--|--|
| **Message** | `feat(beta): landing page and waitlist subscribe API` |
| **Risk** | **Low** for page; **Med** if Resend notify misconfigured (fails soft) |
| **Breaking** | No |
| **Env / secrets** | Optional: `RESEND_API_KEY`, `EMAIL_FROM`, `ADMIN_EMAILS` (notify on subscribe). Subscribe still writes DB without them. |

**Files:**

```text
app/[locale]/beta/**
app/[locale]/components/beta-subscribe-form.tsx
app/[locale]/components/faq-item.tsx
app/api/beta/**
lib/db/beta-waitlist-store.ts
public/beta/**
public/assets/README.md
messages/en.json / zh.json               # beta.*
docs/launch/product-hunt-kit.md
```

**Note:** `public/assets/beta-demo.mp4` is **missing** — page uses poster fallback. Add video in a follow-up or accept poster-only for launch.

---

### Commit G — Feedback admin dashboard + few-shot pipeline

| | |
|--|--|
| **Message** | `feat(admin): feedback analytics dashboard and few-shot extract` |
| **Risk** | **Low** (admin-gated); few-shot inject affects prompts if `fewshots-auto.json` present → **Med** |
| **Breaking** | No |
| **Env / secrets** | **Required:** `ADMIN_EMAILS` already used by admin. Optional: none |

**Files:**

```text
app/admin/feedback-dashboard/**
app/admin/components/admin-shell.tsx
app/api/admin/feedback/**
scripts/extract-fewshots-from-feedback.ts
lib/prompts/jurisdiction-packs/fewshots.ts
lib/prompts/jurisdiction-packs/fewshots.test.ts
lib/prompts/jurisdiction-packs/packs/us-ca/fewshots-auto.json   # optional
app/[locale]/dev/feedback-dashboard-preview/**                 # optional
package.json                                                   # extract:fewshots script
```

---

### Commit H — Community bounty page + GitHub templates

| | |
|--|--|
| **Message** | `feat(community): jurisdiction pack bounty page and issue templates` |
| **Risk** | **Low** |
| **Breaking** | No |
| **Env / secrets** | Optional: `NEXT_PUBLIC_DISCORD_INVITE`, `GITHUB_TOKEN` (read-only, rate-limit for Issues ISR) |

**Files:**

```text
app/[locale]/community/bounty/**
lib/community/**
.github/ISSUE_TEMPLATE/**
.github/pull_request_template.md
docs/community/bounty-launch-kit.md
README.md                                                    # links
```

---

### Commit I — Docs / progress / smoke (non-product)

| | |
|--|--|
| **Message** | `docs(deploy): beta launch release plan and smoke checklist` |
| **Risk** | **Low** |
| **Breaking** | No |

**Files:**

```text
docs/deploy/beta-launch-release-plan.md
docs/deploy/smoke-test-beta-launch.md
.cursor/skills/clausecheck-project/PROGRESS.md
docs/screenshots/**                      # optional
```

---

## Staging cheat-sheet (per commit)

```bash
# Example for Commit A
git add \
  supabase/migrations/20260712_create_feedback.sql \
  supabase/migrations/20260712_create_beta_waitlist.sql \
  lib/db/ensure-feedback-schema.ts \
  lib/db/ensure-beta-waitlist-schema.ts \
  lib/db/pg.ts

git commit -m "$(cat <<'EOF'
feat(db): add feedback and beta_waitlist tables

EOF
)"
```

After **B–E** (engine + product surfaces):

```bash
npm test
npm run build
```

---

## Deploy sequence (ops)

```text
1. Merge release PR → main
2. Run DB migrations (§2) on production Postgres  ← BEFORE relying on waitlist/feedback
3. Vercel auto-deploy (or vercel --prod)
4. Set optional env (§ env table) + Redeploy if NEXT_PUBLIC_* changed
5. Run docs/deploy/smoke-test-beta-launch.md
```

### Env checklist (new / confirm)

| Var | Required for beta launch? | Notes |
|-----|---------------------------|-------|
| `DATABASE_URL` | **Yes** | Existing |
| `OPENAI_API_KEY` | **Yes** | Existing (review + DPA) |
| `AUTH_SECRET` | **Yes** | Existing |
| `ADMIN_EMAILS` | **Yes** for admin dashboard | Existing |
| `RESEND_API_KEY` / `EMAIL_FROM` | Optional | Beta subscribe notify + email features |
| `NEXT_PUBLIC_URL` | **Yes** | Must be `https://www.clausecheck.cc` |
| `NEXT_PUBLIC_DISCORD_INVITE` | Optional | Bounty Discord link |
| `GITHUB_TOKEN` | Optional | Bounty Issues overlay rate limit |

---

## 2. Database migrations

### This release (new)

| Migration | Tables / indexes | Backfill? |
|-----------|------------------|-----------|
| `20260712_create_feedback.sql` | `feedback` + 3 indexes | **No** — empty OK |
| `20260712_create_beta_waitlist.sql` | `beta_waitlist` + unique(email) + index | **No** |

### Not a SQL migration (code-only)

| Change | Action |
|--------|--------|
| RAG jurisdiction metadata | File `lib/rag/jurisdiction-overrides.json` (committed). Optional: `npm run backfill:rag-jurisdiction` to refresh overrides locally — **not** a prod DB job |
| `consume_credit` / `document_quota` | Separate P0 from `docs/DEPLOY_OPEN_ITEMS.md` — verify already applied on prod before scan regressions |

### Apply (production)

```bash
# Option 1 — Supabase SQL Editor / Neon console: paste each file in order

# Option 2 — psql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/20260712_create_feedback.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/20260712_create_beta_waitlist.sql
```

### Verify

```bash
psql "$DATABASE_URL" -c "\d public.feedback"
psql "$DATABASE_URL" -c "\d public.beta_waitlist"
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM public.feedback; SELECT COUNT(*) FROM public.beta_waitlist;"
```

### Rollback (safe — empty or non-critical marketing/feedback)

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 <<'SQL'
DROP TABLE IF EXISTS public.feedback CASCADE;
DROP TABLE IF EXISTS public.beta_waitlist CASCADE;
SQL
```

> Only drop if you accept losing waitlist emails / feedback rows. Prefer leave tables and revert app deploy instead.

### Index rebuild

Not required. Indexes are created in migration with `IF NOT EXISTS`.

---

## Risk summary

| Area | Risk | Mitigation |
|------|------|------------|
| Expert prompt / Packs | High | `npm test` + 1 EN + 1 ZH dry review on staging |
| Feedback / waitlist tables | Med | Migrate first; ensureSchema backup |
| DPA OpenAI cost | Med | Rate-limit already via auth/Pro; monitor usage |
| Few-shot auto inject | Med | Omit `fewshots-auto.json` from day-1 if unsure |
| Bounty Discord dead link | Low | Set `NEXT_PUBLIC_DISCORD_INVITE` or leave placeholder |
| Missing demo MP4 | Low | Poster-only until asset uploaded |
