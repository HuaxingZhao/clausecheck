# Contributing Jurisdiction Packs

ClauseCheck reviews contracts using a **Base prompt** (shared rules) plus **one Jurisdiction Pack** (rules for a single legal system). This guide helps legal experts contribute a new Pack without rewriting the whole review engine.

**Not legal advice.** Pack text is decision-support guidance for the AI reviewer.

---

## What is a Pack?

A Pack is a small TypeScript module that returns this shape:

| Field | Required? | Meaning |
|-------|-----------|---------|
| `id` | Yes | Stable machine id, e.g. `us-ca`, `sg` |
| `displayName` | Yes | Human label, e.g. `California, US` |
| `governingLawPatterns` | Yes | Phrases used to auto-detect this jurisdiction from contract text |
| `systemPromptAddon` | Yes | Extra review instructions **unique to this jurisdiction** |
| `boilerplateRequirements` | Yes (array; may be empty) | Mandatory clause titles to list in `missingClauses` when absent |
| `defaultSigningThresholds` | No | Optional score-band hints for signing recommendations |

Example (simplified):

```typescript
{
  id: "sg",
  displayName: "Singapore",
  governingLawPatterns: [
    "laws of singapore",
    "singapore law",
    "governing law.*singapore",
  ],
  systemPromptAddon: "Focus: PDPA, …",
  boilerplateRequirements: [
    "PDPA consent / notification clause (PDPA Singapore)",
  ],
}
```

---

## Naming convention

Place files under:

```text
lib/prompts/jurisdiction-packs/packs/{id}.ts
```

**`id` format:** `{iso-country}-{subdivision?}` in lowercase kebab-case.

| Example id | File | Display name |
|------------|------|----------------|
| `cn` | `cn.ts` | China (PRC) |
| `us-ca` | `us-ca.ts` | California, US |
| `uk` | `uk.ts` | England & Wales |
| `sg` | `sg.ts` | Singapore |
| `ae-dubai` | `ae-dubai.ts` | Dubai, UAE |

Built-in ids (`cn`, `us-ca`, `us-ny`, `uk`, `intl`) are reserved.

---

## Writing `governingLawPatterns`

These strings are matched **case-insensitively** against the contract (substring, or a simple regex if the pattern contains `.*`).

**Do:**

- Cover common variants: “laws of X”, “X law”, “Governing Law: X”
- Prefer distinctive phrases so other jurisdictions are not false-matched
- Add a **positive** and a **negative** unit test

**Don’t:**

- Use a single vague word like `"law"` or `"agreement"`
- Duplicate the same phrase twice

**Example test ideas:**

| Case | Sample contract snippet | Expect |
|------|-------------------------|--------|
| Positive | `governed by the laws of Singapore` | Your patterns match |
| Negative | `适用中华人民共和国法律` | Your patterns do **not** match |

---

## Writing `systemPromptAddon`

**Principle:** only write what is **special** to this jurisdiction.

| Put in the Pack | Leave in Base (already loaded) |
|-----------------|--------------------------------|
| Local mandatory statutes / regulators | The shared 12-category risk checklist |
| Citation style for this legal family | Persona / “not legal advice” |
| Local data-protection focus (e.g. PDPA, CPRA) | JSON output schema |
| Local signing norms if they differ | Generic quality bar (min flags, paste-ready suggestions) |

Keep the addon concise. Pre-check limit: **≤ ~2000 tokens** (we estimate `characters ÷ 4`).

---

## Writing `boilerplateRequirements`

Format each item as:

```text
Clause Name (legal basis reference)
```

Examples:

- `Severability (common-law commercial practice)`
- `PDPA notification clause (PDPA Singapore)`

**Do not** copy the Base 12-category titles (e.g. “Liability & indemnification”) into this list — those are already scanned. Empty array is allowed if this jurisdiction has no extra mandatory boilerplate.

Common-law packs may reuse the shared Severability / Entire Agreement / Waiver / Force Majeure set via `COMMON_LAW_BOILERPLATE`.

---

## Submit workflow

```text
Fork repo
  → npm run new-pack -- --id=sg --name="Singapore"
  → Edit packs/{id}.ts (patterns + addon + boilerplate)
  → Confirm tests/packs/{id}.test.ts (positive + negative)
  → npm run validate:pack -- --id=sg
  → Open Pull Request
  → CI runs validate:pack on packs/ changes
  → Maintainer review (legal + product)
```

### Scaffold command

```bash
npm run new-pack -- --id=sg --name="Singapore"
```

This creates:

1. `lib/prompts/jurisdiction-packs/packs/sg.ts` (template that already passes pre-check)
2. `tests/packs/sg.test.ts` (positive + negative stubs)
3. Registration in `lib/prompts/jurisdiction-packs/pack-registry.ts`

### Pre-check command

```bash
npm run validate:pack -- --id=sg
npm run validate:pack -- --all
```

Checks (local only, no external APIs):

- Pack loads and matches the `JurisdictionPack` shape
- `governingLawPatterns` non-empty and unique
- `systemPromptAddon` token estimate ≤ 2000
- `boilerplateRequirements` does not restate Base checklist titles
- Unit test file exists with ≥1 positive and ≥1 negative case

---

## Product constraints (please keep)

- Suggestions must remain **paste-ready clause language**, not vague advice
- Never claim fixed accuracy or that output is legal advice
- One Pack per review — do not instruct the model to apply other jurisdictions’ statutes

Questions? Open a GitHub issue with the label `jurisdiction-pack`.
