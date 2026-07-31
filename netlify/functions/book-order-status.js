/**
 * DESIGNER HOMES — Minimal, safe order status for the success page.
 * GET ?session_id=cs_...  → limited public-safe fields for the buyer who just paid.
 * The Stripe session id is long and unguessable and only appears in the buyer's
 * own success URL. No addresses or PII beyond first name are returned.
 */
'use strict';
const S = require('./lib/books-shared');

exports.handler = async (event) => {
  const headers = S.corsHeaders();
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  const q = event.queryStringParameters || {};
  const sid = q.session_id;
  if (!sid || !/^cs_[A-Za-z0-9_]+$/.test(sid)) return S.jsonResponse(400, { error: 'Invalid session' }, headers);
  try {
    const rows = await S.sbSelect('book_orders',
      'stripe_session_id=eq.' + encodeURIComponent(sid) +
      '&select=order_number,customer_name,total_cents,has_digital,has_physical,fulfillment_status&limit=1');
    const o = rows && rows[0];
    if (!o) return S.jsonResponse(200, { found: false }, headers); // webhook may not have landed yet
    return S.jsonResponse(200, {
      found: true,
      order_number: o.order_number,
      first_name: (o.customer_name || '').trim().split(/\s+/)[0] || '',
      total: (o.total_cents / 100).toFixed(2),
      has_digital: o.has_digital,
      has_physical: o.has_physical
    }, headers);
  } catch (err) {
    return S.jsonResponse(200, { found: false }, headers);
  }
};
