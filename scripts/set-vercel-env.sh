#!/usr/bin/env bash
# Push book-store environment variables from .env to Vercel.
# Prereqs: Vercel CLI installed/logged in and this repo linked to the project.
#   npm i -g vercel
#   vercel login
#   vercel link
#
# Usage:
#   bash scripts/set-vercel-env.sh preview
#   bash scripts/set-vercel-env.sh production
#
# It skips any variable still set to REPLACE_ME or REPLACE_WITH_*.

set -euo pipefail
cd "$(dirname "$0")/.."

TARGET="${1:-preview}"
if [ "$TARGET" != "preview" ] && [ "$TARGET" != "production" ] && [ "$TARGET" != "development" ]; then
  echo "Usage: bash scripts/set-vercel-env.sh [preview|production|development]" >&2
  exit 1
fi

if command -v vercel >/dev/null 2>&1; then
  VERCEL_CMD=(vercel)
else
  VERCEL_CMD=(npx vercel)
fi
if [ ! -f .env ]; then echo ".env not found. Copy .env.example to .env first." >&2; exit 1; fi

VARS=(STRIPE_SECRET_KEY STRIPE_WEBHOOK_SECRET SUPABASE_URL SUPABASE_SERVICE_KEY \
      RESEND_API_KEY BOOK_FROM_EMAIL BOOK_ADMIN_EMAIL SITE_URL ADMIN_API_TOKEN DOWNLOAD_SIGNING_SECRET \
      STRIPE_AUTOMATIC_TAX)

# shellcheck disable=SC1091
set -a; source ./.env 2>/dev/null || true; set +a

for name in "${VARS[@]}"; do
  val="${!name-}"
  if [ -z "${val:-}" ] || [ "$val" = "REPLACE_ME" ] || [[ "$val" == REPLACE_WITH_* ]]; then
    echo "skip  $name (not set)"
    continue
  fi
  printf '%s' "$val" | "${VERCEL_CMD[@]}" env add "$name" "$TARGET" >/dev/null
  echo "set   $name ($TARGET)"
done

echo "Done. Verify with: ${VERCEL_CMD[*]} env ls"
echo "Redeploy so functions pick up the new values."
