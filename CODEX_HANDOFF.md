# Codex Handoff — Audit & Complete the Designer Homes Book Store

You are taking over a nearly-complete feature. Audit it for correctness and security,
finish the wiring, test it in Stripe TEST mode, and prepare it for deployment. Do NOT
redesign or regress the existing appraisal website.

## Context & source of truth
- Repo: `github.com/designerhomesre/website`, branch `main`. Base commit before this work: `f2c4137`.
- **Hosting is Vercel** (owner clarification after this handoff was written). Static multi-page
  HTML site, vanilla JS, with Vercel API functions in `api/` wrapping the original
  `netlify/functions/` handlers.
- Read `CLAUDE.md` and `BOOK_STORE_SETUP.md` first — they describe the whole design.
- Single source of truth for products/prices/entitlements/shipping/copy: `js/books-config.js`
  (loaded in the browser AND required by the server functions so prices are verified server-side).

## Hard guardrails
- Do NOT invent prices, titles, ISBNs, page counts, dimensions, descriptions, or cover art.
  Leave the existing editable placeholders; the owner will supply real values.
- Do NOT redesign the existing site. The only existing-file changes should remain: a "Books"
  nav link on public pages, the homepage feature section, and `netlify.toml` additions.
- Do NOT commit secrets, customer files, or the paid PDFs. `.env` is gitignored — keep it so.
- Keep Stripe in TEST mode. Do NOT process a live card without the owner's explicit approval.
- Payment is "paid" ONLY via the verified webhook — never from the success page.

## Files in scope (the book store)
Storefront: `books.html`, `books-success.html`, `book-policies.html`, `css/books.css`,
`js/books-config.js`, `js/books-store.js`.
Functions: `netlify/functions/create-book-checkout.js`, `book-stripe-webhook.js`,
`book-download.js`, `book-order-status.js`, `book-admin.js`, `lib/books-shared.js`, `lib/email.js`.
Admin: `book-admin.html`, `packing-slip.html`.
DB: `supabase/migrations/0001_book_store.sql` (already run by the owner).
Config/scripts: `vercel.json`, `netlify.toml` legacy compatibility, `.env.example`,
`.env` (gitignored), `scripts/set-vercel-env.sh`.

## PART 1 — Audit (report issues with file:line; fix low-risk ones directly)
1. **Server-side pricing:** confirm `create-book-checkout.js` and `book-stripe-webhook.js`
   derive all prices/entitlements from `js/books-config.js` via `lib/books-shared.js` and never
   trust browser-sent amounts. Verify the esbuild bundler resolves the cross-directory
   `require('../../../js/books-config.js')` at build time (run a Netlify build to confirm).
3. **Webhook integrity:** signature verification, correct handling of Netlify
   `isBase64Encoded` bodies, and idempotency via `UNIQUE(stripe_session_id)` (a retried event
   must not create a duplicate order or duplicate emails).
4. **Digital download security (`book-download.js`):** all three checks enforced — HMAC token,
   grant row exists, and the order actually holds the entitlement — before minting a
   short-lived Supabase signed URL from the PRIVATE `book-digital` bucket. Confirm a
   paperback-only buyer cannot reach a bonus file by editing `order`/`file`/`token` params.
5. **Admin auth (`book-admin.js`):** every action requires the `ADMIN_API_TOKEN` bearer;
   constant-time compare; no PII leaks without it.
6. **Supabase RLS:** confirm the anon key can read nothing; all access is service-role via
   functions. Check the migration matches what the functions read/write (column names, the
   `next_book_order_seq` and `decrement_book_inventory` RPCs).
7. **Email (`lib/email.js`):** sends from `info@designerhomesre.com`; degrades safely (skips)
   when `RESEND_API_KEY` is absent so the webhook never fails on email.
8. **Shipping copy:** the exact processing language is used and nothing implies delivery
   within 48 hours. `store.processingNotice` in config is the canonical string.
9. **Front-end:** `/books` renders from config; buttons disabled while `storeLive=false` or a
   product is unpublished/priced null; FAQ/synopsis/workbook/accomplishment sections present;
   SEO/OG/Book structured data present; accessible (focus states, ARIA); responsive.
10. **netlify.toml:** noindex on `book-admin.html`/`packing-slip.html`/`books-success.html`;
    `/books` and `/book-admin` redirects; CSP still allows Stripe + Supabase (connect/frame).

## PART 2 — Complete the wiring (ask the owner for values; don't guess)
1. Ensure `.env` has real TEST values for STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET,
   SUPABASE_URL, SUPABASE_SERVICE_KEY, RESEND_API_KEY. ADMIN_API_TOKEN and
   DOWNLOAD_SIGNING_SECRET are already generated in `.env`.
2. Push env to Netlify: `bash scripts/set-netlify-env.sh` (then `netlify env:list`).
3. In Stripe (test): add webhook endpoint
   `https://<deploy-url>/.netlify/functions/book-stripe-webhook`, event
   `checkout.session.completed`; put its `whsec_…` in env. Enable Apple/Google Pay wallets.
4. Resend: verify domain DNS (SPF/DKIM/DMARC) per `BOOK_STORE_SETUP.md §5`.
5. Confirm the private `book-digital` bucket exists and (for testing) contains placeholder
   `memoir-ebook.pdf` and `workbook-fillable.pdf` (owner replaces with real files).

## PART 3 — Test matrix (Stripe TEST mode; card 4242 4242 4242 4242)
Run locally with `netlify dev` and/or a Netlify deploy preview:
- Paperback / Hardcover / Workbook / Combo each create exactly one paid order.
- Multiple quantities and multiple products in one order compute correct totals + shipping.
- Canceled checkout returns to `/books?checkout=cancelled`; declined card (4000 0000 0000 0002)
  creates no order.
- Webhook writes the order once; re-delivering the same event creates no duplicate/no 2nd email.
- Hardcover/Combo → digital email with working, expiring links; links dead after expiry.
- Paperback-only buyer is denied all bonus downloads (URL tampering blocked).
- Thank-you email on purchase; shipment email + tracking link on "Mark shipped".
- Admin dashboard: search/filter, status update, notes, mark packed/shipped, resend
  confirmation + digital, export unfulfilled CSV, Pirate Ship CSV, single + batch packing slips.
- Admin API rejects requests missing/!= ADMIN_API_TOKEN.
- `/books` mobile layout and keyboard navigation.

## PART 4 — Build, commit, deploy (do NOT promote to prod without owner approval)
1. Run any repo lint/format, then `netlify build` (confirm functions bundle, incl. the config require).
2. Review the full `git diff`. Ensure no secrets/PDFs are staged.
3. Commit to a feature branch (e.g. `feature/book-store`) with a clear message; push.
4. Let Netlify create a **deploy preview**; verify checkout (test mode) on desktop + mobile.
5. Only after the owner approves the preview, merge to `main` for production. Keep Stripe in
   test mode until the owner explicitly authorizes live keys.

## Hand back to the owner (human-only; you cannot do these)
- Rotate the GitHub PAT currently embedded in the git remote; switch to a credential helper.
- Provide real prices/covers/synopsis/ISBNs/inventory in `js/books-config.js`, then set
  each product `published: true` and `store.storeLive = true`.
- Upload the real private e-book + fillable workbook PDF to the `book-digital` bucket.
- Approve sales-tax, return/replacement, damaged/lost, and digital-refund policies.
- Authorize switching Stripe to live keys before real sales.

Report: issues found (file:line), fixes made, test results, the preview URL, and any
blockers or decisions still needed from the owner.
