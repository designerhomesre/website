/**
 * DESIGNER HOMES APPRAISAL PLATFORM
 * Stripe Payment Integration Module
 *
 * Handles all Stripe payment operations:
 * - Creating checkout sessions via Netlify Functions
 * - Generating payment links tied to invoices
 * - Verifying payment status
 * - Resending payment links
 * - Syncing Stripe payments with local invoice status
 * - Admin notifications
 *
 * Dependencies: App, DB, Util, SettingsModule (from app-core.js)
 */

// ============================================================================
// STRIPE PAYMENT SERVICE
// ============================================================================

const StripeService = {
  /**
   * Get the Netlify Functions base URL
   * In production: /.netlify/functions
   * In development: can be overridden via settings
   */
  getBaseUrl() {
    const settings = SettingsModule.getSettings();
    return settings.stripeFunctionsUrl || '/.netlify/functions';
  },

  /**
   * Check if Stripe is configured and enabled
   */
  isEnabled() {
    const settings = SettingsModule.getSettings();
    return settings.stripeEnabled === true;
  },

  /**
   * Create a Stripe Checkout Session for an invoice
   * Returns { sessionId, url, paymentIntentId, expiresAt }
   */
  async createCheckout(invoiceId) {
    const invoice = DB.getById('invoices', invoiceId);
    if (!invoice) throw new Error('Invoice not found');

    const assignment = DB.getById('assignments', invoice.assignment_id);
    const client = DB.getById('clients', invoice.client_id);

    if (!client || !client.email) {
      throw new Error('Client email is required for online payment');
    }

    const response = await fetch(`${this.getBaseUrl()}/create-checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoice_number,
        amount: invoice.amount,
        clientName: invoice.client_name,
        clientEmail: client.email,
        description: invoice.description || 'Professional Appraisal Services',
        propertyAddress: assignment ? assignment.subject_address : '',
        assignmentNumber: assignment ? assignment.assignment_number : '',
        paymentMethod: 'both' // card + ACH
      })
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(err.error || `Server error: ${response.status}`);
    }

    const data = await response.json();

    // Store the checkout session info on the invoice
    DB.update('invoices', invoiceId, {
      stripe_session_id: data.sessionId,
      stripe_checkout_url: data.url,
      stripe_checkout_expires: data.expiresAt,
      payment_link_created: new Date().toISOString()
    });

    DB.logAudit('stripe_checkout_created', 'invoices', invoiceId, invoice.assignment_id, null, {
      sessionId: data.sessionId
    });

    return data;
  },

  /**
   * Verify payment status for an invoice
   * Returns { paid, status, amount, paymentMethod, ... }
   */
  async verifyPayment(invoiceId) {
    const invoice = DB.getById('invoices', invoiceId);
    if (!invoice) throw new Error('Invoice not found');

    const body = {};
    if (invoice.stripe_session_id) {
      body.sessionId = invoice.stripe_session_id;
    } else {
      body.invoiceId = invoiceId;
    }

    const response = await fetch(`${this.getBaseUrl()}/verify-payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: 'Verification failed' }));
      throw new Error(err.error || `Server error: ${response.status}`);
    }

    const data = await response.json();

    // If payment is confirmed, auto-update the local invoice
    if (data.paid && invoice.status !== 'paid') {
      this.syncPaymentToLocal(invoiceId, data);
    }

    return data;
  },

  /**
   * Resend payment link for an invoice
   * Creates a new checkout session and returns the URL
   */
  async resendPaymentLink(invoiceId) {
    const invoice = DB.getById('invoices', invoiceId);
    if (!invoice) throw new Error('Invoice not found');

    const assignment = DB.getById('assignments', invoice.assignment_id);
    const client = DB.getById('clients', invoice.client_id);

    if (!client || !client.email) {
      throw new Error('Client email is required');
    }

    const response = await fetch(`${this.getBaseUrl()}/resend-payment-link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoice_number,
        amount: invoice.amount,
        clientName: invoice.client_name,
        clientEmail: client.email,
        description: invoice.description,
        propertyAddress: assignment ? assignment.subject_address : '',
        assignmentNumber: assignment ? assignment.assignment_number : ''
      })
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(err.error || `Server error: ${response.status}`);
    }

    const data = await response.json();

    // Update invoice with new session info
    DB.update('invoices', invoiceId, {
      stripe_session_id: data.sessionId,
      stripe_checkout_url: data.url,
      stripe_checkout_expires: data.expiresAt,
      payment_link_resent: new Date().toISOString()
    });

    DB.logAudit('stripe_link_resent', 'invoices', invoiceId, invoice.assignment_id, null, {
      sessionId: data.sessionId
    });

    return data;
  },

  /**
   * Sync a confirmed Stripe payment to local invoice
   * Called when verify-payment returns paid: true
   */
  syncPaymentToLocal(invoiceId, paymentData) {
    const invoice = DB.getById('invoices', invoiceId);
    if (!invoice || invoice.status === 'paid') return;

    const updates = {
      status: 'paid',
      payment_confirmed: true,
      payment_method: paymentData.paymentMethod === 'ACH' ? 'ach' : 'credit_card',
      payment_date: new Date().toISOString().split('T')[0],
      payment_notes: `Stripe payment confirmed: ${paymentData.stripePaymentIntentId || paymentData.stripeSessionId || 'verified'}`,
      stripe_payment_confirmed: true
    };

    DB.update('invoices', invoiceId, updates);

    // Update assignment payment status and auto-advance
    if (invoice.assignment_id) {
      DB.update('assignments', invoice.assignment_id, { paymentStatus: 'paid' });

      const assignment = DB.getById('assignments', invoice.assignment_id);
      const report = DB.where('reports', r => r.assignment_id === invoice.assignment_id)[0];
      if (assignment && assignment.status === 'report_complete' && report && report.report_complete) {
        DB.update('assignments', invoice.assignment_id, {
          status: 'delivered',
          completed_date: new Date().toISOString().split('T')[0]
        });
      }
    }

    // Store notification for admin
    this.addNotification({
      type: 'payment_received',
      invoiceId: invoiceId,
      invoiceNumber: invoice.invoice_number,
      clientName: invoice.client_name,
      amount: invoice.amount,
      method: updates.payment_method,
      timestamp: new Date().toISOString()
    });

    DB.logAudit('stripe_payment_synced', 'invoices', invoiceId, invoice.assignment_id, null, paymentData);
  },

  /**
   * Get payment link for an invoice (existing or creates new)
   */
  async getPaymentLink(invoiceId) {
    const invoice = DB.getById('invoices', invoiceId);
    if (!invoice) throw new Error('Invoice not found');

    // If there's an existing non-expired checkout URL, return it
    if (invoice.stripe_checkout_url && invoice.stripe_checkout_expires) {
      const expiresAt = new Date(invoice.stripe_checkout_expires);
      if (expiresAt > new Date()) {
        return {
          url: invoice.stripe_checkout_url,
          sessionId: invoice.stripe_session_id,
          expiresAt: invoice.stripe_checkout_expires,
          isExisting: true
        };
      }
    }

    // Create a new checkout session
    const data = await this.createCheckout(invoiceId);
    return { ...data, isExisting: false };
  },

  // ===== Notification System =====

  /**
   * Add a payment notification (stored in localStorage)
   */
  addNotification(notification) {
    const key = 'dh_payment_notifications';
    const notifications = JSON.parse(localStorage.getItem(key) || '[]');
    notifications.unshift({
      id: Util.id(),
      read: false,
      ...notification
    });
    // Keep only last 50
    localStorage.setItem(key, JSON.stringify(notifications.slice(0, 50)));
  },

  /**
   * Get unread payment notifications
   */
  getUnreadNotifications() {
    const key = 'dh_payment_notifications';
    const notifications = JSON.parse(localStorage.getItem(key) || '[]');
    return notifications.filter(n => !n.read);
  },

  /**
   * Get all payment notifications
   */
  getAllNotifications() {
    const key = 'dh_payment_notifications';
    return JSON.parse(localStorage.getItem(key) || '[]');
  },

  /**
   * Mark a notification as read
   */
  markNotificationRead(notificationId) {
    const key = 'dh_payment_notifications';
    const notifications = JSON.parse(localStorage.getItem(key) || '[]');
    const idx = notifications.findIndex(n => n.id === notificationId);
    if (idx !== -1) {
      notifications[idx].read = true;
      localStorage.setItem(key, JSON.stringify(notifications));
    }
  },

  /**
   * Mark all notifications as read
   */
  markAllRead() {
    const key = 'dh_payment_notifications';
    const notifications = JSON.parse(localStorage.getItem(key) || '[]');
    notifications.forEach(n => n.read = true);
    localStorage.setItem(key, JSON.stringify(notifications));
  },

  /**
   * Check all unpaid invoices with Stripe sessions for payment updates
   * Called on app load and periodically
   */
  async syncAllPendingPayments() {
    if (!this.isEnabled()) return;

    const unpaidInvoices = DB.where('invoices', inv =>
      inv.status !== 'paid' && inv.stripe_session_id
    );

    for (const invoice of unpaidInvoices) {
      try {
        await this.verifyPayment(invoice.id);
      } catch (err) {
        console.warn(`Failed to verify payment for ${invoice.invoice_number}:`, err.message);
      }
    }
  },

  /**
   * Get payment status summary for dashboard
   */
  getPaymentSummary() {
    const invoices = DB.getAll('invoices');
    const now = new Date();

    return {
      total: invoices.length,
      paid: invoices.filter(i => i.status === 'paid').length,
      unpaid: invoices.filter(i => i.status !== 'paid').length,
      overdue: invoices.filter(i => i.status !== 'paid' && new Date(i.due_date) < now).length,
      stripePayments: invoices.filter(i => i.stripe_payment_confirmed).length,
      manualPayments: invoices.filter(i => i.status === 'paid' && !i.stripe_payment_confirmed).length,
      totalRevenue: invoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + i.amount, 0),
      totalOutstanding: invoices.filter(i => i.status !== 'paid').reduce((sum, i) => sum + i.amount, 0)
    };
  }
};

// ============================================================================
// STRIPE UI HELPERS - Integrated into InvoiceModule
// ============================================================================

const StripeUI = {
  /**
   * Show payment link generation modal
   */
  async generatePaymentLink(invoiceId) {
    if (!StripeService.isEnabled()) {
      App.toast('Stripe is not configured. Go to Settings > Payment Processing to set up.', 'warning');
      return;
    }

    const invoice = DB.getById('invoices', invoiceId);
    if (!invoice) {
      App.toast('Invoice not found', 'error');
      return;
    }

    if (invoice.status === 'paid') {
      App.toast('This invoice is already paid', 'info');
      return;
    }

    App.toast('Generating payment link...', 'info');

    try {
      const result = await StripeService.getPaymentLink(invoiceId);

      const body = `
        <div style="text-align: center; padding: 16px;">
          <div style="background: #f0fdf4; border: 1px solid #86efac; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
            <h3 style="margin: 0 0 8px; color: #166534;">Payment Link Ready</h3>
            <p style="margin: 0; font-size: 13px; color: #15803d;">
              ${result.isExisting ? 'Using existing checkout session' : 'New checkout session created'}
            </p>
          </div>

          <div class="form-group" style="text-align: left;">
            <label>Payment URL</label>
            <div style="display: flex; gap: 8px;">
              <input type="text" id="stripe-payment-url" value="${result.url}" readonly
                style="flex: 1; font-size: 12px; background: #f8f9fa;">
              <button class="btn-secondary btn-sm" onclick="StripeUI.copyPaymentLink()">Copy</button>
            </div>
          </div>

          <div style="display: flex; gap: 12px; justify-content: center; margin-top: 16px;">
            <div style="text-align: center;">
              <div style="font-size: 11px; color: #666; text-transform: uppercase;">Invoice</div>
              <div style="font-weight: 600;">${invoice.invoice_number}</div>
            </div>
            <div style="text-align: center;">
              <div style="font-size: 11px; color: #666; text-transform: uppercase;">Amount</div>
              <div style="font-weight: 600;">${Util.currency(invoice.amount)}</div>
            </div>
            <div style="text-align: center;">
              <div style="font-size: 11px; color: #666; text-transform: uppercase;">Expires</div>
              <div style="font-weight: 600;">${Util.formatDate(result.expiresAt)}</div>
            </div>
          </div>

          <p style="font-size: 12px; color: #666; margin-top: 16px;">
            Accepts: Credit Card & ACH Bank Transfer<br>
            <em>ACH payments are preferred to minimize processing fees.</em>
          </p>
        </div>
      `;

      const footer = `
        <button class="btn-secondary" onclick="App.closeModal()">Close</button>
        <button class="btn-secondary" onclick="StripeUI.openPaymentLink('${result.url}')">Open Link</button>
        <button class="btn-primary" onclick="StripeUI.emailPaymentLink('${invoiceId}')">Email to Client</button>
      `;

      App.showModal('Payment Link', body, footer);

    } catch (err) {
      console.error('Payment link error:', err);
      App.toast(`Failed: ${err.message}`, 'error');
    }
  },

  /**
   * Copy payment link to clipboard
   */
  copyPaymentLink() {
    const input = document.getElementById('stripe-payment-url');
    if (input) {
      navigator.clipboard.writeText(input.value).then(() => {
        App.toast('Payment link copied to clipboard', 'success');
      }).catch(() => {
        input.select();
        document.execCommand('copy');
        App.toast('Payment link copied', 'success');
      });
    }
  },

  /**
   * Open payment link in new tab
   */
  openPaymentLink(url) {
    window.open(url, '_blank');
  },

  /**
   * Email payment link to client via Gmail compose
   */
  emailPaymentLink(invoiceId) {
    const invoice = DB.getById('invoices', invoiceId);
    if (!invoice) return;

    const settings = SettingsModule.getSettings();
    const client = DB.getById('clients', invoice.client_id);
    const assignment = DB.getById('assignments', invoice.assignment_id);
    const clientEmail = client ? client.email : '';
    const paymentUrl = invoice.stripe_checkout_url || '';
    const propertyLine = assignment ? `${assignment.subject_address}, ${assignment.city}, ${assignment.state} ${assignment.zip}` : '';

    const subject = `Invoice ${invoice.invoice_number} — Secure Payment Link — ${settings.bizName}`;
    const body = [
      `Dear ${invoice.client_name},`,
      '',
      `Please find the details of your invoice below:`,
      '',
      `Invoice #: ${invoice.invoice_number}`,
      `Date: ${Util.formatDate(invoice.created_at)}`,
      `Due Date: ${Util.formatDate(invoice.due_date)}`,
      propertyLine ? `Property: ${propertyLine}` : '',
      `Description: ${invoice.description || 'Professional Appraisal Services'}`,
      `Amount Due: ${Util.currency(invoice.amount)}`,
      '',
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      'PAY ONLINE — SECURE PAYMENT LINK',
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      '',
      paymentUrl,
      '',
      'ACH payments are preferred to minimize processing fees. Credit card payments are accepted for convenience.',
      '',
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      'ALTERNATIVE PAYMENT METHODS',
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      '',
      settings.paymentInstructions || 'Payment required before report release.',
      '',
      'Thank you for your business.',
      '',
      'Keith Manning Jr.',
      `Certified Residential Appraiser — License #${settings.license || 'A9156'}`,
      settings.bizName || 'Designer Homes Real Estate Services',
      settings.bizPhone || '',
      settings.bizEmail || 'info@designerhomesre.com'
    ].filter(line => line !== undefined).join('\n');

    Util.openGmailCompose({
      to: clientEmail,
      subject: subject,
      body: body
    });

    App.closeModal();
    App.toast('Gmail compose opened with payment link', 'success');
  },

  /**
   * Resend payment link for an invoice
   */
  async resendPaymentLink(invoiceId) {
    if (!StripeService.isEnabled()) {
      App.toast('Stripe is not configured', 'warning');
      return;
    }

    App.toast('Generating new payment link...', 'info');

    try {
      const result = await StripeService.resendPaymentLink(invoiceId);
      this.emailPaymentLink(invoiceId);
    } catch (err) {
      console.error('Resend error:', err);
      App.toast(`Failed: ${err.message}`, 'error');
    }
  },

  /**
   * Verify payment status and sync
   */
  async checkPaymentStatus(invoiceId) {
    if (!StripeService.isEnabled()) {
      App.toast('Stripe is not configured', 'warning');
      return;
    }

    App.toast('Checking payment status...', 'info');

    try {
      const result = await StripeService.verifyPayment(invoiceId);

      if (result.paid) {
        App.toast(`Payment confirmed: ${Util.currency(result.amount)} via ${result.paymentMethod}`, 'success');
        InvoiceModule.render();
      } else {
        App.toast(`Payment status: ${result.status}`, 'info');
      }
    } catch (err) {
      console.error('Verification error:', err);
      App.toast(`Check failed: ${err.message}`, 'error');
    }
  },

  /**
   * Show payment notifications panel
   */
  showNotifications() {
    const notifications = StripeService.getAllNotifications();

    if (notifications.length === 0) {
      App.showModal('Payment Notifications', '<div style="text-align: center; padding: 20px; color: #666;">No payment notifications yet</div>');
      return;
    }

    const rows = notifications.map(n => {
      const icon = n.type === 'payment_received' ? '✅' : '❌';
      const methodLabel = n.method === 'ach' ? 'ACH' : (n.method === 'credit_card' ? 'Credit Card' : n.method);
      const readClass = n.read ? 'style="opacity: 0.6;"' : 'style="font-weight: 600;"';

      return `
        <div class="notification-row" ${readClass} onclick="StripeService.markNotificationRead('${n.id}')">
          <span>${icon}</span>
          <div style="flex: 1;">
            <div>${n.clientName} — ${Util.currency(n.amount)}</div>
            <div style="font-size: 11px; color: #666;">${n.invoiceNumber} • ${methodLabel} • ${Util.timeAgo(n.timestamp)}</div>
          </div>
        </div>
      `;
    }).join('');

    const body = `
      <div style="max-height: 400px; overflow-y: auto;">
        ${rows}
      </div>
    `;

    const footer = `
      <button class="btn-secondary" onclick="StripeService.markAllRead(); App.closeModal();">Mark All Read</button>
      <button class="btn-primary" onclick="App.closeModal()">Close</button>
    `;

    App.showModal('Payment Notifications', body, footer);
  },

  /**
   * Render notification badge count (for sidebar/header)
   */
  renderNotificationBadge() {
    const unread = StripeService.getUnreadNotifications();
    const badge = document.getElementById('payment-notification-badge');
    if (badge) {
      if (unread.length > 0) {
        badge.textContent = unread.length;
        badge.style.display = 'inline-flex';
      } else {
        badge.style.display = 'none';
      }
    }
  }
};
