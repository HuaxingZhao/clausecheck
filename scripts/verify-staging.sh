#!/usr/bin/env bash
# Staging / production smoke checks before go-live.
#
# Usage:
#   BASE_URL=https://your-preview.vercel.app bash scripts/verify-staging.sh
#   npm run verify:staging

set -uo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

BASE_URL="${BASE_URL:-${NEXT_PUBLIC_URL:-}}"
ENV_FILE="${ENV_FILE:-.env.local}"

PASS=0
FAIL=0
WARN=0

green() { printf '\033[32m%s\033[0m\n' "$1"; }
red()   { printf '\033[31m%s\033[0m\n' "$1"; }
yellow(){ printf '\033[33m%s\033[0m\n' "$1"; }

pass() { green "✅ $1"; PASS=$((PASS + 1)); }
fail() { red "❌ $1"; FAIL=$((FAIL + 1)); }
warn() { yellow "⚠️  $1"; WARN=$((WARN + 1)); }

require_env() {
  local key="$1"
  local val=""
  if [[ -f "$ENV_FILE" ]]; then
    val=$(grep -E "^${key}=" "$ENV_FILE" | head -1 | cut -d= -f2- | tr -d '"' | tr -d "'")
  fi
  if [[ -z "$val" && -n "${!key:-}" ]]; then
    val="${!key}"
  fi
  if [[ -z "$val" ]]; then
    fail "Missing env: $key"
    return 1
  fi
  pass "Env present: $key"
  return 0
}

main() {
  echo ""
  echo "ClauseCheck staging / production checklist"
  echo "ENV_FILE=$ENV_FILE"
  echo ""

  require_env OPENAI_API_KEY
  require_env DATABASE_URL
  require_env AUTH_SECRET
  require_env RESEND_API_KEY
  require_env STRIPE_SECRET_KEY
  require_env STRIPE_WEBHOOK_SECRET

  if [[ -z "$BASE_URL" ]]; then
    warn "BASE_URL not set — skipping live HTTP checks"
  else
    echo ""
    echo "Live checks against $BASE_URL"
    code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/scan-count" || echo "000")
    if [[ "$code" == "200" ]]; then
      pass "GET /api/scan-count ($code)"
    else
      fail "GET /api/scan-count ($code)"
    fi

    body=$(curl -s "$BASE_URL/api/quota" || echo "{}")
    if echo "$body" | grep -q '"tier"'; then
      pass "GET /api/quota returns tier"
    else
      fail "GET /api/quota" "$body"
    fi

    echo ""
    echo "Run full P0 suite against staging:"
    echo "  BASE_URL=$BASE_URL npm run verify:p0"
  fi

  echo ""
  echo "────────────────────────────"
  green "Passed: $PASS"
  [[ "$WARN" -gt 0 ]] && yellow "Warnings: $WARN"
  [[ "$FAIL" -gt 0 ]] && red "Failed: $FAIL"
  echo "────────────────────────────"
  echo ""

  [[ "$FAIL" -gt 0 ]] && exit 1
}

main "$@"
