# Designer Homes — Book Store: Setup & Operations Runbook

This document explains how to configure, launch, and operate the memoir & workbook
storefront that was added to the existing site. It changes **nothing** about the
existing appraisal site except adding a "Books" nav link and a homepage feature.

> Architecture: static HTML + **Vercel API Functions** (with legacy Netlify handler wrappers) +
> **Stripe** Checkout + **Supabase** (Postgres + private Storage) + **Resend** email.
> Prices and digital entitlements are verified **server-side** from `js/books-config.js`.

---

## 1. Files added

**Storefront (public)**
- `books.html` — the storefront (`/books`)
- `books-success.html` — post-payment thank-you page
- `book-policies.html` — shipping / returns / damaged / digital policies (placeholders)
- `css/books.css`, `js/books-config.js` (config), `js/books-store.js` (renderer)
- `images/books/` — drop cover artwork here (see its README)

**Admin (noindex, protected)**
- `book-admin.html` — order dashboard
- `packing-slip.html` — printable packing slips

**Serverless functions**
- `api/` — Vercel API entrypoints that adapt the existing audited handlers.
- `netlify/functions/` — shared handler logic retained for continuity.
- `create-book-checkout.js` — creates the Stripe Checkout Session (server-priced)
- `book-stripe-webhook.js` — verified webhook → writes order, grants downloads, emails
- `book-download.js` — entitlement-checked secure download endpoint
- `book-order-status.js` — minimal safe status for the success page
- `book-admin.js` — protected admin API (list/get/update/ship/resend/export)
- `lib/books-shared.js`, `lib/email.js` — shared server helpers + email templates

**Database**
- `supabase/migrations/0001_book_store.sql`

**Config**
- `vercel.json` — noindex/security headers, `/books` + `/book-admin` rewrites, and
  legacy `/.netlify/functions/:function` → `/api/:function` compatibility.
- `netlify.toml` — legacy config retained from the original implementation.
- 14 public pages — added the "Books" nav link (edited)

---

## 2. Environment variables (Vercel → Project → Settings → Environment Variables)

| Variable | Purpose |
|---|---|
| `STRIPE_SECRET_KEY` | Stripe secret key (`sk_test_…` while testing, `sk_live_…` later) |
| `STRIPE_WEBHOOK_SECRET` | Signing secret for the **book** webhook (`whsec_…`) |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Supabase **service role** key (server only — never in the browser) |
| `RESEND_API_KEY` | Resend API key for transactional email |
| `BOOK_FROM_EMAIL` | Optional. Default: `Designer Homes Real Estate <info@designerhomesre.com>` |
| `BOOK_ADMIN_EMAIL` | Optional. Where new-order/admin alerts are sent. Defaults to `info@designerhomesre.com` |
| `ADMIN_API_TOKEN` | Long random secret that protects the order dashboard/API |
| `DOWNLOAD_SIGNING_SECRET` | Random secret used to sign download links (falls back to webhook secret) |
| `SITE_URL` | `https://designerhomesre.com` (already used by the existing functions) |
| `STRIPE_AUTOMATIC_TAX` | Optional `true` to enable Stripe Tax (only after you configure tax) |

Generate secrets, e.g.: `openssl rand -hex 32`.

---

## 3. Supabase

1. Create (or reuse) a Supabase project. Copy the **Project URL** and **service role** key into Vercel env.
2. Open **SQL editor**, paste `supabase/migrations/0001_book_store.sql`, run it.
   - Creates `book_orders`, `book_order_items`, `book_digital_grants`, `book_inventory`.
   - Enables **RLS with no anon policies** → the public key can read nothing; only the
     server (service key) can access orders. Customers can never see others' data.
   - Creates the **private** `book-digital` storage bucket.
3. (Optional) Seed `book_inventory` if you want DB-authoritative stock counts.

---

## 4. Stripe

You do **not** need to pre-create Stripe Products — checkout uses dynamic
`price_data` priced from `js/books-config.js`.

1. In Stripe (test mode), get `sk_test_…` → `STRIPE_SECRET_KEY`.
2. In Stripe **Wallets**, enable Apple Pay / Google Pay (Checkout shows them automatically).
3. **Webhook**: Developers → Webhooks → Add endpoint:
   - URL: `https://designerhomesre.com/api/book-stripe-webhook`
   - Events: `checkout.session.completed`
   - Copy the signing secret → `STRIPE_WEBHOOK_SECRET`.
   - Payment is only marked paid via this verified webhook — never from the success page.
   - Idempotent: retried webhooks hit the `UNIQUE(stripe_session_id)` and are ignored.

---

## 5. Email domain (Resend)

1. Create a Resend account, add domain `designerhomesre.com`.
2. Add the DNS records Resend shows you (typically at your DNS host):
   - **SPF** (TXT), **DKIM** (CNAME/TXT records Resend provides), and a **Return-Path/MX** if requested.
   - Recommended: a **DMARC** TXT record (`v=DMARC1; p=none; rua=mailto:info@designerhomesre.com`).
3. Wait for verification, then set `RESEND_API_KEY` in Vercel. Until configured, emails are safely skipped (orders still record).

---

## 6. Upload the private digital files

The e-book and fillable workbook PDF must live in the **private** `book-digital` bucket —
never a public web folder.

1. Supabase → Storage → `book-digital`.
2. Upload the real files, keeping the names in `js/books-config.js`:
   - `memoir-ebook.pdf` (MEMOIR_EBOOK)
   - `workbook-fillable.pdf` (WORKBOOK_PDF)
   (Change the `storageKey`/`downloadName` in the config if you use different names.)
3. Do **not** make the bucket public. Buyers get short-lived signed links only after an
   entitlement check.

---

## 7. Enter your real product info

Everything editable lives in **one file**: `js/books-config.js`.

For each product set: `name`, `shortName`, `priceCents` (integer cents, e.g. `2499`),
`shortDescription`, `coverImage`, `isbn`, `pageCount`, `dimensions`, `weightOz`,
`dimsIn`, `inventory`, and flip `published: true`.

Fill `content` (hero, synopsis, themes, audience, author statement, workbook, accomplishment)
and `faqs`. Drop cover art into `images/books/` (see its README).

Adjust `store.shipping.flatRateCents`, `freeShippingThresholdCents`, and services as needed.

**Go live:** set `store.storeLive = true`. Until then, buttons show "Coming Soon" and the
server refuses checkout — no accidental orders.

Digital entitlements are configurable per product via `entitlements: { ebook, workbookPdf }`.

---

## 8. Operating orders (admin)

1. Open `https://designerhomesre.com/book-admin` (noindex).
2. Paste the `ADMIN_API_TOKEN` (stored for the browser session only).
3. Search/filter by name, email, order #, tracking, product, date, payment, or fulfillment.
4. Open an order to: update fulfillment status, add internal notes, enter carrier/service/
   tracking/label cost, **Mark packed**, **Mark shipped** (sends the tracking email),
   **Resend confirmation**, **Resend digital downloads**.
5. **Packing slips**: select rows → "Print selected packing slips" (or per-order). Print
   dialog → letter size; there's an ink-saving toggle and automatic page breaks.
6. **Pirate Ship**: "Pirate Ship CSV" downloads an import file for unfulfilled physical
   orders (weights default from config; editable in Pirate Ship before buying labels).
   After you buy/print the label, paste tracking back into the order and Mark shipped.

Fulfillment states: Paid, Awaiting Fulfillment, Packing, Ready to Ship, Shipped,
Delivered, Canceled, Refunded, Needs Attention.

---

## 9. Test plan (Stripe TEST mode)

Use Stripe test cards (`4242 4242 4242 4242`, any future date/CVC). With test keys set in Vercel:

- [ ] Paperback / Hardcover / Workbook / Combo purchase each create a paid order
- [ ] Multiple quantities and multiple products in one order
- [ ] Canceled checkout returns to `/books?checkout=cancelled`
- [ ] Failed card (`4000 0000 0000 0002`) does not create an order
- [ ] Webhook records the order once; re-sending the event creates no duplicate
- [ ] Hardcover/Combo → digital-delivery email with working, expiring links
- [ ] Paperback-only buyer **cannot** reach a bonus file by editing the download URL
- [ ] Thank-you email received; shipment email on "Mark shipped"; tracking link works
- [ ] Packing slip prints (single + batch); Pirate Ship CSV opens correctly
- [ ] Admin API rejects requests without the token
- [ ] Mobile layout of `/books` looks right

Keep test mode until every box passes. Do not process a live card without explicit approval.

---

## 10. Open decisions (need your approval — legal/tax/business)

- **Sales tax**: whether/where to collect. Leave `STRIPE_AUTOMATIC_TAX` unset until decided.
- **Return / replacement** and **damaged/lost** policies (placeholders in `book-policies.html`).
- **Digital goods** refundability terms.
- **Admin settings UI**: prices/inventory are currently edited in `js/books-config.js`
  (single source of truth). A point-and-click admin settings screen can be added later if you want it.
- **GitHub token**: rotate the personal access token currently embedded in the git remote.
