/**
 * DESIGNER HOMES — Book store shared server helpers.
 * Not a Netlify function itself (lives in /lib). Imported by the book-* functions.
 *
 * Loads the SAME config the browser uses so prices & entitlements are verified
 * server-side and never trusted from the client.
 */
'use strict';

const crypto = require('crypto');
// Bundled by esbuild from the repo's single source of truth:
const CFG = require('../../../js/books-config.js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

// ---------------------------------------------------------------------------
// Pricing — computed ONLY from config, never from the browser payload.
// ---------------------------------------------------------------------------
function computeOrder(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return { error: 'No items provided.' };
  }
  if (!CFG.store.storeLive) {
    return { error: 'The store is not open yet.' };
  }

  const resolved = [];
  let subtotalCents = 0;
  let hasPhysical = false;
  const entitlements = { ebook: false, workbookPdf: false };

  for (const raw of items) {
    const product = CFG.getProduct(raw && raw.productId);
    if (!product) return { error: 'Unknown product: ' + (raw && raw.productId) };
    if (!CFG.isPurchasable(product)) return { error: 'Product not available: ' + product.id };

    let qty = parseInt(raw.quantity, 10);
    if (!Number.isFinite(qty) || qty < 1) qty = 1;
    if (qty > 20) qty = 20;

    // Inventory guard (only when inventory is tracked and backorder disabled)
    if (typeof product.inventory === 'number' && !product.allowBackorder && product.inventory < qty) {
      return { error: 'Not enough inventory for ' + product.shortName };
    }

    subtotalCents += product.priceCents * qty;
    if (product.physical) hasPhysical = true;
    if (product.entitlements) {
      if (product.entitlements.ebook) entitlements.ebook = true;
      if (product.entitlements.workbookPdf) entitlements.workbookPdf = true;
    }

    resolved.push({
      productId: product.id,
      sku: product.sku,
      name: product.shortName || product.name,
      format: product.format,
      unitAmountCents: product.priceCents,
      quantity: qty,
      physical: !!product.physical,
      entitlements: product.entitlements || { ebook: false, workbookPdf: false }
    });
  }

  // Shipping (config-driven). Digital-only orders never pay shipping.
  let shippingCents = 0;
  if (hasPhysical) {
    const s = CFG.store.shipping;
    if (s.freeShippingThresholdCents != null && subtotalCents >= s.freeShippingThresholdCents) {
      shippingCents = 0;
    } else if (typeof s.flatRateCents === 'number') {
      shippingCents = s.flatRateCents;
    } else {
      // Flat rate not configured yet — refuse rather than guess.
      return { error: 'Shipping rate is not configured.' };
    }
  }

  return {
    resolved,
    subtotalCents,
    shippingCents,
    hasPhysical,
    entitlements,
    stripeLineItems: resolved.map(function (r) {
      return {
        price_data: {
          currency: CFG.store.currency,
          product_data: { name: r.name + ' (' + r.format + ')', metadata: { product_id: r.productId, sku: r.sku } },
          unit_amount: r.unitAmountCents
        },
        quantity: r.quantity
      };
    })
  };
}

// ---------------------------------------------------------------------------
// Order numbers — human readable, e.g. DH-2026-000042
// ---------------------------------------------------------------------------
function orderNumberFromSeq(seq) {
  const year = new Date().getFullYear();
  return 'DH-' + year + '-' + String(seq).padStart(6, '0');
}
function fallbackOrderNumber() {
  return 'DH-' + new Date().getFullYear() + '-' + crypto.randomBytes(3).toString('hex').toUpperCase();
}

// ---------------------------------------------------------------------------
// Secure download token: HMAC(order_id | file_id) — cannot be forged/tampered.
// ---------------------------------------------------------------------------
function downloadSecret() {
  return process.env.DOWNLOAD_SIGNING_SECRET || process.env.STRIPE_WEBHOOK_SECRET || '';
}
function makeDownloadToken(orderId, fileId) {
  const secret = downloadSecret();
  return crypto.createHmac('sha256', secret).update(orderId + '|' + fileId).digest('hex');
}
function verifyDownloadToken(orderId, fileId, token) {
  const expected = makeDownloadToken(orderId, fileId);
  const a = Buffer.from(expected);
  const b = Buffer.from(String(token || ''));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// ---------------------------------------------------------------------------
// Supabase REST helpers (service role — server only).
// ---------------------------------------------------------------------------
async function sb(path, opts) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) throw new Error('Supabase not configured');
  opts = opts || {};
  const headers = Object.assign({
      'Content-Type': 'application/json',
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY
    }, opts.headers || {});
  const fetchOpts = Object.assign({}, opts, { headers: headers });
  const res = await fetch(SUPABASE_URL + path, fetchOpts);
  const text = await res.text();
  let json = null; try { json = text ? JSON.parse(text) : null; } catch (e) { json = text; }
  if (!res.ok) throw new Error('Supabase ' + res.status + ': ' + (typeof json === 'string' ? json : JSON.stringify(json)));
  return json;
}
function sbInsert(table, rows, prefer) {
  return sb('/rest/v1/' + table, {
    method: 'POST',
    headers: { 'Prefer': prefer || 'return=representation' },
    body: JSON.stringify(rows)
  });
}
function sbSelect(table, query) {
  return sb('/rest/v1/' + table + (query ? ('?' + query) : ''), { method: 'GET' });
}
function sbUpdate(table, matchQuery, patch) {
  return sb('/rest/v1/' + table + '?' + matchQuery, {
    method: 'PATCH',
    headers: { 'Prefer': 'return=representation' },
    body: JSON.stringify(patch)
  });
}
async function sbRpc(fn, args) {
  return sb('/rest/v1/rpc/' + fn, { method: 'POST', body: JSON.stringify(args || {}) });
}
// Create a short-lived signed URL for a PRIVATE storage object.
async function sbSignedUrl(bucket, objectPath, expiresInSec) {
  const json = await sb('/storage/v1/object/sign/' + bucket + '/' + objectPath, {
    method: 'POST',
    body: JSON.stringify({ expiresIn: expiresInSec || 900 })
  });
  // Returns { signedURL: '/object/sign/...?token=...' }
  return SUPABASE_URL + '/storage/v1' + json.signedURL;
}

// ---------------------------------------------------------------------------
// Misc
// ---------------------------------------------------------------------------
function jsonResponse(statusCode, body, extraHeaders) {
  return {
    statusCode,
    headers: Object.assign({ 'Content-Type': 'application/json' }, extraHeaders || {}),
    body: JSON.stringify(body)
  };
}
function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': process.env.SITE_URL || '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Content-Type': 'application/json'
  };
}

module.exports = {
  CFG,
  computeOrder,
  orderNumberFromSeq,
  fallbackOrderNumber,
  makeDownloadToken,
  verifyDownloadToken,
  sb, sbInsert, sbSelect, sbUpdate, sbRpc, sbSignedUrl,
  jsonResponse, corsHeaders
};
