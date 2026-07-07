#!/usr/bin/env bash
# Pre-deploy checklist — run locally before Vercel deploy.
set -uo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

ENV_FILE="${ENV_FILE:-.env.local}"
REQUIRED=(OPENAI_API_KEY AUTH_SECRET STRIPE_SECRET_KEY)
PROD_REQUIRED=(DATABASE_URL RESEND_API_KEY)
OPTIONAL=(STRIPE_WEBHOOK_SECRET NEXT_PUBLIC_URL RESEND_API_KEY EMAIL_FROM)

green() { printf '\033[32m%s\033[0m\n' "$1"; }
red()   { printf '\033[31m%s\033[0m\n' "$1"; }
yellow(){ printf '\033[33m%s\033[0m\n' "$1"; }

get_val() {
  local key="$1"
  if [[ -f "$ENV_FILE" ]]; then
    grep -E "^${key}=" "$ENV_FILE" 2>/dev/null | head -1 | cut -d= -f2- | tr -d '"' | tr -d "'"
  fi
}

echo ""
echo "ClauseCheck deploy prep"
echo "ENV_FILE=$ENV_FILE"
echo ""

PASS=0
FAIL=0

for key in "${REQUIRED[@]}"; do
  val=$(get_val "$key")
  if [[ -n "$val" ]]; then
    green "✅ $key"
    PASS=$((PASS + 1))
  else
    red "❌ $key — missing"
    FAIL=$((FAIL + 1))
  fi
done

for key in "${PROD_REQUIRED[@]}"; do
  val=$(get_val "$key")
  if [[ -n "$val" ]]; then
    green "✅ $key (production)"
    PASS=$((PASS + 1))
  else
    yellow "⚠️  $key — missing (required for Vercel production)"
    FAIL=$((FAIL + 1))
  fi
done

for key in "${OPTIONAL[@]}"; do
  val=$(get_val "$key")
  if [[ -n "$val" ]]; then
    green "✅ $key"
  else
    yellow "○ $key — optional / set after deploy"
  fi
done

auth=$(get_val AUTH_SECRET)
if [[ "$auth" == "dev-only-change-me-in-production" || ${#auth} -lt 16 ]]; then
  red "❌ AUTH_SECRET too weak for production"
  FAIL=$((FAIL + 1))
  new_secret=$(openssl rand -base64 32 2>/dev/null || echo "")
  if [[ -n "$new_secret" ]]; then
    yellow "   Suggested: AUTH_SECRET=$new_secret"
  fi
fi

echo ""
if [[ -f vercel.json ]]; then
  green "✅ vercel.json present (maxDuration configured)"
else
  red "❌ vercel.json missing"
  FAIL=$((FAIL + 1))
fi

if npm run build --silent >/dev/null 2>&1; then
  green "✅ npm run build passes"
else
  red "❌ npm run build failed — fix before deploy"
  FAIL=$((FAIL + 1))
fi

echo ""
echo "────────────────────────────"
if [[ "$FAIL" -eq 0 ]]; then
  green "Ready to deploy. Next steps:"
  echo "  1. docs/DEPLOY.md — full walkthrough"
  echo "  2. npm run db:check     — after DATABASE_URL is set"
  echo "  3. npm run deploy:env   — push env to Vercel (after vercel link)"
  echo "  4. vercel --prod        — deploy"
else
  yellow "Fix $FAIL item(s) above, then re-run: npm run deploy:prep"
  echo ""
  echo "Quick fix for DATABASE_URL:"
  echo "  → Neon: https://neon.tech → New Project → copy Pooled connection string"
  echo "  → Add to $ENV_FILE: DATABASE_URL=postgresql://..."
fi
echo "────────────────────────────"
echo ""

[[ "$FAIL" -eq 0 ]] || exit 1
