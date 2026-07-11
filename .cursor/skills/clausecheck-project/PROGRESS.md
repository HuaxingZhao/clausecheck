# ClauseCheck Project Progress

Living checkpoint for `clausecheck project`. Add dated bullets after every meaningful feature, fix, deploy, or operations discovery. Newest first.

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
