# AI contract review engine (expert prompt + RAG)

ClauseCheck review is **decision support**, not legal advice.

## Modules

| File | Role |
|------|------|
| `lib/ai/expert-system-prompt.ts` | Hardcoded senior non-litigation counsel System Prompt + JSON schema + legalBasis rules |
| `lib/ai/retrieve-compliance-rules.ts` | Scenario knowledge retrieval (keyword-ranked RAG over packs) |
| `lib/ai/review-contract.ts` | `reviewContract()` workflow orchestrator |
| `lib/analyze.ts` | Production scan path — uses the same expert prompt + retrieval |
| `fixtures/contracts/nda-risky-zh.txt` | NDA with typical risks (overlong term, adverse forum, etc.) |

## Workflow

```text
contract text
  → retrieveComplianceRules(scenario)
  → buildExpertSystemPrompt(persona + overlay + knowledge)
  → OpenAI JSON review
  → analysis pipeline (snap quotes / rewrite / critic)
  → ScanResult (flags with level, quote, legalBasis, suggestion)
```

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
