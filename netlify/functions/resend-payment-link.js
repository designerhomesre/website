/**
 * DESIGNER HOMES - Resend Payment Link
 * Netlify Serverless Function
 *
 * Creates a new Stripe Checkout Session for an existing invoice
 * and returns the payment URL for resending to the client.
 *
 * Environment Variables Required:
 *   STRIPE_SECRET_KEY - Stripe secret key
 *   SITE_URL - Base URL for success/cancel redirects
 */

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': process.env.SITE_URL || '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

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
      assignmentNumber
    } = body;

    if (!invoiceId || !amount || !clientEmail) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing required fields' })
      };
    }

    const amountCents = Math.round(parseFloat(amount) * 100);
    const siteUrl = process.env.SITE_URL || 'https://designerhomesre.com';

    // Create new checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card', 'us_bank_account'],
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
              description: description || 'Professional Appraisal Services'
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
      payment_method_options: {
        us_bank_account: {
          financial_connections: {
            permissions: ['payment_method']
          },
          verification_method: 'instant'
        }
      },
      custom_text: {
        submit: {
          message: 'ACH payments are preferred to minimize processing fees. Credit card payments are accepted for convenience.'
        }
      },
      success_url: `${siteUrl}/portal.html?payment=success&invoice=${invoiceId}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/portal.html?payment=cancelled&invoice=${invoiceId}`
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        sessionId: session.id,
        url: session.url,
        expiresAt: new Date(session.expires_at * 1000).toISOString()
      })
    };

  } catch (err) {
    console.error('Resend payment link error:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message || 'Failed to create payment link' })
    };
  }
};
