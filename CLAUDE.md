# Project memory — Designer Homes website (book store)

_Last updated: 2026-07-21_

## Source of truth (verified)
- **Local path:** `/Volumes/SosaWorkspace/SOS/Documents/Claude/Projects/Designer Homes website`
- **GitHub:** `github.com/designerhomesre/website` · branch **main** · base commit `f2c4137`
- **Hosting: Netlify** (NOT Vercel — the brief said Vercel, but the repo is Netlify:
  `netlify.toml` + `netlify/functions/`). Build accordingly.
- Local == GitHub, clean at start of this work.
- ⚠️ **Security:** the git remote had a **plaintext GitHub PAT embedded** in the URL.
  Owner agreed to rotate it later. Rotate + switch to a credential helper.

## Stack (existing, reused)
- Static multi-page HTML + vanilla JS. No build step.
- Stripe already integrated (invoice flow: `create-checkout.js`, `stripe-webhook.js`, `verify-payment.js`).
- Supabase referenced (client `app/js/app-supabase.js`; functions use raw REST + service key).
- **No transactional email provider existed** → Resend was integrated for the book store.
- Admin login is **client-side only** (PBKDF2 hash in localStorage). Not sufficient for
  server endpoints → the book admin API is gated by a server-side `ADMIN_API_TOKEN`.

## What was built (book store — 2026-07-21)
Single source of truth: **`js/books-config.js`** (products, prices, entitlements,
weights/dims, shipping, copy, FAQs). Loaded in browser AND Node (server verifies prices).
Store is locked until `store.storeLive = true` and each product `published: true` + real price.

- Storefront: `books.html` (`/books`), `books-success.html`, `book-policies.html`,
  `css/books.css`, `js/books-store.js`. Nav "Books" link added to all 14 public pages;
  homepage featured section in `index.html`.
- Functions (`netlify/functions/`): `create-book-checkout.js`, `book-stripe-webhook.js`
  (idempotent via UNIQUE stripe_session_id), `book-download.js` (HMAC + grant + entitlement
  checks → short-lived Supabase signed URLs from PRIVATE `book-digital` bucket),
  `book-order-status.js`, `book-admin.js` (token-gated), `lib/books-shared.js`, `lib/email.js`.
- Admin: `book-admin.html` (orders dashboard) + `packing-slip.html` (print CSS, batch, ink-saver).
- DB: `supabase/migrations/0001_book_store.sql` — **owner already ran it** (tables + private
  bucket created). RLS on, no anon policies → only service role can read orders.
- `netlify.toml`: noindex headers + `/books`, `/book-admin` redirects.
- Docs/setup: `BOOK_STORE_SETUP.md`, `.env.example`, `.env` (gitignored),
  `scripts/set-netlify-env.sh`.

## Products & entitlements (configurable in books-config.js)
- memoir-paperback → no digital bonus
- memoir-hardcover → e-book + fillable workbook PDF
- workbook → no digital bonus
- combo (featured) → paperback + physical workbook + e-book + fillable workbook PDF

## Entitlement → file map
- `MEMOIR_EBOOK` (memoir-ebook.pdf), `WORKBOOK_PDF` (workbook-fillable.pdf) in private
  `book-digital` bucket. Filenames are placeholders in config until real files uploaded.

## Env vars (Netlify) — see BOOK_STORE_SETUP.md §2
STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, SUPABASE_URL, SUPABASE_SERVICE_KEY,
RESEND_API_KEY, BOOK_FROM_EMAIL, SITE_URL, ADMIN_API_TOKEN, DOWNLOAD_SIGNING_SECRET,
(optional STRIPE_AUTOMATIC_TAX).
- ADMIN_API_TOKEN and DOWNLOAD_SIGNING_SECRET were generated and stored in `.env` (gitignored).
- The Stripe **book** webhook endpoint: `/.netlify/functions/book-stripe-webhook`, event
  `checkout.session.completed`.

## Status / what's left
- Code complete; local syntax + runtime smoke tests pass. NOT yet committed/pushed/deployed.
- Owner is bringing **Codex** for Stripe integration/testing. Handoff prompt provided.
- Owner ran the SQL. Still to do (human-only): fill 5 real keys in `.env` + run
  `scripts/set-netlify-env.sh`; add Stripe webhook; verify Resend DNS; upload 2 private PDFs;
  enter real prices/covers/synopsis/ISBNs/inventory then `storeLive=true`; rotate GitHub PAT.
- Testing must stay in Stripe TEST mode; do not process a live card without owner approval.

## Open decisions (owner approval)
Sales tax, return/replacement policy, damaged/lost policy, digital-goods refund terms,
whether to build a click-based admin settings UI (prices currently edited in books-config.js).

## Guardrails
Do NOT invent prices, titles, ISBNs, page counts, dimensions, or cover art — use editable
placeholders. Do NOT redesign the existing appraisal site. Preserve existing functionality.
