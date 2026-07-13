# ClauseCheck Project Progress

Living checkpoint for `clausecheck project`. Add dated bullets after every meaningful feature, fix, deploy, or operations discovery. Newest first.

## 2026-07-13 — Beta nav EN / 体验产品间距

- Hint text was wider than the CTA, and the button was `items-end`, so EN sat far left of「体验产品」.
- Group EN + CTA on one tight row (`gap-2`); hint below the group.

## 2026-07-13 — Beta EN switcher fix

- English Beta exists at `/beta` (default locale); `/zh/beta` is Chinese; `/en/beta` 307→`/beta`.
- Switcher used raw `/en/beta` + `next/link`, which can no-op under `localePrefix: as-needed`.
- Fix: `Link` from `@/i18n/routing` with `locale="en"|"zh"` and `href="/beta"`.

## 2026-07-13 — Beta copy clarity (P0)

- Perks disclaimer: benefits credited at official launch (`beta.benefits.disclaimer`).
- Subscribe success: dual CTA register (`/account`) + dismiss wait; note signup ≠ account.
- Nav「体验产品」hint with trial quota from `getQuotaForPlan("trial")` (currently 1).
- Frontend/i18n only — waitlist API unchanged.

## 2026-07-13 — Phone user scan recovered after 504

- User `+6584653074` confirmed scan results returned after PR #8 + quota refund (`used` 1→0, remaining 1).
- Lesson: refund via Neon (`DATABASE_URL`), not Supabase SQL Editor (no `public.users` there).

## 2026-07-13 — Scan 504 timeout hotfix

- Prod symptom: phone user `Request failed (504)` on `股份代持协议.pdf` (quota left 1).
- Cause: `/api/scan` AI first-pass + optional flag-retry exceeded Vercel 90s; debit-before-AI meant 504 could burn quota with no refund.
- Fix: `maxDuration` 300; consume quota only after successful analysis; skip free-tier flag-retry second LLM call; clearer client 504 copy.
- Ops: if this user’s remaining quota shows 0 after failed 504s under old code, refund +1 via `document_quota.used` or `refundUserCredit`.

## 2026-07-12 — Beta UX: subscribe success + no fake video

- Email CTA already worked (green “already on list”); users mistook it for no reaction / clicked fake play button.
- Subscribe success now replaces the form with a green banner + “Try the product” button.
- Hero media: real `dpa-preview.png` + click-through to `/#upload`; removed fake video play affordance; copy clarifies “not a video”.

## 2026-07-12 — Beta scan / subscribe / assets hotfix

- Root causes (prod smoke after #5): Safari CJK FormData → `The string did not match the expected pattern`; beta SVG corrupt UTF-8 middle-dot; missing `/assets/beta-demo.mp4`; subscribe autofill not in React state; possible missing `beta_waitlist` migration.
- Fix: `lib/upload-safe.ts` (ascii filename + safe JSON); scan client uses it; `sessionUserIdSchema` opaque-id regex; beta form reads FormData email; subscribe API clearer migration errors; ASCII-only `public/beta/*.svg`; hero uses poster img (no broken video).
- Branch: `fix/beta-scan-hotfix`. Tests 54/54.
- Ops: confirm Supabase ran `20260712_create_beta_waitlist.sql` if subscribe still 500.

## 2026-07-12 — Beta launch build unblock

- Fixed `feedback-preview` next-intl type error (drop unused Provider).
- Added `sample_contract_loaded` to `AnalyticsEvent`.
- Fixed `packs/cn.ts` import path `../types`.
- `npm test` 52/52 + `npm run build` green.

## 2026-07-12 — Beta launch release plan + smoke checklist

- Commit plan (A–I dependency order): `docs/deploy/beta-launch-release-plan.md` — exclude temp/secrets; High risk = Packs/RAG.
- DB: `feedback` + `beta_waitlist` migrations + rollback; no backfill required.
- Smoke: `docs/deploy/smoke-test-beta-launch.md` (health, /beta, subscribe, bounty, admin feedback, DPA, review regression).
- Blocker reminder: prod still on older SHA — `/beta` 404 until merge + migrate + deploy.

## 2026-07-12 — Jurisdiction Pack Bounty launch kit

- Page: `/community/bounty` — board + 4-step flow + resources + FAQ + Claim CTA (GitHub Issue prefill); ISR status from Issues `bounty` label.
- Issue template: `.github/ISSUE_TEMPLATE/pack-bounty.md` (+ `config.yml`); PR template aligned for pack PRs.
- Ops kit: `docs/community/bounty-launch-kit.md` (social / email / review checklist / reward SOP / timeline).
- Note: NY & E&W bounties = expand built-ins `us-ny` / `uk`; SG / DE / NSW = new packs.

## 2026-07-12 — Feedback → few-shot automation pipeline

- Admin dashboard `/admin/feedback-dashboard` (ADMIN_EMAILS only): overview %, jurisdiction pie, 30d trend by promptVersion, Bad Case list + CSV/JSON export.
- API: `GET /api/admin/feedback` (summary / `?format=csv|json`); queries in `lib/db/feedback-queries.ts` (PG + JSON read-only).
- Script: `npm run extract:fewshots -- --jurisdiction=… --feedbackType=… [--minFrequency=3] [--dry-run] [--local-json]` → `packs/{id}/fewshots-auto.json`.
- Pack load injects auto few-shots into `systemPromptAddon` (≤800 tokens); logs injected count.
- Dev preview: `/en/dev/feedback-dashboard-preview` (non-production).
- Screenshots: `docs/screenshots/feedback-dashboard-overview.png`, `feedback-dashboard-bad-cases.png`, `fewshots-auto-json.png`.

## 2026-07-12 — Beta landing + Product Hunt kit

- `/beta` SSG landing: hero + demo frame + 3 value visuals + perks + trust + FAQ + dual email CTA.
- `POST /api/beta/subscribe` → `beta_waitlist` (Postgres / JSON); optional Resend notify.
- Assets under `public/beta/`; demo video slot `public/assets/beta-demo.mp4`.
- PH kit: `docs/launch/product-hunt-kit.md` (taglines, description, first comment, checklist, social copy).

## 2026-07-12 — Jurisdiction Pack community contribution

- Docs: `docs/contributing-jurisdiction-packs.md` (interface, naming, patterns, PR flow).
- Scaffold: `npm run new-pack -- --id=xx --name="…"` → pack + `tests/packs/{id}.test.ts` + registry.
- Pre-check: `npm run validate:pack` (patterns / token ≤2000 / boilerplate vs Base / +− tests); CI on `packs/` PRs.
- Registry refactored to extensible `PACK_FACTORIES` (string ids). README Contributing link.

## 2026-07-12 — Missing DPA → generate draft + Pro gate

- Independent prompt `lib/prompts/dpa-generator.ts`; generate via `POST /api/generate-dpa` (gpt-4o-mini / stub).
- Free: ~30% preview + watermark + Upgrade CTA; Pro/PPU: full markdown + Word/PDF download.
- Report CTA when `missingClause.type === "dpa"` or `flag.code === "MISSING_DPA"` (also heuristic); modal auto-fills jurisdiction / data categories.
- Preview: `/en/dev/dpa-preview`. Disclaimer forced on every draft.

## 2026-07-12 — Review feedback loop (Beta golden-set)

- Report UI: Accurate / Missed Issue / False Positive on summary + each flag + missingClause; optional comment; local lock after submit.
- `POST /api/feedback` → `feedback` table (hash-only; never stores contract body); anonymous OK with sign-in hint.
- `ScanResult.feedbackMeta` carries `promptVersion` + `ragMetadata` from analyze; client SHA-256 of normalized text.
- Preview: `/en/dev/feedback-preview`. Migration: `supabase/migrations/20260712_create_feedback.sql`.

## 2026-07-12 — Expert prompt Base + Jurisdiction Pack plugins

- Split monolith `expert-system-prompt.ts` into jurisdiction-agnostic **Base** + one loaded **Pack** (`cn` / `us-ca` / `us-ny` / `uk` / `intl`).
- Pack interface: `lib/prompts/jurisdiction-packs/types.ts` (re-export `src/prompts/jurisdiction-packs/types.ts`).
- Resolve: client override → text heuristic (`governingLawPatterns`) → `intl` default.
- Wired through `analyze` / `reviewContract`; meta exposes `jurisdictionPackId`.
- Tests: CA pack excludes PRC articles; CN pack excludes CPRA / common-law boilerplate E.

## 2026-07-12 — RAG jurisdiction metadata filter

- Knowledge chunks carry `jurisdiction` / `doc_type` / optional `effective_date`; backfill via `scripts/backfill-knowledge-jurisdiction.ts` → `lib/rag/jurisdiction-overrides.json`.
- `retrieveComplianceRules({ jurisdiction })` pre-filters `IN (requested, GENERAL)`, excludes `UNKNOWN`, degrades to GENERAL with `degraded: true`.
- Wired through `analyze` / `reviewContract` / `/api/review` from client jurisdiction override.
- Tests: CA excludes CN statutes; CN excludes US-CA; auto warns.

## 2026-07-12 — Try sample contract on upload

- Upload: `SampleContractPicker` loads high-risk / standard CA SaaS + China NDA fixtures as static `.txt` imports (webpack `asset/source`); sets file + jurisdiction + scenario; confirm-before-replace; scrolls to Start Scan.
- No backend changes.

## 2026-07-12 — Jurisdiction picker UI + reasonable CA SaaS fixture

- Upload: Governing Law optional select + dynamic `ReviewDisclaimer` (CN/US/England/Intl).
- `jurisdiction` wired through `/api/scan`, `/api/scan/refine`, `/api/review` → analyze override of `detectedJurisdiction`.
- Fixture `fixtures/saas-ca-reasonable.json` + `fixtures/contracts/saas-ca-reasonable-en.txt`; compare vs hostile `saas-ca`.
- Comparator: hostile → `do_not_sign` CLEAN PASS; reasonable → `sign_with_changes` CLEAN PASS (boilerplate validator now contract-aware).

## 2026-07-12 — Boilerplate FAIL + SaaS signing calibration

- Global Add-ons E: missing Severability / Entire Agreement / Waiver / Force Majeure **must** go in `missingClauses` (non-China).
- Validator: `BOILERPLATE_NOT_REPORTED` is FAIL (non-China only); China path unchanged.
- Signing Recommendation: SaaS/Tech US/UK — industry-standard unfavorable → `sign_with_changes`; deal-breakers only → `do_not_sign`.
- Re-ran `npm run test:review -- --fixture=saas-ca`.

## 2026-07-12 — Global multi-jurisdiction expert prompt

- Refactored `lib/ai/expert-system-prompt.ts`: Jurisdiction Detection & Routing; dual-track citation (China Civil Code whitelist vs common-law `riskRationale` safe templates); Global/Common Law Add-ons (LoL, indemnity, TFC, data/SCCs, boilerplate).
- Types: `ScanResult.detectedJurisdiction` / governing & dispute quotes; `RiskFlag.riskRationale`. `analyze.ts` maps `riskRationale` → `legalBasis` for UI compat.
- Validator jurisdiction-aware: non-China FAIL on PRC Civil Code leak / case-name / fabricated statute sections; WARN on Global Add-on gaps.
- Fixture `fixtures/contracts/saas-ca-risky-en.txt`; `npm run test:review -- --fixture=saas-ca`.

## 2026-07-12 — Expert prompt hardening + review QA gates

- Upgraded `lib/ai/expert-system-prompt.ts`: legal-basis whitelist (151/496–498/501/585–587), ban Civil Code for forum, force paste-ready suggestions (no「建议」prefix).
- Expanded NDA mandatory checks (carve-out effectiveness, unilateral amendment, originals, joint liability) in `scenario-knowledge.ts` + `contract-scenarios.ts`.
- Flags fallback: `analyze.ts` retries once when `flags.length < minFlags` (6/8) with explicit re-scan user message; `reviewContract` meta exposes `flagRetryUsed`.
- Added `lib/ai/validate-review-output.ts` + `scripts/validate-review-output.ts` (WARN unknown articles; FAIL advisory suggestions / low flags / clauseReady=0).
- Re-ran NDA fixture review + validator — see latest `tmp/nda-review-full.json` run.

## 2026-07-12 — Core POST /api/review route

- Added `app/api/review/route.ts` as the text-review API hub: validates `contractText`/`locale`/`scenarioId`, builds expert system prompt via `buildExpertSystemPrompt`, calls `reviewContract` from `@/lib/ai`, returns structured ScanResult JSON.
- Mirrors `/api/scan` auth + document quota (401 / 402 INSUFFICIENT_CREDITS / 413 word limit) with credit refund on AI failure.
- Did **not** add `lib/ai.ts` (would collide with existing `lib/ai/` package). Docs updated in `docs/AI_REVIEW_ENGINE.md`.
- **Verified locally**: logged-in `POST /api/review` with NDA fixture → HTTP 200, 高风险, 5 flags, legalBasis 5/5.

## 2026-07-11 — Core AI review engine (expert prompt + RAG)

- Extracted expert System Prompt into `lib/ai/expert-system-prompt.ts` (20y 资深非诉律师；强制 JSON；legalBasis 须引民法典或标注「基于商业惯例」；不构成法律意见).
- Added RAG retrieval `lib/ai/retrieve-compliance-rules.ts` over scenario knowledge packs; wired into `lib/analyze.ts` production path.
- Added `reviewContract()` in `lib/ai/review-contract.ts` (retrieve → assemble prompt → pipeline).
- NDA risky fixture `fixtures/contracts/nda-risky-zh.txt`; tests `lib/ai/review-contract.test.ts`; scripts `npm run test:review` / `test:review:dry`; gated API `POST /api/ai/review-contract`.
- Docs: `docs/AI_REVIEW_ENGINE.md`. Enhanced NDA knowledge pack (term, forum, Civil Code cites).
- **User verified** `npm run test:review:dry` + live `npm run test:review`: NDA scored 高风险, 5 flags, legalBasis 5/5, suggestion 5/5 (definition / 20y term / penalty / destruction / forum).
- Note: user pasted Aliyun + SMS hook secrets in chat while re-setting Edge secrets — **rotate those credentials** in Aliyun RAM + Supabase Secrets + Dashboard Hook if not already rotated.

## 2026-07-10 — Production verified (phone + pricing)

- User confirmed production OK after merge: Singapore `+65` OTP, pricing UI (no Team card), and related checks.
- Phone auth (+86 Aliyun / +65 Twilio) and Plan A pricing cleanup are live on `main` / www.clausecheck.cc.

## 2026-07-10 — Twilio +65, merge prep, pricing cleanup

### Twilio / +65

- Edge Secrets already had `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_MESSAGING_SERVICE_SID`.
- Twilio account is Full/active; Messaging Service `Clausecheck` (`MG86…`) includes From `+16575665402`.
- Twilio message log shows **delivered** SMS to Singapore `+65…`; **user confirmed end-to-end OTP on production**.
- Local `.env.local` now also has `TWILIO_MESSAGING_SERVICE_SID` + `TWILIO_FROM_NUMBER` (not committed).

### Pricing product cleanup

- Removed Team card from customer-facing pricing grid (Trial / Pro / Enterprise only); Team remains in config/backend for later.
- Account upgrade copy no longer mentions Team.
- `/pricing?plan=pro` opens Pro checkout; `?plan=boost` opens add-on modal.
- ZH FAQ free-tier answer aligned with Plan A (1 doc/cycle post-trial).

### Branch / merge

- Merged `feat/supabase-phone-auth` → `main` as `7852acb` (includes Aliyun Hook, Twilio logging, phone identity UI, clausecheck-project memory, pricing cleanup). Deployed and verified on production.

## 2026-07-10 — Canonical memory and phone-auth checkpoint

### Branch / deploy

- Active phone-auth work is on `feat/supabase-phone-auth`.
- Supabase project: `hwtibqeugchlwbcxuduu`.
- Production site: https://www.clausecheck.cc.
- Vercel build fix excludes `supabase/functions` from Next.js type checking and uses `@ts-nocheck` there; do **not** redeploy commit `6f1f402`.
- Recent commits of note: Twilio logging `9be76d7`; docs checkpoint `ba230d8`; TypeScript exclude `7e65fc1`; hardening `38812fb`.

### Auth

- Email/password and Google OAuth are working; Apple sign-in is removed.
- Phone OTP uses Supabase Auth and bridges the verified identity to a `cc_session`; APIs: `/api/auth/phone/send` and `/api/auth/phone/verify`.
- Migration: `20260715_phone_auth_and_audit_log.sql`, including `audit_log`.
- China `+86`: Supabase Send SMS Hook → `send-sms` Edge Function → Aliyun PNVS `SendSmsVerifyCode`; **user verified this works**.
- Hook URL: `https://hwtibqeugchlwbcxuduu.supabase.co/functions/v1/send-sms` with `--no-verify-jwt`.
- Singapore `+65`: Twilio path configured; **production OTP verified by user** (2026-07-10).
- Supabase Dashboard test phone numbers skip real SMS and bypass the hook.
- Logout clears the session, so a new OTP is required; this is expected.

### Pricing / quota

- Plan A has Trial, Pro, and Enterprise on the UI; Team is hidden (config retained).
- Checkout uses Stripe Payment Element. Apple Pay/Google Pay require the applicable Stripe domain-registration setup; see `docs/PROJECT-STATUS.md` when present.

### Open next

1. No blocking ops for phone auth / pricing cleanup.
2. Next product work when ready (e.g. forgot-password, Enterprise lead form, invite copy vs Trial=1).
3. Continue updating this file after meaningful work.

## 2026-07-07 — Baseline production checkpoint

- Production baseline was `www.clausecheck.cc`; email/password and Google auth were deployed, and Apple was removed.
- The product retained its 18-scenario analysis pipeline and 82vh internally scrolling split review UI.
