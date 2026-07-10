# ClauseCheck Project Progress

Living checkpoint for `clausecheck project`. Add dated bullets after every meaningful feature, fix, deploy, or operations discovery. Newest first.

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
- Singapore `+65` is blocked pending Edge secrets: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and either `TWILIO_MESSAGING_SERVICE_SID` or `TWILIO_FROM_NUMBER`.
- Supabase Dashboard test phone numbers skip real SMS and bypass the hook.
- Logout clears the session, so a new OTP is required; this is expected.

### Pricing / quota

- Plan A has Trial, Pro, Team, and Enterprise, using unified `document_quota`; migrations run through `20260714`.
- Checkout uses Stripe Payment Element. Apple Pay/Google Pay require the applicable Stripe domain-registration setup; see `docs/PROJECT-STATUS.md` when present.

### Open next

1. Configure Twilio Edge secrets, then retest Singapore `+65`.
2. Merge `feat/supabase-phone-auth` to `main` when ready.
3. Continue updating this file after meaningful work.

## 2026-07-07 — Baseline production checkpoint

- Production baseline was `www.clausecheck.cc`; email/password and Google auth were deployed, and Apple was removed.
- The product retained its 18-scenario analysis pipeline and 82vh internally scrolling split review UI.
