---
name: Jurisdiction Pack Bounty
about: Claim or discuss a Jurisdiction Pack bounty (community contribution).
title: "[Bounty] <Jurisdiction> Jurisdiction Pack"
labels: ["bounty", "jurisdiction-pack", "help-wanted"]
assignees: []
---

## Bounty claim

<!-- Auto-filled when opening from /community/bounty — edit as needed -->

- **Jurisdiction:** <!-- e.g. Singapore -->
- **Pack id:** <!-- e.g. sg -->
- **Priority:** <!-- High | Medium | Low -->
- **Reward:** <!-- as listed on the bounty board -->
- **Mode:** <!-- New community pack | Expand existing built-in pack -->

## Checklist

- [ ] I read [Contributing Jurisdiction Packs](../../docs/contributing-jurisdiction-packs.md)
- [ ] I ran (or will run) the scaffold: `npm run new-pack -- --id=<id> --name="<Name>"`  
      _(Skip scaffold if expanding a reserved built-in id: `us-ny`, `uk`, etc.)_
- [ ] I passed AI / local pre-check: `npm run validate:pack -- --id=<id>`
- [ ] I added or strengthened **positive + negative** governing-law pattern tests
- [ ] _(Optional)_ Brief note on legal / professional background:

```text
(your note)
```

## Scope notes

- Suggestions must stay **paste-ready clause language** (not vague advice).
- Packs are **decision support**, not legal advice.
- One Pack per review — do not instruct the model to apply other jurisdictions’ statutes.
- Keep `systemPromptAddon` within the token budget (see contributing guide).

## Compatibility with PRs

When your work is ready, open a Pull Request using the standard PR template (`.github/pull_request_template.md`). Link this bounty issue in the PR (`Closes #NN` or `Related to #NN`).

---

_Community packs are reviewed but not guaranteed. Always verify._
