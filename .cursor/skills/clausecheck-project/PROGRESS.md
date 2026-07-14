# ClauseCheck Project Progress

Living checkpoint for `clausecheck project`. Add dated bullets after every meaningful feature, fix, deploy, or operations discovery. Newest first.

## 2026-07-14 — P0 mock-qr + 剩余安全/一致性

- **P0**：生产默认关闭 `/api/webhooks/payment/mock-qr`（`isMockWechatPayAllowed`；仅 `ALLOW_MOCK_WECHAT_PAY=1` 可开）；无 `WECHAT_PAY_QR_BASE` 时生产不再 silently 回落 mock。
- 试用字数统一 `EXPERIENCE_WORD_LIMIT`（20k）：`scan` / `refine` / `review` + FAQ。
- 去掉「无限扫描」类升级/条款文案；审阅区去掉 `attachScrollChainToPage`。
- 重置密码：`users.session_version` + JWT `sv`；`getSessionFrom*` 校验不一致则失效。
- Magic token：`purpose`（`login` | `password_reset`）；forgot/reset 与 magic-link/verify/team invite 分离。
- Admin TD-001：`::uuid` 已去；README Plan A 配额 + bounty URL 去掉硬编码 `/en`。
- 冒烟：`forgot-password` 可达；生产 mock-qr 期望 404。单测：`lib/credits/mock-pay.test.ts`。

## 2026-07-14 — TD-001：去掉 TEXT user_id 上的错误 `::uuid`

- `lib/admin/queries.ts`：移除 9 处 `u.id` / `userId` 对 `user_credits` / `orders` / `credit_transactions` 的 `::uuid` 强转（列均为 TEXT）。
- `lib/invite/codes.ts`：核实已无 user 相关 `::uuid` 残留。
- `TECH_DEBT.md` TD-001 checklist 已勾完（手测仍待）。

## 2026-07-14 — P2 批量清理

- Bounty 语言切换：`Link locale=`（不再硬编码 `/en/...`）。
- 忘记密码：成功后常驻 `forgotSentHint`（垃圾箱 / Google / support）。
- Beta 创始权益：zh/en 明示「资格锁定、正式版人工发放、报名不自动到账」。
- 删除 `en.json` 孤立 `pricingZh`；英文 FAQ 去掉「over 90%」准确率表述。
- `invite/constants` 注释标明 +3 为邀请加油包 ≠ trial 1。
- Health 增加 `paymentWebhook` 检查；webhook 500 文案提示补 `PAYMENT_WEBHOOK_SECRET`。

## 2026-07-14 — P1：邀请文案 / 发信统一 / 忘记密码入口

- 邀请 zh/en：明确「试用 1 次」+「邀请奖励各 +3」（不再写「注册送 3 份」）。
- 全部 Resend 走 `lib/email/resend.ts`（报告/修订/Beta 通知/销售线索），生产拦截不可靠 From。
- `/forgot-password` 页默认打开邮箱重置；账户未登录区 + 手机 Tab 增加重置入口。

## 2026-07-14 — 重置邮件发不出（根因）

- 症状：点「发送重置邮件」绿字成功，但收不到；接口约 14s。
- 根因：(1) Vercel 只有错误变量名 `Email_From`，代码读 `EMAIL_FROM` → 落到 `onboarding@resend.dev`；(2) 无 `password_hash` 时假成功不发信。
- 修复：`getEmailFrom()` 兼容两种 key；不可靠 From 直接 503；有用户即可发重置（含 Google 账号设密）；Vercel 已补 `EMAIL_FROM=ClauseCheck <noreply@clausecheck.cc>`（需 Resend 域名已验证 + 重新部署才生效）。
- 慢：Neon 冷启动，非前端死循环。

## 2026-07-14 — 忘记密码入口更显眼

- AuthPanel：邮箱「登录」时「忘记密码？」放在密码标签右侧（PR #21）；完整重置流已在 #20。

## 2026-07-14 — P1/P2 批量：路径 / 忘记密码 / CJK / 清理

- **#1 英文路径**：新增 `localizedPath()`；footer/account/pricing/PaymentGateway/auth/reports 等改 as-needed（EN 无 `/en`）。
- **#4 ADMIN_EMAILS**：Vercel Preview+Production **已配置**（`vercel env ls` 确认）。
- **#2 忘记密码**：`/api/auth/forgot-password` + `/api/auth/reset-password` + `/reset-password` 页；AuthPanel「忘记密码？」；Resend 邮件模板。
- **#3 Safari CJK**：revise preview/final 上传走 `fileForUpload` + `originalFileName`。
- **#5 首页瀑布**：`Promise.all(auth,quota)`；首页 `useCredits({ autoFetch:false })` 避免双请求。
- **#6/#7**：删除死代码 `scanner-section.tsx` / `nav-bar.tsx`；移除 `en.json` 孤立 `faqZh`。
- **#8 demo.mp4**：有意用截图；更新 `public/assets/README.md` 说明。

## 2026-07-14 — Client quota ↔ Plan A

- `lib/quota.ts`: 去掉「3 天无限 + 每月 3 次」；离线 fallback = `getQuotaForPlan("trial")`（1）；`recordScan` 始终计入 free；`applyServerQuota` 用服务端 `remaining`，不再把 `inTrialPeriod` 当无限。
- `scan-metrics` fallback：`FREE_MONTHLY_LIMIT` = trial（1）；`checkFreeQuota` / `recordFreeScan` 不再 3 天无限不扣次。
- 首页配额提示：试用期也显示「本周期剩余 N 次」，不再只显示「试用配额生效中」。
- `REGISTER_CREDIT_GRANT` → `getQuotaForPlan("trial")`；zh/en `quota.freeRemaining` / `limitReached` 改为「本周期」口径。

## 2026-07-14 — Trial copy + bootstrap=1

- Homepage trust: 免费试用需登录 / Sign in to scan（去掉「无需注册」）.
- Beta hero: 锁定权益资格 + finePrint 报名≠开通 / credited at launch.
- `bootstrapNewUserCredits` → `getQuotaForPlan("trial")`（当前 1），与 document_quota 对齐.

## 2026-07-14 — 内测三件套修复

- FAQ 免费版限制对齐 Plan A：注册后每周期 **1 份**（去掉「3 天宽松 / 旧账户每月 3 份」）。
- 未登录扫描：前端先弹登录 + `upload.loginRequired`；API 401 优先 `message`（中英）；不再露出 `UNAUTHORIZED`。
- `site-nav` / 登录成功跳转改 as-needed 路径（EN → `/account`，无 `/en` 前缀）。

## 2026-07-14 — 内测前风险审计

- Prod `6413026` health ok；Beta/首页/bounty/providers 200；demo.mp4 404（有意用截图）。
- **无硬阻断**；最大风险：trial 仅 1 次 vs FAQ/client「3天宽松」叙事不一致；创始权益无自动兑现（文案已 disclaimer）。
- P1：未登录扫见 UNAUTHORIZED；无忘记密码；site-nav EN `/en/account` 多跳；Safari CJK 仅主扫描路径 wrapped；确认 `ADMIN_EMAILS`。
- 建议：邀请文案写清「1 次试用」或 Neon 给内测加配额；统一 FAQ；优先 Google 登录。

```
PR #9–#14  ：P0 体验修复（i18n / CTA / 响应式 / 免责 / 配额）
PR #15     ：E2E 回归测试网（6 cases, ~4s）
acf4fd2    ：生产发布 commit
认知对齐 5/5 ✅
E2E    6/6 ✅
状态      ：Beta 软发布 🟢
```

- Links: `https://www.clausecheck.cc/zh/beta` · `https://www.clausecheck.cc/beta`
- Soft launch = 熟人/社群内测 OK；PH 大宣发可选另排。
- 对外文案须保留「决策支持，不构成法律意见」。

## 2026-07-14 — Beta launch gate: #15 + cognitive alignment

- PR #15 merged; prod health `acf4fd2`.
- Prod E2E: `BASE_URL=https://www.clausecheck.cc npm run test:e2e:beta-p0` → **6 passed**.
- Cognitive (prod `/zh/beta`): disclaimer 正式版发放 ✅; FAQ 报名≠开通+正式版发放 ✅; try-hint 需注册·1次 ✅; lang EN/切换到英文 ✅; dual CTA covered by E2E ✅.
- **Verdict: soft Beta public OK** — share `/zh/beta` or `/beta`; keep「不构成法律意见」; PH big splash still optional later.

## 2026-07-14 — Beta P0 E2E green (local + prod)

- `npm run test:e2e:beta-p0:local` → **6 passed** (~19s after warm compile).
- Prod gate earlier: `BASE_URL=https://www.clausecheck.cc npm run test:e2e:beta-p0` → 6 passed.
- Next: cognitive alignment smoke → Beta public launch.

- Added `e2e/beta-p0-regression.spec.ts` (PR #9–#14): disclaimer, lang i18n, dual CTA + mock subscribe, trial quota vs `getQuotaForPlan`, iPhone SE overflow, `/account` 200.
- Helpers: `e2e/helpers/beta.ts` (temp email + subscribe route mock).
- Playwright: `beta-p0` project; `npm run test:e2e:beta-p0`. Path stays under `e2e/` (repo `testDir`).
- Local subscribe flake: form was native-GET before hydration (`?email=`); submit btn is `type="button"` + e2e waits for React fiber + POST.

## 2026-07-13 — PR #14 prod verification (gate before E2E)

- Prod `api/health` version `761b582` (#14 merged + deployed).
- Lang switch: `tLang("label")` + aria `langSwitch.to` (zh shows EN / 切换到英文).
- Success CTA chunk: `href:"/account"` via i18n Link; `/en/account`→307 `/account`, `/account`→200.
- iPhone SE 375: `.beta-nav-try-hint` scrollWidth≤clientWidth; computed `maxWidth:100%`, `overflowWrap:break-word`.
- Gate: all three ✅ → ready for Playwright E2E stage-2 prompt.

## 2026-07-13 — Beta PR #9 compliance leftovers

- Lang switcher: hard-coded `EN`/`中文` → `langSwitch.label` (+ `aria-label` from `langSwitch.to`).
- Responsive: `.beta-nav-try-hint` / `.beta-perks-disclaimer` / `.beta-subscribe-note` add `break-words` + full-width mobile caps.
- Account CTA already `href="/account"` via i18n routing (no `/en/account` hop).

## 2026-07-13 — Quota badge stuck on「登录查看」

- Root: `useCredits` cache-hit path set balance but not `authenticated`; homepage has two hook instances (page + badge).
- Fix: set `authenticated` on cache hit; re-fetch credits after `/api/auth/me` succeeds; clear cache on logout. PR #13.

## 2026-07-13 — Beta / scan click feedback + Beta ISR

- Remove `force-dynamic` on `/beta`; use `revalidate = 3600` for edge cache.
- Instant UI feedback: lang/try nav pending labels, subscribe spinner+hint, success CTA pending, demo card chip.
- Home scan: set loading/stage **before** awaiting quota API (was waiting on cold Neon).

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
