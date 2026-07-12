## Summary

<!-- 1–3 bullets: what this PR does and why -->

- 

## Type

- [ ] Jurisdiction Pack (new or expand)
- [ ] Bug fix
- [ ] Feature / product
- [ ] Docs / ops
- [ ] Other

## Jurisdiction Pack checklist

_Skip if not a pack PR. Aligns with `docs/contributing-jurisdiction-packs.md` and bounty Issue template._

- [ ] Pack id follows kebab-case naming; reserved ids (`cn`, `us-ca`, `us-ny`, `uk`, `intl`) are not duplicated as new files
- [ ] `governingLawPatterns` are distinctive; positive + negative tests added/updated
- [ ] `systemPromptAddon` is jurisdiction-specific only (no Base restatement); within token budget
- [ ] `boilerplateRequirements` do not restate Base 12-category titles
- [ ] `npm run validate:pack -- --id=<id>` passes locally
- [ ] Linked bounty / tracking issue (if any): #

## Product constraints

- [ ] Suggestions remain paste-ready clause language
- [ ] No claim of legal advice or fixed accuracy
- [ ] i18n touched? (`messages/en.json` + `messages/zh.json`) — or N/A

## Test plan

- [ ] 
- [ ] 

---

_Community packs are reviewed but not guaranteed. Always verify._
