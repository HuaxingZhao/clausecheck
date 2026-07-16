# Privacy data retention audit — contract scan data

**Date:** 2026-07-16（#33 已上生产；专家附件配套）  
**Scope:** Align backend retention with privacy promise「正文不长期保留 / 不用于自有模型训练」（对外文案见 i18n 报告 §4）.  
**Status after fix:** Hard-delete only; hourly cron ≤24h; RLS on `reports` / `revisions`.  
**Ops:** Production `CRON_SECRET` configured; manual smoke returns `{"ok":true,...}`.

---

## 1. Verdict (before → after)

| Question | Before | After |
| --- | --- | --- |
| Soft-delete of contract source? | None (also **no delete**) | Still **no soft-delete**; physical `DELETE` / field scrub only |
| Scheduled purge ≤24h? | **Missing** | **Yes** — Vercel Cron hourly → `/api/cron/purge-contract-data` |
| RLS tenant isolation? | App-layer `user_id` only | **RLS enabled** on `reports`/`revisions` (no client policies; same pattern as credits) |
| Scan request persists body? | No INSERT | Unchanged — request-ephemeral |

---

## 2. What is stored

| Path | Content | Retention |
| --- | --- | --- |
| `POST /api/scan` | In-memory extract → JSON response (`contractText`) | Process lifetime only — **no DB write** |
| `reports.result` | Pro analysis metadata; **full `contractReview.source` stripped on save** | Metadata may remain; source scrubbed by cron if leftover |
| `revisions` | `original_text` / `revised_contract` / `changes` | **Physical DELETE** when `created_at` &lt; now−24h |
| `revisions.original_file` | Upload bytes | **Never written** (always `NULL`); cron nulls leftovers |
| `feedback` | SHA-256 hash only | Indefinite (no body) |

---

## 3. Cleanup mechanism

| Piece | Detail |
| --- | --- |
| **Trigger** | Vercel Cron `0 * * * *` (hourly) + manual `GET/POST` with `Authorization: Bearer $CRON_SECRET` |
| **Route** | `app/api/cron/purge-contract-data/route.ts` |
| **Actions** | 1) `DELETE FROM revisions WHERE created_at < cutoff` 2) `UPDATE … original_file = NULL` 3) Re-sanitize report JSON that still has `contractReview.source` / `contractText` |
| **Max age** | `CONTRACT_BODY_MAX_AGE_MS` = **24 hours** (`lib/privacy/contract-retention.ts`) |
| **Soft-delete** | **Forbidden** — no `is_deleted` / `deleted_at` columns |

Write-path guards:

- `sanitizeScanResultForPersistence()` in `saveReport` (Postgres + JSON).
- `saveRevision` ignores upload bytes.
- Scan route documents ephemeral return (no persistence).

---

## 4. Multi-tenant isolation

| Layer | Behavior |
| --- | --- |
| Application | All reads filter `user_id` (and team share when `team_id` set) |
| Postgres RLS | `ENABLE ROW LEVEL SECURITY` on `reports` / `revisions` — blocks PostgREST anon/authenticated with zero permissive policies |
| Session | JWT `cc_session` expiry does **not** purge rows; cron does |

---

## 5. Residual risks (honest)

1. **OpenAI / Vercel / Sentry** may retain prompts/logs under their policies — outside app DB; not used for ClauseCheck model training by us.
2. **Pro report history** still stores truncated quotes / suggestions (≤120 chars) for UI — not full contracts.
3. **Revision download** only works while the row exists (&lt;24h).
4. **Migration** `supabase/migrations/20260716_contract_data_retention_rls.sql` must be applied on production DB (or rely on `ensureSchema` index/RLS bootstrap).
5. Production requires **`CRON_SECRET`** in Vercel env so cron auth is not open.

---

## 6. Ops checklist

- [ ] Set `CRON_SECRET` on Vercel; confirm Cron job appears for `/api/cron/purge-contract-data`
- [ ] Apply migration `20260716_contract_data_retention_rls.sql` (or deploy once so `ensureSchema` runs)
- [ ] Smoke: `curl -H "Authorization: Bearer $CRON_SECRET" https://www.clausecheck.cc/api/cron/purge-contract-data`
- [ ] Confirm no `is_deleted` columns on contract tables

This document is technical backing for the privacy policy claim that contract bodies are not retained as a durable corpus and are hard-deleted on a ≤24h schedule.
