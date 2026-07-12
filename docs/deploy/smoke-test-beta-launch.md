# Smoke Test — Beta Launch (www.clausecheck.cc)

> Run after migrations + production deploy of the Beta launch stack.  
> Base URL default: `https://www.clausecheck.cc`  
> Copy blocks into a terminal as-is.

```bash
export BASE_URL="${BASE_URL:-https://www.clausecheck.cc}"
export LOCALE="${LOCALE:-en}"
# Optional for admin checks:
# export CC_SESSION='…'   # cc_session cookie value for an ADMIN_EMAILS user
```

---

## Preflight

```bash
curl -sS "$BASE_URL/api/health" | tee /tmp/cc-health.json
# Expect: "status":"ok" and checks.database.status == "ok"
python3 - <<'PY'
import json
h=json.load(open("/tmp/cc-health.json"))
assert h.get("status")=="ok", h
assert h.get("checks",{}).get("database",{}).get("status")=="ok", h
print("health OK", h.get("version"))
PY
```

| Check | Expected | If fail |
|-------|----------|---------|
| Health | `status: ok`, DB ok | Vercel logs + `DATABASE_URL`; do not continue smoke |
| Version SHA | Matches just-deployed commit | Wrong deployment / cache — Redeploy |

---

## 1. `/beta` page + Lighthouse

### Access

```bash
CODE=$(curl -sS -o /tmp/cc-beta.html -w "%{http_code}" -L "$BASE_URL/$LOCALE/beta")
echo "HTTP $CODE"
test "$CODE" = "200"
rg -q "Jurisdiction Pack|Founding|beta|ClauseCheck" /tmp/cc-beta.html
# Expect: 200 and landing copy present (not 404)
```

| Expected | Fail path |
|----------|-----------|
| HTTP 200 | Route not deployed — confirm commit includes `app/[locale]/beta` |
| Hero + CTA visible in browser | CSS/build issue — check Vercel build log |

### Lighthouse ≥ 90 (Performance optional; aim Accessibility/Best Practices/SEO)

```bash
npx --yes lighthouse "$BASE_URL/$LOCALE/beta" \
  --only-categories=accessibility,best-practices,seo,performance \
  --chrome-flags="--headless --no-sandbox" \
  --output=json --output-path=/tmp/lh-beta.json \
  --quiet

node - <<'JS'
const r=require('/tmp/lh-beta.json');
const cats=r.categories;
for (const [k,v] of Object.entries(cats)) {
  const s=Math.round((v.score||0)*100);
  console.log(k, s);
  if (['accessibility','best-practices','seo'].includes(k) && s<90) process.exitCode=1;
}
JS
```

| Expected | Fail path |
|----------|-----------|
| a11y / best-practices / SEO ≥ 90 | Fix heading order, contrast, meta — re-run |
| Performance may be &lt;90 on cold start | Warm URL once; re-measure; not a launch blocker if others pass |

---

## 2. Beta subscribe → `beta_waitlist`

```bash
EMAIL="beta-smoke-$(date +%s)@example.com"
curl -sS -X POST "$BASE_URL/api/beta/subscribe" \
  -H "content-type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"locale\":\"$LOCALE\",\"source\":\"smoke_test\"}" \
  | tee /tmp/cc-beta-sub.json

python3 - <<'PY'
import json
b=json.load(open("/tmp/cc-beta-sub.json"))
assert b.get("ok") is True or b.get("success") is True or "id" in b or b.get("email"), b
print("subscribe OK", b)
PY
```

**DB verify** (ops machine with `DATABASE_URL`):

```bash
psql "$DATABASE_URL" -c "SELECT email, locale, source, created_at FROM beta_waitlist WHERE email='$EMAIL';"
```

| Expected | Fail path |
|----------|-----------|
| API 200 + success body | Read Vercel function log; confirm migration `beta_waitlist` applied |
| Row in `beta_waitlist` | `ensureSchema` / migration missing; check unique constraint on duplicate email |
| Duplicate email → friendly error / upsert | Re-POST same email; should not 500 |

**Optional Resend:** if `RESEND_API_KEY` set, admin inbox may get notify — absence is OK.

---

## 3. `/community/bounty` + GitHub overlay

```bash
CODE=$(curl -sS -o /tmp/cc-bounty.html -w "%{http_code}" -L "$BASE_URL/$LOCALE/community/bounty")
echo "HTTP $CODE"
test "$CODE" = "200"
rg -q "Jurisdiction Pack Bounty" /tmp/cc-bounty.html
rg -q "New York|Singapore|England" /tmp/cc-bounty.html
```

| Expected | Fail path |
|----------|-----------|
| 200 + bounty table | Missing `app/[locale]/community/bounty` in deploy |
| Status shows Open (or Claimed if Issues exist) | GitHub API rate limit — page still static OK; optional `GITHUB_TOKEN` |
| Claim link opens `github.com/.../issues/new` | Check `lib/community/bounty-catalog.ts` repo slug |

Browser: click **Claim** once — confirm Issue template loads (labels `bounty`, `jurisdiction-pack`, `help-wanted`).

---

## 4. Admin feedback dashboard + preview

### Auth gate (must 401/403 without admin)

```bash
CODE=$(curl -sS -o /tmp/cc-admin-fb.json -w "%{http_code}" \
  "$BASE_URL/api/admin/feedback?sinceDays=30")
echo "HTTP $CODE (expect 401 or 403)"
test "$CODE" = "401" -o "$CODE" = "403"
```

### With admin session

```bash
test -n "$CC_SESSION" || { echo "Set CC_SESSION for admin tests"; exit 1; }

CODE=$(curl -sS -o /tmp/cc-admin-fb.json -w "%{http_code}" \
  -H "Cookie: cc_session=$CC_SESSION" \
  "$BASE_URL/api/admin/feedback?sinceDays=30")
echo "HTTP $CODE"
test "$CODE" = "200"
python3 - <<'PY'
import json
d=json.load(open("/tmp/cc-admin-fb.json"))
assert "overview" in d and "badCases" in d, d.keys()
print("overview", d["overview"])
PY

# Page
CODE=$(curl -sS -o /dev/null -w "%{http_code}" -L \
  -H "Cookie: cc_session=$CC_SESSION" \
  "$BASE_URL/admin/feedback-dashboard")
echo "dashboard HTTP $CODE (expect 200)"
test "$CODE" = "200"
```

### Dev preview (production should 404)

```bash
CODE=$(curl -sS -o /dev/null -w "%{http_code}" -L \
  "$BASE_URL/$LOCALE/dev/feedback-dashboard-preview")
echo "dev preview HTTP $CODE (expect 404 in production)"
```

| Expected | Fail path |
|----------|-----------|
| API without cookie → 401/403 | Route not using `requireAdmin` |
| Admin → 200 + overview shape | `ADMIN_EMAILS` mismatch; session cookie; `feedback` table missing |
| `/admin/feedback-dashboard` 200 | Layout redirect `/?admin=forbidden` if email not whitelisted |
| Dev preview 404 in prod | OK; if 200, ensure `NODE_ENV=production` |

---

## 5. DPA generator E2E

```bash
# Unauthenticated or free tier — expect preview / upgrade gate, not 500
curl -sS -X POST "$BASE_URL/api/generate-dpa" \
  -H "content-type: application/json" \
  -d '{"jurisdiction":"us_california","locale":"en","dataCategories":["personal_info"]}' \
  | tee /tmp/cc-dpa.json

python3 - <<'PY'
import json
b=json.load(open("/tmp/cc-dpa.json"))
# Accept either preview payload or auth/upgrade error — never uncaught 500
assert "error" in b or "markdown" in b or "preview" in b or "draft" in b or "ok" in b, b
print("dpa response keys", list(b.keys())[:12])
PY
```

Browser (logged-in Free): report with missing DPA → **Generate DPA** → watermarked preview + Upgrade.  
Browser (Pro): full draft + download controls.

| Expected | Fail path |
|----------|-----------|
| No 500 | OpenAI key / prompt error — check function logs |
| Free ≠ full unlock | Pro gate bug in `lib/dpa` / credits |
| Disclaimer present in draft | `dpa-generator` forced disclaimer |

---

## 6. Regression — auth + contract review

### Auth providers

```bash
curl -sS "$BASE_URL/api/auth/providers" | tee /tmp/cc-providers.json
# Expect email + google true (Apple absent)
```

### Lightweight review (text hub)

```bash
# Prefer authenticated cookie if quota enforced
curl -sS -X POST "$BASE_URL/api/review" \
  -H "content-type: application/json" \
  ${CC_SESSION:+-H "Cookie: cc_session=$CC_SESSION"} \
  -d '{"contractText":"This Agreement is governed by the laws of the State of California. Either party may terminate for convenience on 30 days notice.","locale":"en","scenarioId":"saas","refine":false}' \
  | tee /tmp/cc-review.json

python3 - <<'PY'
import json,sys
b=json.load(open("/tmp/cc-review.json"))
if b.get("error"):
  print("review error (check quota/auth):", b)
  # 401/402/403 may be OK without session — document outcome
  sys.exit(0)
assert "flags" in b or "scoreText" in b or "result" in b, list(b.keys())[:20]
print("review OK keys", [k for k in b.keys()][:15])
# Soft check: California pack should not force PRC Civil Code whitelist noise
blob=json.dumps(b,ensure_ascii=False)
if "民法典" in blob and "California" in blob:
  print("WARN: possible jurisdiction leakage — inspect flags.legalBasis")
PY
```

### Existing Playwright smoke (if configured)

```bash
BASE_URL="$BASE_URL" npm run test:smoke
```

| Expected | Fail path |
|----------|-----------|
| Login/register still works | Auth env / Google callback URL |
| Review returns flags or structured error | Pack/prompt crash — Sentry + `/api/review` logs |
| No PRC-only statutes on CA sample | RAG/pack isolation regression — Commit B |
| Quota consume still works | `consume_credit` / `document_quota` migrations (`DEPLOY_OPEN_ITEMS`) |

---

## 7. Sign-off checklist (copy)

- [ ] Preflight `/api/health` OK  
- [ ] `/en/beta` HTTP 200 + Lighthouse a11y/BP/SEO ≥ 90  
- [ ] `POST /api/beta/subscribe` writes `beta_waitlist`  
- [ ] `/en/community/bounty` HTTP 200 + Claim → GitHub  
- [ ] `/api/admin/feedback` 401/403 anonymous; 200 as admin  
- [ ] `/admin/feedback-dashboard` loads for admin  
- [ ] DPA generate returns preview/gate (no 500)  
- [ ] Auth providers + review path no regression  
- [ ] (Optional) `npm run test:smoke` green  

**Signer / date:** __________________

---

## Quick one-liner suite

```bash
export BASE_URL=https://www.clausecheck.cc LOCALE=en
curl -sf "$BASE_URL/api/health" >/dev/null && echo OK_health
curl -sfL -o /dev/null -w "beta:%{http_code}\n" "$BASE_URL/$LOCALE/beta"
curl -sfL -o /dev/null -w "bounty:%{http_code}\n" "$BASE_URL/$LOCALE/community/bounty"
curl -s -o /dev/null -w "admin_fb:%{http_code}\n" "$BASE_URL/api/admin/feedback"
curl -s -X POST "$BASE_URL/api/beta/subscribe" -H 'content-type: application/json' \
  -d "{\"email\":\"smoke-$(date +%s)@example.com\",\"locale\":\"en\"}" | head -c 200; echo
```

Expect: `OK_health`, `beta:200`, `bounty:200`, `admin_fb:401|403`, subscribe JSON success.
