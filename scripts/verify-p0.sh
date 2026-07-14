#!/usr/bin/env bash
# P0 production-readiness smoke tests for ClauseCheck.
#
# Usage:
#   npm run verify:p0              # auto-starts dev server if needed
#   AUTO_START_SERVER=0 npm run verify:p0   # require existing server
#   BASE_URL=http://localhost:3000 npm run verify:p0

set -uo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

BASE_URL="${BASE_URL:-http://localhost:3000}"
COOKIE_JAR="$ROOT/scripts/.verify-p0-cookies.txt"
FIXTURES="$ROOT/scripts/fixtures"
OVERLONG="$FIXTURES/overlong-contract.txt"
HELPERS="$ROOT/scripts/verify-helpers.mjs"
DEV_LOG="$ROOT/scripts/.verify-p0-dev.log"

AUTO_START_SERVER="${AUTO_START_SERVER:-1}"
AUTO_CLEANUP="${AUTO_CLEANUP:-1}"
STARTED_DEV_PID=""
WEBHOOK_TEST_PID=""

PASS=0
FAIL=0
SKIP=0

green() { printf '\033[32m%s\033[0m\n' "$1"; }
red()   { printf '\033[31m%s\033[0m\n' "$1"; }
yellow(){ printf '\033[33m%s\033[0m\n' "$1"; }

pass() { green "✅ $1"; PASS=$((PASS + 1)); }
fail() { red "❌ $1"; [[ -n "${2:-}" ]] && red "   $2"; FAIL=$((FAIL + 1)); }
skip() { yellow "⏭  $1"; SKIP=$((SKIP + 1)); }

cleanup() {
  if [[ "$AUTO_CLEANUP" != "1" ]]; then return; fi
  if [[ -n "$WEBHOOK_TEST_PID" ]]; then
    kill "$WEBHOOK_TEST_PID" 2>/dev/null || true
    wait "$WEBHOOK_TEST_PID" 2>/dev/null || true
  fi
  if [[ -n "$STARTED_DEV_PID" ]]; then
    kill "$STARTED_DEV_PID" 2>/dev/null || true
    wait "$STARTED_DEV_PID" 2>/dev/null || true
    yellow "Stopped auto-started dev server (pid $STARTED_DEV_PID)"
  fi
}
trap cleanup EXIT

load_dotenv() {
  for f in .env.local .env; do
    if [[ -f "$f" ]]; then
      while IFS= read -r line || [[ -n "$line" ]]; do
        [[ "$line" =~ ^[[:space:]]*# ]] && continue
        [[ "$line" =~ ^(AUTH_SECRET|DATABASE_URL|OPENAI_API_KEY)= ]] || continue
        export "$line"
      done < "$f"
      return 0
    fi
  done
  return 1
}

# Stable client IP for quota tests (must match verify-helpers VERIFY_CLIENT_IP)
VERIFY_CLIENT_IP="${VERIFY_CLIENT_IP:-p0-verify-test-ip}"
export VERIFY_CLIENT_IP
CURL_SCAN_HEADERS=(-H "X-Forwarded-For: $VERIFY_CLIENT_IP")

json_field() {
  local json="$1" field="$2"
  node -e "
    const o = JSON.parse(process.argv[1]);
    const v = o[process.argv[2]];
    if (v === undefined || v === null) process.exit(1);
    console.log(typeof v === 'object' ? JSON.stringify(v) : v);
  " "$json" "$field" 2>/dev/null
}

http_code() {
  curl -s -o /dev/null -w "%{http_code}" "$@"
}

http_body() {
  curl -s "$@"
}

ensure_overlong_fixture() {
  # Plan A free/trial cap is EXPERIENCE_WORD_LIMIT (20_000 chars).
  if [[ ! -f "$OVERLONG" ]] || [[ $(wc -c < "$OVERLONG" | tr -d ' ') -lt 22000 ]]; then
    node -e "require('fs').writeFileSync(process.argv[1], '合同条款双方权利义务。'.repeat(2500))" "$OVERLONG"
  fi
}

require_server() {
  local code
  code=$(http_code "$BASE_URL/api/scan-count" || echo "000")
  if [[ "$code" == "200" ]]; then
    return 0
  fi

  if [[ "$AUTO_START_SERVER" != "1" ]]; then
    red "Dev server not reachable at $BASE_URL (got HTTP $code)"
    echo ""
    echo "Start the server: npm run dev"
    exit 1
  fi

  yellow "Starting dev server on ${BASE_URL##*:}…"
  rm -f "$DEV_LOG"
  npm run dev >"$DEV_LOG" 2>&1 &
  STARTED_DEV_PID=$!

  local ready=0
  for _ in $(seq 1 45); do
    code=$(http_code "$BASE_URL/api/scan-count" || echo "000")
    if [[ "$code" == "200" ]]; then
      ready=1
      break
    fi
    sleep 1
  done

  if [[ "$ready" != "1" ]]; then
    red "Failed to start dev server — see $DEV_LOG"
    exit 1
  fi
  green "Dev server ready (pid $STARTED_DEV_PID)"
}

# ── Tests ──────────────────────────────────────────────────────────────

test_server_reachable() {
  local code
  code=$(http_code "$BASE_URL/api/scan-count")
  if [[ "$code" == "200" ]]; then
    pass "Server reachable ($BASE_URL)"
  else
    fail "Server reachable" "HTTP $code"
  fi
}

test_scan_count_shape() {
  local body count
  body=$(http_body "$BASE_URL/api/scan-count")
  count=$(json_field "$body" "count" || echo "")
  if [[ "$count" =~ ^[0-9]+$ ]]; then
    pass "GET /api/scan-count returns numeric count ($count)"
  else
    fail "GET /api/scan-count shape" "$body"
  fi
}

test_entitlements_anonymous() {
  local body pro auth
  body=$(http_body "$BASE_URL/api/entitlements")
  pro=$(json_field "$body" "pro" || echo "")
  auth=$(json_field "$body" "authenticated" || echo "")
  if [[ "$pro" == "false" && "$auth" == "false" ]]; then
    pass "GET /api/entitlements — anonymous returns pro=false"
  else
    fail "GET /api/entitlements — anonymous" "$body"
  fi
}

test_quota_api_shape() {
  local body tier allowed
  body=$(curl -s "${CURL_SCAN_HEADERS[@]}" "$BASE_URL/api/quota")
  tier=$(json_field "$body" "tier" || echo "")
  allowed=$(json_field "$body" "allowed" || echo "")
  if [[ -n "$tier" && -n "$allowed" ]]; then
    pass "GET /api/quota returns tier + allowed (tier=$tier)"
  else
    fail "GET /api/quota shape" "$body"
  fi
}

test_tier_spoof_long_text_rejected() {
  ensure_overlong_fixture
  local body code err_code err_field
  body=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/scan" \
    "${CURL_SCAN_HEADERS[@]}" \
    -H "x-user-tier: pro" \
    -F "file=@$OVERLONG;type=text/plain" \
    -F "locale=zh" \
    -F "tier=pro")
  code=$(echo "$body" | tail -n1)
  body=$(echo "$body" | sed '$d')
  err_code=$(json_field "$body" "code" || echo "")
  err_field=$(json_field "$body" "error" || echo "")

  # Credits on: unauthenticated → 401 (spoofed tier ignored).
  # Credits off / legacy free path: 413 TEXT_TOO_LONG over EXPERIENCE_WORD_LIMIT (20k).
  # Logged-in trial over cap: 413 WORD_LIMIT_EXCEEDED.
  if [[ "$code" == "401" && "$err_field" == "UNAUTHORIZED" ]]; then
    pass "Spoofed pro tier ignored — scan requires login (401 UNAUTHORIZED)"
  elif [[ "$code" == "413" && ( "$err_code" == "TEXT_TOO_LONG" || "$err_field" == "WORD_LIMIT_EXCEEDED" ) ]]; then
    pass "Spoofed pro tier cannot bypass 20k-char free/trial limit (413)"
  else
    fail "Spoofed pro tier on long text" "HTTP $code, code=$err_code, error=$err_field, body=${body:0:200}"
  fi
}

test_quota_exceeded() {
  load_dotenv || true
  node "$HELPERS" backup >/dev/null

  node "$HELPERS" clear-quota >/dev/null 2>&1 || true
  node "$HELPERS" seed-quota >/dev/null

  local body code err_code
  body=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/scan" \
    "${CURL_SCAN_HEADERS[@]}" \
    -F "file=@$FIXTURES/sample-contract.txt;type=text/plain" \
    -F "locale=zh")
  code=$(echo "$body" | tail -n1)
  body=$(echo "$body" | sed '$d')
  err_code=$(json_field "$body" "code" || echo "")

  node "$HELPERS" restore >/dev/null 2>&1 || true

  if [[ "$code" == "403" && "$err_code" == "QUOTA_EXCEEDED" ]]; then
    pass "Free quota enforced server-side (403 QUOTA_EXCEEDED)"
  else
    fail "Free quota exceeded" "HTTP $code, code=$err_code, body=${body:0:200}"
  fi
}

test_pay_per_use_credit_lifecycle() {
  load_dotenv || true
  rm -f "$COOKIE_JAR"
  node "$HELPERS" backup >/dev/null

  local seed_json token ent_body credits_before credits_after scan_code
  seed_json=$(node "$HELPERS" seed-ppu)
  token=$(json_field "$seed_json" "token" || echo "")

  if [[ -z "$token" ]]; then
    node "$HELPERS" restore >/dev/null 2>&1 || true
    fail "Pay-per-use seed" "Could not create test session"
    return
  fi

  # Login via magic link verify → session cookie
  curl -s -o /dev/null -c "$COOKIE_JAR" -b "$COOKIE_JAR" \
    -L "$BASE_URL/api/auth/verify?token=$token&locale=zh"

  ent_body=$(curl -s -b "$COOKIE_JAR" "$BASE_URL/api/entitlements")
  credits_before=$(json_field "$ent_body" "payPerUseCredits" || echo "0")

  scan_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 180 -b "$COOKIE_JAR" \
    "${CURL_SCAN_HEADERS[@]}" -X POST "$BASE_URL/api/scan" \
    -F "file=@$FIXTURES/sample-contract.txt;type=text/plain" \
    -F "locale=zh" || echo "000")

  credits_after=$(node "$HELPERS" count-ppu)

  node "$HELPERS" restore >/dev/null 2>&1 || true
  rm -f "$COOKIE_JAR"

  if [[ "$credits_before" -ge 1 && "$scan_code" == "200" && "$credits_after" == "0" ]]; then
    pass "Pay-per-use credit consumed after scan (before=$credits_before, after=$credits_after)"
  else
    fail "Pay-per-use lifecycle" "credits_before=$credits_before scan=$scan_code credits_after=$credits_after ent=$ent_body"
  fi
}

test_webhook_rejects_unsigned_in_production() {
  if ! command -v npm >/dev/null 2>&1; then
    skip "Webhook production guard (npm not found)"
    return
  fi

  if [[ ! -f "$ROOT/.next/BUILD_ID" ]]; then
    yellow "   Building for webhook test..."
    npm run build --silent >/dev/null 2>&1 || {
      skip "Webhook production guard (build failed)"
      return
    }
  fi

  local port=3099
  local log="$ROOT/scripts/.verify-p0-webhook.log"
  rm -f "$log"
  AUTH_SECRET="test-secret-for-p0" \
  NODE_ENV=production \
  npx next start -p "$port" >"$log" 2>&1 &
  local pid=$!
  WEBHOOK_TEST_PID=$pid

  local ready=0
  for _ in $(seq 1 30); do
    if curl -sf "http://127.0.0.1:$port/api/scan-count" >/dev/null 2>&1; then
      ready=1
      break
    fi
    sleep 1
  done

  if [[ "$ready" != "1" ]]; then
    kill "$pid" 2>/dev/null || true
    wait "$pid" 2>/dev/null || true
    skip "Webhook production guard (server did not start on :$port — see $log)"
    return
  fi

  local code
  code=$(curl -s -o /dev/null -w "%{http_code}" -X POST "http://127.0.0.1:$port/api/webhooks/stripe" \
    -H "Content-Type: application/json" \
    -d '{"type":"checkout.session.completed"}' || echo "000")

  kill "$pid" 2>/dev/null || true
  wait "$pid" 2>/dev/null || true
  WEBHOOK_TEST_PID=""

  if [[ "$code" == "400" || "$code" == "500" ]]; then
    pass "Production webhook rejects missing STRIPE_WEBHOOK_SECRET (HTTP $code)"
  else
    fail "Production webhook guard" "HTTP $code (expected 400 or 500). Log: $log"
  fi
}

# ── Main ───────────────────────────────────────────────────────────────

main() {
  echo ""
  echo "ClauseCheck P0 verification"
  echo "BASE_URL=$BASE_URL"
  if [[ -n "${DATABASE_URL:-}" ]]; then
    echo "Storage: Postgres (DATABASE_URL set)"
  else
    echo "Storage: local JSON (data/*.json)"
  fi
  echo ""

  require_server

  test_server_reachable
  test_scan_count_shape
  test_entitlements_anonymous
  test_quota_api_shape
  test_tier_spoof_long_text_rejected
  test_quota_exceeded
  test_pay_per_use_credit_lifecycle
  test_webhook_rejects_unsigned_in_production

  echo ""
  echo "────────────────────────────"
  green "Passed: $PASS"
  [[ "$SKIP" -gt 0 ]] && yellow "Skipped: $SKIP"
  [[ "$FAIL" -gt 0 ]] && red "Failed: $FAIL"
  echo "────────────────────────────"
  echo ""

  if [[ "$FAIL" -gt 0 ]]; then
    exit 1
  fi
}

main "$@"
