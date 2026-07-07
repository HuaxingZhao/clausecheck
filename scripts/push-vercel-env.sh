#!/usr/bin/env bash
# Push .env.local vars to linked Vercel project (Production).
# Prerequisite: vercel link && vercel login
#
# Usage: npm run deploy:env

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

ENV_FILE="${ENV_FILE:-.env.local}"
KEYS=(
  OPENAI_API_KEY
  DATABASE_URL
  AUTH_SECRET
  STRIPE_SECRET_KEY
  STRIPE_WEBHOOK_SECRET
  NEXT_PUBLIC_URL
  RESEND_API_KEY
  EMAIL_FROM
  GOOGLE_CLIENT_ID
  GOOGLE_CLIENT_SECRET
  APPLE_CLIENT_ID
  APPLE_TEAM_ID
  APPLE_KEY_ID
  APPLE_PRIVATE_KEY
)

if ! command -v vercel >/dev/null 2>&1; then
  echo "Install Vercel CLI: npm i -g vercel"
  exit 1
fi

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE"
  exit 1
fi

if [[ ! -f .vercel/project.json ]]; then
  echo "Run first: vercel link"
  exit 1
fi

echo "Pushing env vars from $ENV_FILE to Vercel (production)…"
echo ""

for key in "${KEYS[@]}"; do
  val=$(grep -E "^${key}=" "$ENV_FILE" 2>/dev/null | head -1 | cut -d= -f2- | tr -d '"' | tr -d "'")
  if [[ -z "$val" ]]; then
    echo "○ skip $key (not in $ENV_FILE)"
    continue
  fi
  echo "→ $key"
  printf '%s' "$val" | vercel env add "$key" production --force
done

echo ""
echo "Done. Redeploy for changes to take effect: vercel --prod"
