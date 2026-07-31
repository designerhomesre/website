/**
 * DESIGNER HOMES — Transactional email (Resend).
 * Sends branded emails from info@designerhomesre.com.
 * Requires env: RESEND_API_KEY, and a verified sending domain (see runbook).
 *
 * Safe by design: if RESEND_API_KEY is missing, send() logs and returns
 * {skipped:true} instead of throwing, so webhook processing never fails just
 * because email is unconfigured.
 */
'use strict';

const FROM = process.env.BOOK_FROM_EMAIL || 'Designer Homes Real Estate <info@designerhomesre.com>';
const SUPPORT_EMAIL = 'info@designerhomesre.com';
const SUPPORT_PHONE = '(973) 725-9580';
const BRAND = 'Designer Homes Real Estate Services';
const NAVY = '#2C3E50';
const GOLD = '#C9A96E';
const PROCESSING_NOTICE = 'Orders are processed and shipped within 48 hours of purchase. Delivery ' +
  'time begins after the shipping carrier accepts the package and varies based on destination and shipping service.';

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
  });
}
function money(cents) { return '$' + (Number(cents || 0) / 100).toFixed(2); }

async function send(to, subject, html) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[email] RESEND_API_KEY missing — skipping email to', to);
    return { skipped: true };
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + process.env.RESEND_API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ from: FROM, to: [to], subject: subject, html: html, reply_to: SUPPORT_EMAIL })
  });
  const text = await res.text();
  if (!res.ok) throw new Error('Resend ' + res.status + ': ' + text);
  return JSON.parse(text || '{}');
}

function shell(title, bodyHtml) {
  return '' +
  '<div style="background:#f4f5f7;padding:24px 0;font-family:Segoe UI,Arial,sans-serif;color:#2C3E50;">' +
    '<div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e9ecef;">' +
      '<div style="background:' + NAVY + ';padding:22px 28px;">' +
        '<div style="color:#fff;font-size:18px;font-weight:700;">' + BRAND + '</div>' +
        '<div style="color:' + GOLD + ';font-size:13px;letter-spacing:.06em;text-transform:uppercase;">' + esc(title) + '</div>' +
      '</div>' +
      '<div style="padding:28px;">' + bodyHtml + '</div>' +
      '<div style="padding:18px 28px;background:#f8f9fa;border-top:1px solid #e9ecef;font-size:12px;color:#6c757d;">' +
        'Questions? Email <a href="mailto:' + SUPPORT_EMAIL + '" style="color:' + NAVY + ';">' + SUPPORT_EMAIL + '</a> or call ' + SUPPORT_PHONE + '.' +
      '</div>' +
    '</div>' +
  '</div>';
}

function itemsTable(items) {
  const rows = (items || []).map(function (i) {
    return '<tr>' +
      '<td style="padding:6px 0;border-bottom:1px solid #eee;">' + esc(i.name) + ' <span style="color:#6c757d;">(' + esc(i.format) + ')</span></td>' +
      '<td style="padding:6px 0;border-bottom:1px solid #eee;text-align:center;">' + Number(i.quantity) + '</td>' +
      '<td style="padding:6px 0;border-bottom:1px solid #eee;text-align:right;">' + money(i.unitAmountCents * i.quantity) + '</td>' +
    '</tr>';
  }).join('');
  return '<table style="width:100%;border-collapse:collapse;font-size:14px;margin:10px 0;">' +
    '<tr><th style="text-align:left;font-size:12px;color:#6c757d;">Item</th><th style="font-size:12px;color:#6c757d;">Qty</th><th style="text-align:right;font-size:12px;color:#6c757d;">Amount</th></tr>' +
    rows + '</table>';
}

function addressBlock(a) {
  if (!a) return '';
  return '<div style="font-size:14px;line-height:1.5;">' +
    esc(a.name || '') + '<br>' +
    esc(a.line1 || '') + (a.line2 ? '<br>' + esc(a.line2) : '') + '<br>' +
    esc([a.city, a.state].filter(Boolean).join(', ')) + ' ' + esc(a.postal_code || '') + '<br>' +
    esc(a.country || '') + '</div>';
}

// ---- Templates -----------------------------------------------------------
function thankYouEmail(order) {
  const firstName = (order.customer_name || '').trim().split(/\s+/)[0] || 'there';
  const body =
    '<p style="font-size:16px;">Hi ' + esc(firstName) + ',</p>' +
    '<p>Thank you for supporting this project and being part of this important milestone. ' +
    'Your order has been received. ' +
    'You will receive another email with tracking information once your package is on the way.</p>' +
    '<p style="margin:14px 0 4px;"><strong>Order ' + esc(order.order_number) + '</strong></p>' +
    itemsTable(order._items) +
    '<table style="width:100%;font-size:14px;margin-top:6px;">' +
      '<tr><td>Subtotal</td><td style="text-align:right;">' + money(order.subtotal_cents) + '</td></tr>' +
      (order.discount_cents ? '<tr><td>Discount</td><td style="text-align:right;">-' + money(order.discount_cents) + '</td></tr>' : '') +
      '<tr><td>Shipping</td><td style="text-align:right;">' + money(order.shipping_cents) + '</td></tr>' +
      (order.tax_cents ? '<tr><td>Tax</td><td style="text-align:right;">' + money(order.tax_cents) + '</td></tr>' : '') +
      '<tr><td style="font-weight:700;padding-top:6px;">Total paid</td><td style="text-align:right;font-weight:700;padding-top:6px;">' + money(order.total_cents) + '</td></tr>' +
    '</table>' +
    (order._hasPhysical ? '<p style="margin-top:16px;"><strong>Shipping to:</strong></p>' + addressBlock(order._shipping) : '') +
    '<p style="margin-top:16px;color:#6c757d;font-size:13px;">' + PROCESSING_NOTICE + '</p>';
  return { subject: 'Thank you — order ' + order.order_number, html: shell('Order Confirmation', body) };
}

function digitalDeliveryEmail(order, links) {
  const firstName = (order.customer_name || '').trim().split(/\s+/)[0] || 'there';
  const linkRows = links.map(function (l) {
    return '<div style="margin:10px 0;"><a href="' + l.url + '" style="display:inline-block;background:' + GOLD + ';color:#1A252F;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:700;">Download ' + esc(l.label) + '</a></div>';
  }).join('');
  const body =
    '<p style="font-size:16px;">Hi ' + esc(firstName) + ',</p>' +
    '<p>Your order includes complimentary digital editions. Use the secure links below to download them. ' +
    'For your security, these links expire — if a link stops working, you can request new ones or reply to this email.</p>' +
    linkRows +
    '<p style="margin-top:16px;color:#6c757d;font-size:13px;">These downloads are tied to your order and are for your personal use.</p>';
  return { subject: 'Your digital downloads — order ' + order.order_number, html: shell('Digital Downloads', body) };
}

function shipmentEmail(order) {
  const firstName = (order.customer_name || '').trim().split(/\s+/)[0] || 'there';
  const carrier = order.shipping_carrier || 'the carrier';
  const tracking = order.tracking_number || '';
  let trackUrl = order.tracking_url || '';
  if (!trackUrl && tracking) {
    const c = (order.shipping_carrier || '').toLowerCase();
    if (c.indexOf('usps') !== -1) trackUrl = 'https://tools.usps.com/go/TrackConfirmAction?tLabels=' + encodeURIComponent(tracking);
    else if (c.indexOf('ups') !== -1) trackUrl = 'https://www.ups.com/track?tracknum=' + encodeURIComponent(tracking);
    else if (c.indexOf('fedex') !== -1) trackUrl = 'https://www.fedex.com/fedextrack/?trknbr=' + encodeURIComponent(tracking);
  }
  const body =
    '<p style="font-size:16px;">Hi ' + esc(firstName) + ',</p>' +
    '<p>Good news — your order <strong>' + esc(order.order_number) + '</strong> is on its way via ' + esc(carrier) + '.</p>' +
    (tracking ? '<p><strong>Tracking:</strong> ' + esc(tracking) + '</p>' +
      (trackUrl ? '<div style="margin:10px 0;"><a href="' + trackUrl + '" style="display:inline-block;background:' + NAVY + ';color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:700;">Track your package</a></div>' : '')
      : '') +
    '<p style="margin-top:14px;color:#6c757d;font-size:13px;">Delivery time begins after the carrier accepts the package and varies by destination and service.</p>';
  return { subject: 'Your order has shipped — ' + order.order_number, html: shell('Shipment Confirmation', body) };
}

module.exports = { send, thankYouEmail, digitalDeliveryEmail, shipmentEmail };
