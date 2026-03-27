// =====================================================
// DESIGNER HOMES ADMIN - CORE APPLICATION
// =====================================================

// =====================================================
// SECURITY UTILITIES - Password hashing and token management
// =====================================================

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
   * Generate cryptographic token
   */
  generateToken(length = 32) {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return Array.from(array, byte => charset[byte % charset.length]).join('');
  }
};

// =====================================================
// DESIGNER HOMES ADMIN - CORE APPLICATION
// =====================================================

const AdminApp = {
  currentSection: 'dashboard',

  // ---- INITIALIZATION ----
  init() {
    // Load persistent rate limiting state
    this._loadAdminRateLimitState();

    // Check if logged in
    if (sessionStorage.getItem('dhres-admin-auth') === 'true') {
      this.showApp();
    }
    // Bind login form
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
      loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.login();
      });
    }
    // Initialize seed data if first run
    if (!localStorage.getItem('dhres-initialized')) {
      this.seedData();
    }
    // Load automation states
    this.loadAutomationStates();
    // Bind filters (using optional chaining for safety)
    document.getElementById('mileage-period')?.addEventListener('change', () => { if (typeof MileageModule !== 'undefined') MileageModule.render(); });
    document.getElementById('leads-filter-status')?.addEventListener('change', () => { if (typeof LeadsModule !== 'undefined') LeadsModule.render(); });
    document.getElementById('leads-filter-type')?.addEventListener('change', () => { if (typeof LeadsModule !== 'undefined') LeadsModule.render(); });
    document.getElementById('assignments-filter-status')?.addEventListener('change', () => { if (typeof AssignmentsModule !== 'undefined') AssignmentsModule.render(); });
    document.getElementById('clients-filter-type')?.addEventListener('change', () => { if (typeof ClientsModule !== 'undefined') ClientsModule.render(); });
  },

  // ---- HTML ONCLICK ALIASES (match inline handlers in admin.html) ----
  handleLogin() { this.login(); },
  handleLogout() { this.logout(); },
  toggleSidebar() { document.getElementById('sidebar').classList.toggle('open'); },
  switchSection(section, event) {
    if (event) event.preventDefault();
    this.navigateTo(section);
  },
  openNotifications() {
    this.navigateTo('dashboard');
    this.toast('Showing dashboard with pending actions', 'info');
  },

  // ---- AUTH ----
  _adminLoginAttempts: 0,
  _adminLockoutUntil: null,
  MAX_LOGIN_ATTEMPTS: 5,
  LOCKOUT_DURATION_MS: 5 * 60 * 1000,

  async login() {
    const errorDiv = document.getElementById('login-error');
    const pw = document.getElementById('login-password').value;

    // Load persistent rate limiting state
    this._loadAdminRateLimitState();

    // Check lockout
    if (this._adminLockoutUntil && Date.now() < this._adminLockoutUntil) {
      const remaining = Math.ceil((this._adminLockoutUntil - Date.now()) / 1000);
      errorDiv.textContent = `Too many failed attempts. Try again in ${remaining} seconds.`;
      errorDiv.style.display = 'block';
      document.getElementById('login-password').value = '';
      return;
    }

    try {
      // Get stored password hash or default
      let storedHash = localStorage.getItem('dhres-admin-password-hash');

      // Handle first-time migration from plaintext
      if (!storedHash) {
        const oldPlaintext = localStorage.getItem('dhres-admin-password');
        if (oldPlaintext) {
          // Auto-migrate old plaintext password to hashed
          const defaultPassword = 'B0$smann919';
          if (pw === oldPlaintext) {
            // User logging in with old password - accept and migrate
            storedHash = await SecurityUtils.hash(defaultPassword);
            localStorage.setItem('dhres-admin-password-hash', storedHash);
          } else if (pw === defaultPassword) {
            // User is trying default password
            storedHash = await SecurityUtils.hash(defaultPassword);
            localStorage.setItem('dhres-admin-password-hash', storedHash);
          }
        }
      }

      // If still no hash, use default
      if (!storedHash) {
        const defaultPassword = 'B0$smann919';
        storedHash = await SecurityUtils.hash(defaultPassword);
        localStorage.setItem('dhres-admin-password-hash', storedHash);
      }

      // Verify password
      if (await SecurityUtils.verify(pw, storedHash)) {
        // Successful login
        this._adminLoginAttempts = 0;
        this._adminLockoutUntil = null;
        this._saveAdminRateLimitState();

        sessionStorage.setItem('dhres-admin-auth', 'true');
        sessionStorage.setItem('dhres-admin-session-token', SecurityUtils.generateToken(32));
        sessionStorage.setItem('dhres-admin-session-created', Date.now().toString());
        this.showApp();
      } else {
        this._handleAdminFailedLogin(errorDiv);
      }
    } catch (error) {
      console.error('Admin login error:', error);
      errorDiv.textContent = 'An error occurred during login. Please try again.';
      errorDiv.style.display = 'block';
      document.getElementById('login-password').value = '';
    }
  },

  _handleAdminFailedLogin(errorDiv) {
    this._adminLoginAttempts++;
    this._saveAdminRateLimitState();
    const remaining = this.MAX_LOGIN_ATTEMPTS - this._adminLoginAttempts;

    if (this._adminLoginAttempts >= this.MAX_LOGIN_ATTEMPTS) {
      this._adminLockoutUntil = Date.now() + this.LOCKOUT_DURATION_MS;
      this._saveAdminRateLimitState();
      errorDiv.textContent = `Account locked. Too many failed attempts. Try again in 5 minutes.`;
    } else {
      errorDiv.textContent = `Incorrect password. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.`;
    }
    errorDiv.style.display = 'block';
    document.getElementById('login-password').value = '';
  },

  _loadAdminRateLimitState() {
    try {
      const stored = localStorage.getItem('dhres-admin-rate-limit');
      if (stored) {
        const state = JSON.parse(stored);
        this._adminLoginAttempts = state.attempts || 0;
        this._adminLockoutUntil = state.lockout_until || null;

        // Clear if lockout expired
        if (this._adminLockoutUntil && Date.now() >= this._adminLockoutUntil) {
          this._adminLoginAttempts = 0;
          this._adminLockoutUntil = null;
          localStorage.removeItem('dhres-admin-rate-limit');
        }
      }
    } catch (e) {
      console.error('Failed to load admin rate limit state:', e);
    }
  },

  _saveAdminRateLimitState() {
    try {
      const state = {
        attempts: this._adminLoginAttempts,
        lockout_until: this._adminLockoutUntil
      };
      localStorage.setItem('dhres-admin-rate-limit', JSON.stringify(state));
    } catch (e) {
      console.error('Failed to save admin rate limit state:', e);
    }
  },

  logout() {
    sessionStorage.removeItem('dhres-admin-auth');
    document.getElementById('app').style.display = 'none';
    document.getElementById('login-screen').style.display = 'flex';
    document.getElementById('login-password').value = '';
  },

  showApp() {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('app').style.display = 'flex';
    this.navigateTo('dashboard');
  },

  // ---- NAVIGATION ----
  navigateTo(section) {
    this.currentSection = section;
    // Hide all sections
    document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
    // Show target
    const target = document.getElementById('section-' + section);
    if (target) target.classList.add('active');
    // Update sidebar active
    document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
    document.querySelector(`.sidebar-link[data-section="${section}"]`)?.classList.add('active');
    // Close mobile sidebar
    document.getElementById('sidebar').classList.remove('open');
    // Render section
    this.renderSection(section);
  },

  renderSection(section) {
    switch(section) {
      case 'dashboard': this.renderDashboard(); break;
      case 'leads': LeadsModule.render(); break;
      case 'assignments': AssignmentsModule.render(); break;
      case 'completed': CompletedModule.render(); break;
      case 'invoices': InvoicesModule.render(); break;
      case 'mileage': MileageModule.render(); break;
      case 'clients': ClientsModule.render(); break;
      case 'reports': ReportsModule.render(); break;
      case 'lender': LenderModule.render(); break;
      case 'settings': SettingsModule.render(); break;
    }
  },

  // ---- QUICK ACTIONS ----
  quickAction(type) {
    switch(type) {
      case 'new-lead': this.navigateTo('leads'); setTimeout(() => LeadsModule.showAddModal(), 100); break;
      case 'new-assignment': this.navigateTo('assignments'); setTimeout(() => AssignmentsModule.showAddModal(), 100); break;
      case 'create-invoice': this.navigateTo('invoices'); setTimeout(() => InvoicesModule.showCreateModal(), 100); break;
      case 'log-mileage': this.navigateTo('mileage'); setTimeout(() => MileageModule.showLogModal(), 100); break;
    }
  },

  // ---- DASHBOARD ----
  renderDashboard() {
    const leads = DB.getAll('leads');
    const assignments = DB.getAll('assignments');
    const invoices = DB.getAll('invoices');
    const mileage = DB.getAll('mileage');
    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();

    // Metrics
    const newLeads = leads.filter(l => l.status === 'New').length;
    const activeAssignments = assignments.filter(a => a.status !== 'Delivered').length;
    const completedMonth = assignments.filter(a => {
      if (a.status !== 'Delivered' || !a.completedDate) return false;
      const d = new Date(a.completedDate);
      return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
    }).length;
    const unpaidInvoices = invoices.filter(i => i.status === 'Sent' || i.status === 'Overdue');
    const unpaidTotal = unpaidInvoices.reduce((sum, i) => sum + (i.total || 0), 0);
    const paidMonth = invoices.filter(i => {
      if (i.status !== 'Paid' || !i.paidDate) return false;
      const d = new Date(i.paidDate);
      return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
    }).reduce((sum, i) => sum + (i.total || 0), 0);
    const reportsReady = assignments.filter(a => a.status === 'Report Complete' || a.status === 'Awaiting Payment').length;
    const monthRevenue = paidMonth;
    const monthMileage = mileage.filter(m => {
      const d = new Date(m.date);
      return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
    }).reduce((sum, m) => sum + (m.totalMiles || 0), 0);

    this.setMetric('metric-new-leads', newLeads, newLeads > 0 ? 'highlight' : '');
    this.setMetric('metric-active', activeAssignments);
    this.setMetric('metric-completed-month', completedMonth);
    this.setMetric('metric-unpaid', unpaidInvoices.length + ' / ' + Util.currency(unpaidTotal), unpaidInvoices.length > 0 ? 'danger' : '');
    this.setMetric('metric-paid-month', Util.currency(paidMonth), paidMonth > 0 ? 'success' : '');
    this.setMetric('metric-reports-ready', reportsReady);
    this.setMetric('metric-revenue-month', Util.currency(monthRevenue));
    this.setMetric('metric-mileage-month', Math.round(monthMileage) + ' mi');

    // Activity feed
    const activities = DB.getAll('activity').slice(-15).reverse();
    const feedEl = document.getElementById('activity-feed');
    feedEl.innerHTML = activities.length ? activities.map(a =>
      `<div class="activity-item"><span class="activity-time">${Util.timeAgo(a.timestamp)}</span><span class="activity-text">${a.text}</span></div>`
    ).join('') : '<p class="empty-state">No recent activity</p>';

    // Pending actions
    const pending = [];
    leads.filter(l => l.status === 'New').forEach(l => pending.push({text: `New lead: ${l.clientName} — ${l.serviceType}`, action: 'leads'}));
    invoices.filter(i => i.status === 'Overdue').forEach(i => pending.push({text: `Overdue invoice: ${i.invoiceNumber} — ${Util.currency(i.total)}`, action: 'invoices'}));
    assignments.filter(a => a.status === 'Awaiting Payment').forEach(a => pending.push({text: `Awaiting payment: ${a.assignmentNumber}`, action: 'assignments'}));
    const pendingEl = document.getElementById('pending-actions');
    pendingEl.innerHTML = pending.length ? pending.map(p =>
      `<div class="pending-item" onclick="AdminApp.navigateTo('${p.action}')">${p.text}</div>`
    ).join('') : '<p class="empty-state">All caught up!</p>';

    // Revenue chart (last 6 months)
    this.renderRevenueChart('revenue-chart', invoices);
  },

  setMetric(id, value, variant) {
    const el = document.getElementById(id + '-value');
    if (el) el.textContent = value;
    const card = el?.closest('.metric-card');
    if (card) {
      card.classList.remove('highlight', 'danger', 'success');
      if (variant) card.classList.add(variant);
    }
  },

  renderRevenueChart(containerId, invoices) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const now = new Date();
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthInvoices = invoices.filter(inv => {
        if (inv.status !== 'Paid' || !inv.paidDate) return false;
        const pd = new Date(inv.paidDate);
        return pd.getMonth() === d.getMonth() && pd.getFullYear() === d.getFullYear();
      });
      const total = monthInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
      months.push({ label: d.toLocaleDateString('en-US', {month:'short'}), value: total });
    }
    const maxVal = Math.max(...months.map(m => m.value), 1);
    container.innerHTML = months.map(m =>
      `<div class="bar-row"><span class="bar-label">${m.label}</span><div class="bar-track"><div class="bar-fill" style="width:${(m.value/maxVal)*100}%"></div></div><span class="bar-value">${Util.currency(m.value)}</span></div>`
    ).join('');
  },

  // ---- MODAL ----
  showModal(title, bodyHTML, footerHTML) {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').innerHTML = bodyHTML;
    document.getElementById('modal-footer').innerHTML = footerHTML || '';
    document.getElementById('modal-overlay').classList.add('open');
    document.body.style.overflow = 'hidden';
  },

  closeModal(e) {
    if (e && e.target !== e.currentTarget) return;
    document.getElementById('modal-overlay').classList.remove('open');
    document.body.style.overflow = '';
  },

  // ---- DETAIL PANEL ----
  showDetail(title, bodyHTML) {
    document.getElementById('detail-title').textContent = title;
    document.getElementById('detail-body').innerHTML = bodyHTML;
    document.getElementById('detail-panel').classList.add('open');
  },

  closeDetail() {
    document.getElementById('detail-panel').classList.remove('open');
  },

  // ---- TOAST ----
  toast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  },

  // ---- GLOBAL SEARCH ----
  globalSearch(query) {
    if (!query || query.length < 2) {
      const dropdown = document.getElementById('search-results');
      if (dropdown) dropdown.style.display = 'none';
      return;
    }
    const q = query.toLowerCase();
    const results = [];
    DB.getAll('leads').forEach(l => {
      if ((l.clientName||'').toLowerCase().includes(q) || (l.propertyAddress||'').toLowerCase().includes(q) || (l.email||'').toLowerCase().includes(q)) {
        results.push({type: 'Lead', name: l.clientName, section: 'leads'});
      }
    });
    DB.getAll('assignments').forEach(a => {
      if ((a.clientName||'').toLowerCase().includes(q) || (a.propertyAddress||'').toLowerCase().includes(q) || (a.assignmentNumber||'').toLowerCase().includes(q)) {
        results.push({type: 'Assignment', name: a.assignmentNumber + ' — ' + a.clientName, section: 'assignments'});
      }
    });
    DB.getAll('clients').forEach(c => {
      if ((c.name||'').toLowerCase().includes(q) || (c.email||'').toLowerCase().includes(q)) {
        results.push({type: 'Client', name: c.name, section: 'clients'});
      }
    });
    // Show results in dropdown
    let dropdown = document.getElementById('search-results');
    if (!dropdown) {
      dropdown = document.createElement('div');
      dropdown.id = 'search-results';
      dropdown.className = 'search-dropdown';
      document.getElementById('global-search').parentNode.appendChild(dropdown);
    }
    if (results.length === 0) {
      dropdown.innerHTML = '<div class="search-result-item">No results found</div>';
    } else {
      dropdown.innerHTML = results.slice(0, 8).map(r =>
        `<div class="search-result-item" onclick="AdminApp.navigateTo('${r.section}'); document.getElementById('search-results').innerHTML=''; document.getElementById('global-search').value='';"><span class="search-result-type">${r.type}</span> ${r.name}</div>`
      ).join('');
    }
    dropdown.style.display = 'block';
    // Hide on click outside
    document.addEventListener('click', function hide(e) {
      if (!e.target.closest('.search-wrapper')) {
        dropdown.style.display = 'none';
        document.removeEventListener('click', hide);
      }
    });
  },

  // ---- AUTOMATIONS ----
  loadAutomationStates() {
    const settings = DB.get('settings') || {};
    ['auto-ack', 'payment-reminders', 'review-requests'].forEach(id => {
      const toggle = document.getElementById(id);
      if (toggle) toggle.checked = settings[id] !== false;
    });
    this.updateAutomationCount();
  },

  toggleAutomation(id) {
    const settings = DB.get('settings') || {};
    const toggle = document.getElementById(id);
    settings[id] = toggle.checked;
    DB.save('settings', settings);
    this.updateAutomationCount();
    this.toast(`Automation ${toggle.checked ? 'enabled' : 'disabled'}`, 'info');
  },

  updateAutomationCount() {
    const settings = DB.get('settings') || {};
    let count = 0;
    if (settings['auto-ack'] !== false) count++;
    if (settings['payment-reminders'] !== false) count++;
    if (settings['review-requests'] !== false) count++;
    const el = document.getElementById('automation-count');
    if (el) el.textContent = count + ' automation' + (count !== 1 ? 's' : '') + ' active';
  },

  // ---- SEED DATA ----
  seedData() {
    const now = new Date();
    const daysAgo = (d) => new Date(now.getTime() - d * 86400000).toISOString().split('T')[0];

    // Clients
    const clients = [
      {id: Util.id(), name: 'Sarah Mitchell', email: 'smitchell@lawfirm.com', phone: '(919) 555-0201', type: 'Attorney', notes: 'Family law attorney, Durham'},
      {id: Util.id(), name: 'James Thompson', email: 'jthompson@gmail.com', phone: '(919) 555-0302', type: 'Homeowner', notes: 'Referred by Sarah Mitchell'},
      {id: Util.id(), name: 'Robert Kim', email: 'rkim@kimcpa.com', phone: '(919) 555-0403', type: 'CPA', notes: 'Estate accounting, Chapel Hill'},
      {id: Util.id(), name: 'Linda Parker', email: 'lparker@firstbank.com', phone: '(919) 555-0504', type: 'Lender', notes: 'Loan officer, First National Bank'},
      {id: Util.id(), name: 'David Williams', email: 'dwilliams@invest.com', phone: '(919) 555-0605', type: 'Investor', notes: 'Multi-property investor, Durham area'}
    ];
    DB.saveAll('clients', clients);

    // Leads
    const leads = [
      {id: Util.id(), date: daysAgo(1), clientName: 'Patricia Adams', email: 'padams@email.com', phone: '(919) 555-0701', serviceType: 'Estate', propertyAddress: '412 Oak Lane, Durham, NC 27701', status: 'New', notes: 'Date-of-death valuation needed for estate settlement. Attorney referral.'},
      {id: Util.id(), date: daysAgo(3), clientName: 'Michael Chen', email: 'mchen@email.com', phone: '(919) 555-0802', serviceType: 'Divorce', propertyAddress: '1890 Elm St, Raleigh, NC 27603', status: 'Contacted', notes: 'Needs divorce appraisal for mediation. Two properties.'},
      {id: Util.id(), date: daysAgo(5), clientName: 'Angela Foster', email: 'afoster@email.com', phone: '(919) 555-0903', serviceType: 'Current Value', propertyAddress: '305 Maple Dr, Chapel Hill, NC 27514', status: 'Quoted', notes: 'Pre-listing appraisal. Quoted $450.'}
    ];
    DB.saveAll('leads', leads);

    // Assignments
    const assignments = [
      {id: Util.id(), assignmentNumber: 'DHRES-2026-001', clientId: clients[0].id, clientName: clients[0].name, clientEmail: clients[0].email, propertyAddress: '2245 Forest Hills Dr, Durham, NC 27707', serviceType: 'Divorce', fee: 500, status: 'Inspected', priority: 'Standard', dueDate: daysAgo(-5), createdDate: daysAgo(10), notes: 'Marital property, inspection completed 3/20.', reportStatus: 'In Progress', paymentStatus: 'Unpaid'},
      {id: Util.id(), assignmentNumber: 'DHRES-2026-002', clientId: clients[1].id, clientName: clients[1].name, clientEmail: clients[1].email, propertyAddress: '789 Cedar Ct, Raleigh, NC 27609', serviceType: 'Current Value', fee: 400, status: 'Scheduled', priority: 'Standard', dueDate: daysAgo(-10), createdDate: daysAgo(5), notes: 'Inspection scheduled for 3/28.', reportStatus: 'Not Started', paymentStatus: 'Unpaid'},
      {id: Util.id(), assignmentNumber: 'DHRES-2026-003', clientId: clients[2].id, clientName: clients[2].name, clientEmail: clients[2].email, propertyAddress: '1500 University Dr, Chapel Hill, NC 27516', serviceType: 'Estate', fee: 550, status: 'Delivered', priority: 'Rush', dueDate: daysAgo(5), createdDate: daysAgo(20), completedDate: daysAgo(3), notes: 'Estate valuation complete and delivered.', reportStatus: 'Delivered', paymentStatus: 'Paid'}
    ];
    DB.saveAll('assignments', assignments);

    // Invoices
    const invoices = [
      {id: Util.id(), invoiceNumber: 'INV-2026-001', date: daysAgo(3), clientName: clients[2].name, clientEmail: clients[2].email, assignmentId: assignments[2].id, assignmentNumber: 'DHRES-2026-003', items: [{description: 'Estate Appraisal — 1500 University Dr', amount: 550}], total: 550, status: 'Paid', dueDate: daysAgo(3), paidDate: daysAgo(2), paymentMethod: 'Stripe'},
      {id: Util.id(), invoiceNumber: 'INV-2026-002', date: daysAgo(15), clientName: 'Prior Client Example', clientEmail: 'prior@email.com', assignmentId: null, assignmentNumber: 'DHRES-2025-047', items: [{description: 'Current Value Appraisal — 220 Pine Rd', amount: 425}], total: 425, status: 'Paid', dueDate: daysAgo(10), paidDate: daysAgo(12), paymentMethod: 'Zelle'}
    ];
    DB.saveAll('invoices', invoices);

    // Mileage
    const mileageEntries = [
      {id: Util.id(), date: daysAgo(3), assignmentId: assignments[2].id, assignmentNumber: 'DHRES-2026-003', subjectAddress: '1500 University Dr, Chapel Hill, NC 27516', comparables: [{address: '1420 University Dr', visited: true}, {address: '1605 Mason Farm Rd', visited: true}, {address: '312 Pittsboro St', visited: false}], startLocation: 'Durham, NC', totalMiles: 28, manualOverride: false, irsRate: 0.70, deduction: 19.60, notes: 'Subject + 2 comps visited'}
    ];
    DB.saveAll('mileage', mileageEntries);

    // Lender inquiries
    const lenderInquiries = [
      {id: Util.id(), date: daysAgo(7), company: 'First National Bank', contactName: 'Linda Parker', email: 'lparker@firstbank.com', phone: '(919) 555-0504', inquiryType: 'Add to Approved Panel', status: 'Reviewed', notes: 'Interested in panel for Durham/Wake counties'}
    ];
    DB.saveAll('lenderInquiries', lenderInquiries);

    // Activity feed
    const activities = [
      {id: Util.id(), timestamp: new Date(now.getTime() - 2*3600000).toISOString(), text: 'New lead: Patricia Adams — Estate appraisal'},
      {id: Util.id(), timestamp: new Date(now.getTime() - 24*3600000).toISOString(), text: 'Invoice INV-2026-001 marked as paid ($550)'},
      {id: Util.id(), timestamp: new Date(now.getTime() - 48*3600000).toISOString(), text: 'Report delivered: DHRES-2026-003 — Estate appraisal'},
      {id: Util.id(), timestamp: new Date(now.getTime() - 72*3600000).toISOString(), text: 'Assignment DHRES-2026-001 status → Inspected'},
      {id: Util.id(), timestamp: new Date(now.getTime() - 96*3600000).toISOString(), text: 'Mileage logged: 28 miles for DHRES-2026-003'},
      {id: Util.id(), timestamp: new Date(now.getTime() - 168*3600000).toISOString(), text: 'Lender inquiry: First National Bank — Panel request'}
    ];
    DB.saveAll('activity', activities);

    // Settings
    DB.save('settings', {
      startLocation: 'Durham, NC',
      irsRate: 0.70,
      baseMiles: 15,
      perStopMiles: 5,
      dueDays: 15,
      paymentInstructions: 'Payment required before report release. Pay online via the link provided or contact us for alternative arrangements.',
      bizName: 'Designer Homes Real Estate Services',
      bizPhone: '(919) 555-0100',
      bizEmail: 'info@designerhomesre.com',
      license: 'A9156',
      'auto-ack': true,
      'payment-reminders': true,
      'review-requests': true
    });

    localStorage.setItem('dhres-initialized', 'true');
    localStorage.setItem('dhres-next-assignment', '4');
    localStorage.setItem('dhres-next-invoice', '3');
  }
};

// =====================================================
// DATABASE LAYER (localStorage wrapper)
// =====================================================
const DB = {
  getAll(collection) {
    try {
      return JSON.parse(localStorage.getItem('dhres-' + collection) || '[]');
    } catch { return []; }
  },

  get(key) {
    try {
      return JSON.parse(localStorage.getItem('dhres-' + key));
    } catch { return null; }
  },

  saveAll(collection, data) {
    localStorage.setItem('dhres-' + collection, JSON.stringify(data));
  },

  save(key, data) {
    localStorage.setItem('dhres-' + key, JSON.stringify(data));
  },

  add(collection, item) {
    const data = this.getAll(collection);
    data.push(item);
    this.saveAll(collection, data);
    return item;
  },

  update(collection, id, updates) {
    const data = this.getAll(collection);
    const idx = data.findIndex(item => item.id === id);
    if (idx >= 0) {
      data[idx] = {...data[idx], ...updates};
      this.saveAll(collection, data);
      return data[idx];
    }
    return null;
  },

  remove(collection, id) {
    const data = this.getAll(collection).filter(item => item.id !== id);
    this.saveAll(collection, data);
  },

  addActivity(text) {
    this.add('activity', {id: Util.id(), timestamp: new Date().toISOString(), text});
  }
};

// =====================================================
// UTILITY FUNCTIONS
// =====================================================
const Util = {
  id() {
    return 'id-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9);
  },

  currency(amount) {
    return '$' + (Number(amount) || 0).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
  },

  formatDate(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {month: '2-digit', day: '2-digit', year: 'numeric'});
  },

  timeAgo(timestamp) {
    const seconds = Math.floor((new Date() - new Date(timestamp)) / 1000);
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return Math.floor(seconds/60) + 'm ago';
    if (seconds < 86400) return Math.floor(seconds/3600) + 'h ago';
    if (seconds < 604800) return Math.floor(seconds/86400) + 'd ago';
    return Util.formatDate(timestamp);
  },

  statusBadge(status) {
    const colors = {
      'New': 'blue', 'Contacted': 'amber', 'Quoted': 'orange', 'Converted': 'green', 'Lost': 'gray',
      'Accepted': 'blue', 'Scheduled': 'amber', 'Inspected': 'orange', 'In Review': 'orange',
      'Report Complete': 'teal', 'Awaiting Payment': 'red', 'Delivered': 'green',
      'Draft': 'gray', 'Sent': 'blue', 'Paid': 'green', 'Overdue': 'red',
      'Not Started': 'gray', 'In Progress': 'amber', 'Complete': 'teal', 'Ready for Delivery': 'blue',
      'Reviewed': 'amber', 'Responded': 'teal', 'Added to Panel': 'green', 'Declined': 'gray'
    };
    const color = colors[status] || 'gray';
    return `<span class="badge badge-${color}">${status}</span>`;
  },

  nextAssignmentNumber() {
    let num = parseInt(localStorage.getItem('dhres-next-assignment') || '1');
    localStorage.setItem('dhres-next-assignment', String(num + 1));
    return 'DHRES-2026-' + String(num).padStart(3, '0');
  },

  nextInvoiceNumber() {
    let num = parseInt(localStorage.getItem('dhres-next-invoice') || '1');
    localStorage.setItem('dhres-next-invoice', String(num + 1));
    return 'INV-2026-' + String(num).padStart(3, '0');
  },

  estimateMileage(numStopsVisited) {
    const settings = DB.get('settings') || {};
    const base = settings.baseMiles || 15;
    const perStop = settings.perStopMiles || 5;
    return base + (numStopsVisited * perStop);
  }
};

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => AdminApp.init());
