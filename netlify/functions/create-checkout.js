/**
 * DESIGNER HOMES - Stripe Checkout Session Creator
 * Netlify Serverless Function
 *
 * Creates a Stripe Checkout Session for invoice payment.
 * Supports: Credit Card, ACH/Bank Transfer
 *
 * Environment Variables Required:
 *   STRIPE_SECRET_KEY - Stripe secret key (sk_live_... or sk_test_...)
 *   SITE_URL - Base URL of the site (e.g., https://designerhomesre.com)
 */

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': process.env.SITE_URL || '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const body = JSON.parse(event.body);
    const {
      invoiceId,
      invoiceNumber,
      amount,
      clientName,
      clientEmail,
      description,
      propertyAddress,
      assignmentNumber,
      paymentMethod // 'card', 'ach', or 'both'
    } = body;

    // Validate required fields
    if (!invoiceId || !amount || !clientName || !clientEmail) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing required fields: invoiceId, amount, clientName, clientEmail' })
      };
    }

    // Validate amount (minimum $1.00)
    const amountCents = Math.round(parseFloat(amount) * 100);
    if (amountCents < 100) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Amount must be at least $1.00' })
      };
    }

    // Build payment method types based on preference
    let paymentMethodTypes = ['card']; // Always support card
    if (paymentMethod === 'ach' || paymentMethod === 'both') {
      paymentMethodTypes.push('us_bank_account');
    }
    if (paymentMethod === 'card') {
      // Card only
    } else {
      // Default: support both
      paymentMethodTypes = ['card', 'us_bank_account'];
    }

    // Build line item description
    const lineDescription = description ||
      `Appraisal Services${propertyAddress ? ' - ' + propertyAddress : ''}`;

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: paymentMethodTypes,
      mode: 'payment',
      customer_email: clientEmail,
      client_reference_id: invoiceId,
      metadata: {
        invoice_id: invoiceId,
        invoice_number: invoiceNumber || '',
        assignment_number: assignmentNumber || '',
        property_address: propertyAddress || '',
        client_name: clientName
      },
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Invoice ${invoiceNumber || invoiceId}`,
              description: lineDescription,
              metadata: {
                invoice_id: invoiceId,
                invoice_number: invoiceNumber || ''
              }
            },
            unit_amount: amountCents
          },
          quantity: 1
        }
      ],
      payment_intent_data: {
        description: `Invoice ${invoiceNumber} — ${clientName}`,
        metadata: {
          invoice_id: invoiceId,
          invoice_number: invoiceNumber || '',
          client_name: clientName
        },
        statement_descriptor_suffix: 'DHRS APPRAISAL'
      },
      // ACH-specific: add mandate for bank debits
      ...(paymentMethodTypes.includes('us_bank_account') && {
        payment_method_options: {
          us_bank_account: {
            financial_connections: {
              permissions: ['payment_method']
            },
            verification_method: 'instant'
          }
        }
      }),
      custom_text: {
        submit: {
          message: 'ACH payments are preferred to minimize processing fees. Credit card payments are accepted for convenience.'
        }
      },
      success_url: `${process.env.SITE_URL || 'https://designerhomesre.com'}/portal.html?payment=success&invoice=${invoiceId}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.SITE_URL || 'https://designerhomesre.com'}/portal.html?payment=cancelled&invoice=${invoiceId}`
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        sessionId: session.id,
        url: session.url,
        paymentIntentId: session.payment_intent,
        expiresAt: new Date(session.expires_at * 1000).toISOString()
      })
    };

  } catch (err) {
    console.error('Stripe checkout error:', err);

    const statusCode = err.type === 'StripeInvalidRequestError' ? 400 : 500;
    return {
      statusCode,
      headers,
      body: JSON.stringify({
        error: err.message || 'Failed to create checkout session'
      })
    };
  }
};
