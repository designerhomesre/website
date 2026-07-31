#!/usr/bin/env bash
# Push book-store environment variables from .env to Netlify.
# Prereqs: Netlify CLI installed and logged in, and this repo linked to the site.
#   npm i -g netlify-cli
#   netlify login
#   netlify link           # choose the site for designerhomesre.com
#
# Usage:  bash scripts/set-netlify-env.sh
# It skips any variable still set to REPLACE_ME or REPLACE_WITH_* so you never push placeholders.

set -euo pipefail
cd "$(dirname "$0")/.."

if ! command -v netlify >/dev/null 2>&1; then
  echo "Netlify CLI not found. Install with: npm i -g netlify-cli" >&2
  exit 1
fi
if [ ! -f .env ]; then echo ".env not found. Copy .env.example to .env first." >&2; exit 1; fi

VARS=(STRIPE_SECRET_KEY STRIPE_WEBHOOK_SECRET SUPABASE_URL SUPABASE_SERVICE_KEY \
      RESEND_API_KEY BOOK_FROM_EMAIL SITE_URL ADMIN_API_TOKEN DOWNLOAD_SIGNING_SECRET \
      STRIPE_AUTOMATIC_TAX)

# shellcheck disable=SC1091
set -a; source ./.env 2>/dev/null || true; set +a

for name in "${VARS[@]}"; do
  val="${!name-}"
  if [ -z "${val:-}" ] || [ "$val" = "REPLACE_ME" ] || [[ "$val" == REPLACE_WITH_* ]]; then
    echo "skip  $name (not set)"
    continue
  fi
  netlify env:set "$name" "$val" >/dev/null
  echo "set   $name"
done

echo "Done. Verify with: netlify env:list"
echo "Redeploy so functions pick up the new values (git push or 'netlify deploy --build')."
