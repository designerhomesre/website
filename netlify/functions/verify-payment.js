/**
 * DESIGNER HOMES - Stripe Payment Verification
 * Netlify Serverless Function
 *
 * Verifies payment status for an invoice by checking Stripe.
 * Called by admin app and portal to confirm payment in real-time.
 *
 * Environment Variables Required:
 *   STRIPE_SECRET_KEY - Stripe secret key
 *   SITE_URL - Base URL for CORS
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
    const { sessionId, invoiceId } = body;

    if (!sessionId && !invoiceId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'sessionId or invoiceId required' })
      };
    }

    // If we have a session ID, retrieve the session directly
    if (sessionId) {
      const session = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ['payment_intent']
      });

      const paymentIntent = session.payment_intent;
      const isPaid = session.payment_status === 'paid';
      const method = paymentIntent?.payment_method_types?.[0] || 'card';

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          paid: isPaid,
          status: session.payment_status,
          amount: session.amount_total / 100,
          paymentMethod: method === 'us_bank_account' ? 'ACH' : 'Credit Card',
          invoiceId: session.metadata?.invoice_id || session.client_reference_id,
          invoiceNumber: session.metadata?.invoice_number || '',
          clientName: session.metadata?.client_name || '',
          stripePaymentIntentId: paymentIntent?.id || null,
          paidAt: isPaid ? new Date().toISOString() : null
        })
      };
    }

    // If we only have an invoice ID, search for checkout sessions
    if (invoiceId) {
      const sessions = await stripe.checkout.sessions.list({
        limit: 10
      });

      // Find sessions matching this invoice
      const matchingSessions = sessions.data.filter(s =>
        s.client_reference_id === invoiceId ||
        s.metadata?.invoice_id === invoiceId
      );

      // Check if any session was paid
      const paidSession = matchingSessions.find(s => s.payment_status === 'paid');

      if (paidSession) {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            paid: true,
            status: 'paid',
            amount: paidSession.amount_total / 100,
            paymentMethod: paidSession.payment_method_types?.includes('us_bank_account') ? 'ACH' : 'Credit Card',
            invoiceId: invoiceId,
            stripeSessionId: paidSession.id,
            paidAt: new Date().toISOString()
          })
        };
      }

      // Check for pending sessions
      const pendingSession = matchingSessions.find(s => s.payment_status === 'unpaid' && s.status === 'open');

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          paid: false,
          status: pendingSession ? 'pending' : 'no_session',
          invoiceId: invoiceId,
          hasActiveLink: !!pendingSession,
          checkoutUrl: pendingSession?.url || null
        })
      };
    }

  } catch (err) {
    console.error('Payment verification error:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message || 'Verification failed' })
    };
  }
};
