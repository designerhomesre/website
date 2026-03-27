/**
 * DESIGNER HOMES APPRAISAL PLATFORM
 * Operations Module - Assignments, Clients, Mileage, Invoices, Reports
 *
 * Phase 1 Production (Assignments & Clients fully built)
 * Mileage, Invoices, Reports are functional with core features
 * Dependencies: App, DB, Util (from app-core.js, loaded first)
 */

// ============================================================================
// ASSIGNMENT MODULE - Fully Built (Phase 1 Priority)
// ============================================================================

const AssignmentModule = {
  /**
   * Render assignment list with filters and search
   */
  render() {
    const statusFilter = document.getElementById('asgn-filter-status').value;
    const typeFilter = document.getElementById('asgn-filter-type').value;
    const searchQuery = document.getElementById('asgn-search').value.toLowerCase();

    let assignments = DB.getAll('assignments');

    // Apply status filter
    if (statusFilter !== 'all') {
      assignments = assignments.filter(a => a.status === statusFilter);
    }

    // Apply type filter
    if (typeFilter !== 'all') {
      assignments = assignments.filter(a => a.type === typeFilter);
    }

    // Apply search filter
    if (searchQuery) {
      assignments = assignments.filter(a =>
        a.assignment_number.toLowerCase().includes(searchQuery) ||
        a.client_name.toLowerCase().includes(searchQuery) ||
        a.subject_address.toLowerCase().includes(searchQuery)
      );
    }

    // Sort by created date descending (newest first)
    assignments.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    // Render to container
    const container = document.getElementById('assignments-list');
    if (assignments.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📋</div>
          <p>No assignments yet. Create one to get started.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = assignments.map(a => this.renderCard(a)).join('');
  },

  /**
   * Render a single assignment card
   */
  renderCard(assignment) {
    const client = DB.getById('clients', assignment.client_id);
    const clientName = client ? client.name : assignment.client_name || 'Unknown Client';
    const statusBadge = Util.statusBadge(assignment.status);
    const pipeline = this.renderPipeline(assignment.status);

    return `
      <div class="assignment-card">
        <div class="card-header">
          <div>
            <h3>${assignment.assignment_number}</h3>
            <p class="text-muted">${clientName}</p>
          </div>
          <div class="card-badges">
            <span class="badge-secondary">${assignment.type.replace(/_/g, ' ').charAt(0).toUpperCase() + assignment.type.replace(/_/g, ' ').slice(1)}</span>
            ${statusBadge}
          </div>
        </div>

        <div class="card-body">
          <div class="info-row">
            <strong>Property:</strong> ${assignment.subject_address}
          </div>
          <div class="info-row">
            <strong>Location:</strong> ${assignment.city}, ${assignment.state} ${assignment.zip}
          </div>
          <div class="info-row">
            <strong>Fee:</strong> ${Util.currency(assignment.fee)} | <strong>Due:</strong> ${Util.formatDate(assignment.due_date)}
          </div>
          ${assignment.priority ? `<div class="info-row"><strong>Priority:</strong> ${assignment.priority}</div>` : ''}
        </div>

        <div class="card-pipeline">
          ${pipeline}
        </div>

        <div class="card-actions">
          <button class="btn-sm btn-link" onclick="AssignmentModule.showDetail('${assignment.id}')">View Details</button>
          <button class="btn-sm btn-link" onclick="AssignmentModule.advanceStatus('${assignment.id}')">Advance Status</button>
          <button class="btn-sm btn-link" onclick="AssignmentModule.scheduleInspection('${assignment.id}')">📅 Schedule</button>
          <button class="btn-sm btn-link" onclick="AssignmentModule.showEdit('${assignment.id}')">Edit</button>
          <button class="btn-sm btn-link btn-danger" onclick="AssignmentModule.deleteAssignment('${assignment.id}')">Delete</button>
        </div>
      </div>
    `;
  },

  /**
   * Render status pipeline visualization (horizontal dots)
   */
  renderPipeline(currentStatus) {
    const statuses = [
      'new', 'accepted', 'scheduled', 'inspected', 'in_review',
      'report_complete', 'awaiting_payment', 'delivered'
    ];
    const statusLabels = {
      'new': 'New',
      'accepted': 'Accepted',
      'scheduled': 'Scheduled',
      'inspected': 'Inspected',
      'in_review': 'In Review',
      'report_complete': 'Report Done',
      'awaiting_payment': 'Awaiting Pay',
      'delivered': 'Delivered'
    };

    const currentIndex = statuses.indexOf(currentStatus);
    const dots = statuses.map((status, index) => {
      let className = 'pipeline-dot';
      if (index < currentIndex) {
        className += ' completed';
      } else if (index === currentIndex) {
        className += ' active';
      }
      return `<div class="${className}" title="${statusLabels[status]}"></div>`;
    }).join('');

    return `<div class="pipeline-visual">${dots}</div>`;
  },

  /**
   * Show create assignment modal
   */
  showCreate() {
    const clients = DB.getAll('clients');
    const clientOptions = clients.map(c =>
      `<option value="${c.id}">${c.name}</option>`
    ).join('');

    const body = `
      <form id="assignment-create-form">
        <div class="form-row">
          <div class="form-group">
            <label>Client *</label>
            <select id="asgn-client-id" required>
              <option value="">Select a client...</option>
              ${clientOptions}
              <option value="__new__" style="border-top: 1px solid #ccc; margin-top: 5px; padding-top: 5px;">+ Add New Client</option>
            </select>
          </div>
        </div>

        <div id="asgn-new-client-fields" style="display:none;">
          <div class="form-row">
            <div class="form-group flex-1">
              <label>Client Name *</label>
              <input type="text" id="asgn-new-client-name" placeholder="e.g., Smith & Associates">
            </div>
            <div class="form-group flex-1">
              <label>Email</label>
              <input type="email" id="asgn-new-client-email" placeholder="email@example.com">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group flex-1">
              <label>Phone</label>
              <input type="tel" id="asgn-new-client-phone" placeholder="(919) 555-0000">
            </div>
            <div class="form-group flex-1">
              <label>Type</label>
              <select id="asgn-new-client-type">
                <option value="attorney">Attorney</option>
                <option value="homeowner">Homeowner</option>
                <option value="estate_rep">Estate Rep</option>
                <option value="cpa">CPA</option>
                <option value="lender">Lender</option>
                <option value="investor">Investor</option>
                <option value="developer">Developer</option>
                <option value="government">Government</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Subject Address *</label>
            <input type="text" id="asgn-subject-address" placeholder="123 Main Street" required>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group flex-1">
            <label>City *</label>
            <input type="text" id="asgn-city" required>
          </div>
          <div class="form-group flex-1">
            <label>State *</label>
            <input type="text" id="asgn-state" value="NC" required>
          </div>
          <div class="form-group flex-1">
            <label>Zip *</label>
            <input type="text" id="asgn-zip" required>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group flex-1">
            <label>County</label>
            <input type="text" id="asgn-county" placeholder="e.g., Durham County">
          </div>
          <div class="form-group flex-1">
            <label>Neighborhood/Subdivision</label>
            <input type="text" id="asgn-neighborhood" placeholder="e.g., Riverside Heights">
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Assignment Type *</label>
            <select id="asgn-type" required>
              <option value="">Select type...</option>
              <option value="current_value">Current Value</option>
              <option value="divorce">Divorce</option>
              <option value="estate">Estate</option>
              <option value="retrospective">Retrospective</option>
              <option value="new_construction">New Construction</option>
              <option value="fha">FHA</option>
              <option value="green_home">Green Home</option>
              <option value="mass_appraisal">Mass Appraisal</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Property Type *</label>
            <select id="asgn-property-type" required>
              <option value="">Select type...</option>
              <option value="single_family">Single Family</option>
              <option value="condo">Condo</option>
              <option value="multi_family">Multi-Family</option>
              <option value="manufactured">Manufactured</option>
              <option value="vacant_land">Vacant Land</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Intended Use</label>
            <input type="text" id="asgn-intended-use" value="To determine market value" placeholder="Purpose of appraisal">
          </div>
        </div>

        <div class="form-row">
          <div class="form-group flex-1">
            <label>Fee *</label>
            <input type="number" id="asgn-fee" min="0" step="0.01" placeholder="425.00" required>
          </div>
          <div class="form-group flex-1">
            <label>Due Date *</label>
            <input type="date" id="asgn-due-date" required>
          </div>
          <div class="form-group flex-1">
            <label>Priority</label>
            <select id="asgn-priority">
              <option value="Standard">Standard</option>
              <option value="Rush">Rush</option>
              <option value="Complex">Complex</option>
            </select>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Notes</label>
            <textarea id="asgn-notes" placeholder="Any special instructions or notes..." rows="3"></textarea>
          </div>
        </div>
      </form>
    `;

    const footer = `
      <button class="btn-secondary" onclick="App.closeModal()">Cancel</button>
      <button class="btn-primary" onclick="AssignmentModule.saveCreate()">Create Assignment</button>
    `;

    App.showModal('Create New Assignment', body, footer);

    // Handle client selection toggle
    document.getElementById('asgn-client-id').addEventListener('change', function() {
      const newClientFields = document.getElementById('asgn-new-client-fields');
      if (this.value === '__new__') {
        newClientFields.style.display = 'block';
      } else {
        newClientFields.style.display = 'none';
      }
    });
  },

  /**
   * Save new assignment
   */
  saveCreate() {
    const clientId = document.getElementById('asgn-client-id').value;
    const subjectAddress = document.getElementById('asgn-subject-address').value.trim();

    if (!subjectAddress) {
      App.toast('Subject address is required', 'warning');
      return;
    }

    let finalClientId = clientId;
    let finalClientName = '';

    // Handle new client creation
    if (clientId === '__new__') {
      const newClientName = document.getElementById('asgn-new-client-name').value.trim();
      if (!newClientName) {
        App.toast('Client name is required', 'warning');
        return;
      }

      const newClient = {
        name: newClientName,
        email: document.getElementById('asgn-new-client-email').value.trim(),
        phone: document.getElementById('asgn-new-client-phone').value.trim(),
        type: document.getElementById('asgn-new-client-type').value,
        notes: ''
      };

      const created = DB.add('clients', newClient);
      finalClientId = created.id;
      finalClientName = newClientName;
    } else {
      const client = DB.getById('clients', clientId);
      finalClientId = clientId;
      finalClientName = client ? client.name : '';
    }

    if (!finalClientId) {
      App.toast('Please select or create a client', 'warning');
      return;
    }

    // Create assignment
    const assignment = {
      assignment_number: Util.nextAssignmentNumber(),
      client_id: finalClientId,
      client_name: finalClientName,
      subject_address: subjectAddress,
      city: document.getElementById('asgn-city').value.trim(),
      state: document.getElementById('asgn-state').value.trim() || 'NC',
      zip: document.getElementById('asgn-zip').value.trim(),
      county: document.getElementById('asgn-county').value.trim(),
      neighborhood: document.getElementById('asgn-neighborhood').value.trim(),
      type: document.getElementById('asgn-type').value,
      property_type: document.getElementById('asgn-property-type').value,
      intended_use: document.getElementById('asgn-intended-use').value.trim(),
      fee: parseFloat(document.getElementById('asgn-fee').value) || 0,
      due_date: document.getElementById('asgn-due-date').value,
      priority: document.getElementById('asgn-priority').value,
      notes: document.getElementById('asgn-notes').value.trim(),
      status: 'new'
    };

    DB.add('assignments', assignment);
    App.closeModal();
    App.toast(`Assignment ${assignment.assignment_number} created successfully`, 'success');
    this.render();
  },

  /**
   * Show assignment detail in full-page tabbed workspace view
   */
  showDetail(id) {
    const assignment = DB.getById('assignments', id);
    if (!assignment) {
      App.toast('Assignment not found', 'error');
      return;
    }

    // Set this as the active assignment
    App.setActiveAssignment(id);

    const client = DB.getById('clients', assignment.client_id);
    const statusBadge = Util.statusBadge(assignment.status);
    const pipeline = this.renderPipeline(assignment.status);

    // Subject property details (stored on the assignment)
    const subj = assignment.subject || {};

    // Count related data
    const mlsDatasets = DB.where('mls_imports', m => m.assignment_id === id);
    const comps = DB.where('comparables', c => c.assignment_id === id);
    const adjustments = DB.where('adjustments', a => a.assignment_id === id);
    const auditEntries = DB.where('audit', a => a.assignment_id === id);
    const invoices = DB.where('invoices', i => i.assignment_id === id);
    const mileageEntries = DB.where('mileage', m => m.assignment_id === id);

    const body = `
      <div class="assignment-detail-workspace">
        <div class="detail-top-bar">
          <div>
            <h2>${assignment.assignment_number} — ${assignment.subject_address}</h2>
            <p class="text-muted">${assignment.client_name} · ${assignment.type.replace(/_/g, ' ')} · Due ${Util.formatDate(assignment.due_date)}</p>
          </div>
          <div class="detail-badges">
            ${statusBadge}
            ${assignment.priority === 'Rush' ? '<span class="badge-red">Rush</span>' : ''}
          </div>
        </div>

        <div class="detail-tab-bar">
          <button class="detail-tab active" onclick="AssignmentModule.switchDetailTab('overview')">Overview</button>
          <button class="detail-tab" onclick="AssignmentModule.switchDetailTab('subject')">Subject Property</button>
          <button class="detail-tab" onclick="AssignmentModule.switchDetailTab('mls')">MLS Data <span class="tab-count">${mlsDatasets.length}</span></button>
          <button class="detail-tab" onclick="AssignmentModule.switchDetailTab('comps')">Comps <span class="tab-count">${comps.length}</span></button>
          <button class="detail-tab" onclick="AssignmentModule.switchDetailTab('adjustments')">Adjustments <span class="tab-count">${adjustments.length}</span></button>
          <button class="detail-tab" onclick="AssignmentModule.switchDetailTab('cost')">Cost</button>
          <button class="detail-tab" onclick="AssignmentModule.switchDetailTab('income')">Income</button>
          <button class="detail-tab" onclick="AssignmentModule.switchDetailTab('billing')">Billing</button>
          <button class="detail-tab" onclick="AssignmentModule.switchDetailTab('audit')">Audit <span class="tab-count">${auditEntries.length}</span></button>
        </div>

        <div class="detail-tab-content">
          <!-- OVERVIEW TAB -->
          <div class="dtab-panel active" id="dtab-overview">
            <div class="detail-section">
              <h3>Property Information</h3>
              <div class="info-grid">
                <div class="info-item"><strong>Address</strong><p>${assignment.subject_address}</p></div>
                <div class="info-item"><strong>Location</strong><p>${assignment.city}, ${assignment.state} ${assignment.zip}${assignment.county ? '<br>' + assignment.county : ''}</p></div>
                <div class="info-item"><strong>Property Type</strong><p>${(assignment.property_type || 'N/A').replace(/_/g, ' ')}</p></div>
                <div class="info-item"><strong>Neighborhood</strong><p>${assignment.neighborhood || 'N/A'}</p></div>
              </div>
            </div>

            <div class="detail-section">
              <h3>Assignment Details</h3>
              <div class="info-grid">
                <div class="info-item"><strong>Type</strong><p>${assignment.type.replace(/_/g, ' ')}</p></div>
                <div class="info-item"><strong>Intended Use</strong><p>${assignment.intended_use || 'N/A'}</p></div>
                <div class="info-item"><strong>Fee</strong><p>${Util.currency(assignment.fee)}</p></div>
                <div class="info-item"><strong>Due Date</strong><p>${Util.formatDate(assignment.due_date)}</p></div>
                <div class="info-item"><strong>Priority</strong><p>${assignment.priority}</p></div>
                <div class="info-item"><strong>Created</strong><p>${Util.timeAgo(assignment.created_at)}</p></div>
              </div>
            </div>

            <div class="detail-section">
              <h3>Client Information</h3>
              <div class="info-grid">
                <div class="info-item"><strong>Name</strong><p>${client ? client.name : 'N/A'}</p></div>
                <div class="info-item"><strong>Type</strong><p>${client ? client.type : 'N/A'}</p></div>
                <div class="info-item"><strong>Email</strong><p>${client ? (client.email || 'N/A') : 'N/A'}</p></div>
                <div class="info-item"><strong>Phone</strong><p>${client ? (client.phone || 'N/A') : 'N/A'}</p></div>
              </div>
            </div>

            <div class="detail-section">
              <h3>Status Timeline</h3>
              ${pipeline}
            </div>

            <div class="detail-section">
              <h3>Notes</h3>
              <p>${assignment.notes || '<em>No notes</em>'}</p>
            </div>
          </div>

          <!-- SUBJECT PROPERTY TAB -->
          <div class="dtab-panel" id="dtab-subject">
            <div class="detail-section">
              <h3>Subject Property Details</h3>
              <p class="text-muted" style="margin-bottom:16px;">Enter subject property characteristics. These values are used for comparison in the adjustment engine and cost approach.</p>
              <form id="subject-property-form">
                <div class="form-row">
                  <div class="form-group flex-1">
                    <label>GLA (Above Grade Sq Ft) *</label>
                    <input type="number" id="subj-gla" value="${subj.gla || ''}" placeholder="e.g., 1632">
                  </div>
                  <div class="form-group flex-1">
                    <label>Year Built *</label>
                    <input type="number" id="subj-year-built" value="${subj.year_built || ''}" placeholder="e.g., 1985">
                  </div>
                  <div class="form-group flex-1">
                    <label>Lot Size (Sq Ft)</label>
                    <input type="number" id="subj-lot-sqft" value="${subj.lot_sqft || ''}" placeholder="e.g., 10890">
                  </div>
                  <div class="form-group flex-1">
                    <label>Lot Size (Acres)</label>
                    <input type="number" id="subj-lot-acres" value="${subj.lot_acres || ''}" step="0.01" placeholder="e.g., 0.25">
                  </div>
                </div>
                <div class="form-row">
                  <div class="form-group flex-1">
                    <label>Bedrooms</label>
                    <input type="number" id="subj-bedrooms" value="${subj.bedrooms || ''}" placeholder="3">
                  </div>
                  <div class="form-group flex-1">
                    <label>Full Bathrooms</label>
                    <input type="number" id="subj-full-baths" value="${subj.full_baths || ''}" placeholder="2">
                  </div>
                  <div class="form-group flex-1">
                    <label>Half Bathrooms</label>
                    <input type="number" id="subj-half-baths" value="${subj.half_baths || ''}" placeholder="0">
                  </div>
                  <div class="form-group flex-1">
                    <label>Stories</label>
                    <input type="number" id="subj-stories" value="${subj.stories || ''}" step="0.5" placeholder="1">
                  </div>
                </div>
                <div class="form-row">
                  <div class="form-group flex-1">
                    <label>Garage Spaces</label>
                    <input type="number" id="subj-garage-spaces" value="${subj.garage_spaces || ''}" placeholder="2">
                  </div>
                  <div class="form-group flex-1">
                    <label>Carport Spaces</label>
                    <input type="number" id="subj-carport-spaces" value="${subj.carport_spaces || ''}" placeholder="0">
                  </div>
                  <div class="form-group flex-1">
                    <label>Basement Finished (Sq Ft)</label>
                    <input type="number" id="subj-basement-fin" value="${subj.basement_finished || ''}" placeholder="0">
                  </div>
                  <div class="form-group flex-1">
                    <label>Basement Unfinished (Sq Ft)</label>
                    <input type="number" id="subj-basement-unfin" value="${subj.basement_unfinished || ''}" placeholder="0">
                  </div>
                </div>
                <div class="form-row">
                  <div class="form-group flex-1">
                    <label>Foundation Area (Sq Ft)</label>
                    <input type="number" id="subj-foundation-area" value="${subj.foundation_area || ''}" placeholder="1632">
                  </div>
                  <div class="form-group flex-1">
                    <label>Pool</label>
                    <select id="subj-pool">
                      <option value="N" ${subj.pool !== 'Y' ? 'selected' : ''}>No</option>
                      <option value="Y" ${subj.pool === 'Y' ? 'selected' : ''}>Yes</option>
                    </select>
                  </div>
                  <div class="form-group flex-1">
                    <label>Quality Level (1-5)</label>
                    <input type="number" id="subj-quality" value="${subj.quality || ''}" min="1" max="5" step="0.25" placeholder="3.00">
                  </div>
                  <div class="form-group flex-1">
                    <label>Condition (1-6)</label>
                    <select id="subj-condition">
                      <option value="" ${!subj.condition ? 'selected' : ''}>Select...</option>
                      <option value="C1" ${subj.condition === 'C1' ? 'selected' : ''}>C1 - New</option>
                      <option value="C2" ${subj.condition === 'C2' ? 'selected' : ''}>C2 - Like New</option>
                      <option value="C3" ${subj.condition === 'C3' ? 'selected' : ''}>C3 - Good</option>
                      <option value="C4" ${subj.condition === 'C4' ? 'selected' : ''}>C4 - Average</option>
                      <option value="C5" ${subj.condition === 'C5' ? 'selected' : ''}>C5 - Fair</option>
                      <option value="C6" ${subj.condition === 'C6' ? 'selected' : ''}>C6 - Poor</option>
                    </select>
                  </div>
                </div>
                <div class="form-row">
                  <div class="form-group flex-1">
                    <label>Parcel Number</label>
                    <input type="text" id="subj-parcel" value="${subj.parcel_number || ''}" placeholder="Enter parcel/PIN">
                  </div>
                  <div class="form-group flex-1">
                    <label>Subdivision</label>
                    <input type="text" id="subj-subdivision" value="${subj.subdivision || ''}" placeholder="Enter subdivision name">
                  </div>
                  <div class="form-group flex-1">
                    <label>Tax Annual Amount</label>
                    <input type="number" id="subj-tax" value="${subj.tax_annual || ''}" step="0.01" placeholder="2400.00">
                  </div>
                </div>
                <div class="form-row">
                  <div class="form-group">
                    <label>Property Description / Additional Features</label>
                    <textarea id="subj-description" rows="3" placeholder="Deck, covered patio, renovated kitchen, etc.">${subj.description || ''}</textarea>
                  </div>
                </div>
              </form>
              <button class="btn-primary" onclick="AssignmentModule.saveSubjectProperty('${id}')">Save Subject Details</button>
            </div>
          </div>

          <!-- MLS DATA TAB -->
          <div class="dtab-panel" id="dtab-mls">
            <div class="detail-section">
              <h3>MLS Datasets</h3>
              ${mlsDatasets.length > 0 ? `
                <table class="data-table">
                  <thead><tr><th>Dataset</th><th>Records</th><th>Imported</th><th>Actions</th></tr></thead>
                  <tbody>
                    ${mlsDatasets.map((ds, i) => `
                      <tr>
                        <td><strong>Dataset ${i+1}</strong></td>
                        <td>${ds.record_count || 0} records</td>
                        <td>${Util.formatDate(ds.imported_at)}</td>
                        <td><button class="btn-link">View</button></td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              ` : `
                <div class="empty-state" style="padding:20px;">
                  <div class="empty-icon">📥</div>
                  <p>No MLS data imported for this assignment.</p>
                  <button class="btn-secondary" onclick="App.closeModal(); App.navigateTo('mls-import');">Go to MLS Import</button>
                </div>
              `}
            </div>
          </div>

          <!-- COMPS TAB -->
          <div class="dtab-panel" id="dtab-comps">
            <div class="detail-section">
              <h3>Selected Comparables</h3>
              ${comps.length > 0 ? `
                <table class="data-table">
                  <thead><tr><th>MLS#</th><th>Address</th><th>Price</th><th>GLA</th><th>$/SqFt</th><th>Tag</th></tr></thead>
                  <tbody>
                    ${comps.map(c => `
                      <tr>
                        <td>${c.mls_number || 'N/A'}</td>
                        <td>${c.address || 'N/A'}</td>
                        <td>${Util.currency(c.close_price)}</td>
                        <td>${c.gla ? c.gla.toLocaleString() : 'N/A'}</td>
                        <td>${c.gla && c.close_price ? Util.currency(c.close_price / c.gla) : 'N/A'}</td>
                        <td><span class="badge-blue">${c.tag || 'candidate'}</span></td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              ` : `
                <div class="empty-state" style="padding:20px;">
                  <div class="empty-icon">🏘️</div>
                  <p>No comparables selected yet. Import MLS data first, then tag comps.</p>
                </div>
              `}
            </div>
          </div>

          <!-- ADJUSTMENTS TAB -->
          <div class="dtab-panel" id="dtab-adjustments">
            <div class="detail-section">
              <h3>Adjustment Summary</h3>
              ${adjustments.length > 0 ? `
                <table class="data-table">
                  <thead><tr><th>Feature</th><th>Adjustment</th><th>Range</th><th>Methods Used</th><th>Confidence</th></tr></thead>
                  <tbody>
                    ${adjustments.map(adj => `
                      <tr>
                        <td><strong>${adj.feature}</strong></td>
                        <td>${Util.currency(adj.value)}</td>
                        <td>${Util.currency(adj.range_low)} — ${Util.currency(adj.range_high)}</td>
                        <td>${adj.methods_count || 0} methods</td>
                        <td><span class="badge-${adj.confidence === 'high' ? 'green' : adj.confidence === 'medium' ? 'amber' : 'red'}">${adj.confidence || 'pending'}</span></td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              ` : `
                <div class="empty-state" style="padding:20px;">
                  <div class="empty-icon">⚖️</div>
                  <p>No adjustments calculated yet. Import MLS data and select comparables first.</p>
                </div>
              `}
            </div>
          </div>

          <!-- COST APPROACH TAB -->
          <div class="dtab-panel" id="dtab-cost">
            <div class="detail-section">
              <h3>Cost Approach Summary</h3>
              ${assignment.cost_approach ? `
                <div class="info-grid">
                  <div class="info-item"><strong>Replacement Cost New</strong><p>${Util.currency(assignment.cost_approach.rcn)}</p></div>
                  <div class="info-item"><strong>Depreciation</strong><p>${Util.currency(assignment.cost_approach.depreciation)}</p></div>
                  <div class="info-item"><strong>Land Value</strong><p>${Util.currency(assignment.cost_approach.land_value)}</p></div>
                  <div class="info-item"><strong>Indicated Value</strong><p>${Util.currency(assignment.cost_approach.indicated_value)}</p></div>
                </div>
              ` : `
                <div class="empty-state" style="padding:20px;">
                  <div class="empty-icon">🏗️</div>
                  <p>Cost approach not yet completed. Enter DwellingCost data in the Cost Approach section.</p>
                  <button class="btn-secondary" onclick="App.closeModal(); App.navigateTo('cost-approach');">Go to Cost Approach</button>
                </div>
              `}
            </div>
          </div>

          <!-- INCOME APPROACH TAB -->
          <div class="dtab-panel" id="dtab-income">
            <div class="detail-section">
              <h3>Income Approach Summary</h3>
              ${assignment.income_approach ? `
                <div class="info-grid">
                  <div class="info-item"><strong>Monthly Rent</strong><p>${Util.currency(assignment.income_approach.monthly_rent)}</p></div>
                  <div class="info-item"><strong>GRM</strong><p>${assignment.income_approach.grm || 'N/A'}</p></div>
                  <div class="info-item"><strong>Indicated Value</strong><p>${Util.currency(assignment.income_approach.indicated_value)}</p></div>
                </div>
              ` : `
                <div class="empty-state" style="padding:20px;">
                  <div class="empty-icon">💰</div>
                  <p>Income approach not applicable or not yet completed.</p>
                  <button class="btn-secondary" onclick="App.closeModal(); App.navigateTo('income-approach');">Go to Income Approach</button>
                </div>
              `}
            </div>
          </div>

          <!-- BILLING TAB -->
          <div class="dtab-panel" id="dtab-billing">
            <div class="detail-section">
              <h3>Invoices & Mileage</h3>
              <div class="detail-subsection">
                <h4>Invoices</h4>
                ${invoices.length > 0 ? `
                  <table class="data-table">
                    <thead><tr><th>Invoice #</th><th>Amount</th><th>Status</th><th>Due</th></tr></thead>
                    <tbody>
                      ${invoices.map(inv => `
                        <tr>
                          <td>${inv.invoice_number}</td>
                          <td>${Util.currency(inv.amount)}</td>
                          <td><span class="badge-${inv.status === 'paid' ? 'green' : 'amber'}">${inv.status}</span></td>
                          <td>${Util.formatDate(inv.due_date)}</td>
                        </tr>
                      `).join('')}
                    </tbody>
                  </table>
                ` : '<p class="text-muted">No invoices created for this assignment.</p>'}
              </div>
              <div class="detail-subsection" style="margin-top:20px;">
                <h4>Mileage</h4>
                ${mileageEntries.length > 0 ? `
                  <table class="data-table">
                    <thead><tr><th>Date</th><th>Miles</th><th>Deduction</th><th>Notes</th></tr></thead>
                    <tbody>
                      ${mileageEntries.map(m => `
                        <tr>
                          <td>${Util.formatDate(m.date)}</td>
                          <td>${m.total_miles}</td>
                          <td>${Util.currency(m.deduction)}</td>
                          <td>${m.notes || ''}</td>
                        </tr>
                      `).join('')}
                    </tbody>
                  </table>
                ` : '<p class="text-muted">No mileage logged for this assignment.</p>'}
              </div>
            </div>
          </div>

          <!-- AUDIT TAB -->
          <div class="dtab-panel" id="dtab-audit">
            <div class="detail-section">
              <h3>Audit Trail</h3>
              ${auditEntries.length > 0 ? `
                <table class="data-table">
                  <thead><tr><th>Timestamp</th><th>Action</th><th>Entity</th><th>Details</th></tr></thead>
                  <tbody>
                    ${auditEntries.slice(0, 50).map(a => `
                      <tr>
                        <td>${Util.formatDate(a.timestamp)} ${new Date(a.timestamp).toLocaleTimeString()}</td>
                        <td><span class="badge-blue">${a.action}</span></td>
                        <td>${a.entity || ''}</td>
                        <td>${a.details || ''}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              ` : `
                <div class="empty-state" style="padding:20px;">
                  <div class="empty-icon">🔒</div>
                  <p>Audit trail will populate as actions are taken on this assignment.</p>
                </div>
              `}
            </div>
          </div>
        </div>
      </div>
    `;

    const footer = `
      <button class="btn-secondary" onclick="App.closeModal()">Close</button>
      <button class="btn-secondary" onclick="AssignmentModule.showEdit('${id}')">Edit Assignment</button>
      <button class="btn-primary" onclick="AssignmentModule.advanceStatus('${id}')">Advance Status →</button>
    `;

    App.showModal(`Assignment ${assignment.assignment_number}`, body, footer);
  },

  /**
   * Switch between tabs in the assignment detail view
   */
  switchDetailTab(tabName) {
    // Deactivate all tabs and panels
    document.querySelectorAll('.detail-tab-bar .detail-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.dtab-panel').forEach(p => p.classList.remove('active'));

    // Activate selected tab and panel
    const panel = document.getElementById(`dtab-${tabName}`);
    if (panel) panel.classList.add('active');

    // Find and activate the button
    const buttons = document.querySelectorAll('.detail-tab-bar .detail-tab');
    buttons.forEach(btn => {
      if (btn.textContent.toLowerCase().includes(tabName.replace('-', ' ')) ||
          btn.getAttribute('onclick')?.includes(`'${tabName}'`)) {
        btn.classList.add('active');
      }
    });
  },

  /**
   * Save subject property details to assignment
   */
  saveSubjectProperty(id) {
    const subject = {
      gla: parseInt(document.getElementById('subj-gla').value) || null,
      year_built: parseInt(document.getElementById('subj-year-built').value) || null,
      lot_sqft: parseInt(document.getElementById('subj-lot-sqft').value) || null,
      lot_acres: parseFloat(document.getElementById('subj-lot-acres').value) || null,
      bedrooms: parseInt(document.getElementById('subj-bedrooms').value) || null,
      full_baths: parseInt(document.getElementById('subj-full-baths').value) || null,
      half_baths: parseInt(document.getElementById('subj-half-baths').value) || null,
      stories: parseFloat(document.getElementById('subj-stories').value) || null,
      garage_spaces: parseInt(document.getElementById('subj-garage-spaces').value) || null,
      carport_spaces: parseInt(document.getElementById('subj-carport-spaces').value) || null,
      basement_finished: parseInt(document.getElementById('subj-basement-fin').value) || null,
      basement_unfinished: parseInt(document.getElementById('subj-basement-unfin').value) || null,
      foundation_area: parseInt(document.getElementById('subj-foundation-area').value) || null,
      pool: document.getElementById('subj-pool').value,
      quality: parseFloat(document.getElementById('subj-quality').value) || null,
      condition: document.getElementById('subj-condition').value,
      parcel_number: document.getElementById('subj-parcel').value.trim(),
      subdivision: document.getElementById('subj-subdivision').value.trim(),
      tax_annual: parseFloat(document.getElementById('subj-tax').value) || null,
      description: document.getElementById('subj-description').value.trim()
    };

    DB.update('assignments', id, { subject: subject });
    App.toast('Subject property details saved', 'success');
  },

  /**
   * Show edit assignment modal
   */
  showEdit(id) {
    const assignment = DB.getById('assignments', id);
    if (!assignment) {
      App.toast('Assignment not found', 'error');
      return;
    }

    const clients = DB.getAll('clients');
    const clientOptions = clients.map(c =>
      `<option value="${c.id}" ${c.id === assignment.client_id ? 'selected' : ''}>${c.name}</option>`
    ).join('');

    const body = `
      <form id="assignment-edit-form">
        <div class="form-row">
          <div class="form-group">
            <label>Client *</label>
            <select id="asgn-client-id" required>
              <option value="">Select a client...</option>
              ${clientOptions}
            </select>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Subject Address *</label>
            <input type="text" id="asgn-subject-address" value="${assignment.subject_address}" required>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group flex-1">
            <label>City *</label>
            <input type="text" id="asgn-city" value="${assignment.city}" required>
          </div>
          <div class="form-group flex-1">
            <label>State *</label>
            <input type="text" id="asgn-state" value="${assignment.state}" required>
          </div>
          <div class="form-group flex-1">
            <label>Zip *</label>
            <input type="text" id="asgn-zip" value="${assignment.zip}" required>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group flex-1">
            <label>County</label>
            <input type="text" id="asgn-county" value="${assignment.county || ''}">
          </div>
          <div class="form-group flex-1">
            <label>Neighborhood/Subdivision</label>
            <input type="text" id="asgn-neighborhood" value="${assignment.neighborhood || ''}">
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Assignment Type *</label>
            <select id="asgn-type" required>
              <option value="current_value" ${assignment.type === 'current_value' ? 'selected' : ''}>Current Value</option>
              <option value="divorce" ${assignment.type === 'divorce' ? 'selected' : ''}>Divorce</option>
              <option value="estate" ${assignment.type === 'estate' ? 'selected' : ''}>Estate</option>
              <option value="retrospective" ${assignment.type === 'retrospective' ? 'selected' : ''}>Retrospective</option>
              <option value="new_construction" ${assignment.type === 'new_construction' ? 'selected' : ''}>New Construction</option>
              <option value="fha" ${assignment.type === 'fha' ? 'selected' : ''}>FHA</option>
              <option value="green_home" ${assignment.type === 'green_home' ? 'selected' : ''}>Green Home</option>
              <option value="mass_appraisal" ${assignment.type === 'mass_appraisal' ? 'selected' : ''}>Mass Appraisal</option>
              <option value="other" ${assignment.type === 'other' ? 'selected' : ''}>Other</option>
            </select>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Property Type *</label>
            <select id="asgn-property-type" required>
              <option value="single_family" ${assignment.property_type === 'single_family' ? 'selected' : ''}>Single Family</option>
              <option value="condo" ${assignment.property_type === 'condo' ? 'selected' : ''}>Condo</option>
              <option value="multi_family" ${assignment.property_type === 'multi_family' ? 'selected' : ''}>Multi-Family</option>
              <option value="manufactured" ${assignment.property_type === 'manufactured' ? 'selected' : ''}>Manufactured</option>
              <option value="vacant_land" ${assignment.property_type === 'vacant_land' ? 'selected' : ''}>Vacant Land</option>
              <option value="other" ${assignment.property_type === 'other' ? 'selected' : ''}>Other</option>
            </select>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Intended Use</label>
            <input type="text" id="asgn-intended-use" value="${assignment.intended_use}" placeholder="Purpose of appraisal">
          </div>
        </div>

        <div class="form-row">
          <div class="form-group flex-1">
            <label>Fee *</label>
            <input type="number" id="asgn-fee" min="0" step="0.01" value="${assignment.fee}" required>
          </div>
          <div class="form-group flex-1">
            <label>Due Date *</label>
            <input type="date" id="asgn-due-date" value="${assignment.due_date}" required>
          </div>
          <div class="form-group flex-1">
            <label>Priority</label>
            <select id="asgn-priority">
              <option value="Standard" ${assignment.priority === 'Standard' ? 'selected' : ''}>Standard</option>
              <option value="Rush" ${assignment.priority === 'Rush' ? 'selected' : ''}>Rush</option>
              <option value="Complex" ${assignment.priority === 'Complex' ? 'selected' : ''}>Complex</option>
            </select>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Notes</label>
            <textarea id="asgn-notes" rows="3">${assignment.notes || ''}</textarea>
          </div>
        </div>
      </form>
    `;

    const footer = `
      <button class="btn-secondary" onclick="App.closeModal()">Cancel</button>
      <button class="btn-primary" onclick="AssignmentModule.saveEdit('${id}')">Save Changes</button>
    `;

    App.showModal(`Edit Assignment ${assignment.assignment_number}`, body, footer);
  },

  /**
   * Save assignment edits
   */
  saveEdit(id) {
    const clientId = document.getElementById('asgn-client-id').value;
    const subjectAddress = document.getElementById('asgn-subject-address').value.trim();

    if (!subjectAddress || !clientId) {
      App.toast('Subject address and client are required', 'warning');
      return;
    }

    const client = DB.getById('clients', clientId);

    const updates = {
      client_id: clientId,
      client_name: client ? client.name : '',
      subject_address: subjectAddress,
      city: document.getElementById('asgn-city').value.trim(),
      state: document.getElementById('asgn-state').value.trim(),
      zip: document.getElementById('asgn-zip').value.trim(),
      county: document.getElementById('asgn-county').value.trim(),
      neighborhood: document.getElementById('asgn-neighborhood').value.trim(),
      type: document.getElementById('asgn-type').value,
      property_type: document.getElementById('asgn-property-type').value,
      intended_use: document.getElementById('asgn-intended-use').value.trim(),
      fee: parseFloat(document.getElementById('asgn-fee').value) || 0,
      due_date: document.getElementById('asgn-due-date').value,
      priority: document.getElementById('asgn-priority').value,
      notes: document.getElementById('asgn-notes').value.trim()
    };

    DB.update('assignments', id, updates);
    App.closeModal();
    App.toast('Assignment updated successfully', 'success');
    this.render();
  },

  /**
   * Advance assignment to next status in pipeline
   */
  advanceStatus(id) {
    const assignment = DB.getById('assignments', id);
    if (!assignment) {
      App.toast('Assignment not found', 'error');
      return;
    }

    const statuses = [
      'new', 'accepted', 'scheduled', 'inspected', 'in_review',
      'report_complete', 'awaiting_payment', 'delivered'
    ];

    const currentIndex = statuses.indexOf(assignment.status);
    if (currentIndex === -1 || currentIndex >= statuses.length - 1) {
      App.toast('Assignment is already at final status', 'warning');
      return;
    }

    const nextStatus = statuses[currentIndex + 1];
    DB.update('assignments', id, { status: nextStatus });
    App.toast(`Assignment moved to ${nextStatus.replace(/_/g, ' ')}`, 'success');
    this.render();
    this.showDetail(id);
  },

  /**
   * Delete assignment with confirmation
   */
  deleteAssignment(id) {
    const assignment = DB.getById('assignments', id);
    if (!assignment) {
      App.toast('Assignment not found', 'error');
      return;
    }

    // Count related records
    const relatedInvoices = DB.where('invoices', i => i.assignment_id === id);
    const relatedReports = DB.where('reports', r => r.assignment_id === id);
    const relatedMileage = DB.where('mileage', m => m.assignment_id === id);
    const relatedMLS = DB.where('mls_imports', m => m.assignment_id === id);
    const relatedComps = DB.where('comparables', c => c.assignment_id === id);
    const totalRelated = relatedInvoices.length + relatedReports.length + relatedMileage.length + relatedMLS.length + relatedComps.length;

    let confirmMsg = `Are you sure you want to delete assignment ${assignment.assignment_number}?`;
    if (totalRelated > 0) {
      confirmMsg += `\n\nThis will also delete ${totalRelated} related record(s):`;
      if (relatedInvoices.length) confirmMsg += `\n  - ${relatedInvoices.length} invoice(s)`;
      if (relatedReports.length) confirmMsg += `\n  - ${relatedReports.length} report(s)`;
      if (relatedMileage.length) confirmMsg += `\n  - ${relatedMileage.length} mileage trip(s)`;
      if (relatedMLS.length) confirmMsg += `\n  - ${relatedMLS.length} MLS dataset(s)`;
      if (relatedComps.length) confirmMsg += `\n  - ${relatedComps.length} comparable(s)`;
    }
    confirmMsg += '\n\nThis cannot be undone.';

    if (!confirm(confirmMsg)) return;

    // Cascade delete related records
    relatedInvoices.forEach(i => DB.remove('invoices', i.id));
    relatedReports.forEach(r => DB.remove('reports', r.id));
    relatedMileage.forEach(m => DB.remove('mileage', m.id));
    relatedMLS.forEach(m => DB.remove('mls_imports', m.id));
    relatedComps.forEach(c => DB.remove('comparables', c.id));

    // Also cascade: market_analyses, adjustments, cost/income approaches, comments
    ['market_analyses', 'adjustments', 'cost_approaches', 'income_approaches', 'comments'].forEach(col => {
      DB.where(col, item => item.assignment_id === id).forEach(item => DB.remove(col, item.id));
    });

    DB.remove('assignments', id);
    App.toast(`Assignment ${assignment.assignment_number} and ${totalRelated} related records deleted`, 'success');
    this.render();
  },

  /**
   * Schedule inspection via Google Calendar
   */
  scheduleInspection(id) {
    const assignment = DB.getById('assignments', id);
    if (!assignment) return;

    const client = DB.getById('clients', assignment.client_id);
    const clientName = client ? client.name : assignment.client_name || '';

    Util.openGoogleCalendar({
      title: `Inspection: ${assignment.assignment_number} — ${assignment.subject_address}`,
      location: `${assignment.subject_address}, ${assignment.city}, ${assignment.state} ${assignment.zip}`,
      description: [
        `Assignment: ${assignment.assignment_number}`,
        `Client: ${clientName}`,
        `Type: ${assignment.type.replace(/_/g, ' ')}`,
        `Fee: ${Util.currency(assignment.fee)}`,
        `Due: ${Util.formatDate(assignment.due_date)}`,
        `Priority: ${assignment.priority}`,
        '',
        'Designer Homes Real Estate Services',
        'Keith Manning Jr., Certified Residential Appraiser'
      ].join('\n')
    });
  }
};

// ============================================================================
// CLIENT MODULE - Fully Built (Phase 1 Priority)
// ============================================================================

const ClientModule = {
  /**
   * Render client table
   */
  render() {
    let clients = DB.getAll('clients');

    // Sort alphabetically by name
    clients.sort((a, b) => a.name.localeCompare(b.name));

    const tbody = document.getElementById('clients-tbody');
    if (clients.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 40px;">No clients yet. Add one to get started.</td></tr>';
      return;
    }

    tbody.innerHTML = clients.map(client => {
      const assignmentCount = DB.count('assignments', a => a.client_id === client.id);
      const typeLabel = client.type.replace(/_/g, ' ').charAt(0).toUpperCase() +
                       client.type.replace(/_/g, ' ').slice(1);

      return `
        <tr>
          <td><strong><a href="#" onclick="ClientModule.showDetail('${client.id}'); return false;">${client.name}</a></strong></td>
          <td>${client.email || '-'}</td>
          <td>${client.phone || '-'}</td>
          <td><span class="badge-blue">${typeLabel}</span></td>
          <td>${assignmentCount}</td>
          <td>
            <button class="btn-link" onclick="ClientModule.showEdit('${client.id}')">Edit</button>
            <button class="btn-link btn-danger" onclick="ClientModule.deleteClient('${client.id}')">Delete</button>
          </td>
        </tr>
      `;
    }).join('');
  },

  /**
   * Show add client modal
   */
  showAdd() {
    const body = `
      <form id="client-add-form">
        <div class="form-row">
          <div class="form-group flex-1">
            <label>Name *</label>
            <input type="text" id="client-name" placeholder="e.g., Smith & Associates" required>
          </div>
          <div class="form-group flex-1">
            <label>Type *</label>
            <select id="client-type" required>
              <option value="">Select type...</option>
              <option value="attorney">Attorney</option>
              <option value="homeowner">Homeowner</option>
              <option value="estate_rep">Estate Rep</option>
              <option value="cpa">CPA</option>
              <option value="lender">Lender</option>
              <option value="investor">Investor</option>
              <option value="developer">Developer</option>
              <option value="government">Government</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group flex-1">
            <label>Email</label>
            <input type="email" id="client-email" placeholder="email@example.com">
          </div>
          <div class="form-group flex-1">
            <label>Phone</label>
            <input type="tel" id="client-phone" placeholder="(919) 555-0000">
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Company</label>
            <input type="text" id="client-company" placeholder="e.g., Smith Law Firm">
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Notes</label>
            <textarea id="client-notes" placeholder="Additional information..." rows="3"></textarea>
          </div>
        </div>
      </form>
    `;

    const footer = `
      <button class="btn-secondary" onclick="App.closeModal()">Cancel</button>
      <button class="btn-primary" onclick="ClientModule.saveClient()">Save Client</button>
    `;

    App.showModal('Add New Client', body, footer);
  },

  /**
   * Save new client
   */
  saveClient() {
    const name = document.getElementById('client-name').value.trim();
    const type = document.getElementById('client-type').value;

    if (!name || !type) {
      App.toast('Name and type are required', 'warning');
      return;
    }

    const client = {
      name: name,
      type: type,
      email: document.getElementById('client-email').value.trim(),
      phone: document.getElementById('client-phone').value.trim(),
      company: document.getElementById('client-company').value.trim(),
      notes: document.getElementById('client-notes').value.trim()
    };

    DB.add('clients', client);
    App.closeModal();
    App.toast(`Client ${name} added successfully`, 'success');
    this.render();
  },

  /**
   * Show client detail view
   */
  showDetail(id) {
    const client = DB.getById('clients', id);
    if (!client) {
      App.toast('Client not found', 'error');
      return;
    }

    const assignments = DB.where('assignments', a => a.client_id === id);
    const typeLabel = client.type.replace(/_/g, ' ').charAt(0).toUpperCase() +
                     client.type.replace(/_/g, ' ').slice(1);

    let assignmentsList = '';
    if (assignments.length > 0) {
      assignmentsList = '<div class="assignment-list" style="margin-top: 10px;">';
      assignments.forEach(a => {
        assignmentsList += `
          <div class="assignment-item" style="padding: 8px; border-left: 3px solid #3b82f6; margin-bottom: 5px;">
            <strong>${a.assignment_number}</strong> - ${a.subject_address}
            <br><small>${a.city}, ${a.state} | Fee: ${Util.currency(a.fee)}</small>
          </div>
        `;
      });
      assignmentsList += '</div>';
    } else {
      assignmentsList = '<p style="color: #999; margin-top: 10px;">No assignments linked to this client</p>';
    }

    const body = `
      <div class="detail-content">
        <h3>${client.name}</h3>
        <div class="info-grid">
          <div class="info-item">
            <strong>Type</strong>
            <p><span class="badge-blue">${typeLabel}</span></p>
          </div>
          <div class="info-item">
            <strong>Email</strong>
            <p>${client.email || 'Not provided'}</p>
          </div>
          <div class="info-item">
            <strong>Phone</strong>
            <p>${client.phone || 'Not provided'}</p>
          </div>
          <div class="info-item">
            <strong>Company</strong>
            <p>${client.company || 'Not provided'}</p>
          </div>
        </div>

        <div style="margin-top: 20px;">
          <h4>Linked Assignments (${assignments.length})</h4>
          ${assignmentsList}
        </div>

        ${client.notes ? `<div style="margin-top: 20px;"><strong>Notes:</strong><p>${client.notes}</p></div>` : ''}
      </div>
    `;

    const footer = `
      <button class="btn-secondary" onclick="App.closeModal()">Close</button>
      <button class="btn-secondary" onclick="ClientModule.showEdit('${id}')">Edit</button>
    `;

    App.showModal(`Client: ${client.name}`, body, footer);
  },

  /**
   * Show edit client modal
   */
  showEdit(id) {
    const client = DB.getById('clients', id);
    if (!client) {
      App.toast('Client not found', 'error');
      return;
    }

    const body = `
      <form id="client-edit-form">
        <div class="form-row">
          <div class="form-group flex-1">
            <label>Name *</label>
            <input type="text" id="client-name" value="${client.name}" required>
          </div>
          <div class="form-group flex-1">
            <label>Type *</label>
            <select id="client-type" required>
              <option value="attorney" ${client.type === 'attorney' ? 'selected' : ''}>Attorney</option>
              <option value="homeowner" ${client.type === 'homeowner' ? 'selected' : ''}>Homeowner</option>
              <option value="estate_rep" ${client.type === 'estate_rep' ? 'selected' : ''}>Estate Rep</option>
              <option value="cpa" ${client.type === 'cpa' ? 'selected' : ''}>CPA</option>
              <option value="lender" ${client.type === 'lender' ? 'selected' : ''}>Lender</option>
              <option value="investor" ${client.type === 'investor' ? 'selected' : ''}>Investor</option>
              <option value="developer" ${client.type === 'developer' ? 'selected' : ''}>Developer</option>
              <option value="government" ${client.type === 'government' ? 'selected' : ''}>Government</option>
              <option value="other" ${client.type === 'other' ? 'selected' : ''}>Other</option>
            </select>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group flex-1">
            <label>Email</label>
            <input type="email" id="client-email" value="${client.email || ''}">
          </div>
          <div class="form-group flex-1">
            <label>Phone</label>
            <input type="tel" id="client-phone" value="${client.phone || ''}">
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Company</label>
            <input type="text" id="client-company" value="${client.company || ''}">
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Notes</label>
            <textarea id="client-notes" rows="3">${client.notes || ''}</textarea>
          </div>
        </div>
      </form>
    `;

    const footer = `
      <button class="btn-secondary" onclick="App.closeModal()">Cancel</button>
      <button class="btn-primary" onclick="ClientModule.saveEdit('${id}')">Save Changes</button>
    `;

    App.showModal(`Edit Client: ${client.name}`, body, footer);
  },

  /**
   * Save client edits
   */
  saveEdit(id) {
    const name = document.getElementById('client-name').value.trim();
    const type = document.getElementById('client-type').value;

    if (!name || !type) {
      App.toast('Name and type are required', 'warning');
      return;
    }

    const updates = {
      name: name,
      type: type,
      email: document.getElementById('client-email').value.trim(),
      phone: document.getElementById('client-phone').value.trim(),
      company: document.getElementById('client-company').value.trim(),
      notes: document.getElementById('client-notes').value.trim()
    };

    DB.update('clients', id, updates);
    App.closeModal();
    App.toast('Client updated successfully', 'success');
    this.render();
  },

  /**
   * Delete client with confirmation
   */
  deleteClient(id) {
    const client = DB.getById('clients', id);
    if (!client) {
      App.toast('Client not found', 'error');
      return;
    }

    const linkedAssignments = DB.where('assignments', a => a.client_id === id);

    let confirmMsg = `Are you sure you want to delete client ${client.name}?`;
    if (linkedAssignments.length > 0) {
      confirmMsg += `\n\nThis client has ${linkedAssignments.length} linked assignment(s). Deleting this client will NOT delete those assignments, but they will become unlinked.`;
    }
    confirmMsg += '\n\nThis cannot be undone.';

    if (!confirm(confirmMsg)) return;

    // Unlink assignments from this client (set client_id to null)
    linkedAssignments.forEach(a => {
      DB.update('assignments', a.id, { client_id: null, client_name: client.name + ' (deleted)' });
    });

    DB.remove('clients', id);
    App.toast(`Client ${client.name} deleted`, 'success');
    this.render();
  }
};

// ============================================================================
// MILEAGE MODULE - Functional (Phase 9 detail)
// ============================================================================

const MileageModule = {
  /**
   * Render mileage table with summary
   */
  render() {
    const period = document.getElementById('mileage-period').value;
    let entries = DB.getAll('mileage');

    // Filter by period
    entries = this.filterByPeriod(entries, period);

    // Sort by date descending
    entries.sort((a, b) => new Date(b.trip_date) - new Date(a.trip_date));

    // Calculate summary
    const totalMiles = entries.reduce((sum, e) => sum + (e.miles || 0), 0);
    const totalDeduction = entries.reduce((sum, e) => sum + (e.deduction || 0), 0);
    const tripCount = entries.length;
    const avgMiles = tripCount > 0 ? (totalMiles / tripCount).toFixed(1) : 0;

    // Update summary cards
    document.querySelector('#mileage-summary .metric-card:nth-child(1) .metric-value').textContent = totalMiles;
    document.querySelector('#mileage-summary .metric-card:nth-child(2) .metric-value').textContent = Util.currency(totalDeduction);
    document.querySelector('#mileage-summary .metric-card:nth-child(3) .metric-value').textContent = tripCount;
    document.querySelector('#mileage-summary .metric-card:nth-child(4) .metric-value').textContent = avgMiles;

    // Render table
    const tbody = document.getElementById('mileage-tbody');
    if (entries.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding: 20px;">No mileage records for this period</td></tr>';
      return;
    }

    tbody.innerHTML = entries.map(entry => {
      const assignment = DB.getById('assignments', entry.assignment_id);
      return `
        <tr>
          <td>${Util.formatDate(entry.trip_date)}</td>
          <td>${assignment ? assignment.assignment_number : 'N/A'}</td>
          <td>${entry.subject_address}</td>
          <td>${entry.stops_visited || 0}</td>
          <td>${entry.miles}</td>
          <td>${Util.currency(entry.deduction)}</td>
          <td>${entry.notes || '-'}</td>
          <td>
            <button class="btn-link" onclick="MileageModule.editTrip('${entry.id}')">Edit</button>
            <button class="btn-link btn-danger" onclick="MileageModule.deleteTrip('${entry.id}')">Delete</button>
          </td>
        </tr>
      `;
    }).join('');
  },

  /**
   * Show trip logging modal
   */
  showLog(assignmentId = null) {
    const assignments = DB.getAll('assignments');
    const assignmentOptions = assignments.map(a =>
      `<option value="${a.id}" ${a.id === assignmentId ? 'selected' : ''}>${a.assignment_number} - ${a.subject_address}</option>`
    ).join('');

    const settings = SettingsModule.getSettings();
    const today = new Date().toISOString().split('T')[0];

    const body = `
      <form id="mileage-log-form">
        <div class="form-row">
          <div class="form-group">
            <label>Assignment *</label>
            <select id="mileage-assignment-id" ${assignmentId ? 'disabled' : 'required'}>
              <option value="">Select assignment...</option>
              ${assignmentOptions}
            </select>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group flex-1">
            <label>Trip Date *</label>
            <input type="date" id="mileage-trip-date" value="${today}" required>
          </div>
          <div class="form-group flex-1">
            <label>Start Location</label>
            <input type="text" id="mileage-start-location" value="${settings.startLocation || 'Durham, NC'}" placeholder="e.g., Office">
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Subject Address *</label>
            <input type="text" id="mileage-subject-address" placeholder="Subject property address" required>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Comparable Addresses</label>
            <div id="mileage-comps-list" style="margin-top: 10px;">
              <div class="comp-row" style="display: flex; gap: 10px; margin-bottom: 8px;">
                <input type="text" class="comp-address" placeholder="Comp address" style="flex: 1;">
                <label><input type="checkbox" class="comp-visited"> Visited</label>
                <button type="button" class="btn-sm btn-link" onclick="this.parentElement.remove()">Remove</button>
              </div>
            </div>
            <button type="button" class="btn-sm btn-secondary" onclick="MileageModule.addCompRow()">+ Add Comp</button>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group flex-1">
            <label>Estimated Miles</label>
            <input type="number" id="mileage-estimated" readonly placeholder="Auto-calculated">
          </div>
          <div class="form-group flex-1">
            <label><input type="checkbox" id="mileage-manual-override"> Manual Override</label>
          </div>
        </div>

        <div class="form-row" id="mileage-manual-input" style="display:none;">
          <div class="form-group flex-1">
            <label>Manual Miles *</label>
            <input type="number" id="mileage-miles" min="0" step="0.1" placeholder="Enter miles manually">
          </div>
        </div>

        <div class="form-row" id="mileage-auto-calc">
          <div class="form-group flex-1">
            <label>IRS Rate (per mile)</label>
            <input type="number" id="mileage-irs-rate" value="${settings.irsRate}" readonly>
          </div>
          <div class="form-group flex-1">
            <label>Tax Deduction</label>
            <input type="text" id="mileage-deduction" readonly placeholder="Calculated automatically">
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Notes</label>
            <textarea id="mileage-notes" placeholder="Trip details..." rows="2"></textarea>
          </div>
        </div>
      </form>
    `;

    const footer = `
      <button class="btn-secondary" onclick="App.closeModal()">Cancel</button>
      <button class="btn-primary" onclick="MileageModule.saveTrip()">Save Trip</button>
    `;

    App.showModal('Log Mileage Trip', body, footer);

    // Handle manual override checkbox
    document.getElementById('mileage-manual-override').addEventListener('change', function() {
      document.getElementById('mileage-manual-input').style.display = this.checked ? 'flex' : 'none';
      document.getElementById('mileage-auto-calc').style.display = this.checked ? 'none' : 'flex';
      MileageModule.recalcMileage();
    });

    // Auto-calculate on comp count change
    document.getElementById('mileage-comps-list').addEventListener('change', () => MileageModule.recalcMileage());
    document.getElementById('mileage-miles').addEventListener('input', () => MileageModule.recalcMileage());
  },

  /**
   * Add a comp address row
   */
  addCompRow() {
    const list = document.getElementById('mileage-comps-list');
    const row = document.createElement('div');
    row.className = 'comp-row';
    row.style.cssText = 'display: flex; gap: 10px; margin-bottom: 8px;';
    row.innerHTML = `
      <input type="text" class="comp-address" placeholder="Comp address" style="flex: 1;">
      <label><input type="checkbox" class="comp-visited"> Visited</label>
      <button type="button" class="btn-sm btn-link" onclick="this.parentElement.remove(); MileageModule.recalcMileage()">Remove</button>
    `;
    list.appendChild(row);
  },

  /**
   * Recalculate mileage based on manual override or comp count
   */
  recalcMileage() {
    const manualOverride = document.getElementById('mileage-manual-override').checked;

    if (manualOverride) {
      const miles = parseFloat(document.getElementById('mileage-miles').value) || 0;
      const irsRate = parseFloat(document.getElementById('mileage-irs-rate').value) || 0.70;
      const deduction = (miles * irsRate).toFixed(2);
      document.getElementById('mileage-deduction').value = Util.currency(deduction);
    } else {
      const comps = document.querySelectorAll('#mileage-comps-list .comp-visited:checked');
      const stopsVisited = comps.length;
      const miles = Util.estimateMileage(stopsVisited);
      const irsRate = parseFloat(document.getElementById('mileage-irs-rate').value) || 0.70;
      const deduction = (miles * irsRate).toFixed(2);

      document.getElementById('mileage-estimated').value = miles;
      document.getElementById('mileage-deduction').value = Util.currency(deduction);
    }
  },

  /**
   * Save trip to DB
   */
  saveTrip() {
    const assignmentId = document.getElementById('mileage-assignment-id').value;
    const subjectAddress = document.getElementById('mileage-subject-address').value.trim();

    if (!assignmentId || !subjectAddress) {
      App.toast('Assignment and subject address are required', 'warning');
      return;
    }

    const manualOverride = document.getElementById('mileage-manual-override').checked;
    let miles;

    if (manualOverride) {
      miles = parseFloat(document.getElementById('mileage-miles').value);
      if (isNaN(miles) || miles <= 0) {
        App.toast('Please enter valid mileage', 'warning');
        return;
      }
    } else {
      miles = parseFloat(document.getElementById('mileage-estimated').value);
    }

    const irsRate = parseFloat(document.getElementById('mileage-irs-rate').value) || 0.70;
    const deduction = miles * irsRate;

    const trip = {
      assignment_id: assignmentId,
      trip_date: document.getElementById('mileage-trip-date').value,
      start_location: document.getElementById('mileage-start-location').value.trim(),
      subject_address: subjectAddress,
      stops_visited: document.querySelectorAll('#mileage-comps-list .comp-visited:checked').length,
      miles: miles,
      irs_rate: irsRate,
      deduction: deduction,
      notes: document.getElementById('mileage-notes').value.trim()
    };

    DB.add('mileage', trip);
    App.closeModal();
    App.toast('Trip logged successfully', 'success');
    this.render();
  },

  /**
   * Edit existing trip
   */
  editTrip(id) {
    const trip = DB.getById('mileage', id);
    if (!trip) {
      App.toast('Trip not found', 'error');
      return;
    }

    const assignments = DB.getAll('assignments');
    const assignmentOptions = assignments.map(a =>
      `<option value="${a.id}" ${a.id === trip.assignment_id ? 'selected' : ''}>${a.assignment_number} - ${a.subject_address}</option>`
    ).join('');

    const body = `
      <form id="mileage-edit-form">
        <div class="form-row">
          <div class="form-group flex-1">
            <label>Trip Date *</label>
            <input type="date" id="mileage-trip-date" value="${trip.trip_date}" required>
          </div>
          <div class="form-group flex-1">
            <label>Assignment</label>
            <select id="mileage-assignment-id" disabled>
              <option value="${trip.assignment_id}">${DB.getById('assignments', trip.assignment_id)?.assignment_number || 'N/A'}</option>
            </select>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Subject Address</label>
            <input type="text" id="mileage-subject-address" value="${trip.subject_address}">
          </div>
        </div>

        <div class="form-row">
          <div class="form-group flex-1">
            <label>Miles</label>
            <input type="number" id="mileage-miles" value="${trip.miles}" min="0" step="0.1">
          </div>
          <div class="form-group flex-1">
            <label>IRS Rate</label>
            <input type="number" id="mileage-irs-rate" value="${trip.irs_rate}" step="0.01">
          </div>
          <div class="form-group flex-1">
            <label>Deduction</label>
            <input type="text" value="${Util.currency(trip.deduction)}" readonly>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Notes</label>
            <textarea id="mileage-notes" rows="2">${trip.notes || ''}</textarea>
          </div>
        </div>
      </form>
    `;

    const footer = `
      <button class="btn-secondary" onclick="App.closeModal()">Cancel</button>
      <button class="btn-primary" onclick="MileageModule.updateTrip('${id}')">Save Changes</button>
    `;

    App.showModal('Edit Mileage Trip', body, footer);
  },

  /**
   * Update trip in DB
   */
  updateTrip(id) {
    const miles = parseFloat(document.getElementById('mileage-miles').value);
    const irsRate = parseFloat(document.getElementById('mileage-irs-rate').value) || 0.70;

    if (isNaN(miles) || miles <= 0) {
      App.toast('Please enter valid mileage', 'warning');
      return;
    }

    const updates = {
      trip_date: document.getElementById('mileage-trip-date').value,
      subject_address: document.getElementById('mileage-subject-address').value.trim(),
      miles: miles,
      irs_rate: irsRate,
      deduction: miles * irsRate,
      notes: document.getElementById('mileage-notes').value.trim()
    };

    DB.update('mileage', id, updates);
    App.closeModal();
    App.toast('Trip updated successfully', 'success');
    this.render();
  },

  /**
   * Delete trip with confirmation
   */
  deleteTrip(id) {
    if (!confirm('Are you sure you want to delete this trip?')) return;

    DB.remove('mileage', id);
    App.toast('Trip deleted', 'success');
    this.render();
  },

  /**
   * Export mileage as CSV
   */
  exportCSV() {
    const period = document.getElementById('mileage-period').value;
    let entries = DB.getAll('mileage');
    entries = this.filterByPeriod(entries, period);

    let csv = 'Date,Assignment,Subject,Stops,Miles,Deduction,Notes\n';
    entries.forEach(e => {
      const assignment = DB.getById('assignments', e.assignment_id);
      csv += `"${Util.formatDate(e.trip_date)}","${assignment ? assignment.assignment_number : 'N/A'}","${e.subject_address}",${e.stops_visited || 0},${e.miles},"${Util.currency(e.deduction)}","${e.notes || ''}"\n`;
    });

    Util.downloadCSV(csv, `mileage_${period}_${new Date().getTime()}.csv`);
    App.toast('Mileage exported', 'success');
  },

  /**
   * Filter mileage entries by period
   */
  filterByPeriod(entries, period) {
    const now = new Date();
    const start = new Date();

    if (period === 'month') {
      start.setMonth(now.getMonth());
      start.setDate(1);
    } else if (period === 'quarter') {
      const q = Math.floor(now.getMonth() / 3);
      start.setMonth(q * 3);
      start.setDate(1);
    } else if (period === 'year') {
      start.setMonth(0);
      start.setDate(1);
    } else {
      return entries;
    }

    return entries.filter(e => new Date(e.trip_date) >= start);
  }
};

// ============================================================================
// INVOICE MODULE - Functional (Phase 10 detail)
// ============================================================================

const InvoiceModule = {
  currentTab: 'list',

  /**
   * Render both tabs
   */
  render() {
    if (this.currentTab === 'list') {
      this.renderList();
    } else {
      this.renderOverview();
    }
  },

  /**
   * Switch tab view
   */
  showTab(tab) {
    this.currentTab = tab;

    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');

    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    if (tab === 'list') {
      document.getElementById('invoices-tab-list').classList.add('active');
    } else {
      document.getElementById('invoices-tab-overview').classList.add('active');
    }

    this.render();
  },

  /**
   * Render invoice list table
   */
  renderList() {
    let invoices = DB.getAll('invoices');
    invoices.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    const tbody = document.getElementById('invoices-tbody');
    if (invoices.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding: 20px;">No invoices yet</td></tr>';
      return;
    }

    const stripeEnabled = typeof StripeService !== 'undefined' && StripeService.isEnabled();

    tbody.innerHTML = invoices.map(inv => {
      const assignment = DB.getById('assignments', inv.assignment_id);
      const client = DB.getById('clients', inv.client_id);
      const isOverdue = new Date(inv.due_date) < new Date() && inv.status !== 'paid';
      const statusClass = isOverdue ? 'badge-red' : (inv.status === 'paid' ? 'badge-green' : 'badge-amber');
      const statusLabel = isOverdue ? 'Overdue' : (inv.status === 'paid' ? 'Paid' : 'Pending');
      const methodBadge = inv.status === 'paid' ? this.getPaymentMethodBadge(inv) : '';

      return `
        <tr>
          <td><strong>${inv.invoice_number}</strong></td>
          <td>${Util.formatDate(inv.created_at)}</td>
          <td>${client ? client.name : 'Unknown'}</td>
          <td>${assignment ? assignment.assignment_number : 'N/A'}</td>
          <td>${Util.currency(inv.amount)}</td>
          <td><span class="${statusClass}">${statusLabel}</span>${methodBadge}</td>
          <td>${Util.formatDate(inv.due_date)}</td>
          <td>
            <button class="btn-link" onclick="InvoiceModule.viewInvoice('${inv.id}')">View</button>
            ${inv.status !== 'paid' && stripeEnabled ? `<button class="btn-link stripe-pay-btn" onclick="StripeUI.generatePaymentLink('${inv.id}')" title="Generate Stripe Payment Link">💳 Pay Link</button>` : ''}
            ${inv.status !== 'paid' ? `<button class="btn-link" onclick="InvoiceModule.markPaid('${inv.id}')">Mark Paid</button>` : ''}
            ${inv.status !== 'paid' ? `<button class="btn-link" onclick="InvoiceModule.sendViaGmail('${inv.id}')">📧</button>` : ''}
            ${inv.status !== 'paid' && stripeEnabled ? `<button class="btn-link" onclick="StripeUI.checkPaymentStatus('${inv.id}')" title="Check Stripe Payment Status">🔄</button>` : ''}
            ${isOverdue ? `<button class="btn-link" onclick="InvoiceModule.sendReminder('${inv.id}')">⏰ Remind</button>` : ''}
            ${isOverdue && stripeEnabled ? `<button class="btn-link" onclick="StripeUI.resendPaymentLink('${inv.id}')" title="Resend Payment Link">🔗 Resend</button>` : ''}
          </td>
        </tr>
      `;
    }).join('');
  },

  /**
   * Render revenue overview
   */
  renderOverview() {
    const invoices = DB.getAll('invoices');
    const now = new Date();
    const thisMonth = invoices.filter(i => {
      const d = new Date(i.created_at);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const thisQuarter = invoices.filter(i => {
      const d = new Date(i.created_at);
      const q = Math.floor(d.getMonth() / 3);
      const nq = Math.floor(now.getMonth() / 3);
      return q === nq && d.getFullYear() === now.getFullYear();
    });
    const thisYear = invoices.filter(i => {
      const d = new Date(i.created_at);
      return d.getFullYear() === now.getFullYear();
    });

    const totalMonth = thisMonth.reduce((sum, i) => sum + (i.status === 'paid' ? i.amount : 0), 0);
    const totalQuarter = thisQuarter.reduce((sum, i) => sum + (i.status === 'paid' ? i.amount : 0), 0);
    const totalYear = thisYear.reduce((sum, i) => sum + (i.status === 'paid' ? i.amount : 0), 0);
    const avgAmount = invoices.length > 0 ? (invoices.reduce((sum, i) => sum + i.amount, 0) / invoices.length).toFixed(2) : 0;

    document.getElementById('revenue-metrics').innerHTML = `
      <div class="metric-card">
        <div class="metric-label">This Month</div>
        <div class="metric-value">${Util.currency(totalMonth)}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">This Quarter</div>
        <div class="metric-value">${Util.currency(totalQuarter)}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">This Year</div>
        <div class="metric-value">${Util.currency(totalYear)}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Avg per Invoice</div>
        <div class="metric-value">${Util.currency(avgAmount)}</div>
      </div>
    `;
  },

  /**
   * Show create invoice modal
   */
  showCreate(assignmentId = null) {
    const assignments = DB.getAll('assignments');
    const assignmentOptions = assignments.map(a =>
      `<option value="${a.id}" ${a.id === assignmentId ? 'selected' : ''}>${a.assignment_number} - ${a.subject_address}</option>`
    ).join('');

    const settings = SettingsModule.getSettings();
    const today = new Date().toISOString().split('T')[0];
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + (settings.dueDays || 15));
    const dueDateStr = dueDate.toISOString().split('T')[0];

    const body = `
      <form id="invoice-create-form">
        <div class="form-row">
          <div class="form-group">
            <label>Assignment *</label>
            <select id="inv-assignment-id" ${assignmentId ? 'disabled' : 'required'}>
              <option value="">Select assignment...</option>
              ${assignmentOptions}
            </select>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group flex-1">
            <label>Invoice Date</label>
            <input type="date" id="inv-date" value="${today}">
          </div>
          <div class="form-group flex-1">
            <label>Due Date *</label>
            <input type="date" id="inv-due-date" value="${dueDateStr}" required>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Description</label>
            <input type="text" id="inv-description" placeholder="e.g., Property Appraisal">
          </div>
        </div>

        <div class="form-row">
          <div class="form-group flex-1">
            <label>Amount *</label>
            <input type="number" id="inv-amount" min="0" step="0.01" placeholder="0.00" required>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Notes</label>
            <textarea id="inv-notes" placeholder="Additional invoice notes..." rows="2"></textarea>
          </div>
        </div>
      </form>
    `;

    const footer = `
      <button class="btn-secondary" onclick="App.closeModal()">Cancel</button>
      <button class="btn-primary" onclick="InvoiceModule.saveInvoice()">Create Invoice</button>
    `;

    App.showModal('Create Invoice', body, footer);
  },

  /**
   * Save new invoice
   */
  saveInvoice() {
    const assignmentId = document.getElementById('inv-assignment-id').value;
    const amount = parseFloat(document.getElementById('inv-amount').value);

    if (!assignmentId || !amount || amount <= 0) {
      App.toast('Assignment and amount are required', 'warning');
      return;
    }

    const assignment = DB.getById('assignments', assignmentId);
    const client = DB.getById('clients', assignment.client_id);

    const invoice = {
      invoice_number: Util.nextInvoiceNumber(),
      assignment_id: assignmentId,
      client_id: assignment.client_id,
      client_name: client ? client.name : assignment.client_name,
      description: document.getElementById('inv-description').value.trim(),
      amount: amount,
      status: 'unpaid',
      created_at: document.getElementById('inv-date').value,
      due_date: document.getElementById('inv-due-date').value,
      notes: document.getElementById('inv-notes').value.trim()
    };

    DB.add('invoices', invoice);

    // Update assignment payment status
    DB.update('assignments', assignmentId, { paymentStatus: 'invoiced' });

    App.closeModal();
    App.toast(`Invoice ${invoice.invoice_number} created`, 'success');
    this.render();
  },

  /**
   * Get payment method badge HTML for paid invoices
   */
  getPaymentMethodBadge(invoice) {
    if (invoice.status !== 'paid') return '';
    const method = invoice.payment_method || '';
    const labels = {
      'credit_card': '💳 Card',
      'ach': '🏦 ACH',
      'check': '📝 Check',
      'zelle': '⚡ Zelle',
      'cash': '💵 Cash',
      'stripe': '💳 Stripe',
      'other': '📋 Other'
    };
    const label = labels[method] || method;
    const isStripe = invoice.stripe_payment_confirmed;
    return `<br><span style="font-size: 10px; color: ${isStripe ? '#6366f1' : '#666'}; font-weight: 500;">${isStripe ? '⚡ Stripe' : label}</span>`;
  },

  /**
   * Mark invoice as paid
   */
  markPaid(id) {
    const invoice = DB.getById('invoices', id);
    if (!invoice) {
      App.toast('Invoice not found', 'error');
      return;
    }

    const body = `
      <form id="payment-form">
        <div class="form-row">
          <div class="form-group">
            <label>Payment Method *</label>
            <select id="payment-method" required>
              <option value="">Select method...</option>
              <option value="ach">ACH Transfer (preferred)</option>
              <option value="zelle">Zelle</option>
              <option value="check">Check</option>
              <option value="credit_card">Credit Card</option>
              <option value="cash">Cash</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Payment Date *</label>
            <input type="date" id="payment-date" value="${new Date().toISOString().split('T')[0]}" required>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Notes</label>
            <textarea id="payment-notes" placeholder="Reference number, check #, etc..." rows="2"></textarea>
          </div>
        </div>
      </form>
    `;

    const footer = `
      <button class="btn-secondary" onclick="App.closeModal()">Cancel</button>
      <button class="btn-primary" onclick="InvoiceModule.confirmPayment('${id}')">Record Payment</button>
    `;

    App.showModal(`Mark Paid: ${invoice.invoice_number}`, body, footer);
  },

  /**
   * Confirm and record payment
   */
  confirmPayment(id) {
    const method = document.getElementById('payment-method').value;
    const date = document.getElementById('payment-date').value;

    if (!method || !date) {
      App.toast('Payment method and date are required', 'warning');
      return;
    }

    const updates = {
      status: 'paid',
      payment_confirmed: true,
      payment_method: method,
      payment_date: date,
      payment_notes: document.getElementById('payment-notes').value.trim()
    };

    DB.update('invoices', id, updates);

    // Update assignment payment status and auto-advance
    const invoice = DB.getById('invoices', id);
    if (invoice && invoice.assignment_id) {
      DB.update('assignments', invoice.assignment_id, { paymentStatus: 'paid' });

      // Auto-advance: if report is complete and payment confirmed, advance to delivered
      const assignment = DB.getById('assignments', invoice.assignment_id);
      const report = DB.where('reports', r => r.assignment_id === invoice.assignment_id)[0];
      if (assignment && assignment.status === 'report_complete' && report && report.report_complete) {
        DB.update('assignments', invoice.assignment_id, {
          status: 'delivered',
          completed_date: new Date().toISOString().split('T')[0]
        });
        App.toast('Assignment auto-advanced to Delivered (payment + report confirmed)', 'success');
      }
    }

    App.closeModal();
    App.toast('Payment recorded successfully', 'success');
    this.render();
  },

  /**
   * View invoice in printable format
   */
  viewInvoice(id) {
    const invoice = DB.getById('invoices', id);
    if (!invoice) {
      App.toast('Invoice not found', 'error');
      return;
    }

    const settings = SettingsModule.getSettings();
    const assignment = DB.getById('assignments', invoice.assignment_id);
    const client = assignment ? DB.getById('clients', assignment.client_id) : null;

    const statusBadge = invoice.status === 'paid'
      ? '<span class="badge-green">PAID</span>'
      : '<span class="badge-amber">UNPAID</span>';

    const clientAddr = client ? [client.address, client.city, client.state, client.zip].filter(Boolean).join(', ') : '';

    const body = `
      <div class="invoice-preview" id="invoice-preview-${id}">
        <div class="invoice-header-row">
          <div class="invoice-biz-info">
            <h2>${settings.bizName}</h2>
            <p>License #${settings.license}</p>
            <p>${settings.bizEmail}</p>
            ${settings.bizPhone ? `<p>${settings.bizPhone}</p>` : ''}
          </div>
          <div class="invoice-number-block">
            <div class="inv-label">INVOICE</div>
            <div class="inv-num">${invoice.invoice_number}</div>
            <div style="margin-top: 8px;">${statusBadge}</div>
          </div>
        </div>

        <div class="invoice-details-grid">
          <div class="detail-group">
            <h4>Bill To</h4>
            <p><strong>${invoice.client_name}</strong></p>
            ${clientAddr ? `<p>${clientAddr}</p>` : ''}
            ${client && client.email ? `<p>${client.email}</p>` : ''}
          </div>
          <div class="detail-group" style="text-align: right;">
            <h4>Invoice Details</h4>
            <p><strong>Date:</strong> ${Util.formatDate(invoice.created_at)}</p>
            <p><strong>Due:</strong> ${Util.formatDate(invoice.due_date)}</p>
            ${assignment ? `<p><strong>Assignment:</strong> ${assignment.assignment_number}</p>` : ''}
            ${assignment ? `<p><strong>Property:</strong> ${assignment.subject_address}</p>` : ''}
          </div>
        </div>

        <table class="invoice-line-items">
          <thead>
            <tr>
              <th>Description</th>
              <th style="text-align: right; width: 120px;">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>${invoice.description || (assignment ? assignment.type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) + ' Appraisal' : 'Professional Services')}</td>
              <td style="text-align: right;">${Util.currency(invoice.amount)}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr class="invoice-total-row">
              <td>TOTAL DUE</td>
              <td style="text-align: right;">${Util.currency(invoice.amount)}</td>
            </tr>
          </tfoot>
        </table>

        <div style="background: #eff6ff; border: 1px solid #bfdbfe; padding: 16px; border-radius: 6px; margin-bottom: 12px;">
          <h4 style="margin: 0 0 8px; font-size: 11px; text-transform: uppercase; color: #1e40af;">Online Payment</h4>
          <p style="margin: 0 0 6px; font-size: 13px; font-style: italic; color: #1e3a5f;">ACH payments are preferred to minimize processing fees. Credit card payments are accepted for convenience.</p>
          ${invoice.stripe_checkout_url && invoice.status !== 'paid' ? `<a href="${invoice.stripe_checkout_url}" target="_blank" style="display: inline-block; background: #6366f1; color: white; padding: 8px 20px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 13px; margin-top: 4px;">Pay Online Now →</a>` : ''}
        </div>
        <div style="background: #f8f9fa; padding: 16px; border-radius: 6px; margin-bottom: 16px;">
          <h4 style="margin: 0 0 8px; font-size: 11px; text-transform: uppercase; color: #666;">Alternative Payment Methods</h4>
          <p style="margin: 0; font-size: 13px;">${settings.paymentInstructions}</p>
        </div>

        ${invoice.notes ? `<div style="padding-top: 12px; border-top: 1px solid #eee;"><strong style="font-size: 11px; text-transform: uppercase; color: #666;">Notes</strong><p style="font-size: 13px; margin-top: 4px;">${invoice.notes}</p></div>` : ''}

        <div class="invoice-footer">
          ${settings.bizName} &middot; ${settings.bizEmail} &middot; License #${settings.license}
        </div>
      </div>
    `;

    const stripeEnabled = typeof StripeService !== 'undefined' && StripeService.isEnabled();
    const footer = `
      <button class="btn-secondary" onclick="App.closeModal()">Close</button>
      <button class="btn-secondary" onclick="window.print()">Print</button>
      <button class="btn-primary" onclick="InvoiceModule.downloadPDF('${id}')">Download PDF</button>
      <button class="btn-primary" onclick="InvoiceModule.sendViaGmail('${id}')">Send via Gmail</button>
      ${invoice.status !== 'paid' && stripeEnabled ? `<button class="btn-primary" style="background: #6366f1;" onclick="App.closeModal(); StripeUI.generatePaymentLink('${id}')">💳 Payment Link</button>` : ''}
    `;

    App.showModal(`Invoice ${invoice.invoice_number}`, body, footer);
  },

  /**
   * Generate and download branded PDF invoice using jsPDF
   */
  downloadPDF(id) {
    const invoice = DB.getById('invoices', id);
    if (!invoice) { App.toast('Invoice not found', 'error'); return; }

    const settings = SettingsModule.getSettings();
    const assignment = DB.getById('assignments', invoice.assignment_id);
    const client = assignment ? DB.getById('clients', assignment.client_id) : null;

    try {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();

      // --- HEADER: Navy bar ---
      doc.setFillColor(27, 42, 74); // Navy
      doc.rect(0, 0, pageWidth, 38, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text(settings.bizName, 14, 18);

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`License #${settings.license}  |  ${settings.bizEmail}${settings.bizPhone ? '  |  ' + settings.bizPhone : ''}`, 14, 28);

      // Gold accent line
      doc.setFillColor(201, 168, 76); // Gold
      doc.rect(0, 38, pageWidth, 2, 'F');

      // --- INVOICE TITLE ---
      doc.setTextColor(27, 42, 74);
      doc.setFontSize(28);
      doc.setFont('helvetica', 'bold');
      doc.text('INVOICE', pageWidth - 14, 60, { align: 'right' });

      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(201, 168, 76);
      doc.text(invoice.invoice_number, pageWidth - 14, 68, { align: 'right' });

      // Status badge
      const isPaid = invoice.status === 'paid';
      doc.setFillColor(isPaid ? 40 : 220, isPaid ? 167 : 53, isPaid ? 69 : 69);
      doc.roundedRect(pageWidth - 42, 72, 28, 10, 2, 2, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text(isPaid ? 'PAID' : 'UNPAID', pageWidth - 28, 79, { align: 'center' });

      // --- BILL TO ---
      let y = 60;
      doc.setTextColor(100, 100, 100);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('BILL TO', 14, y);
      y += 7;

      doc.setTextColor(30, 30, 30);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(invoice.client_name, 14, y);
      y += 6;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      if (client) {
        if (client.address) { doc.text(client.address, 14, y); y += 5; }
        const cityLine = [client.city, client.state, client.zip].filter(Boolean).join(', ');
        if (cityLine) { doc.text(cityLine, 14, y); y += 5; }
        if (client.email) { doc.text(client.email, 14, y); y += 5; }
      }

      // --- INVOICE DETAILS ---
      y = 90;
      doc.setTextColor(100, 100, 100);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('INVOICE DETAILS', 14, y);
      y += 7;

      doc.setTextColor(30, 30, 30);
      doc.setFont('helvetica', 'normal');
      const details = [
        ['Date:', Util.formatDate(invoice.created_at)],
        ['Due:', Util.formatDate(invoice.due_date)],
      ];
      if (assignment) {
        details.push(['Assignment:', assignment.assignment_number]);
        details.push(['Property:', assignment.subject_address]);
      }
      details.forEach(([label, value]) => {
        doc.setFont('helvetica', 'bold');
        doc.text(label, 14, y);
        doc.setFont('helvetica', 'normal');
        doc.text(value || '', 45, y);
        y += 6;
      });

      // --- LINE ITEMS TABLE ---
      y += 10;
      // Header row
      doc.setFillColor(27, 42, 74);
      doc.rect(14, y - 5, pageWidth - 28, 10, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('Description', 18, y + 1);
      doc.text('Amount', pageWidth - 18, y + 1, { align: 'right' });
      y += 12;

      // Line item
      doc.setTextColor(30, 30, 30);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      const desc = invoice.description || (assignment ? assignment.type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) + ' Appraisal' : 'Professional Services');
      doc.text(desc, 18, y);
      doc.text(Util.currency(invoice.amount), pageWidth - 18, y, { align: 'right' });
      y += 8;

      // Divider
      doc.setDrawColor(27, 42, 74);
      doc.setLineWidth(0.5);
      doc.line(14, y, pageWidth - 14, y);
      y += 8;

      // Total
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(27, 42, 74);
      doc.text('TOTAL DUE', 18, y);
      doc.text(Util.currency(invoice.amount), pageWidth - 18, y, { align: 'right' });
      y += 16;

      // --- ACH PREFERRED MESSAGE ---
      doc.setFillColor(235, 245, 255);
      doc.roundedRect(14, y - 4, pageWidth - 28, 16, 2, 2, 'F');
      doc.setDrawColor(191, 219, 254);
      doc.roundedRect(14, y - 4, pageWidth - 28, 16, 2, 2, 'S');
      doc.setTextColor(30, 64, 175);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bolditalic');
      doc.text('ACH payments are preferred to minimize processing fees. Credit card payments are accepted for convenience.', 18, y + 6);
      y += 22;

      // --- PAYMENT INSTRUCTIONS ---
      doc.setFillColor(245, 245, 248);
      doc.roundedRect(14, y - 4, pageWidth - 28, 22, 2, 2, 'F');
      doc.setTextColor(100, 100, 100);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text('PAYMENT INSTRUCTIONS', 18, y + 2);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(50, 50, 50);
      const payLines = doc.splitTextToSize(settings.paymentInstructions || 'Payment required before report release.', pageWidth - 40);
      doc.text(payLines, 18, y + 10);
      y += 30;

      // --- ONLINE PAYMENT LINK (if available) ---
      if (invoice.stripe_checkout_url && invoice.status !== 'paid') {
        doc.setFillColor(99, 102, 241);
        doc.roundedRect(14, y - 4, pageWidth - 28, 14, 2, 2, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text('PAY ONLINE:', 18, y + 5);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.textWithLink(invoice.stripe_checkout_url.substring(0, 80) + '...', 50, y + 5, { url: invoice.stripe_checkout_url });
        y += 18;
      }

      // --- NOTES ---
      if (invoice.notes) {
        doc.setTextColor(100, 100, 100);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text('NOTES', 18, y);
        y += 6;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(50, 50, 50);
        const noteLines = doc.splitTextToSize(invoice.notes, pageWidth - 40);
        doc.text(noteLines, 18, y);
        y += noteLines.length * 5 + 8;
      }

      // --- FOOTER ---
      const footerY = doc.internal.pageSize.getHeight() - 15;
      doc.setFillColor(27, 42, 74);
      doc.rect(0, footerY - 5, pageWidth, 20, 'F');
      doc.setTextColor(201, 168, 76);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(`${settings.bizName}  |  ${settings.bizEmail}  |  License #${settings.license}`, pageWidth / 2, footerY + 3, { align: 'center' });

      // Save
      doc.save(`${invoice.invoice_number}.pdf`);
      App.toast('Invoice PDF downloaded', 'success');
      DB.logAudit('export', 'invoices', id, invoice.assignment_id, null, { format: 'pdf' });

    } catch (err) {
      console.error('PDF generation error:', err);
      App.toast('PDF generation failed. Try Print instead.', 'error');
    }
  },

  /**
   * Send invoice via Gmail compose window
   */
  sendViaGmail(id) {
    const invoice = DB.getById('invoices', id);
    if (!invoice) return;

    const settings = SettingsModule.getSettings();
    const assignment = DB.getById('assignments', invoice.assignment_id);
    const client = DB.getById('clients', invoice.client_id);
    const clientEmail = client ? client.email : '';

    const propertyLine = assignment ? `${assignment.subject_address}, ${assignment.city}, ${assignment.state} ${assignment.zip}` : '';

    const subject = `Invoice ${invoice.invoice_number} — ${settings.bizName}`;
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
      ...(invoice.stripe_checkout_url && invoice.status !== 'paid' ? [
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
        'PAY ONLINE — SECURE PAYMENT LINK',
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
        '',
        invoice.stripe_checkout_url,
        '',
        'ACH payments are preferred to minimize processing fees. Credit card payments are accepted for convenience.',
        '',
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
        'ALTERNATIVE PAYMENT METHODS',
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
        ''
      ] : []),
      settings.paymentInstructions || 'Payment is due upon receipt.',
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
  },

  /**
   * Send payment reminder via Gmail
   */
  sendReminder(id) {
    const invoice = DB.getById('invoices', id);
    if (!invoice) return;

    const settings = SettingsModule.getSettings();
    const client = DB.getById('clients', invoice.client_id);
    const clientEmail = client ? client.email : '';

    const subject = `Payment Reminder: Invoice ${invoice.invoice_number} — ${Util.currency(invoice.amount)} Due`;
    const body = [
      `Dear ${invoice.client_name},`,
      '',
      `This is a friendly reminder that Invoice ${invoice.invoice_number} for ${Util.currency(invoice.amount)} was due on ${Util.formatDate(invoice.due_date)}.`,
      '',
      `If payment has already been sent, please disregard this message.`,
      '',
      ...(invoice.stripe_checkout_url ? [
        'To pay online securely:',
        invoice.stripe_checkout_url,
        '',
        'ACH payments are preferred to minimize processing fees. Credit card payments are accepted for convenience.',
        ''
      ] : []),
      settings.paymentInstructions || 'Payment is due upon receipt.',
      '',
      'Thank you,',
      '',
      'Keith Manning Jr.',
      `Certified Residential Appraiser — License #${settings.license || 'A9156'}`,
      settings.bizName || 'Designer Homes Real Estate Services',
      settings.bizEmail || 'info@designerhomesre.com'
    ].join('\n');

    Util.openGmailCompose({
      to: clientEmail,
      subject: subject,
      body: body
    });
  },

  /**
   * Email invoice to client (alias for sendViaGmail)
   */
  emailInvoice(id) {
    this.sendViaGmail(id);
  }
};

// ============================================================================
// REPORT MODULE - Functional (Phase 10 detail)
// ============================================================================

const ReportModule = {
  /**
   * Render report delivery table
   */
  render() {
    let assignments = DB.getAll('assignments').filter(a =>
      ['in_review', 'report_complete', 'awaiting_payment', 'delivered'].includes(a.status)
    );

    assignments.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    const tbody = document.getElementById('reports-tbody');
    if (assignments.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 20px;">No reports in delivery pipeline</td></tr>';
      return;
    }

    tbody.innerHTML = assignments.map(a => {
      const client = DB.getById('clients', a.client_id);
      const invoice = DB.where('invoices', i => i.assignment_id === a.id)[0];
      const isPaid = invoice && invoice.status === 'paid';

      const reportStatus = a.status === 'delivered' ? 'Delivered' : (a.status === 'report_complete' ? 'Ready' : 'In Progress');
      const paymentStatus = isPaid ? 'Paid' : 'Unpaid';
      const paymentBadge = isPaid ? 'badge-green' : 'badge-red';
      const reportBadge = a.status === 'delivered' ? 'badge-green' : 'badge-teal';

      const hasDriveLink = a.drive_folder_url ? true : false;

      return `
        <tr>
          <td><strong>${a.assignment_number}</strong></td>
          <td>${client ? client.name : 'Unknown'}</td>
          <td>${a.subject_address}</td>
          <td><span class="${reportBadge}">${reportStatus}</span></td>
          <td><span class="${paymentBadge}">${paymentStatus}</span></td>
          <td>
            ${!isPaid ? `<button class="btn-link" onclick="ReportModule.releaseReport('${a.id}')">Release</button>` : ''}
            <button class="btn-link" onclick="ReportModule.updateStatus('${a.id}')">Update</button>
            ${hasDriveLink ? `<a href="${a.drive_folder_url}" target="_blank" class="btn-link">📁 Drive</a>` : `<button class="btn-link" onclick="ReportModule.setDriveLink('${a.id}')">📁 Link Drive</button>`}
            ${a.status === 'delivered' || isPaid ? `<button class="btn-link" onclick="ReportModule.sendViaGmail('${a.id}')">📧 Send</button>` : ''}
          </td>
        </tr>
      `;
    }).join('');
  },

  /**
   * Release report (check payment status first)
   */
  releaseReport(id) {
    const assignment = DB.getById('assignments', id);
    if (!assignment) {
      App.toast('Assignment not found', 'error');
      return;
    }

    const invoice = DB.where('invoices', i => i.assignment_id === id)[0];
    if (!invoice || invoice.status !== 'paid') {
      App.toast('Payment required before release', 'error');
      return;
    }

    DB.update('assignments', id, { status: 'delivered' });
    App.toast(`Report for ${assignment.assignment_number} released`, 'success');
    this.render();
  },

  /**
   * Update report status
   */
  updateStatus(id) {
    const assignment = DB.getById('assignments', id);
    if (!assignment) {
      App.toast('Assignment not found', 'error');
      return;
    }

    const body = `
      <form id="report-status-form">
        <div class="form-row">
          <div class="form-group">
            <label>Report Status *</label>
            <select id="report-status" required>
              <option value="in_review" ${assignment.status === 'in_review' ? 'selected' : ''}>In Review</option>
              <option value="report_complete" ${assignment.status === 'report_complete' ? 'selected' : ''}>Complete</option>
              <option value="awaiting_payment" ${assignment.status === 'awaiting_payment' ? 'selected' : ''}>Awaiting Payment</option>
              <option value="delivered" ${assignment.status === 'delivered' ? 'selected' : ''}>Delivered</option>
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Notes</label>
            <textarea id="report-notes" placeholder="Status update notes..." rows="2"></textarea>
          </div>
        </div>
      </form>
    `;

    const footer = `
      <button class="btn-secondary" onclick="App.closeModal()">Cancel</button>
      <button class="btn-primary" onclick="ReportModule.confirmStatusUpdate('${id}')">Update Status</button>
    `;

    App.showModal(`Update Report Status: ${assignment.assignment_number}`, body, footer);
  },

  /**
   * Confirm status update
   */
  /**
   * View report detail (placeholder for demo rows; dynamic rows use updateStatus)
   */
  viewReport(id) {
    App.toast('Select an active assignment to view report details', 'info');
  },

  confirmStatusUpdate(id) {
    const status = document.getElementById('report-status').value;
    const notes = document.getElementById('report-notes').value.trim();

    if (!status) {
      App.toast('Please select a status', 'warning');
      return;
    }

    const updates = {
      status: status
    };

    if (notes) {
      updates.report_notes = notes;
    }

    DB.update('assignments', id, updates);
    App.closeModal();
    App.toast('Report status updated', 'success');
    this.render();
  },

  /**
   * Set Google Drive folder link for an assignment
   */
  setDriveLink(id) {
    const assignment = DB.getById('assignments', id);
    if (!assignment) return;

    const body = `
      <div class="form-group">
        <label>Google Drive Folder URL</label>
        <input type="url" id="drive-folder-url" placeholder="https://drive.google.com/drive/folders/..." value="${assignment.drive_folder_url || ''}">
        <p class="text-muted" style="margin-top:8px; font-size:0.82rem;">
          Paste the share link of the Google Drive folder where you store this assignment's report files.
          <br><br>
          <a href="#" onclick="Util.openGoogleDrive(); return false;" style="color: var(--color-gold);">→ Open Google Drive to create a folder</a>
        </p>
      </div>
    `;

    const footer = `
      <button class="btn-secondary" onclick="App.closeModal()">Cancel</button>
      <button class="btn-primary" onclick="ReportModule.saveDriveLink('${id}')">Save Link</button>
    `;

    App.showModal(`Link Drive Folder: ${assignment.assignment_number}`, body, footer);
  },

  /**
   * Save Drive folder link
   */
  saveDriveLink(id) {
    const url = document.getElementById('drive-folder-url').value.trim();
    if (!url) {
      App.toast('Please enter a Drive folder URL', 'warning');
      return;
    }
    Util.setAssignmentDriveLink(id, url);
    App.closeModal();
    App.toast('Drive folder linked', 'success');
    this.render();
  },

  /**
   * Send completed report via Gmail compose
   */
  sendViaGmail(id) {
    const assignment = DB.getById('assignments', id);
    if (!assignment) return;

    const client = DB.getById('clients', assignment.client_id);
    const clientEmail = client ? client.email : '';
    const settings = SettingsModule.getSettings();

    const driveLink = assignment.drive_folder_url ? `\nReport files: ${assignment.drive_folder_url}` : '';

    const subject = `Appraisal Report Delivered: ${assignment.subject_address} — ${assignment.assignment_number}`;
    const body = [
      `Dear ${client ? client.name : 'Client'},`,
      '',
      `Your appraisal report for the following property has been completed and is ready for your review:`,
      '',
      `Property: ${assignment.subject_address}`,
      `${assignment.city}, ${assignment.state} ${assignment.zip}`,
      `Assignment: ${assignment.assignment_number}`,
      `Type: ${assignment.type.replace(/_/g, ' ')}`,
      driveLink,
      '',
      `Please do not hesitate to reach out if you have any questions regarding this report.`,
      '',
      'Respectfully,',
      '',
      'Keith Manning Jr.',
      `Certified Residential Appraiser — License #${settings.license || 'A9156'}`,
      settings.bizName || 'Designer Homes Real Estate Services',
      settings.bizPhone || '',
      settings.bizEmail || 'info@designerhomesre.com'
    ].join('\n');

    Util.openGmailCompose({
      to: clientEmail,
      subject: subject,
      body: body
    });
  },

  /**
   * Email report ready notification to client (alias for sendViaGmail)
   */
  emailReportReady(id) {
    this.sendViaGmail(id);
  },

  /**
   * Email portal access token to client
   */
  emailPortalAccess(clientId) {
    const client = DB.getById('clients', clientId);
    if (!client) {
      App.toast('Client not found', 'error');
      return;
    }

    const settings = SettingsModule.getSettings();
    const clientToken = PortalTokenModule.generateClientToken(clientId, client.name);

    const subject = `Your Designer Homes Client Portal Access`;
    const body = [
      `Dear ${client.name},`,
      '',
      `We've set up a secure client portal for you to access your appraisal reports and assignment information.`,
      '',
      `Portal Access Token: ${clientToken}`,
      `Portal URL: ${window.location.origin}/portal`,
      '',
      `To access your portal:`,
      `1. Visit the portal URL above`,
      `2. Enter your access token when prompted`,
      `3. You'll have access to all your assignments and reports for 90 days`,
      '',
      `If you have any questions or need assistance, please don't hesitate to reach out.`,
      '',
      'Respectfully,',
      '',
      'Keith Manning Jr.',
      `Certified Residential Appraiser — License #${settings.license || 'A9156'}`,
      settings.bizName || 'Designer Homes Real Estate Services',
      settings.bizPhone || '',
      settings.bizEmail || 'info@designerhomesre.com'
    ].join('\n');

    Util.openGmailCompose({
      to: client.email,
      subject: subject,
      body: body
    });
  }
};


// ============================================================================
// TRAINEE MODULE - Experience Tracking System
// ============================================================================

const TraineeModule = {
  /**
   * Render trainee experience log with stats
   */
  render() {
    const logs = this._getFiltered();
    const allLogs = DB.getAll('trainee_logs');

    // Populate trainee name filter
    const nameFilter = document.getElementById('trainee-filter-name');
    if (nameFilter) {
      const currentVal = nameFilter.value;
      const uniqueNames = [...new Set(allLogs.map(l => l.trainee_name).filter(Boolean))];
      nameFilter.innerHTML = '<option value="all">All Trainees</option>' +
        uniqueNames.map(n => `<option value="${n}" ${n === currentVal ? 'selected' : ''}>${n}</option>`).join('');
    }

    // Stats
    const statsEl = document.getElementById('trainee-stats');
    if (statsEl) {
      const totalHours = logs.reduce((s, l) => s + (parseFloat(l.hours) || 0), 0);
      const uniqueTrainees = new Set(logs.map(l => l.trainee_name)).size;
      const approvedCount = logs.filter(l => l.supervisor_approved).length;
      const typeBreakdown = {};
      logs.forEach(l => { typeBreakdown[l.report_type] = (typeBreakdown[l.report_type] || 0) + 1; });
      const topType = Object.entries(typeBreakdown).sort((a, b) => b[1] - a[1])[0];

      statsEl.innerHTML = `
        <div class="trainee-stat"><div class="stat-value">${logs.length}</div><div class="stat-label">Total Entries</div></div>
        <div class="trainee-stat"><div class="stat-value">${totalHours.toFixed(1)}</div><div class="stat-label">Total Hours</div></div>
        <div class="trainee-stat"><div class="stat-value">${uniqueTrainees}</div><div class="stat-label">Active Trainees</div></div>
        <div class="trainee-stat"><div class="stat-value">${approvedCount} / ${logs.length}</div><div class="stat-label">Supervisor Approved</div></div>
        ${topType ? `<div class="trainee-stat"><div class="stat-value">${topType[1]}</div><div class="stat-label">Top: ${topType[0].replace(/_/g, ' ')}</div></div>` : ''}
      `;
    }

    // Table
    const tbody = document.getElementById('trainee-tbody');
    if (!tbody) return;

    if (logs.length === 0) {
      tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;">No experience entries yet. Click "+ Log Experience" to start tracking.</td></tr>';
      return;
    }

    tbody.innerHTML = logs.sort((a, b) => new Date(b.date) - new Date(a.date)).map(log => {
      const assignment = log.assignment_id ? DB.getById('assignments', log.assignment_id) : null;
      const assignmentNum = assignment ? assignment.assignment_number : (log.assignment_number || '-');
      const approved = log.supervisor_approved
        ? '<span class="badge-green">Yes</span>'
        : '<span class="badge-amber">Pending</span>';

      return `
        <tr>
          <td>${Util.formatDate(log.date)}</td>
          <td>${log.trainee_name}</td>
          <td>${assignmentNum}</td>
          <td>${log.property_address || '-'}</td>
          <td>${(log.report_type || '').replace(/_/g, ' ')}</td>
          <td>${log.hours || '-'}</td>
          <td>${log.tasks_performed || '-'}</td>
          <td>${approved}</td>
          <td>
            ${!log.supervisor_approved ? `<button class="btn-link" onclick="TraineeModule.approve('${log.id}')">Approve</button>` : ''}
            <button class="btn-link" onclick="TraineeModule.editEntry('${log.id}')">Edit</button>
            <button class="btn-link btn-danger" onclick="TraineeModule.deleteEntry('${log.id}')">Delete</button>
          </td>
        </tr>
      `;
    }).join('');
  },

  /**
   * Get filtered logs
   */
  _getFiltered() {
    let logs = DB.getAll('trainee_logs');
    const nameFilter = document.getElementById('trainee-filter-name')?.value;
    const typeFilter = document.getElementById('trainee-filter-type')?.value;

    if (nameFilter && nameFilter !== 'all') {
      logs = logs.filter(l => l.trainee_name === nameFilter);
    }
    if (typeFilter && typeFilter !== 'all') {
      logs = logs.filter(l => l.report_type === typeFilter);
    }
    return logs;
  },

  /**
   * Show log entry modal
   */
  showLogEntry(entryId = null) {
    const entry = entryId ? DB.getById('trainee_logs', entryId) : null;
    const assignments = DB.getAll('assignments');
    const assignmentOptions = assignments.map(a =>
      `<option value="${a.id}" ${entry && entry.assignment_id === a.id ? 'selected' : ''}>${a.assignment_number} - ${a.subject_address}</option>`
    ).join('');

    const body = `
      <form id="trainee-log-form">
        <div class="form-row">
          <div class="form-group">
            <label>Trainee Name *</label>
            <input type="text" id="trainee-name" value="${entry ? entry.trainee_name : ''}" required placeholder="Full name of trainee">
          </div>
          <div class="form-group">
            <label>Date *</label>
            <input type="date" id="trainee-date" value="${entry ? entry.date : new Date().toISOString().split('T')[0]}" required>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Assignment</label>
            <select id="trainee-assignment">
              <option value="">Select assignment (optional)...</option>
              ${assignmentOptions}
            </select>
          </div>
          <div class="form-group">
            <label>Property Address</label>
            <input type="text" id="trainee-address" value="${entry ? entry.property_address || '' : ''}" placeholder="Auto-fills from assignment">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Report Type *</label>
            <select id="trainee-report-type" required>
              <option value="">Select type...</option>
              <option value="1004_urar" ${entry && entry.report_type === '1004_urar' ? 'selected' : ''}>1004 URAR</option>
              <option value="1073_condo" ${entry && entry.report_type === '1073_condo' ? 'selected' : ''}>1073 Condo</option>
              <option value="1025_small_res" ${entry && entry.report_type === '1025_small_res' ? 'selected' : ''}>1025 Small Residential</option>
              <option value="2055_exterior" ${entry && entry.report_type === '2055_exterior' ? 'selected' : ''}>2055 Exterior Only</option>
              <option value="desktop" ${entry && entry.report_type === 'desktop' ? 'selected' : ''}>Desktop</option>
              <option value="other" ${entry && entry.report_type === 'other' ? 'selected' : ''}>Other</option>
            </select>
          </div>
          <div class="form-group">
            <label>Hours Worked *</label>
            <input type="number" id="trainee-hours" value="${entry ? entry.hours : ''}" step="0.5" min="0" max="24" required placeholder="e.g., 4.5">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group" style="flex: 1;">
            <label>Tasks Performed *</label>
            <textarea id="trainee-tasks" rows="3" required placeholder="Describe tasks: inspection assistance, comp research, measurement, data entry, analysis review...">${entry ? entry.tasks_performed : ''}</textarea>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Supervisor Notes</label>
            <textarea id="trainee-notes" rows="2" placeholder="Optional supervisor notes...">${entry ? entry.supervisor_notes || '' : ''}</textarea>
          </div>
        </div>
      </form>
    `;

    const isEdit = !!entry;
    const footer = `
      <button class="btn-secondary" onclick="App.closeModal()">Cancel</button>
      <button class="btn-primary" onclick="TraineeModule.${isEdit ? `updateEntry('${entryId}')` : 'saveEntry()'}">
        ${isEdit ? 'Update' : 'Save'} Entry
      </button>
    `;

    App.showModal(isEdit ? 'Edit Experience Entry' : 'Log Trainee Experience', body, footer);

    // Auto-fill address from assignment selection
    setTimeout(() => {
      const sel = document.getElementById('trainee-assignment');
      if (sel) {
        sel.addEventListener('change', () => {
          const asgn = DB.getById('assignments', sel.value);
          if (asgn) {
            const addrEl = document.getElementById('trainee-address');
            if (addrEl && !addrEl.value) {
              addrEl.value = `${asgn.subject_address}, ${asgn.city}, ${asgn.state} ${asgn.zip}`;
            }
          }
        });
      }
    }, 100);
  },

  /**
   * Save new trainee log entry
   */
  saveEntry() {
    const name = document.getElementById('trainee-name').value.trim();
    const date = document.getElementById('trainee-date').value;
    const reportType = document.getElementById('trainee-report-type').value;
    const hours = document.getElementById('trainee-hours').value;
    const tasks = document.getElementById('trainee-tasks').value.trim();

    if (!Util.validate.required(name, 'Trainee name')) return;
    if (!Util.validate.required(date, 'Date')) return;
    if (!Util.validate.required(reportType, 'Report type')) return;
    if (!Util.validate.required(hours, 'Hours')) return;
    if (!Util.validate.required(tasks, 'Tasks performed')) return;

    const assignmentId = document.getElementById('trainee-assignment').value;
    const assignment = assignmentId ? DB.getById('assignments', assignmentId) : null;

    const entry = {
      trainee_name: name,
      date: date,
      assignment_id: assignmentId || null,
      assignment_number: assignment ? assignment.assignment_number : '',
      property_address: document.getElementById('trainee-address').value.trim(),
      report_type: reportType,
      hours: parseFloat(hours),
      tasks_performed: tasks,
      supervisor_notes: document.getElementById('trainee-notes').value.trim(),
      supervisor_approved: false
    };

    DB.add('trainee_logs', entry);
    App.closeModal();
    App.toast('Experience entry logged', 'success');
    this.render();
  },

  /**
   * Edit existing entry
   */
  editEntry(id) {
    this.showLogEntry(id);
  },

  /**
   * Update existing entry
   */
  updateEntry(id) {
    const name = document.getElementById('trainee-name').value.trim();
    const date = document.getElementById('trainee-date').value;
    const reportType = document.getElementById('trainee-report-type').value;
    const hours = document.getElementById('trainee-hours').value;
    const tasks = document.getElementById('trainee-tasks').value.trim();

    if (!Util.validate.required(name, 'Trainee name') || !Util.validate.required(date, 'Date') ||
        !Util.validate.required(reportType, 'Report type') || !Util.validate.required(hours, 'Hours') ||
        !Util.validate.required(tasks, 'Tasks performed')) return;

    const assignmentId = document.getElementById('trainee-assignment').value;
    const assignment = assignmentId ? DB.getById('assignments', assignmentId) : null;

    DB.update('trainee_logs', id, {
      trainee_name: name,
      date: date,
      assignment_id: assignmentId || null,
      assignment_number: assignment ? assignment.assignment_number : '',
      property_address: document.getElementById('trainee-address').value.trim(),
      report_type: reportType,
      hours: parseFloat(hours),
      tasks_performed: tasks,
      supervisor_notes: document.getElementById('trainee-notes').value.trim()
    });

    App.closeModal();
    App.toast('Entry updated', 'success');
    this.render();
  },

  /**
   * Approve entry as supervisor
   */
  approve(id) {
    DB.update('trainee_logs', id, {
      supervisor_approved: true,
      approval_date: new Date().toISOString()
    });
    App.toast('Entry approved', 'success');
    this.render();
  },

  /**
   * Delete entry
   */
  deleteEntry(id) {
    if (!confirm('Delete this experience entry? This cannot be undone.')) return;
    DB.remove('trainee_logs', id);
    App.toast('Entry deleted', 'success');
    this.render();
  },

  /**
   * Export filtered entries as CSV
   */
  exportCSV() {
    const logs = this._getFiltered();
    if (logs.length === 0) { App.toast('No entries to export', 'warning'); return; }

    const headers = ['Date', 'Trainee', 'Assignment', 'Property Address', 'Report Type', 'Hours', 'Tasks Performed', 'Supervisor Notes', 'Approved', 'Approval Date'];
    const rows = logs.map(l => [
      l.date, l.trainee_name, l.assignment_number || '',
      l.property_address || '', (l.report_type || '').replace(/_/g, ' '),
      l.hours || '', l.tasks_performed || '', l.supervisor_notes || '',
      l.supervisor_approved ? 'Yes' : 'No', l.approval_date ? Util.formatDate(l.approval_date) : ''
    ]);

    Util.downloadCSV([headers, ...rows], `trainee-experience-${Date.now()}.csv`);
    App.toast('Experience log exported', 'success');
  },

  /**
   * Generate experience report summary for licensing
   */
  exportExperienceReport() {
    const logs = this._getFiltered();
    if (logs.length === 0) { App.toast('No entries to report', 'warning'); return; }

    // Group by trainee
    const byTrainee = {};
    logs.forEach(l => {
      if (!byTrainee[l.trainee_name]) byTrainee[l.trainee_name] = [];
      byTrainee[l.trainee_name].push(l);
    });

    let reportText = 'TRAINEE EXPERIENCE REPORT\n';
    reportText += `Generated: ${new Date().toLocaleDateString()}\n`;
    reportText += `Supervisor: Keith Manning Jr., License #${SettingsModule.getSettings().license || 'A9156'}\n`;
    reportText += '='.repeat(60) + '\n\n';

    Object.entries(byTrainee).forEach(([name, entries]) => {
      const totalHours = entries.reduce((s, e) => s + (parseFloat(e.hours) || 0), 0);
      const approved = entries.filter(e => e.supervisor_approved).length;
      const typeCount = {};
      entries.forEach(e => { typeCount[e.report_type] = (typeCount[e.report_type] || 0) + 1; });

      reportText += `TRAINEE: ${name}\n`;
      reportText += '-'.repeat(40) + '\n';
      reportText += `Total Entries: ${entries.length}\n`;
      reportText += `Total Hours: ${totalHours.toFixed(1)}\n`;
      reportText += `Approved: ${approved} / ${entries.length}\n`;
      reportText += `Report Types: ${Object.entries(typeCount).map(([t, c]) => `${t.replace(/_/g, ' ')} (${c})`).join(', ')}\n\n`;

      reportText += 'Date       | Assignment    | Hours | Tasks\n';
      reportText += '-'.repeat(60) + '\n';
      entries.sort((a, b) => new Date(a.date) - new Date(b.date)).forEach(e => {
        reportText += `${e.date}  | ${(e.assignment_number || '-').padEnd(13)} | ${String(e.hours || '-').padEnd(5)} | ${e.tasks_performed || '-'}\n`;
      });
      reportText += '\n\n';
    });

    // Download as text file
    const blob = new Blob([reportText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `experience-report-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    App.toast('Experience report downloaded', 'success');
  }
};
