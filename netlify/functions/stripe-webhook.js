/**
 * DESIGNER HOMES - Stripe Webhook Handler
 * Netlify Serverless Function
 *
 * Handles Stripe webhook events for payment confirmation.
 * Updates invoice status in the application database via Supabase.
 *
 * Environment Variables Required:
 *   STRIPE_SECRET_KEY - Stripe secret key
 *   STRIPE_WEBHOOK_SECRET - Webhook signing secret (whsec_...)
 *   SUPABASE_URL - Supabase project URL (optional, for future DB integration)
 *   SUPABASE_SERVICE_KEY - Supabase service role key (optional)
 *   NOTIFICATION_EMAIL - Admin email for payment notifications
 *   SITE_URL - Base URL of the site
 */

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json'
  };

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const sig = event.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let stripeEvent;

  try {
    // Verify webhook signature
    if (webhookSecret && sig) {
      stripeEvent = stripe.webhooks.constructEvent(event.body, sig, webhookSecret);
    } else {
      // Development fallback (no signature verification)
      stripeEvent = JSON.parse(event.body);
      console.warn('⚠️ Webhook signature verification skipped (dev mode)');
    }
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: `Webhook signature verification failed: ${err.message}` })
    };
  }

  try {
    switch (stripeEvent.type) {
      // ===== Payment Successful =====
      case 'checkout.session.completed': {
        const session = stripeEvent.data.object;
        const invoiceId = session.metadata?.invoice_id || session.client_reference_id;
        const invoiceNumber = session.metadata?.invoice_number || '';
        const clientName = session.metadata?.client_name || '';
        const amountPaid = session.amount_total / 100;
        const paymentMethod = session.payment_method_types?.[0] || 'card';

        console.log(`✅ Payment received: Invoice ${invoiceNumber} (${invoiceId}) — $${amountPaid} via ${paymentMethod}`);

        // If using Supabase, update the database directly
        if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
          await updateSupabaseInvoice(invoiceId, {
            status: 'paid',
            payment_confirmed: true,
            payment_method: paymentMethod === 'us_bank_account' ? 'ach' : paymentMethod,
            payment_date: new Date().toISOString().split('T')[0],
            payment_notes: `Stripe payment: ${session.payment_intent}`,
            stripe_session_id: session.id,
            stripe_payment_intent: session.payment_intent
          });
        }

        // Store payment event for client-side sync (localStorage bridge)
        // The admin app polls this endpoint or checks on load
        await storePaymentEvent({
          type: 'payment_success',
          invoiceId,
          invoiceNumber,
          clientName,
          amount: amountPaid,
          paymentMethod: paymentMethod === 'us_bank_account' ? 'ACH' : 'Credit Card',
          stripeSessionId: session.id,
          stripePaymentIntentId: session.payment_intent,
          timestamp: new Date().toISOString()
        });

        break;
      }

      // ===== Payment Failed =====
      case 'checkout.session.expired': {
        const session = stripeEvent.data.object;
        const invoiceId = session.metadata?.invoice_id;
        console.log(`⏰ Checkout expired: Invoice ${invoiceId}`);
        break;
      }

      // ===== ACH Payment Pending (bank transfers can take days) =====
      case 'payment_intent.processing': {
        const paymentIntent = stripeEvent.data.object;
        const invoiceId = paymentIntent.metadata?.invoice_id;
        console.log(`⏳ ACH payment processing: Invoice ${invoiceId}`);
        break;
      }

      // ===== Payment Intent Succeeded (final confirmation for ACH) =====
      case 'payment_intent.succeeded': {
        const paymentIntent = stripeEvent.data.object;
        const invoiceId = paymentIntent.metadata?.invoice_id;
        const invoiceNumber = paymentIntent.metadata?.invoice_number || '';
        const amountPaid = paymentIntent.amount_received / 100;

        console.log(`✅ Payment intent succeeded: Invoice ${invoiceNumber} — $${amountPaid}`);

        if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
          await updateSupabaseInvoice(invoiceId, {
            status: 'paid',
            payment_confirmed: true,
            payment_date: new Date().toISOString().split('T')[0],
            payment_notes: `Stripe confirmed: ${paymentIntent.id}`,
            stripe_payment_intent: paymentIntent.id
          });
        }
        break;
      }

      // ===== Payment Failed =====
      case 'payment_intent.payment_failed': {
        const paymentIntent = stripeEvent.data.object;
        const invoiceId = paymentIntent.metadata?.invoice_id;
        const error = paymentIntent.last_payment_error?.message || 'Unknown error';
        console.error(`❌ Payment failed: Invoice ${invoiceId} — ${error}`);

        await storePaymentEvent({
          type: 'payment_failed',
          invoiceId,
          error,
          timestamp: new Date().toISOString()
        });
        break;
      }

      default:
        console.log(`Unhandled event type: ${stripeEvent.type}`);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ received: true })
    };

  } catch (err) {
    console.error('Webhook processing error:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Webhook processing failed' })
    };
  }
};

// ===== Supabase Helper =====
async function updateSupabaseInvoice(invoiceId, updates) {
  try {
    const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/invoices?id=eq.${invoiceId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'apikey': process.env.SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(updates)
    });

    if (!response.ok) {
      throw new Error(`Supabase update failed: ${response.status}`);
    }
    console.log(`Supabase invoice ${invoiceId} updated successfully`);
  } catch (err) {
    console.error('Supabase update error:', err);
  }
}

// ===== Payment Event Storage =====
// In the localStorage MVP, this stores events that the admin app polls.
// In production with Supabase, this is handled by direct DB updates above.
async function storePaymentEvent(eventData) {
  // For now, log the event. The admin app will check Stripe directly
  // via the verify-payment function for real-time status.
  console.log('Payment event:', JSON.stringify(eventData));

  // Future: Send notification email via SendGrid/Postmark
  // Future: Push notification via Supabase Realtime
  // Future: Store in Supabase payment_events table
}
