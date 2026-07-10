---
name: clausecheck-project
description: >-
  ClauseCheck project memory and living progress. Use for any ClauseCheck work,
  new chats, phone auth, pricing, review UI, deploy, or when user says
  @clausecheck-project / clausecheck project.
---

# ClauseCheck Project

## How to invoke

Use `@clausecheck-project` or say「按 clausecheck project」. This memory also loads automatically through the always-apply project rule.

## Mandatory agent duty

After any meaningful change—feature, fix, deploy, or operations discovery—update [PROGRESS.md](PROGRESS.md) in this folder with dated bullet(s). Do not wait for the user to ask.

## Product memory

ClauseCheck is a bilingual (EN/ZH) Next.js contract-risk scanner. It provides decision support and negotiation deliverables, **not legal advice**.

Current flow:

```text
选场景 → 上传 → 扫描 → 决策摘要 → 风险报告（可折叠详情）
→ 保存分析报告（PDF）→ 合同审阅（左原文/右建议）→ 勾选采纳 → 谈判邮件 / 修订对照稿 Word
```

Accounts support email/password, Google OAuth, and Phone OTP. Apple sign-in is removed; magic links are internal team-invite only.

| Method | Implementation |
| --- | --- |
| Email + password | `POST /api/auth/login` / `register`; scrypt password hash |
| Google OAuth | `/api/auth/google` |
| Phone OTP | Supabase Auth; +86 via Aliyun hook, other countries via Twilio |
| Apple | Removed |

Product principles:

1. **Scenario-first**: 18 scenarios use `contract-scenarios.ts` prompt overlays and `scenario-knowledge.ts` RAG—not a model swap.
2. **Executable output**: suggestions must be pasteable clause language; explanatory advice goes through `rewrite-suggestions.ts`; exports use `revision-workbook-docx.ts` without silently overwriting the source file.
3. **Verifiable**: flags should carry `clauseId` and source `quote` where possible; confidence is high/medium/needs verification; never imply certainty without a quote.
4. **i18n parity**: update `messages/zh.json` and `messages/en.json` together.

Pipeline v2: `analyze.ts` (free `gpt-4o-mini`, Pro `gpt-4o`) injects scenario overlay/RAG, then `runAnalysisPipeline` snaps quotes, rewrites advisory suggestions, runs critic when needed, annotates confidence/quality, and builds/normalizes contract review.

Results order: decision summary → quality banner → score/flags → collapsed detail sections → saved PDF report → contract review. Use `page-content-wide`; keep time-sensitive clauses as compact horizontal tags.

Review is a read-only split view. `contract-review-shell` stays at **82vh**, with each pane scrolling internally. Missing clauses belong in the missing group; quote matching uses `lockAtSection` fallback. Level checkboxes accept/unaccept immediately; clear resets levels and accepted items; negotiation email is download-only.

## Do not

- Claim legal advice or a fixed accuracy percentage.
- Use body text inconsistent with `review.source` for review/export.
- Reintroduce silent DOCX patching or TipTap into the main flow.
- Turn the 82vh split review into page-height scrolling.
- Add SMS SDKs to the app: use Supabase Auth OTP and its hooks.

## Short workflows

- **Scenario**: update the scenario id, prompt overlay, RAG pack, and both locale messages; build afterward.
- **Pipeline**: trace `analyze.ts` → `analysis-pipeline.ts` → `rewrite-suggestions.ts` → confidence/quote snapping; return the complete pipeline output.
- **Review**: trace shell/view → `lock-suggestions.ts` → `review-to-changes.ts` → workbook export; always pass `review.source`.

## Deep references

- [Phone OTP architecture](../../../docs/PHONE_AUTH_SUPABASE.md)
- [Aliyun SMS Hook](../../../docs/ALIYUN_SMS_HOOK.md)
- [Project status](../../../docs/PROJECT-STATUS.md)
- [Pricing Plan A](../../../docs/PRICING_PLAN_A.md)
- [Legacy deep workflow skill](../clausecheck/SKILL.md)

See [PROGRESS.md](PROGRESS.md) for living status.
