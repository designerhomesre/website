/**
 * DESIGNER HOMES APPRAISAL PLATFORM
 * Core Application Controller
 *
 * Phase 1 - Foundation (Production)
 * No demo data, localStorage MVP, audit trail enabled
 */

// ============================================================================
// SECURITY: Input Sanitization via DOMPurify
// ============================================================================

const SafeHTML = {
  /**
   * Sanitize HTML string before inserting into the DOM.
   * Uses DOMPurify if loaded, falls back to basic escaping.
   */
  sanitize(html) {
    if (typeof DOMPurify !== 'undefined') {
      return DOMPurify.sanitize(html, {
        ALLOWED_TAGS: ['div', 'span', 'p', 'br', 'strong', 'em', 'b', 'i', 'u',
          'table', 'thead', 'tbody', 'tr', 'th', 'td', 'h1', 'h2', 'h3', 'h4', 'h5',
          'ul', 'ol', 'li', 'a', 'img', 'small', 'label', 'input', 'select', 'option',
          'textarea', 'button', 'form', 'section', 'header', 'footer', 'nav',
          'svg', 'path', 'circle', 'canvas'],
        ALLOWED_ATTR: ['class', 'id', 'style', 'href', 'src', 'alt', 'title', 'type',
          'value', 'placeholder', 'name', 'for', 'checked', 'disabled', 'readonly',
          'min', 'max', 'step', 'rows', 'cols', 'colspan', 'rowspan', 'target',
          'data-id', 'data-section', 'data-slot', 'data-type', 'data-status',
          'data-assignment', 'data-client', 'data-invoice', 'data-index',
          'onclick', 'onchange', 'onsubmit', 'oninput'],
        ALLOW_DATA_ATTR: true
      });
    }
    // Fallback: basic HTML entity escaping
    return SafeHTML.escape(html);
  },

  /** Escape HTML entities for safe text insertion */
  escape(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  },

  /**
   * Set innerHTML safely. Drop-in replacement for el.innerHTML = html.
   * @param {HTMLElement} el - Target element
   * @param {string} html - HTML string to sanitize and set
   */
  set(el, html) {
    if (el) el.innerHTML = this.sanitize(html);
  }
};

// ============================================================================
// UTILITY OBJECT - Helper functions for common operations
// ===========================================================================
const Util = {
  /**
   * Generate unique ID: id-[timestamp]-[random]
   */
  id() {
    return 'id-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  },

  /**
   * Format number as currency: $X,XXX.XX
   */
  currency(amount) {
    if (amount === null || amount === undefined) return '$0.00';
    const num = parseFloat(amount);
    if (isNaN(num)) return '$0.00';
    return '$' + num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  },

  /**
   * Format ISO date string as MM/DD/YYYY
   */
  formatDate(isoStr) {
    if (!isoStr) return '';
    const date = new Date(isoStr);
    if (isNaN(date)) return isoStr;
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
  },

  /**
   * Parse various date formats to ISO string (YYYY-MM-DD)
   */
  parseDate(str) {
    if (!str) return '';
    // Try to parse MM/DD/YYYY, MM-DD-YYYY, YYYY-MM-DD
    let date;
    if (str.includes('/')) {
      const parts = str.split('/');
      if (parts.length === 3) {
        if (parts[2].length === 4) {
          // MM/DD/YYYY
          date = new Date(parts[2], parts[0] - 1, parts[1]);
        } else {
          // DD/MM/YY or similar - try parsing as standard
          date = new Date(str);
        }
      }
    } else if (str.includes('-')) {
      date = new Date(str);
    } else {
      date = new Date(str);
    }

    if (isNaN(date)) return str;
    return date.toISOString().split('T')[0];
  },

  /**
   * Convert ISO timestamp to relative time string (e.g., "2 hours ago")
   */
  timeAgo(timestamp) {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);

    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    const weeks = Math.floor(days / 7);
    if (weeks < 4) return `${weeks}w ago`;

    return this.formatDate(timestamp);
  },

  /**
   * Return HTML span badge for status with appropriate color
   */
  statusBadge(status) {
    const colorMap = {
      'new': 'badge-blue',
      'accepted': 'badge-blue',
      'scheduled': 'badge-amber',
      'inspected': 'badge-orange',
      'in_review': 'badge-orange',
      'report_complete': 'badge-teal',
      'awaiting_payment': 'badge-red',
      'delivered': 'badge-green',
      'draft': 'badge-gray',
      'sent': 'badge-blue',
      'paid': 'badge-green',
      'overdue': 'badge-red',
      'unpaid': 'badge-red'
    };
    const colorClass = colorMap[status] || 'badge-gray';
    const displayName = status.replace(/_/g, ' ').charAt(0).toUpperCase() + status.replace(/_/g, ' ').slice(1);
    return `<span class="${colorClass}">${displayName}</span>`;
  },

  /**
   * Generate next assignment number: DHRES-YYYY-NNN
   */
  nextAssignmentNumber() {
    const assignments = DB.getAll('assignments');
    const year = new Date().getFullYear();
    const thisYear = assignments.filter(a => a.assignment_number && a.assignment_number.includes(year.toString()));
    const count = thisYear.length + 1;
    const padded = String(count).padStart(3, '0');
    return `DHRES-${year}-${padded}`;
  },

  /**
   * Generate next invoice number: INV-YYYY-NNN
   */
  nextInvoiceNumber() {
    const invoices = DB.getAll('invoices');
    const year = new Date().getFullYear();
    const thisYear = invoices.filter(i => i.invoice_number && i.invoice_number.includes(year.toString()));
    const count = thisYear.length + 1;
    const padded = String(count).padStart(3, '0');
    return `INV-${year}-${padded}`;
  },

  /**
   * Estimate mileage: baseMiles + (stops * perStopMiles)
   */
  estimateMileage(stopsVisited) {
    const settings = SettingsModule.getSettings();
    const baseMiles = settings.baseMiles || 15;
    const perStopMiles = settings.perStopMiles || 5;
    return baseMiles + (stopsVisited * perStopMiles);
  },

  /**
   * Download CSV file
   */
  downloadCSV(csvContent, filename) {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename || 'export.csv';
    link.click();
  },

  /**
   * Download JSON file
   */
  downloadJSON(data, filename) {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename || 'export.json';
    link.click();
  },

  // ========================================================================
  // GOOGLE WORKSPACE INTEGRATIONS
  // ========================================================================

  /**
   * Open Google Calendar event creation with pre-filled details
   * @param {Object} opts - { title, startDate, endDate, location, description }
   */
  openGoogleCalendar(opts = {}) {
    const base = 'https://calendar.google.com/calendar/render?action=TEMPLATE';
    const params = new URLSearchParams();
    if (opts.title) params.set('text', opts.title);
    if (opts.location) params.set('location', opts.location);
    if (opts.description) params.set('details', opts.description);

    // Format dates: YYYYMMDDTHHMMSS (all-day if no time given)
    if (opts.startDate) {
      const start = this._formatCalDate(opts.startDate, opts.startTime || '09:00');
      const end = this._formatCalDate(opts.endDate || opts.startDate, opts.endTime || '10:00');
      params.set('dates', `${start}/${end}`);
    }

    window.open(`${base}&${params.toString()}`, '_blank');
  },

  /**
   * Format date + time for Google Calendar URL: YYYYMMDDTHHMMSS
   */
  _formatCalDate(dateStr, timeStr) {
    const d = new Date(dateStr);
    if (isNaN(d)) return '';
    const [hours, minutes] = (timeStr || '09:00').split(':');
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}${month}${day}T${hours.padStart(2, '0')}${minutes.padStart(2, '0')}00`;
  },

  /**
   * Open Gmail compose window with pre-filled fields
   * @param {Object} opts - { to, subject, body, cc, bcc }
   */
  openGmailCompose(opts = {}) {
    const base = 'https://mail.google.com/mail/?view=cm&fs=1';
    const params = new URLSearchParams();
    if (opts.to) params.set('to', opts.to);
    if (opts.cc) params.set('cc', opts.cc);
    if (opts.bcc) params.set('bcc', opts.bcc);
    if (opts.subject) params.set('su', opts.subject);
    if (opts.body) params.set('body', opts.body);

    window.open(`${base}&${params.toString()}`, '_blank');
  },

  /**
   * Generate a Google Drive folder URL for an assignment
   * User creates the folder manually; this stores/retrieves the link
   * @param {string} assignmentId
   */
  getAssignmentDriveLink(assignmentId) {
    const assignment = DB.getById('assignments', assignmentId);
    return assignment ? (assignment.drive_folder_url || null) : null;
  },

  /**
   * Save Google Drive folder link for an assignment
   */
  setAssignmentDriveLink(assignmentId, url) {
    DB.update('assignments', assignmentId, { drive_folder_url: url });
  },

  /**
   * Open Google Drive to create a new folder (pre-fills nothing; user organizes)
   */
  openGoogleDrive() {
    window.open('https://drive.google.com/drive/my-drive', '_blank');
  },

  /**
   * Input validation helpers
   */
  validate: {
    required(value, fieldName) {
      if (!value || (typeof value === 'string' && !value.trim())) {
        App.toast(`${fieldName} is required`, 'warning');
        return false;
      }
      return true;
    },
    email(value) {
      if (!value) return true; // optional unless combined with required
      const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!re.test(value)) {
        App.toast('Please enter a valid email address', 'warning');
        return false;
      }
      return true;
    },
    phone(value) {
      if (!value) return true;
      const cleaned = value.replace(/[\s\-\(\)\.]/g, '');
      if (cleaned.length < 10 || !/^\+?\d+$/.test(cleaned)) {
        App.toast('Please enter a valid phone number', 'warning');
        return false;
      }
      return true;
    },
    currency(value) {
      if (!value && value !== 0) return true;
      const num = parseFloat(String(value).replace(/[$,]/g, ''));
      if (isNaN(num) || num < 0) {
        App.toast('Please enter a valid dollar amount', 'warning');
        return false;
      }
      return true;
    },
    date(value) {
      if (!value) return true;
      const d = new Date(value);
      if (isNaN(d.getTime())) {
        App.toast('Please enter a valid date', 'warning');
        return false;
      }
      return true;
    }
  }
};

// ============================================================================
// DATABASE OBJECT - localStorage CRUD operations with audit trail
// ============================================================================

const DB = {
  // Collections
  collections: [
    'clients', 'assignments', 'mls_data', 'mls_imports', 'properties', 'comparables',
    'market_analyses', 'adjustments', 'cost_approaches', 'income_approaches',
    'income_comps', 'mileage', 'invoices', 'reports', 'comments', 'trainee_logs', 'audit',
    'comment_rules', 'comment_templates', 'special_statements', 'comment_gen_logs'
  ],

  /**
   * Get all items from a collection
   */
  getAll(collection) {
    const data = localStorage.getItem(`dh_${collection}`);
    if (!data) return [];
    try {
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.error(`Error parsing ${collection}:`, e);
      return [];
    }
  },

  /**
   * Get single item by ID from collection
   */
  getById(collection, id) {
    const all = this.getAll(collection);
    return all.find(item => item.id === id) || null;
  },

  /**
   * Get a single settings value by key
   */
  get(key) {
    const data = localStorage.getItem(`dh_${key}`);
    if (!data) return null;
    try {
      return JSON.parse(data);
    } catch (e) {
      return data;
    }
  },

  /**
   * Save entire collection to localStorage
   */
  saveAll(collection, data) {
    localStorage.setItem(`dh_${collection}`, JSON.stringify(data));
  },

  /**
   * Save single key-value pair
   */
  save(key, data) {
    localStorage.setItem(`dh_${key}`, JSON.stringify(data));
  },

  /**
   * Add new item to collection (auto-generates ID)
   */
  add(collection, item) {
    if (!item.id) {
      item.id = Util.id();
    }
    if (!item.created_at) {
      item.created_at = new Date().toISOString();
    }
    item.updated_at = new Date().toISOString();

    const all = this.getAll(collection);
    all.push(item);
    this.saveAll(collection, all);

    this.logAudit('create', collection, item.id, item.assignment_id || null, null, item);
    return item;
  },

  /**
   * Update existing item by ID
   */
  update(collection, id, updates) {
    const all = this.getAll(collection);
    const index = all.findIndex(item => item.id === id);
    if (index === -1) return null;

    const beforeData = { ...all[index] };
    const updated = { ...all[index], ...updates, updated_at: new Date().toISOString() };
    all[index] = updated;
    this.saveAll(collection, all);

    this.logAudit('update', collection, id, updated.assignment_id || null, beforeData, updated);
    return updated;
  },

  /**
   * Remove item from collection by ID
   */
  remove(collection, id) {
    const all = this.getAll(collection);
    const item = all.find(i => i.id === id);
    const filtered = all.filter(item => item.id !== id);
    this.saveAll(collection, filtered);

    if (item) {
      this.logAudit('delete', collection, id, item.assignment_id || null, item, null);
    }
  },

  /**
   * Log audit trail entry
   */
  logAudit(action, entityType, entityId, assignmentId, beforeData, afterData) {
    const audit = this.getAll('audit');
    const entry = {
      id: Util.id(),
      timestamp: new Date().toISOString(),
      action,
      entity_type: entityType,
      entity_id: entityId,
      assignment_id: assignmentId,
      before_data: beforeData,
      after_data: afterData
    };
    audit.push(entry);
    this.saveAll('audit', audit);
  },

  /**
   * Query helper: filter collection
   */
  where(collection, filterFn) {
    return this.getAll(collection).filter(filterFn);
  },

  /**
   * Query helper: count items
   */
  count(collection, filterFn) {
    return this.where(collection, filterFn).length;
  }
};

// ============================================================================
// SETTINGS MODULE - Business and system configuration
// ============================================================================

const SettingsModule = {
  /**
   * Get all settings with defaults
   */
  getSettings() {
    const saved = DB.get('settings');
    if (saved) return saved;

    return {
      bizName: 'Designer Homes Real Estate Services',
      bizPhone: '',
      bizEmail: 'info@designerhomesre.com',
      license: 'A9156',
      startLocation: 'Durham, NC',
      irsRate: 0.70,
      baseMiles: 15,
      perStopMiles: 5,
      dueDays: 15,
      paymentInstructions: 'Payment required before report release.',
      stripeEnabled: true,
      stripePublishableKey: 'pk_test_51TFRoVCbr00SFfFgEzUrA2LKuIJgmQWdvVFfCDp3wLs1Joq9Ldv0VOULPNtUutx4llb9wreGCiutsoHeJIMoyMf700zTfxqL8A',
      stripeFunctionsUrl: ''
    };
  },

  /**
   * Render settings form
   */
  render() {
    const settings = this.getSettings();

    document.getElementById('set-biz-name').value = settings.bizName || '';
    document.getElementById('set-biz-phone').value = settings.bizPhone || '';
    document.getElementById('set-biz-email').value = settings.bizEmail || '';
    document.getElementById('set-license').value = settings.license || '';
    document.getElementById('set-start-loc').value = settings.startLocation || '';
    document.getElementById('set-irs-rate').value = settings.irsRate || 0.70;
    document.getElementById('set-base-miles').value = settings.baseMiles || 15;
    document.getElementById('set-per-stop').value = settings.perStopMiles || 5;
    document.getElementById('set-due-days').value = settings.dueDays || 15;
    document.getElementById('set-payment-inst').value = settings.paymentInstructions || '';

    // Stripe settings
    const stripeEnabledEl = document.getElementById('set-stripe-enabled');
    if (stripeEnabledEl) {
      stripeEnabledEl.value = settings.stripeEnabled ? 'true' : 'false';
      this.onStripeToggle();
    }
    const stripePkEl = document.getElementById('set-stripe-pk');
    if (stripePkEl) stripePkEl.value = settings.stripePublishableKey || '';
    const stripeFnUrlEl = document.getElementById('set-stripe-functions-url');
    if (stripeFnUrlEl) stripeFnUrlEl.value = settings.stripeFunctionsUrl || '';
  },

  /**
   * Save all settings
   */
  save() {
    const settings = {
      bizName: document.getElementById('set-biz-name').value,
      bizPhone: document.getElementById('set-biz-phone').value,
      bizEmail: document.getElementById('set-biz-email').value,
      license: document.getElementById('set-license').value,
      startLocation: document.getElementById('set-start-loc').value,
      irsRate: parseFloat(document.getElementById('set-irs-rate').value),
      baseMiles: parseInt(document.getElementById('set-base-miles').value),
      perStopMiles: parseInt(document.getElementById('set-per-stop').value),
      dueDays: parseInt(document.getElementById('set-due-days').value),
      paymentInstructions: document.getElementById('set-payment-inst').value,
      stripeEnabled: document.getElementById('set-stripe-enabled')?.value === 'true',
      stripePublishableKey: document.getElementById('set-stripe-pk')?.value || '',
      stripeFunctionsUrl: document.getElementById('set-stripe-functions-url')?.value || ''
    };

    DB.save('settings', settings);
    App.toast('Settings saved successfully', 'success');

    // Update notification badge
    if (typeof StripeUI !== 'undefined') {
      StripeUI.renderNotificationBadge();
    }
  },

  /**
   * Toggle Stripe config fields visibility
   */
  onStripeToggle() {
    const enabled = document.getElementById('set-stripe-enabled')?.value === 'true';
    const fields = document.getElementById('stripe-config-fields');
    if (fields) {
      fields.style.display = enabled ? 'block' : 'none';
    }
  },

  /**
   * Test Stripe connection
   */
  async testStripe() {
    if (typeof StripeService === 'undefined') {
      App.toast('Stripe module not loaded', 'error');
      return;
    }

    App.toast('Testing Stripe connection...', 'info');

    try {
      const response = await fetch(`${StripeService.getBaseUrl()}/verify-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceId: 'test-connection' })
      });

      if (response.ok) {
        App.toast('Stripe connection successful!', 'success');
      } else {
        const err = await response.json().catch(() => ({}));
        App.toast(`Stripe error: ${err.error || response.status}`, 'error');
      }
    } catch (err) {
      App.toast(`Connection failed: ${err.message}. Make sure Netlify Functions are deployed.`, 'error');
    }
  },

  /**
   * Change password with hashing
   */
  async changePassword() {
    const newPw = document.getElementById('set-new-pw').value.trim();
    const confirmPw = document.getElementById('confirm-new-pw')?.value.trim() || '';

    if (!newPw) {
      App.toast('Please enter a new password', 'warning');
      return;
    }

    if (newPw !== confirmPw) {
      App.toast('Passwords do not match', 'warning');
      return;
    }

    if (newPw.length < 12) {
      App.toast('Password must be at least 12 characters', 'warning');
      return;
    }

    try {
      const hash = await SecurityUtils.hash(newPw);
      DB.save('password_hash', hash);
      document.getElementById('set-new-pw').value = '';
      if (document.getElementById('confirm-new-pw')) {
        document.getElementById('confirm-new-pw').value = '';
      }
      DB.logAudit('password_changed', 'security', null, null, null, {
        timestamp: new Date().toISOString()
      });
      App.toast('Password updated successfully', 'success');
    } catch (error) {
      console.error('Password change error:', error);
      App.toast('Failed to update password', 'error');
    }
  },

  /**
   * Export all data as JSON file
   */
  exportAll() {
    const data = {};
    DB.collections.forEach(collection => {
      data[collection] = DB.getAll(collection);
    });

    const exportObj = {
      exported_at: new Date().toISOString(),
      app_version: 'Phase 1',
      data
    };

    Util.downloadJSON(exportObj, `designer-homes-export-${Date.now()}.json`);
    App.toast('Data exported successfully', 'success');
  },

  /**
   * Import data from JSON file
   */
  importData(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importObj = JSON.parse(e.target.result);
        const data = importObj.data || importObj;

        let importedCount = 0;
        Object.keys(data).forEach(collection => {
          if (Array.isArray(data[collection])) {
            DB.saveAll(collection, data[collection]);
            importedCount += data[collection].length;
          }
        });

        App.toast(`Imported ${importedCount} items successfully`, 'success');
        App.renderSection(App.currentSection);
      } catch (err) {
        App.toast('Error importing data: ' + err.message, 'error');
      }
    };
    reader.readAsText(file);
  },

  /**
   * Clear all data (with confirmation)
   */
  clearAll() {
    DB.collections.forEach(collection => {
      DB.saveAll(collection, []);
    });
    App.toast('All data cleared', 'success');
  },

  // ========================================================================
  // AI SETTINGS
  // ========================================================================

  /**
   * Load AI settings into the form
   */
  renderAISettings() {
    if (typeof AIService === 'undefined') return;
    const s = AIService.getSettings();

    const providerEl = document.getElementById('set-ai-provider');
    const keyEl = document.getElementById('set-ai-key');
    const modelEl = document.getElementById('set-ai-model');
    const tempEl = document.getElementById('set-ai-temp');
    const maxTokEl = document.getElementById('set-ai-max-tokens');
    const capEl = document.getElementById('set-ai-monthly-cap');
    const proxyEl = document.getElementById('set-ai-proxy');
    const proxySecretEl = document.getElementById('set-ai-proxy-secret');

    if (providerEl) providerEl.value = s.provider || 'none';
    if (keyEl) keyEl.value = s.apiKey || '';
    if (tempEl) tempEl.value = s.temperature || 0.3;
    if (maxTokEl) maxTokEl.value = s.maxRequestTokens || 3000;
    if (capEl) capEl.value = s.maxMonthlyTokens || 500000;
    if (proxyEl) proxyEl.value = s.useProxy ? 'proxy' : 'direct';
    if (proxySecretEl) proxySecretEl.value = s.proxySecret || '';

    this.onAIProviderChange();
    this.onProxyToggle();
    this._updateAIUsage();
  },

  /**
   * Handle provider dropdown change — update model options
   */
  onAIProviderChange() {
    if (typeof AIService === 'undefined') return;
    const provider = document.getElementById('set-ai-provider')?.value || 'none';
    const modelEl = document.getElementById('set-ai-model');
    if (!modelEl) return;

    modelEl.innerHTML = '<option value="">Default</option>';
    if (provider !== 'none' && AIService.providers[provider]) {
      AIService.providers[provider].models.forEach(m => {
        modelEl.innerHTML += `<option value="${m}">${m}</option>`;
      });
    }

    const savedSettings = AIService.getSettings();
    if (savedSettings.model) modelEl.value = savedSettings.model;
  },

  /**
   * Toggle proxy vs direct key UI visibility
   */
  onProxyToggle() {
    const mode = document.getElementById('set-ai-proxy')?.value || 'proxy';
    const keyGroup = document.getElementById('ai-key-group');
    const proxySecretGroup = document.getElementById('ai-proxy-secret-group');
    const proxyHint = document.getElementById('proxy-hint');

    if (mode === 'proxy') {
      if (keyGroup) keyGroup.style.display = 'none';
      if (proxySecretGroup) proxySecretGroup.style.display = '';
      if (proxyHint) proxyHint.textContent = 'API key stays on the server \u2014 never touches your browser';
    } else {
      if (keyGroup) keyGroup.style.display = '';
      if (proxySecretGroup) proxySecretGroup.style.display = 'none';
      if (proxyHint) proxyHint.textContent = 'API key stored in your browser localStorage';
    }
  },

  /**
   * Save AI settings
   */
  saveAISettings() {
    if (typeof AIService === 'undefined') return;
    const useProxy = document.getElementById('set-ai-proxy')?.value === 'proxy';
    const settings = {
      provider: document.getElementById('set-ai-provider')?.value || 'none',
      apiKey: useProxy ? '' : (document.getElementById('set-ai-key')?.value || ''),
      model: document.getElementById('set-ai-model')?.value || '',
      temperature: parseFloat(document.getElementById('set-ai-temp')?.value) || 0.3,
      maxRequestTokens: parseInt(document.getElementById('set-ai-max-tokens')?.value) || 3000,
      maxMonthlyTokens: parseInt(document.getElementById('set-ai-monthly-cap')?.value) || 500000,
      enabled: document.getElementById('set-ai-provider')?.value !== 'none',
      useProxy: useProxy,
      proxySecret: useProxy ? (document.getElementById('set-ai-proxy-secret')?.value || '') : ''
    };
    AIService.saveSettings(settings);
    App.toast('AI settings saved', 'success');
  },

  /**
   * Test AI connection
   */
  async testAI() {
    if (typeof AIService === 'undefined') {
      App.toast('AI service not loaded', 'error');
      return;
    }

    // Save settings first
    this.saveAISettings();

    if (!AIService.isAvailable()) {
      App.toast('AI is disabled or not configured', 'warning');
      return;
    }

    App.toast('Testing connection...', 'info');
    const result = await AIService.generate(
      'You are a test assistant. Respond with exactly: "Connection successful."',
      'Test connection.',
      { maxTokens: 50, commentType: 'test' }
    );

    if (result.text) {
      App.toast(`AI connected: ${result.provider} / ${result.model}`, 'success');
    } else {
      App.toast(`Connection failed: ${result.error}`, 'error');
    }
  },

  /**
   * View AI generation logs
   */
  viewAILogs() {
    const logs = DB.getAll('comment_gen_logs').sort((a, b) =>
      new Date(b.created_at) - new Date(a.created_at)
    ).slice(0, 50);

    if (logs.length === 0) {
      App.toast('No AI generation logs yet', 'info');
      return;
    }

    const body = `
      <div class="ai-logs-list">
        <table class="data-table">
          <thead>
            <tr><th>Date</th><th>Type</th><th>Provider</th><th>Model</th><th>Tokens</th><th>Status</th></tr>
          </thead>
          <tbody>
            ${logs.map(l => `
              <tr>
                <td>${Util.formatDate(l.created_at)}</td>
                <td>${l.comment_type || 'N/A'}</td>
                <td>${l.ai_provider || 'N/A'}</td>
                <td>${(l.ai_model || 'N/A').split('-').slice(0, 2).join('-')}</td>
                <td>${l.total_tokens || 0}</td>
                <td>${l.success_flag ? '✅' : '❌'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;

    App.showModal('AI Generation Logs', body);
  },

  /**
   * Update AI usage display
   */
  _updateAIUsage() {
    if (typeof AIService === 'undefined') return;
    const usage = AIService.getMonthlyUsage();
    const tokEl = document.getElementById('ai-usage-tokens');
    const reqEl = document.getElementById('ai-usage-requests');
    if (tokEl) tokEl.textContent = usage.totalTokens.toLocaleString();
    if (reqEl) reqEl.textContent = usage.requestCount.toLocaleString();
  }
};

// ============================================================================
// SECURITY UTILITIES - Password hashing, token generation, device management
// ============================================================================

const SecurityUtils = {
  /**
   * SHA-256 hash using Web Crypto API
   */
  async hash(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  },

  /**
   * Verify password against stored hash
   */
  async verify(password, storedHash) {
    const passwordHash = await this.hash(password);
    return passwordHash === storedHash;
  },

  /**
   * Generate cryptographic session token
   */
  generateToken(length = 32) {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return Array.from(array, byte => charset[byte % charset.length]).join('');
  },

  /**
   * Generate portal access token for client
   */
  generatePortalToken() {
    const timestamp = Date.now().toString(36);
    const random = this.generateToken(16);
    return `DH-${timestamp}-${random}`;
  },

  /**
   * Generate device token for "Remember this device"
   */
  generateDeviceToken() {
    const random = crypto.getRandomValues(new Uint8Array(16));
    return Array.from(random, b => b.toString(16).padStart(2, '0')).join('');
  },

  /**
   * Add device token to remembered devices list
   */
  addDeviceToken(token, deviceId) {
    const devices = this.getDeviceTokens();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

    devices.push({
      token,
      device_id: deviceId,
      created_at: now.toISOString(),
      expires_at: expiresAt.toISOString()
    });

    localStorage.setItem('dh_device_tokens', JSON.stringify(devices));
    return token;
  },

  /**
   * Get all valid device tokens
   */
  getDeviceTokens() {
    try {
      const stored = localStorage.getItem('dh_device_tokens');
      const devices = stored ? JSON.parse(stored) : [];
      const now = new Date();

      // Filter out expired tokens
      return devices.filter(d => new Date(d.expires_at) > now);
    } catch {
      return [];
    }
  },

  /**
   * Verify device token is valid and current
   */
  isValidDeviceToken(token) {
    const devices = this.getDeviceTokens();
    return devices.some(d => d.token === token);
  },

  /**
   * Remove a single device token
   */
  forgetDevice(token) {
    const devices = this.getDeviceTokens();
    const filtered = devices.filter(d => d.token !== token);
    localStorage.setItem('dh_device_tokens', JSON.stringify(filtered));
  },

  /**
   * Remove all device tokens
   */
  forgetAllDevices() {
    localStorage.removeItem('dh_device_tokens');
  },

  /**
   * Generate unique device ID (browser fingerprint)
   */
  getDeviceId() {
    let deviceId = localStorage.getItem('dh_device_id');
    if (!deviceId) {
      deviceId = 'dev-' + this.generateToken(12);
      localStorage.setItem('dh_device_id', deviceId);
    }
    return deviceId;
  }
};

// ============================================================================
// AUDIT MODULE - Audit trail viewer
// ============================================================================

const AuditModule = {
  /**
   * Render audit log with filters
   */
  render() {
    const filterType = document.getElementById('audit-filter-type')?.value || 'all';
    const dateStart = document.getElementById('audit-date-start')?.value || '';
    const dateEnd = document.getElementById('audit-date-end')?.value || '';

    let audit = DB.getAll('audit').sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    if (filterType !== 'all') {
      audit = audit.filter(entry => entry.action === filterType);
    }

    if (dateStart) {
      const start = new Date(dateStart).getTime();
      audit = audit.filter(entry => new Date(entry.timestamp).getTime() >= start);
    }

    if (dateEnd) {
      const end = new Date(dateEnd).getTime() + 86400000; // Include entire day
      audit = audit.filter(entry => new Date(entry.timestamp).getTime() <= end);
    }

    const tbody = document.getElementById('audit-tbody');
    if (!tbody) return;

    if (audit.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No audit entries found</td></tr>';
      return;
    }

    tbody.innerHTML = audit.map(entry => {
      const assignment = entry.assignment_id ? DB.getById('assignments', entry.assignment_id) : null;
      const assignmentNum = assignment ? assignment.assignment_number : '-';

      let details = '';
      if (entry.action === 'update' && entry.before_data && entry.after_data) {
        const changes = [];
        Object.keys(entry.after_data).forEach(key => {
          if (entry.before_data[key] !== entry.after_data[key]) {
            changes.push(`${key}: ${entry.before_data[key]} → ${entry.after_data[key]}`);
          }
        });
        details = changes.slice(0, 2).join('; ');
      } else if (entry.action === 'create' && entry.after_data) {
        details = entry.entity_type;
      } else if (entry.action === 'delete' && entry.before_data) {
        details = entry.entity_type;
      }

      const timestamp = new Date(entry.timestamp);
      const formatted = timestamp.toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });

      return `
        <tr>
          <td>${formatted}</td>
          <td>${assignmentNum}</td>
          <td>${Util.statusBadge(entry.action)}</td>
          <td>${entry.entity_type}</td>
          <td>${details}</td>
        </tr>
      `;
    }).join('');
  }
};

// ============================================================================
// MAIN APP CONTROLLER
// ============================================================================

const App = {
  currentSection: 'dashboard',
  _activeAssignmentId: null,
  isAuthenticated: false,
  _sessionTimer: null,
  _loginAttempts: 0,
  _lockoutUntil: null,
  SESSION_TIMEOUT_MS: 30 * 60 * 1000, // 30 minutes
  MAX_LOGIN_ATTEMPTS: 5,
  LOCKOUT_DURATION_MS: 5 * 60 * 1000, // 5 minutes

  // Getter/setter so both App.activeAssignment and App.activeAssignmentId work
  get activeAssignmentId() { return this._activeAssignmentId; },
  set activeAssignmentId(val) { this._activeAssignmentId = val; },
  get activeAssignment() { return this._activeAssignmentId; },
  set activeAssignment(val) { this._activeAssignmentId = val; },

  /**
   * Initialize app: check auth, bind events, render initial view
   */
  init() {
    // Load persistent rate limiting state
    this._loadRateLimitState();

    // Check if already logged in and session is still valid
    const session = sessionStorage.getItem('dh_session');
    const lastActivity = sessionStorage.getItem('dh_last_activity');
    const now = Date.now();

    if (session && lastActivity && (now - parseInt(lastActivity)) < this.SESSION_TIMEOUT_MS) {
      this.isAuthenticated = true;
      this._resetSessionTimer();
      this.showApp();
    } else if (!session) {
      // Check for valid device token for auto-authentication
      const deviceToken = localStorage.getItem('dh_device_token_current');
      if (deviceToken && SecurityUtils.isValidDeviceToken(deviceToken)) {
        // Auto-authenticate with device token
        this.isAuthenticated = true;
        sessionStorage.setItem('dh_session', 'authenticated');
        sessionStorage.setItem('dh_session_token', SecurityUtils.generateToken(32));
        sessionStorage.setItem('dh_session_created', Date.now().toString());
        sessionStorage.setItem('dh_last_activity', Date.now().toString());
        this._resetSessionTimer();
        DB.logAudit('login', 'session', null, null, null, {
          timestamp: new Date().toISOString(),
          method: 'device_token'
        });
        this.showApp();
      } else {
        sessionStorage.removeItem('dh_session');
        sessionStorage.removeItem('dh_last_activity');
        sessionStorage.removeItem('dh_session_token');
        this.showLogin();
      }
    }

    // Bind login form
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
      loginForm.addEventListener('submit', (e) => this.handleLogin(e));
    }

    // Track activity for session timeout
    ['click', 'keypress', 'scroll', 'mousemove'].forEach(evt => {
      document.addEventListener(evt, () => this._touchSession(), { passive: true });
    });

    // Check localStorage size on startup
    this._checkStorageHealth();
  },

  /**
   * Reset session timeout timer
   */
  _resetSessionTimer() {
    if (this._sessionTimer) clearTimeout(this._sessionTimer);
    sessionStorage.setItem('dh_last_activity', Date.now().toString());
    this._sessionTimer = setTimeout(() => {
      if (this.isAuthenticated) {
        this.toast('Session expired due to inactivity', 'warning');
        this._forceLogout();
      }
    }, this.SESSION_TIMEOUT_MS);
  },

  /**
   * Touch session on user activity (throttled to once per 30 seconds)
   */
  _touchSession() {
    if (!this.isAuthenticated) return;
    const last = parseInt(sessionStorage.getItem('dh_last_activity') || '0');
    if (Date.now() - last > 30000) {
      this._resetSessionTimer();
    }
  },

  /**
   * Force logout without confirmation (for session timeout)
   */
  _forceLogout() {
    sessionStorage.removeItem('dh_session');
    sessionStorage.removeItem('dh_last_activity');
    if (this._sessionTimer) clearTimeout(this._sessionTimer);
    this.isAuthenticated = false;
    this.currentSection = 'dashboard';
    this.activeAssignmentId = null;
    this.showLogin();
  },

  /**
   * Check localStorage usage and warn if approaching limits
   */
  _checkStorageHealth() {
    try {
      let totalSize = 0;
      for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key) && key.startsWith('dh_')) {
          totalSize += localStorage[key].length;
        }
      }
      const sizeMB = (totalSize * 2 / (1024 * 1024)).toFixed(2); // UTF-16 = 2 bytes per char
      const maxMB = 5; // localStorage typical limit
      const usagePercent = (sizeMB / maxMB * 100).toFixed(0);

      if (usagePercent > 80) {
        console.warn(`localStorage usage: ${sizeMB}MB / ${maxMB}MB (${usagePercent}%)`);
        setTimeout(() => {
          this.toast(`Storage at ${usagePercent}% capacity. Consider exporting and clearing old audit data.`, 'warning');
        }, 2000);
      }

      // Auto-trim audit log if over 2000 entries
      const audit = DB.getAll('audit');
      if (audit.length > 2000) {
        const trimmed = audit.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 1500);
        DB.saveAll('audit', trimmed);
        console.log(`Audit log trimmed from ${audit.length} to 1500 entries`);
      }
    } catch (e) {
      console.error('Storage health check failed:', e);
    }
  },

  /**
   * Handle login form submission with rate limiting and hashing
   */
  async handleLogin(event) {
    event.preventDefault();

    const errorDiv = document.getElementById('login-error');

    // Check persistent rate limiting
    this._loadRateLimitState();

    // Check lockout
    if (this._lockoutUntil && Date.now() < this._lockoutUntil) {
      const remaining = Math.ceil((this._lockoutUntil - Date.now()) / 1000);
      errorDiv.textContent = `Too many failed attempts. Try again in ${remaining} seconds.`;
      errorDiv.style.display = 'block';
      document.getElementById('login-password').value = '';
      return;
    }

    const password = document.getElementById('login-password').value;
    const rememberDevice = document.getElementById('remember-device')?.checked || false;

    try {
      // Get stored password hash or default
      let storedHash = DB.get('password_hash');

      // Handle first-time migration from plaintext
      if (!storedHash) {
        const oldPlaintext = DB.get('password');
        if (oldPlaintext) {
          // Auto-migrate old plaintext password to hashed
          const defaultPassword = 'DHRS-Valuation!2026-Secure';
          if (password === oldPlaintext) {
            // User logging in with old password - accept and migrate
            storedHash = await SecurityUtils.hash(defaultPassword);
            DB.save('password_hash', storedHash);
            DB.logAudit('password_migrated', 'security', null, null, null, { migrated: true });
          } else if (password === defaultPassword) {
            // User is trying new default password
            storedHash = await SecurityUtils.hash(defaultPassword);
            DB.save('password_hash', storedHash);
            DB.logAudit('password_set', 'security', null, null, null, { action: 'initial_hash' });
          }
        }
      }

      // If still no hash, use default
      if (!storedHash) {
        const defaultPassword = 'DHRS-Valuation!2026-Secure';
        storedHash = await SecurityUtils.hash(defaultPassword);
        DB.save('password_hash', storedHash);
      }

      // Verify password
      if (await SecurityUtils.verify(password, storedHash)) {
        // Successful login
        this._loginAttempts = 0;
        this._lockoutUntil = null;
        this._saveRateLimitState();

        // Create session token
        const sessionToken = SecurityUtils.generateToken(32);
        sessionStorage.setItem('dh_session_token', sessionToken);
        sessionStorage.setItem('dh_session', 'authenticated');
        sessionStorage.setItem('dh_session_created', Date.now().toString());
        sessionStorage.setItem('dh_last_activity', Date.now().toString());

        // Handle device remembering
        if (rememberDevice) {
          const deviceId = SecurityUtils.getDeviceId();
          const deviceToken = SecurityUtils.generateDeviceToken();
          SecurityUtils.addDeviceToken(deviceToken, deviceId);
          localStorage.setItem('dh_device_token_current', deviceToken);
        }

        this.isAuthenticated = true;
        this._resetSessionTimer();
        errorDiv.style.display = 'none';
        DB.logAudit('login', 'session', null, null, null, {
          timestamp: new Date().toISOString(),
          device_remembered: rememberDevice
        });
        this.showApp();
      } else {
        this._handleFailedLogin(errorDiv);
      }
    } catch (error) {
      console.error('Login error:', error);
      errorDiv.textContent = 'An error occurred during login. Please try again.';
      errorDiv.style.display = 'block';
      document.getElementById('login-password').value = '';
    }
  },

  /**
   * Handle failed login attempt with persistent rate limiting
   */
  _handleFailedLogin(errorDiv) {
    this._loginAttempts++;
    this._saveRateLimitState();
    const remaining = this.MAX_LOGIN_ATTEMPTS - this._loginAttempts;

    if (this._loginAttempts >= this.MAX_LOGIN_ATTEMPTS) {
      this._lockoutUntil = Date.now() + this.LOCKOUT_DURATION_MS;
      this._saveRateLimitState();
      errorDiv.textContent = `Account locked. Too many failed attempts. Try again in 5 minutes.`;
      DB.logAudit('lockout', 'session', null, null, null, { attempts: this._loginAttempts });
    } else {
      errorDiv.textContent = `Invalid password. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.`;
    }
    errorDiv.style.display = 'block';
    document.getElementById('login-password').value = '';
  },

  /**
   * Load rate limiting state from persistent storage
   */
  _loadRateLimitState() {
    try {
      const stored = localStorage.getItem('dh_rate_limit');
      if (stored) {
        const state = JSON.parse(stored);
        this._loginAttempts = state.attempts || 0;
        this._lockoutUntil = state.lockout_until || null;

        // Clear if lockout expired
        if (this._lockoutUntil && Date.now() >= this._lockoutUntil) {
          this._loginAttempts = 0;
          this._lockoutUntil = null;
          localStorage.removeItem('dh_rate_limit');
        }
      }
    } catch (e) {
      console.error('Failed to load rate limit state:', e);
    }
  },

  /**
   * Save rate limiting state to persistent storage
   */
  _saveRateLimitState() {
    try {
      const state = {
        attempts: this._loginAttempts,
        lockout_until: this._lockoutUntil
      };
      localStorage.setItem('dh_rate_limit', JSON.stringify(state));
    } catch (e) {
      console.error('Failed to save rate limit state:', e);
    }
  },

  /**
   * Logout and show login screen
   */
  logout() {
    if (!confirm('Are you sure you want to logout?')) return;

    DB.logAudit('logout', 'session', null, null, null, { timestamp: new Date().toISOString() });
    sessionStorage.removeItem('dh_session');
    sessionStorage.removeItem('dh_last_activity');
    if (this._sessionTimer) clearTimeout(this._sessionTimer);
    this.isAuthenticated = false;
    this.currentSection = 'dashboard';
    this.activeAssignmentId = null;
    this.showLogin();
  },

  /**
   * Show login screen
   */
  showLogin() {
    document.getElementById('login-screen').style.display = 'flex';
    document.getElementById('app').style.display = 'none';
  },

  /**
   * Show app, hide login, render dashboard
   */
  showApp() {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('app').style.display = 'flex';
    this.navigateTo('dashboard');
  },

  /**
   * Toggle sidebar on mobile
   */
  toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('active');
  },

  /**
   * Switch to a section (called by sidebar links)
   */
  switchSection(event, section) {
    event.preventDefault();
    this.navigateTo(section);
  },

  /**
   * Navigate to section: update sidebar, render content, show/hide assignment bar
   */
  navigateTo(section) {
    this.currentSection = section;

    // Update sidebar active state
    document.querySelectorAll('.sidebar-link').forEach(link => {
      link.classList.remove('active');
    });
    document.querySelector(`[data-section="${section}"]`)?.classList.add('active');

    // Hide all sections
    document.querySelectorAll('.content-section').forEach(sec => {
      sec.style.display = 'none';
    });

    // Show target section
    const targetSection = document.getElementById(`section-${section}`);
    if (targetSection) {
      targetSection.style.display = 'block';
    }

    // Show/hide assignment bar and compliance disclaimer
    const assignmentSections = [
      'mls-import', 'comps', 'market-analysis', 'adjustments',
      'cost-approach', 'income-approach', 'comments', 'mileage', 'adjustment-tool'
    ];
    const complianceSections = [
      'market-analysis', 'adjustments', 'cost-approach', 'income-approach', 'adjustment-tool'
    ];

    const assignmentBar = document.getElementById('assignment-bar');
    const disclaimer = document.getElementById('compliance-disclaimer');

    if (assignmentSections.includes(section)) {
      assignmentBar.style.display = 'block';
      this.updateAssignmentBar();
    } else {
      assignmentBar.style.display = 'none';
      this.activeAssignmentId = null;
    }

    if (complianceSections.includes(section)) {
      disclaimer.style.display = 'block';
    } else {
      disclaimer.style.display = 'none';
    }

    // Render the section
    this.renderSection(section);

    // Send MLS data to Adjustment Tool iframe if navigating to adjustment-tool section
    if (section === 'adjustment-tool' && this.activeAssignmentId) {
      this.sendMLSDataToAdjustmentTool();
    }

    // Close sidebar on mobile
    document.getElementById('sidebar').classList.remove('active');

    // Scroll to top
    document.querySelector('.main-content').scrollTop = 0;
  },

  /**
   * Set active assignment and update display
   */
  setActiveAssignment(assignmentId) {
    if (!assignmentId) {
      this.activeAssignmentId = null;
      return;
    }

    this.activeAssignmentId = assignmentId;
    this.updateAssignmentBar();
    this.renderSection(this.currentSection);
  },

  /**
   * Update assignment bar dropdown and info
   */
  updateAssignmentBar() {
    const select = document.getElementById('active-assignment-select');
    const infoSpan = document.getElementById('active-assignment-info');
    const assignmentSections = [
      'mls-import', 'comps', 'market-analysis', 'adjustments',
      'cost-approach', 'income-approach', 'comments', 'mileage', 'adjustment-tool'
    ];

    if (!assignmentSections.includes(this.currentSection)) {
      return;
    }

    const assignments = DB.getAll('assignments').filter(a => a.status !== 'delivered');

    select.innerHTML = '<option value="">Select an assignment</option>';
    assignments.forEach(asgn => {
      const option = document.createElement('option');
      option.value = asgn.id;
      option.textContent = `${asgn.assignment_number} - ${asgn.subject_address}`;
      if (asgn.id === this.activeAssignmentId) {
        option.selected = true;
      }
      select.appendChild(option);
    });

    if (this.activeAssignmentId) {
      const active = DB.getById('assignments', this.activeAssignmentId);
      if (active) {
        const client = DB.getById('clients', active.client_id);
        const clientName = client ? client.name : 'Unknown';
        infoSpan.textContent = `${active.assignment_number} • ${clientName} • ${Util.formatDate(active.created_at)}`;
      }
    } else {
      infoSpan.textContent = '';
    }
  },

  /**
   * Send MLS data to Adjustment Tool iframe via postMessage
   */
  sendMLSDataToAdjustmentTool() {
    if (!this.activeAssignmentId) return;

    // Get all MLS data for the active assignment
    const allMLSData = DB.where('mls_data', d => d.assignment_id === this.activeAssignmentId);
    if (allMLSData.length === 0) return;

    // Map DB fields to CSV headers
    const fieldMapping = {
      close_price: 'Close Price',
      gla: 'Above Grade Finished Area',
      bedrooms: 'Bedrooms Total',
      full_baths: 'Bathrooms Full',
      half_baths: 'Bathrooms Half',
      garage_spaces: 'Garage Spaces',
      basement_finished: 'Below Grade Finished Area',
      lot_sqft: 'Lot Size Square Feet',
      year_built: 'Year Built',
      address: 'Address',
      city: 'City',
      mls_number: 'MLS #',
      close_date: 'Close Date',
      dom: 'Days On Market',
      list_price: 'List Price',
      neighborhood: 'Neighborhood',
      subdivision: 'Subdivision',
      lot_acres: 'Lot Size Acres',
      stories: 'Stories',
      price_per_sqft: 'Price Per SqFt'
    };

    // Convert normalized DB format to CSV header-keyed format, grouped by dataset_slot
    const datasets = { a: [], b: [], c: [] };
    const slotMap = { 1: 'a', 2: 'b', 3: 'c' };

    allMLSData.forEach(record => {
      const slot = slotMap[record.dataset_slot] || 'a';
      const csvRow = {};

      Object.keys(fieldMapping).forEach(dbField => {
        if (record.hasOwnProperty(dbField) && record[dbField] !== null && record[dbField] !== undefined) {
          const csvHeader = fieldMapping[dbField];
          csvRow[csvHeader] = String(record[dbField]);
        }
      });

      if (Object.keys(csvRow).length > 0) {
        datasets[slot].push(csvRow);
      }
    });

    // Get assignment info
    const assignment = DB.getById('assignments', this.activeAssignmentId);
    const assignmentInfo = assignment ? {
      id: assignment.id,
      address: assignment.subject_address || ''
    } : { id: this.activeAssignmentId, address: '' };

    // Send postMessage to iframe
    const iframe = document.querySelector('section#section-adjustment-tool iframe');
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.postMessage({
        type: 'loadMLSData',
        datasets: {
          a: datasets.a.length > 0 ? datasets.a : null,
          b: datasets.b.length > 0 ? datasets.b : null,
          c: datasets.c.length > 0 ? datasets.c : null
        },
        assignmentInfo: assignmentInfo
      }, '*');
    }
  },

  /**
   * Render section content based on current section
   */
  renderSection(section) {
    switch (section) {
      case 'dashboard':
        this.renderDashboard();
        break;
      case 'assignments':
        if (typeof AssignmentModule !== 'undefined') {
          AssignmentModule.render();
        }
        break;
      case 'mls-import':
        if (typeof MLSModule !== 'undefined') {
          MLSModule.render();
        }
        break;
      case 'comps':
        if (typeof CompsModule !== 'undefined') {
          CompsModule.render();
        }
        break;
      case 'market-analysis':
        if (typeof MarketAnalysisModule !== 'undefined') {
          MarketAnalysisModule.render();
        }
        break;
      case 'adjustments':
        if (typeof AdjustmentsModule !== 'undefined') {
          AdjustmentsModule.render();
        }
        break;
      case 'cost-approach':
        if (typeof CostApproachModule !== 'undefined') {
          CostApproachModule.render();
        }
        break;
      case 'income-approach':
        if (typeof IncomeApproachModule !== 'undefined') {
          IncomeApproachModule.render();
        }
        break;
      case 'comments':
        if (typeof CommentsModule !== 'undefined') {
          CommentsModule.init();
          CommentsModule.render();
        }
        break;
      case 'mileage':
        if (typeof MileageModule !== 'undefined') {
          MileageModule.render();
        }
        break;
      case 'invoices':
        if (typeof InvoiceModule !== 'undefined') {
          InvoiceModule.render();
        }
        break;
      case 'reports':
        if (typeof ReportModule !== 'undefined') {
          ReportModule.render();
        }
        break;
      case 'clients':
        if (typeof ClientModule !== 'undefined') {
          ClientModule.render();
        }
        break;
      case 'trainees':
        if (typeof TraineeModule !== 'undefined') {
          TraineeModule.render();
        }
        break;
      case 'audit':
        AuditModule.render();
        break;
      case 'settings':
        SettingsModule.render();
        SettingsModule.renderAISettings();
        break;
    }
  },

  /**
   * Render dashboard: morning briefing, metrics, pipeline, activity feed
   */
  renderDashboard() {
    const assignments = DB.getAll('assignments');
    const invoices = DB.getAll('invoices');
    const mileage = DB.getAll('mileage');
    const audit = DB.getAll('audit');
    const clients = DB.getAll('clients');
    const reports = DB.getAll('reports');

    // Calculate metrics
    const totalAssignments = assignments.length;
    const activeAssignments = assignments.filter(a => a.status !== 'delivered').length;
    const completedAssignments = assignments.filter(a => a.status === 'delivered').length;
    const reportReady = reports.filter(r => r.report_complete).length;

    const awaitingPaymentInvoices = invoices.filter(i => i.status === 'awaiting_payment');
    const unpaidInvoices = invoices.filter(i => i.status === 'unpaid');
    const totalAwaitingPayment = awaitingPaymentInvoices.reduce((sum, i) => sum + (i.amount || 0), 0);
    const unpaidTotal = unpaidInvoices.reduce((sum, i) => sum + (i.amount || 0), 0);
    const totalUnpaid = totalAwaitingPayment + unpaidTotal;

    const thisMonth = new Date();
    const monthStart = new Date(thisMonth.getFullYear(), thisMonth.getMonth(), 1).toISOString().split('T')[0];
    const today = new Date().toISOString().split('T')[0];
    const monthlyRevenue = invoices
      .filter(i => i.status === 'paid' && i.paid_date >= monthStart)
      .reduce((sum, i) => sum + (i.amount || 0), 0);

    const monthlyMileage = mileage
      .filter(m => m.date >= monthStart)
      .reduce((sum, m) => sum + (m.miles || 0), 0);

    // ---- MORNING BRIEFING ----
    const briefingEl = document.getElementById('morning-briefing');
    if (briefingEl) {
      const overdueAssignments = assignments.filter(a =>
        a.due_date && a.due_date < today && a.status !== 'delivered'
      );
      const dueSoon = assignments.filter(a => {
        if (!a.due_date || a.status === 'delivered') return false;
        const daysLeft = Math.ceil((new Date(a.due_date) - new Date()) / 86400000);
        return daysLeft >= 0 && daysLeft <= 3;
      });
      const needsInspection = assignments.filter(a => a.status === 'accepted' || a.status === 'new');
      const overdueInvoices = invoices.filter(i => {
        if (i.status === 'paid') return false;
        if (!i.due_date) return false;
        return i.due_date < today;
      });
      const reportsGated = reports.filter(r => {
        if (!r.report_complete) return false;
        const inv = invoices.find(i => i.assignment_id === r.assignment_id);
        return !inv || inv.status !== 'paid';
      });

      let briefingItems = [];

      if (overdueAssignments.length > 0) {
        briefingItems.push(`<div class="briefing-item briefing-urgent"><span class="briefing-icon">!</span> <strong>${overdueAssignments.length} overdue assignment${overdueAssignments.length > 1 ? 's' : ''}</strong> — ${overdueAssignments.map(a => a.assignment_number).join(', ')}</div>`);
      }
      if (dueSoon.length > 0) {
        briefingItems.push(`<div class="briefing-item briefing-warning"><span class="briefing-icon">~</span> <strong>${dueSoon.length} due within 3 days</strong> — ${dueSoon.map(a => `${a.assignment_number} (${Util.formatDate(a.due_date)})`).join(', ')}</div>`);
      }
      if (needsInspection.length > 0) {
        briefingItems.push(`<div class="briefing-item briefing-info"><span class="briefing-icon">i</span> <strong>${needsInspection.length} awaiting inspection</strong> — ready to schedule</div>`);
      }
      if (overdueInvoices.length > 0) {
        const overdueTotal = overdueInvoices.reduce((s, i) => s + (i.amount || 0), 0);
        briefingItems.push(`<div class="briefing-item briefing-warning"><span class="briefing-icon">$</span> <strong>${overdueInvoices.length} overdue invoice${overdueInvoices.length > 1 ? 's' : ''}</strong> totaling ${Util.currency(overdueTotal)}</div>`);
      }
      if (reportsGated.length > 0) {
        briefingItems.push(`<div class="briefing-item briefing-info"><span class="briefing-icon">^</span> <strong>${reportsGated.length} report${reportsGated.length > 1 ? 's' : ''} held</strong> — awaiting payment before release</div>`);
      }

      if (briefingItems.length === 0) {
        briefingItems.push(`<div class="briefing-item briefing-clear"><span class="briefing-icon">*</span> All clear — no urgent items today.</div>`);
      }

      briefingEl.innerHTML = `
        <div class="briefing-header">Morning Briefing — ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</div>
        ${briefingItems.join('')}
      `;
      briefingEl.style.display = 'block';
    }

    // Update metrics grid
    const metricsGrid = document.getElementById('dashboard-metrics');
    if (metricsGrid) {
      const metrics = [
        { label: 'Active Assignments', value: activeAssignments, change: '' },
        { label: 'Reports Ready', value: reportReady, change: '' },
        { label: 'YTD Revenue', value: Util.currency(invoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + (i.amount || 0), 0)), change: '' },
        { label: 'Pending Payment', value: Util.currency(totalUnpaid), change: `From ${awaitingPaymentInvoices.length + unpaidInvoices.length} invoices` },
        { label: 'Completed This Month', value: assignments.filter(a => a.status === 'delivered' && a.completed_date >= monthStart).length, change: '' },
        { label: 'Total Assignments', value: totalAssignments, change: '' },
        { label: 'Mileage This Month', value: monthlyMileage + ' miles', change: Util.currency(monthlyMileage * (SettingsModule.getSettings().irsRate || 0.70)) + ' deduction' },
        { label: 'Client Count', value: clients.length, change: '' }
      ];

      metricsGrid.innerHTML = metrics.map(m => `
        <div class="metric-card">
          <div class="metric-label">${m.label}</div>
          <div class="metric-value">${m.value}</div>
          ${m.change ? `<div class="metric-change">${m.change}</div>` : ''}
        </div>
      `).join('');
    }

    // Render assignment pipeline
    const pipelineList = document.getElementById('pipeline-list');
    if (pipelineList) {
      const statuses = ['new', 'accepted', 'scheduled', 'inspected', 'in_review', 'report_complete'];
      const pipeline = statuses.map(status => {
        const count = assignments.filter(a => a.status === status).length;
        return `
          <div class="pipeline-stage">
            <div class="stage-label">${status.replace(/_/g, ' ').toUpperCase()}</div>
            <div class="stage-count">${count}</div>
          </div>
        `;
      }).join('');

      pipelineList.innerHTML = pipeline;
    }

    // Render activity feed (last 15 audit entries)
    const activityFeed = document.getElementById('activity-feed');
    if (activityFeed) {
      const recentAudit = audit.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 15);

      if (recentAudit.length === 0) {
        activityFeed.innerHTML = '<div style="padding: 20px; color: #999; text-align: center;">No activity yet</div>';
      } else {
        activityFeed.innerHTML = recentAudit.map(entry => {
          const assignment = entry.assignment_id ? DB.getById('assignments', entry.assignment_id) : null;
          const assignmentNum = assignment ? assignment.assignment_number : 'System';

          return `
            <div class="activity-item">
              <div class="activity-time">${Util.timeAgo(entry.timestamp)}</div>
              <div class="activity-action">${entry.action.charAt(0).toUpperCase() + entry.action.slice(1)}</div>
              <div class="activity-detail">${assignmentNum} • ${entry.entity_type}</div>
            </div>
          `;
        }).join('');
      }
    }
  },

  /**
   * Show modal dialog
   */
  showModal(title, bodyHTML, footerHTML) {
    const overlay = document.getElementById('modal-overlay');
    document.getElementById('modal-title').textContent = title;
    SafeHTML.set(document.getElementById('modal-body'), bodyHTML);
    SafeHTML.set(document.getElementById('modal-footer'), footerHTML || '');
    overlay.style.display = 'flex';
  },

  /**
   * Close modal (can be called from overlay click or button)
   */
  closeModal(event) {
    if (event && event.target.id !== 'modal-overlay') return;
    document.getElementById('modal-overlay').style.display = 'none';
  },

  /**
   * Show detail panel (side panel)
   */
  showDetail(title, bodyHTML) {
    document.getElementById('detail-title').textContent = title;
    SafeHTML.set(document.getElementById('detail-body'), bodyHTML);
    document.getElementById('detail-panel').style.display = 'block';
  },

  /**
   * Close detail panel
   */
  closeDetail() {
    document.getElementById('detail-panel').style.display = 'none';
  },

  /**
   * Show toast notification
   */
  toast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('show');
    }, 10);

    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  },

  /**
   * Dashboard quick actions — navigate to the appropriate section/action
   */
  quickAction(action) {
    switch (action) {
      case 'new-assignment':
        this.navigateTo('assignments');
        setTimeout(() => {
          if (typeof AssignmentModule !== 'undefined') AssignmentModule.showCreate();
        }, 100);
        break;
      case 'import-mls':
        this.navigateTo('mls-import');
        break;
      case 'log-mileage':
        this.navigateTo('mileage');
        setTimeout(() => {
          if (typeof MileageModule !== 'undefined') MileageModule.showLog();
        }, 100);
        break;
      case 'create-invoice':
        this.navigateTo('invoices');
        setTimeout(() => {
          if (typeof InvoiceModule !== 'undefined') InvoiceModule.showCreate();
        }, 100);
        break;
      default:
        this.toast('Unknown action', 'warning');
    }
  },

  /**
   * Global search across assignments and clients
   */
  globalSearch(event) {
    const query = event.target.value.toLowerCase();
    if (!query) return;

    const assignments = DB.getAll('assignments').filter(a =>
      a.assignment_number?.toLowerCase().includes(query) ||
      a.subject_address?.toLowerCase().includes(query)
    );

    const clients = DB.getAll('clients').filter(c =>
      c.name?.toLowerCase().includes(query) ||
      c.email?.toLowerCase().includes(query)
    );

    // Navigate to assignments section and could add search results
    // This is a foundation - full search UI would be added in phase 2
  }
};

// ============================================================================
// PORTAL TOKEN MODULE - Client portal access token management
// ============================================================================

const PortalTokenModule = {
  /**
   * Generate a new client portal access token
   */
  generateClientToken(clientId, clientName) {
    const token = SecurityUtils.generatePortalToken();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000); // 90 days

    const newToken = {
      token,
      client_id: clientId,
      client_name: clientName,
      created_at: now.toISOString(),
      expires_at: expiresAt.toISOString()
    };

    const tokens = this.listTokens();
    tokens.push(newToken);
    localStorage.setItem('dh_portal_tokens', JSON.stringify(tokens));

    DB.logAudit('token_created', 'portal_token', token, null, null, {
      client_id: clientId,
      client_name: clientName,
      expires_at: expiresAt.toISOString()
    });

    return token;
  },

  /**
   * Revoke a portal access token
   */
  revokeToken(token) {
    const tokens = this.listTokens();
    const filtered = tokens.filter(t => t.token !== token);
    localStorage.setItem('dh_portal_tokens', JSON.stringify(filtered));

    DB.logAudit('token_revoked', 'portal_token', token, null, null, null);
  },

  /**
   * List all active portal tokens
   */
  listTokens() {
    try {
      const stored = localStorage.getItem('dh_portal_tokens');
      const tokens = stored ? JSON.parse(stored) : [];
      const now = new Date();

      // Filter out expired tokens
      return tokens.filter(t => new Date(t.expires_at) > now);
    } catch {
      return [];
    }
  },

  /**
   * Verify token is valid
   */
  isValidToken(token) {
    const tokens = this.listTokens();
    return tokens.some(t => t.token === token);
  },

  /**
   * Get token details
   */
  getTokenDetails(token) {
    const tokens = this.listTokens();
    return tokens.find(t => t.token === token);
  },

  /**
   * Revoke all tokens for a client
   */
  revokeClientTokens(clientId) {
    const tokens = this.listTokens();
    const filtered = tokens.filter(t => t.client_id !== clientId);
    localStorage.setItem('dh_portal_tokens', JSON.stringify(filtered));

    DB.logAudit('tokens_revoked', 'portal_token', null, null, null, {
      client_id: clientId
    });
  },

  /**
   * Show token manager modal with client list and active tokens
   */
  showTokenManager() {
    const clients = DB.getAll('clients');
    const tokens = this.listTokens();

    let clientsHtml = '';
    if (clients.length === 0) {
      clientsHtml = '<tr><td colspan="3" style="text-align:center; padding: 20px;">No clients yet</td></tr>';
    } else {
      clientsHtml = clients.map(client => {
        const clientTokens = tokens.filter(t => t.client_id === client.id);
        return `
          <tr>
            <td><strong>${client.name}</strong></td>
            <td>${client.email || 'N/A'}</td>
            <td>
              <button class="btn-primary btn-sm" onclick="PortalTokenModule.generateAndShowToken('${client.id}', '${client.name}')">Generate Token</button>
            </td>
          </tr>
        `;
      }).join('');
    }

    let tokensHtml = '';
    if (tokens.length === 0) {
      tokensHtml = '<tr><td colspan="4" style="text-align:center; padding: 20px;">No active tokens</td></tr>';
    } else {
      tokensHtml = tokens.map(token => {
        const expiresDate = new Date(token.expires_at);
        const daysLeft = Math.ceil((expiresDate - new Date()) / (1000 * 60 * 60 * 24));
        return `
          <tr>
            <td><strong>${token.client_name}</strong></td>
            <td><code style="font-size: 11px; background: #f0f0f0; padding: 2px 6px; border-radius: 3px;">${token.token.substring(0, 20)}...</code></td>
            <td>${Util.formatDate(token.created_at)}</td>
            <td>
              ${daysLeft} days
              <button class="btn-danger btn-sm" style="margin-left: 8px;" onclick="PortalTokenModule.revokeToken('${token.token}'); PortalTokenModule.showTokenManager();">Revoke</button>
            </td>
          </tr>
        `;
      }).join('');
    }

    const body = `
      <div style="margin-bottom: 24px;">
        <h4 style="margin-bottom: 12px;">Generate New Token</h4>
        <table class="data-table" style="margin-bottom: 16px;">
          <thead>
            <tr>
              <th>Client Name</th>
              <th>Email</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            ${clientsHtml}
          </tbody>
        </table>
      </div>

      <div>
        <h4 style="margin-bottom: 12px;">Active Tokens</h4>
        <table class="data-table">
          <thead>
            <tr>
              <th>Client</th>
              <th>Token</th>
              <th>Created</th>
              <th>Expires</th>
            </tr>
          </thead>
          <tbody>
            ${tokensHtml}
          </tbody>
        </table>
      </div>
    `;

    const footer = `
      <button class="btn-secondary" onclick="App.closeModal()">Close</button>
    `;

    App.showModal('Portal Token Manager', body, footer);
  },

  /**
   * Generate token and show it to admin for sharing
   */
  generateAndShowToken(clientId, clientName) {
    const token = this.generateClientToken(clientId, clientName);

    const body = `
      <div style="background: #f9f9f9; padding: 16px; border-radius: 4px; margin-bottom: 16px;">
        <p style="margin: 0 0 8px 0;"><strong>Share this token with ${clientName}:</strong></p>
        <div style="background: white; padding: 12px; border-radius: 3px; font-family: monospace; word-break: break-all; border: 1px solid #ddd;">
          ${token}
        </div>
        <small style="color: #666; display: block; margin-top: 8px;">Token expires in 90 days. Save this token securely.</small>
      </div>
      <p><strong>Portal Access URL:</strong></p>
      <div style="background: white; padding: 12px; border-radius: 3px; font-family: monospace; word-break: break-all; border: 1px solid #ddd; margin-bottom: 16px;">
        ${window.location.origin}/portal?token=${token}
      </div>
      <p style="font-size: 12px; color: #666;"><strong>Note:</strong> Copy both the token and portal URL to share with the client. They will use the token to access the client portal.</p>
    `;

    const footer = `
      <button class="btn-secondary" onclick="navigator.clipboard.writeText('${token}'); App.toast('Token copied!', 'success');">📋 Copy Token</button>
      <button class="btn-secondary" onclick="App.closeModal()">Close</button>
    `;

    App.showModal(`Portal Token Generated - ${clientName}`, body, footer);
  }
};

// ============================================================================
// INITIALIZATION
// ============================================================================

// ============================================================================
// SECURITY: LocalStorage Size Monitor
// ============================================================================

const StorageMonitor = {
  _backupIntervalDays: 7, // Prompt backup every 7 days

  /** Check localStorage usage and warn if approaching limit */
  check() {
    let totalBytes = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      totalBytes += key.length + localStorage.getItem(key).length;
    }
    const totalMB = (totalBytes * 2) / (1024 * 1024); // UTF-16 = 2 bytes per char
    const limitMB = 5; // Conservative browser limit
    const usagePct = Math.round((totalMB / limitMB) * 100);

    if (usagePct >= 90) {
      console.error(`[StorageMonitor] localStorage at ${usagePct}% (${totalMB.toFixed(2)}MB / ${limitMB}MB). Data loss risk!`);
      if (typeof App !== 'undefined' && App.toast) {
        App.toast(`Storage is ${usagePct}% full. Export your data soon to prevent loss.`, 'warning');
      }
      // Auto-trigger backup prompt at critical level
      this._promptBackup(true);
    } else if (usagePct >= 70) {
      console.warn(`[StorageMonitor] localStorage at ${usagePct}% (${totalMB.toFixed(2)}MB / ${limitMB}MB)`);
    }

    // Check if backup is overdue (every 7 days)
    this._checkBackupSchedule();

    return { totalMB: Math.round(totalMB * 100) / 100, limitMB, usagePct };
  },

  /** Get breakdown by collection */
  breakdown() {
    const collections = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      const bytes = (key.length + localStorage.getItem(key).length) * 2;
      const prefix = key.startsWith('dh_') ? key : '_other';
      collections[prefix] = (collections[prefix] || 0) + bytes;
    }
    return Object.entries(collections)
      .map(([key, bytes]) => ({ collection: key, sizeMB: Math.round(bytes / 1024 / 1024 * 100) / 100 }))
      .sort((a, b) => b.sizeMB - a.sizeMB);
  },

  /** Check if backup is overdue */
  _checkBackupSchedule() {
    const lastBackup = localStorage.getItem('dh_last_backup_date');
    if (!lastBackup) {
      // Never backed up — prompt on first load after 3 days of usage
      const firstUse = localStorage.getItem('dh_first_use_date');
      if (!firstUse) {
        localStorage.setItem('dh_first_use_date', new Date().toISOString());
        return;
      }
      const daysSinceFirst = (Date.now() - new Date(firstUse).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceFirst >= 3) {
        this._promptBackup(false);
      }
      return;
    }

    const daysSinceBackup = (Date.now() - new Date(lastBackup).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceBackup >= this._backupIntervalDays) {
      this._promptBackup(false);
    }
  },

  /** Prompt user to backup, or auto-download if critical */
  _promptBackup(critical) {
    // Only show once per session
    if (sessionStorage.getItem('dh_backup_prompted')) return;
    sessionStorage.setItem('dh_backup_prompted', 'true');

    if (typeof App !== 'undefined' && App.toast) {
      const msg = critical
        ? 'Storage is nearly full. Exporting backup now...'
        : 'It\'s been a while since your last backup. Consider exporting your data.';
      App.toast(msg, critical ? 'warning' : 'info');
    }

    if (critical) {
      // Auto-export at critical level
      setTimeout(() => this.exportBackup(), 1500);
    }
  },

  /** Export all dh_ data as a JSON backup file */
  exportBackup() {
    try {
      const data = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith('dh_')) {
          try { data[key] = JSON.parse(localStorage.getItem(key)); }
          catch { data[key] = localStorage.getItem(key); }
        }
      }

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const date = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `DHRES-Backup-${date}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Record backup timestamp
      localStorage.setItem('dh_last_backup_date', new Date().toISOString());
      console.log('[StorageMonitor] Backup exported successfully');

      if (typeof App !== 'undefined' && App.toast) {
        App.toast('Backup exported successfully', 'success');
      }
    } catch (err) {
      console.error('[StorageMonitor] Backup export failed:', err);
      if (typeof App !== 'undefined' && App.toast) {
        App.toast('Backup export failed. Please try manually from Settings.', 'error');
      }
    }
  }
};


// ============================================================================
// SECURITY: Auto-Logout on Idle (30 minutes)
// ============================================================================

const IdleLogout = {
  _timeout: 30 * 60 * 1000, // 30 minutes
  _timer: null,

  start() {
    this._resetTimer();
    ['mousemove', 'keydown', 'scroll', 'touchstart', 'click'].forEach(event => {
      document.addEventListener(event, () => this._resetTimer(), { passive: true });
    });
  },

  _resetTimer() {
    if (this._timer) clearTimeout(this._timer);
    this._timer = setTimeout(() => this._logout(), this._timeout);
  },

  _logout() {
    sessionStorage.removeItem('dhres-session');
    sessionStorage.removeItem('dhres-admin-auth');
    console.log('[IdleLogout] Session expired due to inactivity');
    if (typeof App !== 'undefined' && App.toast) {
      App.toast('Session expired. Please log in again.', 'warning');
    }
    setTimeout(() => location.reload(), 2000);
  }
};


// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  App.init();

  // Start idle logout timer
  IdleLogout.start();

  // Check storage usage
  StorageMonitor.check();

  // Sync pending Stripe payments on load
  if (typeof StripeService !== 'undefined' && StripeService.isEnabled()) {
    StripeService.syncAllPendingPayments().catch(err => {
      console.warn('Stripe sync on load:', err.message);
    });
  }

  // Render payment notification badge
  if (typeof StripeUI !== 'undefined') {
    StripeUI.renderNotificationBadge();
  }
});
