---
name: clausecheck-expert-review
description: >-
  External expert brief for ClauseCheck functional review and product strategy.
  Use when reviewing the product for quality, GTM, pricing, or next-feature
  prioritization, or when the user mentions expert review / 专家审查 / EXPERT_BRIEF.
---

# ClauseCheck Expert Review

## Canonical attachment

The **self-contained brief to send as an attachment** is:

**[`docs/EXPERT_BRIEF.md`](../../../docs/EXPERT_BRIEF.md)**

Read that file first. It includes product facts, §0 recent compliance/privacy/SMS/payments closures (#31–#34), constraints, file map, review questions, strategic backlog, and the expected expert reply format.

## Companion audits (attach with the brief)

1. [`docs/PRIVACY_DATA_RETENTION_AUDIT.md`](../../../docs/PRIVACY_DATA_RETENTION_AUDIT.md) — hard-delete / Cron / RLS  
2. [`docs/I18N_COMPLIANCE_DIFF_REPORT.md`](../../../docs/I18N_COMPLIANCE_DIFF_REPORT.md) — zh/en not-legal-advice parity  
3. [`docs/PROJECT-STATUS.md`](../../../docs/PROJECT-STATUS.md) — prod snapshot  

## How to use (for agents)

1. Open `docs/EXPERT_BRIEF.md`.
2. Verify live prod: `GET https://www.clausecheck.cc/api/health` (expect tip ≈ `73112d2` / #34).
3. Spot-check files listed in §6 of the brief.
4. Answer using the template in §9 of the brief (功能结论 + 战略建议).

## Do not

- Recommend presenting ClauseCheck as legal advice or a fixed accuracy %.
- Propose TipTap as the main review editor or page-height scrolling for the 82vh shell.
- Suggest silent DOCX overwrites of the user’s original file.
- Treat WeChat merchant wiring / Redis / Team UI as “bugs” — they are strategic backlog (UI is gated; API kept).
- Suggest soft-delete (`is_deleted`) for contract bodies — hard DELETE only.

## Related memory

- Living progress: `.cursor/skills/clausecheck-project/PROGRESS.md`
- Product memory: `.cursor/skills/clausecheck-project/SKILL.md`
- Deep pipeline: `.cursor/skills/clausecheck/SKILL.md`
