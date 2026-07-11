# AI contract review engine (expert prompt + RAG)

ClauseCheck review is **decision support**, not legal advice.

## Modules

| File | Role |
|------|------|
| `lib/ai/expert-system-prompt.ts` | Hardcoded senior non-litigation counsel System Prompt + JSON schema + legalBasis rules |
| `lib/ai/retrieve-compliance-rules.ts` | Scenario knowledge retrieval (keyword-ranked RAG over packs) |
| `lib/ai/review-contract.ts` | `reviewContract()` workflow orchestrator |
| `lib/analyze.ts` | Production scan path — uses the same expert prompt + retrieval |
| `app/api/review/route.ts` | **Core review API** — JSON `{ contractText, locale, scenarioId? }` → AI → ScanResult |
| `app/api/scan/route.ts` | File upload → extract text → first-pass analyze (existing UI flow) |
| `fixtures/contracts/nda-risky-zh.txt` | NDA with typical risks (overlong term, adverse forum, etc.) |

> Note: AI helpers live under `lib/ai/` (package `@/lib/ai`). Do **not** add a sibling `lib/ai.ts` — it conflicts with the directory module.

## Workflow

```text
contract text
  → retrieveComplianceRules(scenario)
  → buildExpertSystemPrompt(persona + overlay + knowledge)
  → OpenAI JSON review
  → analysis pipeline (snap quotes / rewrite / critic)
  → ScanResult (flags with level, quote, legalBasis, suggestion)
```

## Core API

```bash
# Logged-in (when Postgres credits enabled) — consumes 1 document quota
curl -X POST http://localhost:3000/api/review \
  -H "content-type: application/json" \
  -H "cookie: cc_session=…" \
  -d '{"contractText":"…","locale":"zh","scenarioId":"nda"}'
```

Auth / quota mirrors `/api/scan`: empty text → 400; insufficient quota → 402; word limit → 413; AI failure refunds credit.

## Test

```bash
# No API key — prompt + RAG assembly only
npm run test:review:dry

# Unit tests (offline)
npm test

# Live OpenAI (reads OPENAI_API_KEY from env / .env.local)
npm run test:review

# Optional HTTP (requires REVIEW_TEST_SECRET)
curl -X POST http://localhost:3000/api/ai/review-contract \
  -H "content-type: application/json" \
  -H "x-review-test-secret: $REVIEW_TEST_SECRET" \
  -d '{"useFixture":true,"scenarioId":"nda","dryRun":true}'
```
