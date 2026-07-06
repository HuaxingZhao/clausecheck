---
name: clausecheck
description: >-
  Develop and extend ClauseCheck — bilingual contract risk scanner with
  scenario-based AI analysis, confidence scoring, split review UI, and revision
  workbook export. Use when working on ClauseCheck, contract scan/analysis
  pipeline, scenario prompts, review UI, i18n, or revision export.
---

# ClauseCheck Development Skill

Read `.cursor/rules/clausecheck.mdc` first (always-applied core memory).

## When to use this skill

- Adding/editing **contract scenarios** or **scenario knowledge (RAG)**
- Changing **analyze pipeline**, prompts, confidence, or suggestion rewrite
- Review UI: pins, click-to-jump, accept-by-level, export
- Results page layout, expandable sections, report delivery order
- i18n (`messages/zh.json`, `messages/en.json`)
- Revision workbook / negotiation email export

## Standard workflows

### Add a new contract scenario

1. Add id to `ContractScenarioId` in `lib/contract-scenarios.ts`
2. Add `CONTRACT_SCENARIOS` entry with `promptOverlayZh/En`
3. Add pack in `lib/scenario-knowledge.ts`; omit → `COMMON`
4. Add `scenarios.{id}.name/desc` in zh.json + en.json
5. `featured: true` only for common scenarios (8 featured)
6. Run `npm run build`

### Change analysis quality

Files in order: `analyze.ts` → `analysis-pipeline.ts` → `rewrite-suggestions.ts` → `confidence.ts` → `snap-scan-quotes.ts`

After AI changes: always run full pipeline; never return raw first pass alone.

### Change review / export UX

- Shell: `contract-review-section.tsx` → `contract-review-view.tsx`
- Lock: `lock-suggestions.ts` (`buildContractReview` + `normalizeReviewItems`)
- Accept: `review-to-changes.ts` (`acceptIdsForLevels`); state in `contract-review-view.tsx`
- Export: `review-to-changes` → `revision-workbook-docx` + `revision-export` → `/api/review/export`
- Pass `review.source` from `resolveContractReview`, not raw upload text

### Fix「未找到原文段落」

1. Check if `quote` is meta/absence text → extend `isAbsenceDescription` in `suggestion-diff.ts`
2. Ensure `normalizeReviewItems` promotes to `kind: "missing"`
3. For real quotes: improve `lockGlobally` / `lockAtSection` in `lock-suggestions.ts`
4. Re-scan or rely on client `resolveContractReview` normalization

### Change results page sections

- New long section → wrap in `ResultsExpandableSection` (default collapsed)
- Keep order: analysis blocks → `ReportDeliverySection` → `ContractReviewSection`

## Quality checklist (before shipping)

- [ ] Full clause suggestions after pipeline rewrite
- [ ] `confidence` + `qualityStats` on ScanResult
- [ ] Absence quotes → missing group, not「未定位」
- [ ] Level checkboxes sync with acceptedIds; clear resets both
- [ ] i18n zh + en
- [ ] `npm run build` passes

## Deep reference

See [reference.md](reference.md) for API routes, UI map, and changelog.
