/**
 * DESIGNER HOMES — Stripe webhook for BOOK orders.
 *
 * Source of truth for "paid". Verifies the Stripe signature, re-computes the
 * order server-side, writes it to Supabase, grants digital entitlements, and
 * sends confirmation + digital-delivery emails.
 *
 * Idempotent: the order row has a UNIQUE stripe_session_id. A retried webhook
 * hits the unique constraint and is treated as already-processed (no dup order,
 * no duplicate emails).
 *
 * Env: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, SUPABASE_URL,
 *      SUPABASE_SERVICE_KEY, RESEND_API_KEY, SITE_URL
 */
'use strict';

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const S = require('./lib/books-shared');
const mail = require('./lib/email');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const sig = event.headers['stripe-signature'];
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  let evt;
  try {
    if (!secret || !sig) throw new Error('Missing webhook secret or signature');
    // Netlify may base64-encode the body; constructEvent needs the raw string.
    const raw = event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString('utf8') : event.body;
    evt = stripe.webhooks.constructEvent(raw, sig, secret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid signature' }) };
  }

  try {
    if (evt.type === 'checkout.session.completed') {
      await handleCompleted(evt.data.object);
    } else {
      console.log('Unhandled book webhook event:', evt.type);
    }
    return { statusCode: 200, body: JSON.stringify({ received: true }) };
  } catch (err) {
    console.error('Book webhook processing error:', err);
    // Return 200 for "already processed" so Stripe stops retrying; 500 otherwise.
    if (err.__alreadyProcessed) return { statusCode: 200, body: JSON.stringify({ received: true, duplicate: true }) };
    return { statusCode: 500, body: JSON.stringify({ error: 'processing_failed' }) };
  }
};

async function handleCompleted(session) {
  if (session.metadata && session.metadata.kind !== 'book_order') {
    console.log('Skipping non-book session', session.id);
    return;
  }
  if (session.payment_status !== 'paid') {
    console.log('Session not paid yet:', session.id, session.payment_status);
    return;
  }

  // Re-fetch with expansions for authoritative data.
  const full = await stripe.checkout.sessions.retrieve(session.id, {
    expand: ['line_items', 'payment_intent', 'total_details.breakdown']
  });

  // Re-compute the order from metadata cart (authoritative, config-priced).
  let cart = [];
  try { cart = JSON.parse((full.metadata && full.metadata.cart) || '[]'); } catch (e) {}
  const items = cart.map(function (c) { return { productId: c.p, quantity: c.q }; });
  const computed = S.computeOrder(items);
  if (computed.error) { console.error('Recompute failed:', computed.error); }

  const totalCents = full.amount_total;
  const shippingCents = (full.total_details && full.total_details.amount_shipping) || (computed.shippingCents || 0);
  const taxCents = (full.total_details && full.total_details.amount_tax) || 0;
  const discountCents = (full.total_details && full.total_details.amount_discount) || 0;
  const subtotalCents = (computed && computed.subtotalCents) != null ? computed.subtotalCents
    : (totalCents - shippingCents - taxCents + discountCents);

  const cd = full.customer_details || {};
  const ship = full.shipping_details || (full.customer_details && full.customer_details.address ? { name: cd.name, address: cd.address } : null);
  const shipAddr = ship && ship.address ? {
    name: ship.name || cd.name || '',
    line1: ship.address.line1 || '', line2: ship.address.line2 || '',
    city: ship.address.city || '', state: ship.address.state || '',
    postal_code: ship.address.postal_code || '', country: ship.address.country || ''
  } : null;

  const hasPhysical = !!(computed && computed.hasPhysical);
  const ent = (computed && computed.entitlements) || {
    ebook: full.metadata.ent_ebook === '1',
    workbookPdf: full.metadata.ent_workbook_pdf === '1'
  };
  const hasDigital = !!(ent.ebook || ent.workbookPdf);

  // Order number (sequence via RPC; fallback to random).
  let orderNumber;
  try {
    const seq = await S.sbRpc('next_book_order_seq', {});
    orderNumber = S.orderNumberFromSeq(typeof seq === 'number' ? seq : (Array.isArray(seq) ? seq[0] : seq));
  } catch (e) {
    console.warn('order seq RPC failed, using fallback:', e.message);
    orderNumber = S.fallbackOrderNumber();
  }

  const orderRow = {
    order_number: orderNumber,
    customer_name: (shipAddr && shipAddr.name) || cd.name || '',
    customer_email: cd.email || full.customer_email || '',
    customer_phone: cd.phone || '',
    shipping_address: shipAddr,
    subtotal_cents: subtotalCents,
    shipping_cents: shippingCents,
    tax_cents: taxCents,
    discount_cents: discountCents,
    total_cents: totalCents,
    currency: full.currency,
    has_physical: hasPhysical,
    has_digital: hasDigital,
    entitlement_ebook: !!ent.ebook,
    entitlement_workbook_pdf: !!ent.workbookPdf,
    stripe_session_id: full.id,
    stripe_payment_intent: (full.payment_intent && full.payment_intent.id) || full.payment_intent || null,
    payment_status: 'paid',
    fulfillment_status: hasPhysical ? 'Awaiting Fulfillment' : 'Paid',
    digital_delivery_status: hasDigital ? 'pending' : 'not_applicable',
    email_confirmation_status: 'pending'
  };

  // Insert order — idempotency via UNIQUE(stripe_session_id).
  let inserted;
  try {
    const rows = await S.sbInsert('book_orders', orderRow);
    inserted = Array.isArray(rows) ? rows[0] : rows;
  } catch (err) {
    if (String(err.message).indexOf('409') !== -1 || /duplicate key|unique/i.test(err.message)) {
      console.log('Order already processed for session', full.id);
      const e = new Error('already processed'); e.__alreadyProcessed = true; throw e;
    }
    throw err;
  }
  const orderId = inserted.id;

  // Order items.
  const itemRows = (computed && computed.resolved || []).map(function (r) {
    return {
      order_id: orderId, product_id: r.productId, sku: r.sku, name: r.name,
      format: r.format, unit_amount_cents: r.unitAmountCents, quantity: r.quantity,
      physical: r.physical
    };
  });
  if (itemRows.length) { try { await S.sbInsert('book_order_items', itemRows, 'return=minimal'); } catch (e) { console.error('item insert', e.message); } }

  // Digital grants (secure tokens; validated at download time).
  const grantLinks = [];
  const siteUrl = process.env.SITE_URL || 'https://designerhomesre.com';
  async function grant(fileId, label) {
    const token = S.makeDownloadToken(orderId, fileId);
    try {
      await S.sbInsert('book_digital_grants', {
        order_id: orderId, file_id: fileId, token: token, request_count: 0
      }, 'return=minimal');
    } catch (e) { console.error('grant insert', e.message); }
    grantLinks.push({
      label: label,
      url: siteUrl + '/.netlify/functions/book-download?order=' + orderId + '&file=' + fileId + '&token=' + token
    });
  }
  if (ent.ebook) await grant('MEMOIR_EBOOK', 'Memoir e-book');
  if (ent.workbookPdf) await grant('WORKBOOK_PDF', 'Fillable Workbook PDF');

  // Emails (non-fatal; tracked).
  const emailModel = Object.assign({}, inserted, {
    _items: (computed && computed.resolved) || [],
    _hasPhysical: hasPhysical,
    _shipping: shipAddr
  });
  try {
    const t = mail.thankYouEmail(emailModel);
    const r = await mail.send(orderRow.customer_email, t.subject, t.html);
    await S.sbUpdate('book_orders', 'id=eq.' + orderId, {
      email_confirmation_status: r && r.skipped ? 'skipped' : 'sent',
      email_confirmation_at: new Date().toISOString()
    });
  } catch (e) { console.error('thank-you email failed:', e.message); }

  if (hasDigital && grantLinks.length) {
    try {
      const d = mail.digitalDeliveryEmail(emailModel, grantLinks);
      const r = await mail.send(orderRow.customer_email, d.subject, d.html);
      await S.sbUpdate('book_orders', 'id=eq.' + orderId, {
        digital_delivery_status: r && r.skipped ? 'skipped' : 'sent',
        digital_delivery_at: new Date().toISOString()
      });
    } catch (e) { console.error('digital email failed:', e.message); }
  }

  // Decrement inventory for tracked products (best-effort).
  for (const r of (computed && computed.resolved) || []) {
    try { await S.sbRpc('decrement_book_inventory', { p_product_id: r.productId, p_qty: r.quantity }); } catch (e) {}
  }

  console.log('Book order recorded:', orderNumber, orderId);
}
