/**
 * DESIGNER HOMES — Book order admin API (server-side protected).
 *
 * Protects customer PII behind a server-side token because the existing admin
 * login is client-side only. The admin dashboard sends:
 *     Authorization: Bearer <ADMIN_API_TOKEN>
 *
 * Actions (POST { action, ... }):
 *   list, get, update_status, add_note, set_shipping, mark_packed,
 *   mark_shipped, resend_confirmation, resend_digital, export_unfulfilled,
 *   pirateship_csv
 *
 * Env: ADMIN_API_TOKEN, SUPABASE_URL, SUPABASE_SERVICE_KEY, RESEND_API_KEY, SITE_URL
 */
'use strict';

const crypto = require('crypto');
const S = require('./lib/books-shared');
const mail = require('./lib/email');
const CFG = S.CFG;

const FULFILLMENT_STATES = ['Paid', 'Awaiting Fulfillment', 'Packing', 'Ready to Ship',
  'Shipped', 'Delivered', 'Canceled', 'Refunded', 'Needs Attention'];

function authOK(event) {
  const expected = process.env.ADMIN_API_TOKEN || '';
  if (!expected) return false;
  const hdr = event.headers['authorization'] || event.headers['Authorization'] || '';
  const got = hdr.replace(/^Bearer\s+/i, '');
  const a = Buffer.from(got), b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

exports.handler = async (event) => {
  const headers = S.corsHeaders();
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') return S.jsonResponse(405, { error: 'Method not allowed' }, headers);
  if (!authOK(event)) return S.jsonResponse(401, { error: 'Unauthorized' }, headers);

  let body;
  try { body = JSON.parse(event.body || '{}'); } catch (e) { return S.jsonResponse(400, { error: 'Bad JSON' }, headers); }
  const action = body.action;

  try {
    switch (action) {
      case 'list':                 return S.jsonResponse(200, await listOrders(body), headers);
      case 'get':                  return S.jsonResponse(200, await getOrder(body.id), headers);
      case 'update_status':        return S.jsonResponse(200, await updateStatus(body), headers);
      case 'add_note':             return S.jsonResponse(200, await addNote(body), headers);
      case 'set_shipping':         return S.jsonResponse(200, await setShipping(body), headers);
      case 'mark_packed':          return S.jsonResponse(200, await markPacked(body), headers);
      case 'mark_shipped':         return S.jsonResponse(200, await markShipped(body), headers);
      case 'resend_confirmation':  return S.jsonResponse(200, await resendConfirmation(body), headers);
      case 'resend_digital':       return S.jsonResponse(200, await resendDigital(body), headers);
      case 'export_unfulfilled':   return S.jsonResponse(200, await exportUnfulfilled(), headers);
      case 'pirateship_csv':       return await pirateShipCsv(body, headers);
      default:                     return S.jsonResponse(400, { error: 'Unknown action' }, headers);
    }
  } catch (err) {
    console.error('book-admin ' + action + ' error:', err.message);
    return S.jsonResponse(500, { error: err.message || 'Server error' }, headers);
  }
};

// ---- helpers ---------------------------------------------------------------
function esc(v) { return encodeURIComponent(v); }

async function listOrders(body) {
  const parts = ['select=*', 'order=created_at.desc'];
  const filters = [];
  if (body.fulfillment_status) filters.push('fulfillment_status=eq.' + esc(body.fulfillment_status));
  if (body.payment_status) filters.push('payment_status=eq.' + esc(body.payment_status));
  if (body.date_from) filters.push('created_at=gte.' + esc(body.date_from));
  if (body.date_to) filters.push('created_at=lte.' + esc(body.date_to));
  if (body.search) {
    const s = String(body.search).replace(/[(),*]/g, ' ').trim();
    // Search across order_number, email, name, tracking
    filters.push('or=(order_number.ilike.*' + esc(s) + '*,customer_email.ilike.*' + esc(s) +
      '*,customer_name.ilike.*' + esc(s) + '*,tracking_number.ilike.*' + esc(s) + '*)');
  }
  const limit = Math.min(200, parseInt(body.limit, 10) || 100);
  parts.push('limit=' + limit);
  const query = parts.concat(filters).join('&');
  let orders = await S.sbSelect('book_orders', query);

  // Optional product filter (needs item join) — filter in app for simplicity.
  if (body.product_id) {
    const items = await S.sbSelect('book_order_items', 'select=order_id&product_id=eq.' + esc(body.product_id) + '&limit=1000');
    const ids = new Set((items || []).map(function (i) { return i.order_id; }));
    orders = orders.filter(function (o) { return ids.has(o.id); });
  }
  return { orders: orders, states: FULFILLMENT_STATES };
}

async function getOrder(id) {
  if (!id) throw new Error('id required');
  const orders = await S.sbSelect('book_orders', 'id=eq.' + esc(id) + '&limit=1');
  const order = orders && orders[0];
  if (!order) throw new Error('Order not found');
  order._items = await S.sbSelect('book_order_items', 'order_id=eq.' + esc(id) + '&order=created_at.asc');
  order._grants = await S.sbSelect('book_digital_grants', 'order_id=eq.' + esc(id));
  return { order: order };
}

async function updateStatus(body) {
  if (!body.id || !body.fulfillment_status) throw new Error('id and fulfillment_status required');
  if (FULFILLMENT_STATES.indexOf(body.fulfillment_status) === -1) throw new Error('Invalid status');
  const rows = await S.sbUpdate('book_orders', 'id=eq.' + esc(body.id), { fulfillment_status: body.fulfillment_status });
  return { ok: true, order: rows[0] };
}

async function addNote(body) {
  if (!body.id) throw new Error('id required');
  const rows = await S.sbUpdate('book_orders', 'id=eq.' + esc(body.id), { admin_notes: body.admin_notes || '' });
  return { ok: true, order: rows[0] };
}

async function setShipping(body) {
  if (!body.id) throw new Error('id required');
  const patch = {};
  ['tracking_number', 'tracking_url', 'shipping_carrier', 'shipping_service'].forEach(function (k) {
    if (body[k] != null) patch[k] = body[k];
  });
  if (body.shipping_label_cost_cents != null) patch.shipping_label_cost_cents = parseInt(body.shipping_label_cost_cents, 10);
  if (body.ship_date) patch.ship_date = body.ship_date;
  const rows = await S.sbUpdate('book_orders', 'id=eq.' + esc(body.id), patch);
  return { ok: true, order: rows[0] };
}

async function markPacked(body) {
  if (!body.id) throw new Error('id required');
  const rows = await S.sbUpdate('book_orders', 'id=eq.' + esc(body.id),
    { fulfillment_status: 'Ready to Ship', packed_date: new Date().toISOString() });
  return { ok: true, order: rows[0] };
}

async function markShipped(body) {
  if (!body.id) throw new Error('id required');
  const patch = {
    fulfillment_status: 'Shipped',
    shipped_date: new Date().toISOString()
  };
  ['tracking_number', 'tracking_url', 'shipping_carrier', 'shipping_service'].forEach(function (k) {
    if (body[k] != null) patch[k] = body[k];
  });
  if (body.shipping_label_cost_cents != null) patch.shipping_label_cost_cents = parseInt(body.shipping_label_cost_cents, 10);
  const rows = await S.sbUpdate('book_orders', 'id=eq.' + esc(body.id), patch);
  const order = rows[0];
  let emailed = false;
  if (order.customer_email) {
    try { const m = mail.shipmentEmail(order); const r = await mail.send(order.customer_email, m.subject, m.html); emailed = !(r && r.skipped); }
    catch (e) { console.error('shipment email failed:', e.message); }
  }
  return { ok: true, order: order, emailed: emailed };
}

async function resendConfirmation(body) {
  const { order } = await getOrder(body.id);
  order._items = order._items || [];
  order._hasPhysical = order.has_physical;
  order._shipping = order.shipping_address;
  const m = mail.thankYouEmail(order);
  const r = await mail.send(order.customer_email, m.subject, m.html);
  await S.sbUpdate('book_orders', 'id=eq.' + esc(body.id), {
    email_confirmation_status: r && r.skipped ? 'skipped' : 'sent',
    email_confirmation_at: new Date().toISOString()
  });
  return { ok: true, skipped: !!(r && r.skipped) };
}

async function resendDigital(body) {
  const { order } = await getOrder(body.id);
  if (!order.has_digital) throw new Error('Order has no digital items');
  const siteUrl = process.env.SITE_URL || 'https://designerhomesre.com';
  const links = (order._grants || []).map(function (g) {
    const def = CFG.digitalFiles[g.file_id] || { label: g.file_id };
    return { label: def.label || g.file_id,
      url: siteUrl + '/api/book-download?order=' + order.id + '&file=' + g.file_id + '&token=' + g.token };
  });
  const m = mail.digitalDeliveryEmail(order, links);
  const r = await mail.send(order.customer_email, m.subject, m.html);
  for (const g of (order._grants || [])) {
    await S.sbUpdate('book_digital_grants', 'id=eq.' + esc(g.id),
      { resent_at: new Date().toISOString(), resent_count: (g.resent_count || 0) + 1 });
  }
  await S.sbUpdate('book_orders', 'id=eq.' + esc(order.id), {
    digital_delivery_status: r && r.skipped ? 'skipped' : 'sent',
    digital_delivery_at: new Date().toISOString()
  });
  return { ok: true, skipped: !!(r && r.skipped), count: links.length };
}

async function exportUnfulfilled() {
  const orders = await S.sbSelect('book_orders',
    'select=*&has_physical=eq.true&fulfillment_status=in.(Paid,Awaiting Fulfillment,Packing,Ready to Ship)&order=created_at.asc');
  return { orders: orders };
}

// Pirate Ship-compatible CSV. Weights/dims default from config, overridable per order.
async function pirateShipCsv(body, headers) {
  const orders = await exportUnfulfilled().then(function (r) { return r.orders; });
  const overrides = body.overrides || {}; // { orderId: { weightOz, l, w, h, service } }

  const cols = ['Order Number', 'Name', 'Company', 'Address 1', 'Address 2', 'City', 'State',
    'Postal Code', 'Country', 'Email', 'Weight (oz)', 'Length (in)', 'Width (in)', 'Height (in)',
    'Requested Service', 'Description'];

  const lines = [cols.join(',')];
  for (const o of orders) {
    const items = await S.sbSelect('book_order_items', 'order_id=eq.' + esc(o.id));
    // default combined weight from config
    let weightOz = 0; const descParts = [];
    (items || []).forEach(function (it) {
      const p = CFG.getProduct(it.product_id);
      if (p && typeof p.weightOz === 'number') weightOz += p.weightOz * it.quantity;
      descParts.push(it.quantity + '× ' + it.name);
    });
    const ov = overrides[o.id] || {};
    const w = ov.weightOz != null ? ov.weightOz : (weightOz || '');
    const a = o.shipping_address || {};
    const svc = ov.service || o.shipping_service || labelForDefault();
    const row = [
      o.order_number, a.name || o.customer_name || '', a.company || '',
      a.line1 || '', a.line2 || '', a.city || '', a.state || '', a.postal_code || '', a.country || 'US',
      o.customer_email || '', w,
      ov.l != null ? ov.l : '', ov.w != null ? ov.w : '', ov.h != null ? ov.h : '',
      svc, descParts.join('; ')
    ].map(csvCell);
    lines.push(row.join(','));
  }
  return {
    statusCode: 200,
    headers: Object.assign({}, headers, {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="pirateship-export.csv"'
    }),
    body: lines.join('\r\n')
  };
}
function labelForDefault() {
  const d = CFG.store.shipping.defaultServiceCode;
  const s = CFG.store.shipping.services.find(function (x) { return x.code === d; });
  return s ? s.label : 'USPS Media Mail';
}
function csvCell(v) {
  const s = String(v == null ? '' : v);
  return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}
