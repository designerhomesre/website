/**
 * DESIGNER HOMES — Create Stripe Checkout Session for BOOK orders.
 *
 * The browser sends ONLY { items: [{ productId, quantity }] }.
 * Prices, entitlements, and shipping are computed server-side from
 * js/books-config.js — the browser total is never trusted.
 *
 * Env: STRIPE_SECRET_KEY, SITE_URL
 * Card, Apple Pay, and Google Pay are handled automatically by the 'card'
 * payment method in Stripe Checkout when enabled on the account.
 */
'use strict';

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { CFG, computeOrder, corsHeaders, jsonResponse } = require('./lib/books-shared');

exports.handler = async (event) => {
  const headers = corsHeaders();
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') return jsonResponse(405, { error: 'Method not allowed' }, headers);

  try {
    const body = JSON.parse(event.body || '{}');
    const order = computeOrder(body.items);
    if (order.error) return jsonResponse(400, { error: order.error }, headers);

    const siteUrl = process.env.SITE_URL || 'https://designerhomesre.com';
    const allowed = (CFG.store.shipping.allowedRegions || ['US']);

    const params = {
      mode: 'payment',
      payment_method_types: ['card'], // card enables Apple/Google Pay automatically
      billing_address_collection: 'auto',
      allow_promotion_codes: true,
      customer_creation: 'always',
      line_items: order.stripeLineItems,
      // Metadata is a compact cart summary; the webhook re-verifies everything.
      metadata: {
        kind: 'book_order',
        cart: JSON.stringify(order.resolved.map(function (r) { return { p: r.productId, q: r.quantity }; })),
        ent_ebook: order.entitlements.ebook ? '1' : '0',
        ent_workbook_pdf: order.entitlements.workbookPdf ? '1' : '0',
        subtotal_cents: String(order.subtotalCents),
        shipping_cents: String(order.shippingCents)
      },
      payment_intent_data: {
        description: 'Book order — ' + CFG.store.support.businessName,
        metadata: { kind: 'book_order' },
        statement_descriptor_suffix: 'DHRS BOOKS'
      },
      success_url: siteUrl + '/books-success.html?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: siteUrl + '/books.html?checkout=cancelled'
    };

    // Physical orders: collect shipping address + add a shipping line.
    if (order.hasPhysical) {
      params.shipping_address_collection = { allowed_countries: allowed };
      params.phone_number_collection = { enabled: true };
      params.shipping_options = [{
        shipping_rate_data: {
          type: 'fixed_amount',
          fixed_amount: { amount: order.shippingCents, currency: CFG.store.currency },
          display_name: order.shippingCents === 0 ? 'Free shipping' : 'Shipping',
          delivery_estimate: undefined
        }
      }];
    }

    // Optional automatic tax (only if enabled in Stripe + env flag).
    if (process.env.STRIPE_AUTOMATIC_TAX === 'true') {
      params.automatic_tax = { enabled: true };
    }

    const session = await stripe.checkout.sessions.create(params);
    return jsonResponse(200, { url: session.url, sessionId: session.id }, headers);

  } catch (err) {
    console.error('create-book-checkout error:', err);
    const code = err.type === 'StripeInvalidRequestError' ? 400 : 500;
    return jsonResponse(code, { error: err.message || 'Failed to create checkout session' }, headers);
  }
};
