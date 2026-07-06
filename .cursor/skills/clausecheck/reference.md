# ClauseCheck Reference

## How to invoke next time

| 方式 | 路径 | 何时生效 |
|------|------|----------|
| **Rule（记忆）** | `.cursor/rules/clausecheck.mdc` | `alwaysApply: true`，本项目每次对话自动加载 |
| **Skill（技能）** | `.cursor/skills/clausecheck/SKILL.md` | 对话提到 ClauseCheck / 审阅 / 扫描 / 场景 时 Agent 会读；也可手动 `@clausecheck` 或说「按 clausecheck skill 做」 |

**持久化**：把 `.cursor/` 目录 **commit 到 git**，换机器或新对话只要打开本仓库即可。

## API routes

| Route | Purpose |
|-------|---------|
| `POST /api/scan` | Upload + `scenario` → `analyzeContract` |
| `POST /api/review/export` | Pro / pay_per_use: revision workbook DOCX |
| `POST /api/revise/final` | Legacy: patch original file |
| `POST /api/export/pdf` | Risk report PDF |

## Results page component order

```
results-section (#results)
  ├── UpgradeBanner (free)
  ├── DecisionSummary
  ├── AnalysisQualityBanner
  ├── results-grid (score + dimensions)
  ├── result-card (time-terms compact strip + flags)
  ├── ResultsExpandableSection × N (negotiations, worstCase, strengths, missing, actions, summary)
  ├── ReportDeliverySection (PDF + email)
  └── ContractReviewSection (#contract-review)
```

## Review component map

```
contract-review-section (hero title)
  └── contract-review-view
        ├── review-actions-bar (levels, clear, download email, export docx)
        ├── contract-review-pipeline (step indicator)
        └── contract-review-shell [82vh, overflow hidden]
              ├── contract-readonly-pane (internal scroll)
              └── contract-suggestions-pane (internal scroll)
```

## Scenarios (18)

`general`, `cross_border_ecommerce`, `multilingual`, `procurement_sales`, `rental`, `creator_merchant`, `account_opening`, `corporate_services`, `equity_nominee`, `employment`, `investment`, `tech_saas`, `nda`, `ip_license`, `construction`, `franchise`, `medical_education`, `eor`

Featured (8): general, cross_border_ecommerce, procurement_sales, rental, employment, investment, tech_saas, nda

All 18 have `PACKS` in `scenario-knowledge.ts`.

## Lock & absence handling

```text
buildContractReview
  → flagToItem / negoToItem (isAbsenceDescription early exit → missing)
  → normalizeReviewItems (promote meta originalText → missing)
resolveContractReview
  → prefer embedded contractReview, always re-run normalizeReviewItems
```

## Accept-by-level behavior

- `selectedLevels: Set<high|medium|low>` in `contract-review-view.tsx`
- Toggle level checkbox → add/remove all items of that level from `acceptedIds`
- `clearAll` → empty `acceptedIds` + empty `selectedLevels`
- Default init: only `high` checked

## UI tokens

- Layout: `.page-content-wide`
- Review hero: `.contract-review-hero`, `.contract-review-hero-title`
- Colors: `legal-navy`, `legal-gold`, `legal-cream` in `tailwind.config.ts`
- Font: `--font-display` / `font-display` (Noto Serif SC in `layout.tsx`)

## Session changelog (2026-07)

- 18 scenario knowledge packs
- `resolveContractReview` + `normalizeReviewItems`
- Results: expandable sections, time-terms compact, report before review
- Review: hero header, level accept checkboxes, no copy email
- Click red mark body → jump to suggestion
- Scroll: keep 82vh internal (reverted full-page scroll experiment)

## Future direction

- Vector RAG for statutes
- Fine-tune from accept/reject telemetry
- Optional second 4o refine (Pro toggle)
- Scroll-to-footer without breaking 82vh split (needs overscroll-chaining design)
