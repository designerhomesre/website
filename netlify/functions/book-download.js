/**
 * DESIGNER HOMES — Secure digital download.
 *
 * GET /.netlify/functions/book-download?order=<uuid>&file=<FILE_ID>&token=<hmac>
 *
 * Security:
 *   1. HMAC token is verified (cannot be forged/tampered).
 *   2. A matching grant row must exist for (order, file).
 *   3. The order must actually hold the entitlement for that file.
 * Only then is a SHORT-LIVED Supabase Storage signed URL minted and returned via
 * a 302 redirect. Files live in a PRIVATE bucket — never publicly reachable.
 * Editing the URL to a file you didn't buy fails all three checks.
 *
 * Env: SUPABASE_URL, SUPABASE_SERVICE_KEY, DOWNLOAD_SIGNING_SECRET (or STRIPE_WEBHOOK_SECRET)
 */
'use strict';

const S = require('./lib/books-shared');
const CFG = S.CFG;

const ENTITLEMENT_FOR_FILE = {
  MEMOIR_EBOOK: 'entitlement_ebook',
  MEMOIR_EPUB: 'entitlement_ebook',
  WORKBOOK_PDF: 'entitlement_workbook_pdf'
};
const SIGNED_URL_TTL = 300; // seconds

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Method not allowed' };
  }
  const q = event.queryStringParameters || {};
  const orderId = q.order, fileId = q.file, token = q.token;

  if (!orderId || !fileId || !token) return deny(400, 'Missing parameters.');
  const fileDef = CFG.digitalFiles[fileId];
  if (!fileDef) return deny(404, 'Unknown file.');

  // 1. Token integrity
  if (!S.verifyDownloadToken(orderId, fileId, token)) return deny(403, 'Invalid or expired link.');

  try {
    // 2. Grant row must exist
    const grants = await S.sbSelect('book_digital_grants',
      'order_id=eq.' + encodeURIComponent(orderId) + '&file_id=eq.' + encodeURIComponent(fileId) + '&limit=1');
    if (!grants || !grants.length) return deny(403, 'No download grant for this order.');

    // 3. Order must actually hold the entitlement
    const col = ENTITLEMENT_FOR_FILE[fileId];
    const orders = await S.sbSelect('book_orders',
      'id=eq.' + encodeURIComponent(orderId) + '&select=id,' + col + ',payment_status&limit=1');
    const order = orders && orders[0];
    if (!order || order.payment_status !== 'paid' || !order[col]) return deny(403, 'Not entitled to this download.');

    // Mint short-lived signed URL from the PRIVATE bucket
    const signed = await S.sbSignedUrl(fileDef.bucket, fileDef.storageKey, SIGNED_URL_TTL);

    // Track the request (best-effort)
    try {
      await S.sbUpdate('book_digital_grants',
        'order_id=eq.' + encodeURIComponent(orderId) + '&file_id=eq.' + encodeURIComponent(fileId),
        { last_requested_at: new Date().toISOString(), request_count: (grants[0].request_count || 0) + 1 });
    } catch (e) { /* non-fatal */ }

    return {
      statusCode: 302,
      headers: {
        'Location': signed,
        'Cache-Control': 'no-store, private',
        'Content-Disposition': 'attachment; filename="' + (fileDef.downloadName || 'download') + '"'
      },
      body: ''
    };
  } catch (err) {
    console.error('book-download error:', err.message);
    return deny(500, 'Download temporarily unavailable.');
  }
};

function deny(code, msg) {
  return {
    statusCode: code,
    headers: { 'Content-Type': 'text/html', 'Cache-Control': 'no-store' },
    body: '<!doctype html><meta charset="utf-8"><title>Download</title>' +
      '<div style="font-family:system-ui;max-width:520px;margin:60px auto;text-align:center;color:#2C3E50;">' +
      '<h1 style="font-size:20px;">Download unavailable</h1><p style="color:#6c757d;">' + msg + '</p>' +
      '<p style="color:#6c757d;font-size:13px;">Need help? Email info@designerhomesre.com</p></div>'
  };
}
