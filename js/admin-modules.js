// =====================================================
// LEADS MODULE
// =====================================================
const LeadsModule = {
  render() {
    const leads = DB.getAll('leads');
    const statusFilter = document.getElementById('leads-filter-status')?.value || 'all';
    const typeFilter = document.getElementById('leads-filter-type')?.value || 'all';
    let filtered = leads;
    if (statusFilter !== 'all') filtered = filtered.filter(l => l.status === statusFilter);
    if (typeFilter !== 'all') filtered = filtered.filter(l => l.serviceType === typeFilter);
    // Sort by date descending
    filtered.sort((a, b) => new Date(b.date) - new Date(a.date));

    const tbody = document.getElementById('leads-tbody');
    tbody.innerHTML = filtered.length ? filtered.map(l => `
      <tr>
        <td>${Util.formatDate(l.date)}</td>
        <td><a href="#" onclick="LeadsModule.showDetail('${l.id}'); return false;">${l.clientName}</a></td>
        <td>${l.email || ''}</td>
        <td>${l.phone || ''}</td>
        <td>${l.serviceType || ''}</td>
        <td>${l.propertyAddress || ''}</td>
        <td>${Util.statusBadge(l.status)}</td>
        <td class="actions-cell">
          <button class="btn-sm btn-secondary" onclick="LeadsModule.updateStatus('${l.id}')">Status</button>
          ${l.status !== 'Converted' ? `<button class="btn-sm btn-primary" onclick="LeadsModule.convertToAssignment('${l.id}')">Convert</button>` : ''}
        </td>
      </tr>
    `).join('') : '<tr><td colspan="8" class="empty-state">No leads found</td></tr>';
  },

  showAddModal() {
    const body = `
      <form id="lead-form" class="admin-form">
        <div class="form-row">
          <div class="form-group"><label>Client Name *</label><input type="text" id="lead-name" required></div>
          <div class="form-group"><label>Email</label><input type="email" id="lead-email"></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Phone</label><input type="tel" id="lead-phone"></div>
          <div class="form-group"><label>Service Type</label>
            <select id="lead-service-type">
              <option value="Current Value">Current Value</option>
              <option value="Divorce">Divorce</option>
              <option value="Estate">Estate</option>
              <option value="Retrospective">Retrospective</option>
              <option value="New Construction">New Construction</option>
              <option value="FHA">FHA</option>
              <option value="Green Home">Green Home</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>
        <div class="form-group"><label>Property Address</label><input type="text" id="lead-address"></div>
        <div class="form-group"><label>Notes</label><textarea id="lead-notes" rows="3"></textarea></div>
      </form>
    `;
    const footer = `<button class="btn-primary" onclick="LeadsModule.saveLead()">Save Lead</button>`;
    AdminApp.showModal('New Lead', body, footer);
  },

  saveLead() {
    const name = document.getElementById('lead-name').value.trim();
    if (!name) { AdminApp.toast('Client name is required', 'error'); return; }
    const lead = {
      id: Util.id(),
      date: new Date().toISOString().split('T')[0],
      clientName: name,
      email: document.getElementById('lead-email').value.trim(),
      phone: document.getElementById('lead-phone').value.trim(),
      serviceType: document.getElementById('lead-service-type').value,
      propertyAddress: document.getElementById('lead-address').value.trim(),
      status: 'New',
      notes: document.getElementById('lead-notes').value.trim()
    };
    DB.add('leads', lead);
    DB.addActivity(`New lead: ${lead.clientName} — ${lead.serviceType}`);
    AdminApp.closeModal();
    AdminApp.toast('Lead added successfully', 'success');
    this.render();
  },

  showDetail(id) {
    const lead = DB.getAll('leads').find(l => l.id === id);
    if (!lead) return;
    const body = `
      <div class="detail-section">
        <p><strong>Name:</strong> ${lead.clientName}</p>
        <p><strong>Email:</strong> ${lead.email || '—'}</p>
        <p><strong>Phone:</strong> ${lead.phone || '—'}</p>
        <p><strong>Service Type:</strong> ${lead.serviceType}</p>
        <p><strong>Property:</strong> ${lead.propertyAddress || '—'}</p>
        <p><strong>Status:</strong> ${Util.statusBadge(lead.status)}</p>
        <p><strong>Date:</strong> ${Util.formatDate(lead.date)}</p>
        <p><strong>Notes:</strong> ${lead.notes || '—'}</p>
      </div>
      <div class="detail-actions">
        <button class="btn-sm btn-secondary" onclick="LeadsModule.updateStatus('${id}')">Update Status</button>
        ${lead.status !== 'Converted' ? `<button class="btn-sm btn-primary" onclick="LeadsModule.convertToAssignment('${id}')">Convert to Assignment</button>` : ''}
        <button class="btn-sm btn-danger" onclick="LeadsModule.deleteLead('${id}')">Delete</button>
      </div>
      <div class="detail-section" style="margin-top:1rem;">
        <h4>Lead Summary</h4>
        <p class="lead-summary">${lead.serviceType} appraisal request for ${lead.propertyAddress || 'address pending'}. Client: ${lead.clientName}${lead.notes ? '. ' + lead.notes : ''}</p>
      </div>
    `;
    AdminApp.showDetail('Lead Details', body);
  },

  updateStatus(id) {
    const lead = DB.getAll('leads').find(l => l.id === id);
    if (!lead) return;
    const body = `
      <div class="form-group">
        <label>Current Status: ${Util.statusBadge(lead.status)}</label>
        <select id="lead-new-status">
          <option value="New" ${lead.status==='New'?'selected':''}>New</option>
          <option value="Contacted" ${lead.status==='Contacted'?'selected':''}>Contacted</option>
          <option value="Quoted" ${lead.status==='Quoted'?'selected':''}>Quoted</option>
          <option value="Converted" ${lead.status==='Converted'?'selected':''}>Converted</option>
          <option value="Lost" ${lead.status==='Lost'?'selected':''}>Lost</option>
        </select>
      </div>
    `;
    const footer = `<button class="btn-primary" onclick="LeadsModule.saveStatus('${id}')">Update</button>`;
    AdminApp.showModal('Update Lead Status', body, footer);
  },

  saveStatus(id) {
    const newStatus = document.getElementById('lead-new-status').value;
    DB.update('leads', id, {status: newStatus});
    DB.addActivity(`Lead status updated to ${newStatus}`);
    AdminApp.closeModal();
    AdminApp.closeDetail();
    AdminApp.toast('Status updated', 'success');
    this.render();
  },

  convertToAssignment(id) {
    const lead = DB.getAll('leads').find(l => l.id === id);
    if (!lead) return;
    const body = `
      <form id="convert-form" class="admin-form">
        <div class="form-group"><label>Client Name</label><input type="text" id="conv-name" value="${lead.clientName}"></div>
        <div class="form-group"><label>Property Address</label><input type="text" id="conv-address" value="${lead.propertyAddress || ''}"></div>
        <div class="form-row">
          <div class="form-group"><label>Service Type</label>
            <select id="conv-type">
              ${['Current Value','Divorce','Estate','Retrospective','New Construction','FHA','Green Home','Other'].map(t => `<option value="${t}" ${t===lead.serviceType?'selected':''}>${t}</option>`).join('')}
            </select>
          </div>
          <div class="form-group"><label>Fee ($)</label><input type="number" id="conv-fee" placeholder="0.00" step="0.01"></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Due Date</label><input type="date" id="conv-due"></div>
          <div class="form-group"><label>Priority</label>
            <select id="conv-priority"><option>Standard</option><option>Rush</option><option>Complex</option></select>
          </div>
        </div>
        <div class="form-group"><label>Notes</label><textarea id="conv-notes" rows="2">${lead.notes || ''}</textarea></div>
      </form>
    `;
    const footer = `<button class="btn-primary" onclick="LeadsModule.saveConversion('${id}')">Create Assignment</button>`;
    AdminApp.showModal('Convert Lead to Assignment', body, footer);
  },

  saveConversion(leadId) {
    const lead = DB.getAll('leads').find(l => l.id === leadId);
    // Check/create client
    let clients = DB.getAll('clients');
    let client = clients.find(c => c.email === lead.email);
    if (!client && lead.email) {
      client = {id: Util.id(), name: lead.clientName, email: lead.email, phone: lead.phone, type: 'Other', notes: ''};
      DB.add('clients', client);
    }

    const assignment = {
      id: Util.id(),
      assignmentNumber: Util.nextAssignmentNumber(),
      clientId: client?.id || '',
      clientName: document.getElementById('conv-name').value.trim(),
      clientEmail: lead.email || '',
      propertyAddress: document.getElementById('conv-address').value.trim(),
      serviceType: document.getElementById('conv-type').value,
      fee: parseFloat(document.getElementById('conv-fee').value) || 0,
      status: 'Accepted',
      priority: document.getElementById('conv-priority').value,
      dueDate: document.getElementById('conv-due').value,
      createdDate: new Date().toISOString().split('T')[0],
      notes: document.getElementById('conv-notes').value.trim(),
      reportStatus: 'Not Started',
      paymentStatus: 'Unpaid'
    };
    DB.add('assignments', assignment);
    DB.update('leads', leadId, {status: 'Converted'});
    DB.addActivity(`Lead converted to assignment ${assignment.assignmentNumber}: ${assignment.clientName}`);
    AdminApp.closeModal();
    AdminApp.closeDetail();
    AdminApp.toast(`Assignment ${assignment.assignmentNumber} created`, 'success');
    AdminApp.navigateTo('assignments');
  },

  deleteLead(id) {
    if (confirm('Delete this lead?')) {
      DB.remove('leads', id);
      AdminApp.closeDetail();
      AdminApp.toast('Lead deleted', 'info');
      this.render();
    }
  }
};

// =====================================================
// ASSIGNMENTS MODULE
// =====================================================
const AssignmentsModule = {
  statuses: ['Accepted', 'Scheduled', 'Inspected', 'In Review', 'Report Complete', 'Awaiting Payment', 'Delivered'],

  render() {
    const assignments = DB.getAll('assignments');
    const statusFilter = document.getElementById('assignments-filter-status')?.value || 'all';
    let filtered = assignments.filter(a => a.status !== 'Delivered');
    if (statusFilter !== 'all') filtered = filtered.filter(a => a.status === statusFilter);
    filtered.sort((a, b) => new Date(b.createdDate) - new Date(a.createdDate));

    const container = document.getElementById('assignments-list');
    container.innerHTML = filtered.length ? filtered.map(a => {
      const statusIdx = this.statuses.indexOf(a.status);
      const pipelineHTML = this.statuses.slice(0, -1).map((s, i) => {
        let cls = i < statusIdx ? 'completed' : (i === statusIdx ? 'current' : '');
        return `<div class="pipeline-step ${cls}"><div class="pipeline-dot"></div><span class="pipeline-label">${s}</span></div>`;
      }).join('');

      return `
        <div class="assignment-card">
          <div class="assignment-header">
            <div>
              <span class="assignment-number">${a.assignmentNumber}</span>
              <span class="assignment-type">${a.serviceType}</span>
              ${a.priority === 'Rush' ? '<span class="badge badge-red">Rush</span>' : ''}
              ${a.priority === 'Complex' ? '<span class="badge badge-orange">Complex</span>' : ''}
            </div>
            <div>${Util.statusBadge(a.status)}</div>
          </div>
          <div class="assignment-details">
            <p><strong>${a.clientName}</strong> · ${a.propertyAddress}</p>
            <p>Fee: ${Util.currency(a.fee)} · Due: ${Util.formatDate(a.dueDate)} · Payment: ${Util.statusBadge(a.paymentStatus || 'Unpaid')}</p>
          </div>
          <div class="pipeline">${pipelineHTML}</div>
          <div class="assignment-actions">
            <button class="btn-sm btn-primary" onclick="AssignmentsModule.advanceStatus('${a.id}')">Advance Status</button>
            <button class="btn-sm btn-secondary" onclick="AssignmentsModule.showDetail('${a.id}')">Details</button>
            <button class="btn-sm btn-secondary" onclick="AssignmentsModule.addNote('${a.id}')">Add Note</button>
            <button class="btn-sm btn-secondary" onclick="MileageModule.showLogModal('${a.id}')">Log Mileage</button>
            <button class="btn-sm btn-secondary" onclick="InvoicesModule.showCreateModal('${a.id}')">Invoice</button>
          </div>
        </div>
      `;
    }).join('') : '<p class="empty-state">No active assignments</p>';
  },

  showAddModal() {
    const clients = DB.getAll('clients');
    const body = `
      <form class="admin-form">
        <div class="form-row">
          <div class="form-group"><label>Client</label>
            <select id="asgn-client">
              <option value="">Select client or add new</option>
              ${clients.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
              <option value="new">+ Add New Client</option>
            </select>
          </div>
          <div class="form-group"><label>Service Type</label>
            <select id="asgn-type">
              ${['Current Value','Divorce','Estate','Retrospective','New Construction','FHA','Green Home','Other'].map(t => `<option>${t}</option>`).join('')}
            </select>
          </div>
        </div>
        <div id="new-client-fields" style="display:none;">
          <div class="form-row">
            <div class="form-group"><label>Client Name</label><input type="text" id="asgn-client-name"></div>
            <div class="form-group"><label>Client Email</label><input type="email" id="asgn-client-email"></div>
          </div>
          <div class="form-group"><label>Client Phone</label><input type="tel" id="asgn-client-phone"></div>
        </div>
        <div class="form-group"><label>Property Address *</label><input type="text" id="asgn-address" required></div>
        <div class="form-row">
          <div class="form-group"><label>Fee ($)</label><input type="number" id="asgn-fee" step="0.01"></div>
          <div class="form-group"><label>Due Date</label><input type="date" id="asgn-due"></div>
          <div class="form-group"><label>Priority</label>
            <select id="asgn-priority"><option>Standard</option><option>Rush</option><option>Complex</option></select>
          </div>
        </div>
        <div class="form-group"><label>Lender (if applicable)</label><input type="text" id="asgn-lender"></div>
        <div class="form-group"><label>Notes</label><textarea id="asgn-notes" rows="3"></textarea></div>
      </form>
      <script>document.getElementById('asgn-client').addEventListener('change',function(){document.getElementById('new-client-fields').style.display=this.value==='new'?'block':'none';});</script>
    `;
    const footer = `<button class="btn-primary" onclick="AssignmentsModule.saveAssignment()">Create Assignment</button>`;
    AdminApp.showModal('New Assignment', body, footer);
    // Rebind the client dropdown after modal opens
    setTimeout(() => {
      document.getElementById('asgn-client')?.addEventListener('change', function() {
        document.getElementById('new-client-fields').style.display = this.value === 'new' ? 'block' : 'none';
      });
    }, 100);
  },

  saveAssignment() {
    const address = document.getElementById('asgn-address').value.trim();
    if (!address) { AdminApp.toast('Property address required', 'error'); return; }

    let clientName = '', clientEmail = '', clientId = '';
    const clientSelect = document.getElementById('asgn-client').value;
    if (clientSelect === 'new') {
      clientName = document.getElementById('asgn-client-name').value.trim();
      clientEmail = document.getElementById('asgn-client-email').value.trim();
      if (clientName) {
        const newClient = {id: Util.id(), name: clientName, email: clientEmail, phone: document.getElementById('asgn-client-phone').value.trim(), type: 'Other', notes: ''};
        DB.add('clients', newClient);
        clientId = newClient.id;
      }
    } else if (clientSelect) {
      const client = DB.getAll('clients').find(c => c.id === clientSelect);
      if (client) { clientName = client.name; clientEmail = client.email; clientId = client.id; }
    }

    const assignment = {
      id: Util.id(),
      assignmentNumber: Util.nextAssignmentNumber(),
      clientId, clientName, clientEmail,
      propertyAddress: address,
      serviceType: document.getElementById('asgn-type').value,
      fee: parseFloat(document.getElementById('asgn-fee').value) || 0,
      status: 'Accepted',
      priority: document.getElementById('asgn-priority').value,
      dueDate: document.getElementById('asgn-due').value,
      createdDate: new Date().toISOString().split('T')[0],
      lender: document.getElementById('asgn-lender').value.trim(),
      notes: document.getElementById('asgn-notes').value.trim(),
      reportStatus: 'Not Started',
      paymentStatus: 'Unpaid'
    };
    DB.add('assignments', assignment);
    DB.addActivity(`New assignment ${assignment.assignmentNumber}: ${assignment.serviceType} — ${clientName || 'No client'}`);
    AdminApp.closeModal();
    AdminApp.toast(`Assignment ${assignment.assignmentNumber} created`, 'success');
    this.render();
  },

  advanceStatus(id) {
    const a = DB.getAll('assignments').find(x => x.id === id);
    if (!a) return;
    const idx = this.statuses.indexOf(a.status);
    if (idx < this.statuses.length - 1) {
      const newStatus = this.statuses[idx + 1];
      const updates = {status: newStatus};
      if (newStatus === 'Delivered') {
        updates.completedDate = new Date().toISOString().split('T')[0];
        updates.reportStatus = 'Delivered';
      }
      if (newStatus === 'Report Complete') updates.reportStatus = 'Complete';
      if (newStatus === 'Awaiting Payment') updates.reportStatus = 'Ready for Delivery';
      DB.update('assignments', id, updates);
      DB.addActivity(`Assignment ${a.assignmentNumber} status → ${newStatus}`);
      AdminApp.toast(`Status advanced to ${newStatus}`, 'success');
      this.render();
    }
  },

  showDetail(id) {
    const a = DB.getAll('assignments').find(x => x.id === id);
    if (!a) return;
    const mileageEntries = DB.getAll('mileage').filter(m => m.assignmentId === id);
    const invoiceEntries = DB.getAll('invoices').filter(i => i.assignmentId === id);
    const body = `
      <div class="detail-section">
        <h4>${a.assignmentNumber}</h4>
        <p><strong>Client:</strong> ${a.clientName} (${a.clientEmail || '—'})</p>
        <p><strong>Property:</strong> ${a.propertyAddress}</p>
        <p><strong>Service:</strong> ${a.serviceType}</p>
        <p><strong>Fee:</strong> ${Util.currency(a.fee)}</p>
        <p><strong>Status:</strong> ${Util.statusBadge(a.status)}</p>
        <p><strong>Priority:</strong> ${a.priority || 'Standard'}</p>
        <p><strong>Due:</strong> ${Util.formatDate(a.dueDate)}</p>
        <p><strong>Created:</strong> ${Util.formatDate(a.createdDate)}</p>
        ${a.completedDate ? `<p><strong>Completed:</strong> ${Util.formatDate(a.completedDate)}</p>` : ''}
        ${a.lender ? `<p><strong>Lender:</strong> ${a.lender}</p>` : ''}
        <p><strong>Report:</strong> ${Util.statusBadge(a.reportStatus || 'Not Started')}</p>
        <p><strong>Payment:</strong> ${Util.statusBadge(a.paymentStatus || 'Unpaid')}</p>
        <p><strong>Notes:</strong> ${a.notes || '—'}</p>
      </div>
      ${mileageEntries.length ? `<div class="detail-section"><h4>Mileage (${mileageEntries.length} trips, ${mileageEntries.reduce((s,m)=>s+m.totalMiles,0)} mi)</h4>${mileageEntries.map(m=>`<p>${Util.formatDate(m.date)}: ${m.totalMiles} mi — ${m.notes||''}</p>`).join('')}</div>` : ''}
      ${invoiceEntries.length ? `<div class="detail-section"><h4>Invoices</h4>${invoiceEntries.map(i=>`<p>${i.invoiceNumber}: ${Util.currency(i.total)} — ${Util.statusBadge(i.status)}</p>`).join('')}</div>` : ''}
      <div class="detail-actions" style="margin-top:1rem;">
        <button class="btn-sm btn-primary" onclick="AssignmentsModule.advanceStatus('${id}')">Advance Status</button>
        <button class="btn-sm btn-secondary" onclick="AssignmentsModule.editAssignment('${id}')">Edit</button>
        <button class="btn-sm btn-danger" onclick="AssignmentsModule.deleteAssignment('${id}')">Delete</button>
      </div>
    `;
    AdminApp.showDetail('Assignment Details', body);
  },

  editAssignment(id) {
    const a = DB.getAll('assignments').find(x => x.id === id);
    if (!a) return;
    AdminApp.closeDetail();
    const body = `
      <form class="admin-form">
        <div class="form-group"><label>Client Name</label><input type="text" id="edit-asgn-name" value="${a.clientName}"></div>
        <div class="form-group"><label>Property Address</label><input type="text" id="edit-asgn-address" value="${a.propertyAddress}"></div>
        <div class="form-row">
          <div class="form-group"><label>Service Type</label>
            <select id="edit-asgn-type">${['Current Value','Divorce','Estate','Retrospective','New Construction','FHA','Green Home','Other'].map(t=>`<option ${t===a.serviceType?'selected':''}>${t}</option>`).join('')}</select>
          </div>
          <div class="form-group"><label>Fee</label><input type="number" id="edit-asgn-fee" value="${a.fee}" step="0.01"></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Status</label>
            <select id="edit-asgn-status">${this.statuses.map(s=>`<option ${s===a.status?'selected':''}>${s}</option>`).join('')}</select>
          </div>
          <div class="form-group"><label>Due Date</label><input type="date" id="edit-asgn-due" value="${a.dueDate||''}"></div>
        </div>
        <div class="form-group"><label>Priority</label>
          <select id="edit-asgn-priority">${['Standard','Rush','Complex'].map(p=>`<option ${p===a.priority?'selected':''}>${p}</option>`).join('')}</select>
        </div>
        <div class="form-group"><label>Notes</label><textarea id="edit-asgn-notes" rows="3">${a.notes||''}</textarea></div>
      </form>
    `;
    const footer = `<button class="btn-primary" onclick="AssignmentsModule.saveEdit('${id}')">Save Changes</button>`;
    AdminApp.showModal('Edit Assignment', body, footer);
  },

  saveEdit(id) {
    const updates = {
      clientName: document.getElementById('edit-asgn-name').value.trim(),
      propertyAddress: document.getElementById('edit-asgn-address').value.trim(),
      serviceType: document.getElementById('edit-asgn-type').value,
      fee: parseFloat(document.getElementById('edit-asgn-fee').value) || 0,
      status: document.getElementById('edit-asgn-status').value,
      dueDate: document.getElementById('edit-asgn-due').value,
      priority: document.getElementById('edit-asgn-priority').value,
      notes: document.getElementById('edit-asgn-notes').value.trim()
    };
    if (updates.status === 'Delivered' && !DB.getAll('assignments').find(a=>a.id===id)?.completedDate) {
      updates.completedDate = new Date().toISOString().split('T')[0];
    }
    DB.update('assignments', id, updates);
    DB.addActivity(`Assignment updated`);
    AdminApp.closeModal();
    AdminApp.toast('Assignment updated', 'success');
    this.render();
  },

  addNote(id) {
    const a = DB.getAll('assignments').find(x => x.id === id);
    if (!a) return;
    const body = `<div class="form-group"><label>Add Note</label><textarea id="note-text" rows="4" placeholder="Enter note..."></textarea></div>
      <div class="detail-section"><h4>Existing Notes</h4><p>${a.notes || 'No notes yet'}</p></div>`;
    const footer = `<button class="btn-primary" onclick="AssignmentsModule.saveNote('${id}')">Save Note</button>`;
    AdminApp.showModal('Add Note', body, footer);
  },

  saveNote(id) {
    const note = document.getElementById('note-text').value.trim();
    if (!note) return;
    const a = DB.getAll('assignments').find(x => x.id === id);
    const existing = a?.notes || '';
    const timestamp = new Date().toLocaleString();
    DB.update('assignments', id, {notes: existing + (existing ? '\n' : '') + `[${timestamp}] ${note}`});
    AdminApp.closeModal();
    AdminApp.toast('Note added', 'success');
  },

  deleteAssignment(id) {
    if (confirm('Delete this assignment? This cannot be undone.')) {
      DB.remove('assignments', id);
      AdminApp.closeDetail();
      AdminApp.toast('Assignment deleted', 'info');
      this.render();
    }
  }
};

// =====================================================
// COMPLETED MODULE
// =====================================================
const CompletedModule = {
  render() {
    const assignments = DB.getAll('assignments').filter(a => a.status === 'Delivered');
    assignments.sort((a, b) => new Date(b.completedDate || b.createdDate) - new Date(a.completedDate || a.createdDate));
    const invoices = DB.getAll('invoices');

    const tbody = document.getElementById('completed-tbody');
    tbody.innerHTML = assignments.length ? assignments.map(a => {
      const inv = invoices.find(i => i.assignmentId === a.id);
      return `
        <tr>
          <td>${a.assignmentNumber}</td>
          <td>${a.clientName}</td>
          <td>${a.propertyAddress}</td>
          <td>${Util.formatDate(a.completedDate)}</td>
          <td>${Util.currency(a.fee)}</td>
          <td>${Util.statusBadge(a.paymentStatus || (inv?.status || 'Unpaid'))}</td>
          <td>${Util.statusBadge(a.reportStatus || 'Delivered')}</td>
          <td>${a.reviewRequested ? '✓ Sent' : '<button class="btn-sm btn-secondary" onclick="CompletedModule.requestReview(\''+a.id+'\')">Request</button>'}</td>
          <td><button class="btn-sm btn-secondary" onclick="AssignmentsModule.showDetail('${a.id}')">View</button></td>
        </tr>
      `;
    }).join('') : '<tr><td colspan="9" class="empty-state">No completed assignments</td></tr>';
  },

  requestReview(id) {
    DB.update('assignments', id, {reviewRequested: true});
    DB.addActivity('Review request sent for assignment');
    AdminApp.toast('Review request sent (simulated)', 'success');
    this.render();
  }
};

// =====================================================
// INVOICES MODULE
// =====================================================
const InvoicesModule = {
  currentTab: 'invoices',

  render() {
    this.renderInvoicesTab();
    this.renderOverviewTab();
  },

  showTab(tab) {
    this.currentTab = tab;
    document.querySelectorAll('#section-invoices .tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('#section-invoices .tab-content').forEach(t => t.classList.remove('active'));
    document.getElementById(tab + '-tab').classList.add('active');
    event.target.classList.add('active');
  },

  renderInvoicesTab() {
    const invoices = DB.getAll('invoices');
    // Check for overdue
    const today = new Date();
    invoices.forEach(inv => {
      if (inv.status === 'Sent' && inv.dueDate && new Date(inv.dueDate) < today) {
        DB.update('invoices', inv.id, {status: 'Overdue'});
        inv.status = 'Overdue';
      }
    });
    invoices.sort((a, b) => new Date(b.date) - new Date(a.date));

    const tbody = document.getElementById('invoices-tbody');
    tbody.innerHTML = invoices.length ? invoices.map(i => `
      <tr>
        <td><a href="#" onclick="InvoicesModule.viewInvoice('${i.id}'); return false;">${i.invoiceNumber}</a></td>
        <td>${Util.formatDate(i.date)}</td>
        <td>${i.clientName}</td>
        <td>${i.assignmentNumber || '—'}</td>
        <td>${Util.currency(i.total)}</td>
        <td>${Util.statusBadge(i.status)}</td>
        <td>${Util.formatDate(i.dueDate)}</td>
        <td class="actions-cell">
          ${i.status !== 'Paid' ? `<button class="btn-sm btn-primary" onclick="InvoicesModule.markPaid('${i.id}')">Mark Paid</button>` : ''}
          ${i.status === 'Sent' || i.status === 'Overdue' ? `<button class="btn-sm btn-secondary" onclick="InvoicesModule.sendReminder('${i.id}')">Remind</button>` : ''}
          <button class="btn-sm btn-secondary" onclick="InvoicesModule.viewInvoice('${i.id}')">View</button>
        </td>
      </tr>
    `).join('') : '<tr><td colspan="8" class="empty-state">No invoices</td></tr>';
  },

  renderOverviewTab() {
    const invoices = DB.getAll('invoices');
    const now = new Date();
    const thisYear = now.getFullYear();
    const thisMonth = now.getMonth();

    const paid = invoices.filter(i => i.status === 'Paid');
    const totalRevenue = paid.reduce((s, i) => s + (i.total || 0), 0);
    const yearRevenue = paid.filter(i => new Date(i.paidDate).getFullYear() === thisYear).reduce((s, i) => s + (i.total || 0), 0);
    const monthRevenue = paid.filter(i => { const d = new Date(i.paidDate); return d.getMonth() === thisMonth && d.getFullYear() === thisYear; }).reduce((s, i) => s + (i.total || 0), 0);
    const unpaidTotal = invoices.filter(i => i.status !== 'Paid').reduce((s, i) => s + (i.total || 0), 0);
    const overdueTotal = invoices.filter(i => i.status === 'Overdue').reduce((s, i) => s + (i.total || 0), 0);

    document.getElementById('ov-total-revenue').textContent = Util.currency(totalRevenue);
    document.getElementById('ov-year-revenue').textContent = Util.currency(yearRevenue);
    document.getElementById('ov-month-revenue').textContent = Util.currency(monthRevenue);
    document.getElementById('ov-unpaid').textContent = Util.currency(unpaidTotal);
    document.getElementById('ov-overdue').textContent = Util.currency(overdueTotal);

    AdminApp.renderRevenueChart('revenue-overview-chart', invoices);
  },

  showCreateModal(assignmentId) {
    const assignments = DB.getAll('assignments');
    const selected = assignmentId ? assignments.find(a => a.id === assignmentId) : null;
    const settings = DB.get('settings') || {};
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + (settings.dueDays || 15));

    const body = `
      <form class="admin-form">
        <div class="form-group"><label>Link to Assignment</label>
          <select id="inv-assignment" onchange="InvoicesModule.prefillFromAssignment()">
            <option value="">Select assignment</option>
            ${assignments.filter(a=>a.status!=='Delivered').map(a => `<option value="${a.id}" ${a.id===assignmentId?'selected':''}>${a.assignmentNumber} — ${a.clientName}</option>`).join('')}
          </select>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Invoice #</label><input type="text" id="inv-number" value="${Util.nextInvoiceNumber()}" readonly></div>
          <div class="form-group"><label>Date</label><input type="date" id="inv-date" value="${new Date().toISOString().split('T')[0]}"></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Client Name</label><input type="text" id="inv-client" value="${selected?.clientName||''}"></div>
          <div class="form-group"><label>Client Email</label><input type="email" id="inv-email" value="${selected?.clientEmail||''}"></div>
        </div>
        <div id="inv-line-items">
          <label>Line Items</label>
          <div class="line-item-row">
            <input type="text" class="line-desc" placeholder="Description" value="${selected ? selected.serviceType+' Appraisal — '+selected.propertyAddress : ''}">
            <input type="number" class="line-amount" placeholder="Amount" value="${selected?.fee||''}" step="0.01" onchange="InvoicesModule.calcTotal()">
          </div>
        </div>
        <button type="button" class="btn-sm btn-secondary" onclick="InvoicesModule.addLineItem()" style="margin:0.5rem 0;">+ Add Line Item</button>
        <div class="form-row">
          <div class="form-group"><label>Total</label><input type="text" id="inv-total" value="${selected ? Util.currency(selected.fee) : '$0.00'}" readonly></div>
          <div class="form-group"><label>Due Date</label><input type="date" id="inv-due" value="${dueDate.toISOString().split('T')[0]}"></div>
        </div>
        <div class="form-group"><label>Payment Instructions</label><textarea id="inv-instructions" rows="2">${settings.paymentInstructions || ''}</textarea></div>
        <div class="form-group"><label>Notes</label><textarea id="inv-notes" rows="2"></textarea></div>
      </form>
    `;
    const footer = `<button class="btn-primary" onclick="InvoicesModule.saveInvoice()">Create Invoice</button>`;
    AdminApp.showModal('Create Invoice', body, footer);
    if (selected) setTimeout(() => this.calcTotal(), 100);
  },

  prefillFromAssignment() {
    const aId = document.getElementById('inv-assignment').value;
    if (!aId) return;
    const a = DB.getAll('assignments').find(x => x.id === aId);
    if (!a) return;
    document.getElementById('inv-client').value = a.clientName;
    document.getElementById('inv-email').value = a.clientEmail || '';
    const items = document.getElementById('inv-line-items');
    items.innerHTML = `<label>Line Items</label><div class="line-item-row"><input type="text" class="line-desc" placeholder="Description" value="${a.serviceType} Appraisal — ${a.propertyAddress}"><input type="number" class="line-amount" placeholder="Amount" value="${a.fee}" step="0.01" onchange="InvoicesModule.calcTotal()"></div>`;
    this.calcTotal();
  },

  addLineItem() {
    const container = document.getElementById('inv-line-items');
    const row = document.createElement('div');
    row.className = 'line-item-row';
    row.innerHTML = '<input type="text" class="line-desc" placeholder="Description"><input type="number" class="line-amount" placeholder="Amount" step="0.01" onchange="InvoicesModule.calcTotal()"><button type="button" class="btn-sm btn-danger" onclick="this.parentElement.remove(); InvoicesModule.calcTotal();">&times;</button>';
    container.appendChild(row);
  },

  calcTotal() {
    const amounts = [...document.querySelectorAll('.line-amount')].map(el => parseFloat(el.value) || 0);
    const total = amounts.reduce((s, a) => s + a, 0);
    document.getElementById('inv-total').value = Util.currency(total);
  },

  saveInvoice() {
    const items = [...document.querySelectorAll('.line-item-row')].map(row => ({
      description: row.querySelector('.line-desc').value,
      amount: parseFloat(row.querySelector('.line-amount').value) || 0
    }));
    const total = items.reduce((s, i) => s + i.amount, 0);
    const assignmentId = document.getElementById('inv-assignment').value || null;
    const assignmentNumber = assignmentId ? DB.getAll('assignments').find(a=>a.id===assignmentId)?.assignmentNumber : '';

    const invoice = {
      id: Util.id(),
      invoiceNumber: document.getElementById('inv-number').value,
      date: document.getElementById('inv-date').value,
      clientName: document.getElementById('inv-client').value.trim(),
      clientEmail: document.getElementById('inv-email').value.trim(),
      assignmentId,
      assignmentNumber,
      items, total,
      status: 'Sent',
      dueDate: document.getElementById('inv-due').value,
      paymentInstructions: document.getElementById('inv-instructions').value.trim(),
      notes: document.getElementById('inv-notes').value.trim()
    };
    DB.add('invoices', invoice);
    if (assignmentId) {
      DB.update('assignments', assignmentId, {paymentStatus: 'Invoiced'});
    }
    DB.addActivity(`Invoice ${invoice.invoiceNumber} created: ${Util.currency(total)} — ${invoice.clientName}`);
    AdminApp.closeModal();
    AdminApp.toast(`Invoice ${invoice.invoiceNumber} created`, 'success');
    this.render();
  },

  markPaid(id) {
    const body = `
      <div class="form-group"><label>Payment Method</label>
        <select id="pay-method"><option>Stripe</option><option>Zelle</option><option>Check</option><option>ACH</option><option>Other</option></select>
      </div>
      <div class="form-group"><label>Payment Date</label><input type="date" id="pay-date" value="${new Date().toISOString().split('T')[0]}"></div>
    `;
    const footer = `<button class="btn-primary" onclick="InvoicesModule.confirmPaid('${id}')">Confirm Payment</button>`;
    AdminApp.showModal('Mark as Paid', body, footer);
  },

  confirmPaid(id) {
    const method = document.getElementById('pay-method').value;
    const paidDate = document.getElementById('pay-date').value;
    const invoice = DB.getAll('invoices').find(i => i.id === id);
    DB.update('invoices', id, {status: 'Paid', paidDate, paymentMethod: method});
    if (invoice?.assignmentId) {
      DB.update('assignments', invoice.assignmentId, {paymentStatus: 'Paid'});
    }
    DB.addActivity(`Payment received: ${invoice?.invoiceNumber} — ${Util.currency(invoice?.total)} via ${method}`);
    AdminApp.closeModal();
    AdminApp.toast('Payment recorded', 'success');
    this.render();
  },

  sendReminder(id) {
    const inv = DB.getAll('invoices').find(i => i.id === id);
    DB.addActivity(`Payment reminder sent: ${inv?.invoiceNumber} to ${inv?.clientEmail}`);
    AdminApp.toast('Payment reminder sent (simulated)', 'success');
  },

  viewInvoice(id) {
    const inv = DB.getAll('invoices').find(i => i.id === id);
    if (!inv) return;
    const settings = DB.get('settings') || {};
    const body = `
      <div class="invoice-preview">
        <div style="text-align:center; margin-bottom:2rem;">
          <h2 style="color:#1B2A4A; margin:0;">${settings.bizName || 'Designer Homes Real Estate Services'}</h2>
          <p style="color:#5A6275;">${settings.bizPhone || ''} · ${settings.bizEmail || 'info@designerhomesre.com'} · License #${settings.license || 'A9156'}</p>
        </div>
        <div style="display:flex; justify-content:space-between; margin-bottom:1.5rem;">
          <div><strong>Bill To:</strong><br>${inv.clientName}<br>${inv.clientEmail || ''}</div>
          <div style="text-align:right;"><strong>Invoice ${inv.invoiceNumber}</strong><br>Date: ${Util.formatDate(inv.date)}<br>Due: ${Util.formatDate(inv.dueDate)}<br>Status: ${Util.statusBadge(inv.status)}</div>
        </div>
        <table style="width:100%; border-collapse:collapse; margin-bottom:1.5rem;">
          <thead><tr style="border-bottom:2px solid #1B2A4A;"><th style="text-align:left; padding:0.5rem;">Description</th><th style="text-align:right; padding:0.5rem;">Amount</th></tr></thead>
          <tbody>${inv.items.map(item => `<tr style="border-bottom:1px solid #E2E5EB;"><td style="padding:0.5rem;">${item.description}</td><td style="text-align:right; padding:0.5rem;">${Util.currency(item.amount)}</td></tr>`).join('')}</tbody>
          <tfoot><tr style="border-top:2px solid #1B2A4A;"><td style="padding:0.5rem;"><strong>Total</strong></td><td style="text-align:right; padding:0.5rem;"><strong>${Util.currency(inv.total)}</strong></td></tr></tfoot>
        </table>
        ${inv.paymentInstructions ? `<div style="background:#F7F8FA; padding:1rem; border-radius:0.5rem;"><strong>Payment Instructions:</strong><br>${inv.paymentInstructions}</div>` : ''}
        ${inv.status === 'Paid' ? `<div style="background:#2D8F5E22; padding:1rem; border-radius:0.5rem; margin-top:1rem; color:#2D8F5E;"><strong>PAID</strong> on ${Util.formatDate(inv.paidDate)} via ${inv.paymentMethod || 'N/A'}</div>` : ''}
      </div>
    `;
    const footer = `<button class="btn-secondary" onclick="window.print()">Print Invoice</button>`;
    AdminApp.showModal(`Invoice ${inv.invoiceNumber}`, body, footer);
  },

  exportCSV() {
    const invoices = DB.getAll('invoices');
    let csv = 'Invoice #,Date,Client,Assignment,Amount,Status,Due Date,Paid Date,Method\n';
    invoices.forEach(i => {
      csv += `${i.invoiceNumber},${i.date},${i.clientName},${i.assignmentNumber||''},${i.total},${i.status},${i.dueDate||''},${i.paidDate||''},${i.paymentMethod||''}\n`;
    });
    this.downloadCSV(csv, 'dhres-invoices.csv');
  },

  printReport() {
    window.print();
  },

  downloadCSV(csv, filename) {
    const blob = new Blob([csv], {type: 'text/csv'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    AdminApp.toast('CSV downloaded', 'success');
  }
};

// =====================================================
// MILEAGE MODULE
// =====================================================
const MileageModule = {
  render() {
    const entries = DB.getAll('mileage');
    const period = document.getElementById('mileage-period')?.value || 'month';
    const filtered = this.filterByPeriod(entries, period);

    // Summary
    const totalMiles = filtered.reduce((s, m) => s + (m.totalMiles || 0), 0);
    const totalDeduction = filtered.reduce((s, m) => s + (m.deduction || 0), 0);
    const tripCount = filtered.length;
    const avgMiles = tripCount > 0 ? Math.round(totalMiles / tripCount) : 0;

    document.getElementById('mi-total-miles').textContent = Math.round(totalMiles);
    document.getElementById('mi-total-deduction').textContent = Util.currency(totalDeduction);
    document.getElementById('mi-trip-count').textContent = tripCount;
    document.getElementById('mi-avg-miles').textContent = avgMiles;

    // Table
    filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
    const tbody = document.getElementById('mileage-tbody');
    tbody.innerHTML = filtered.length ? filtered.map(m => `
      <tr>
        <td>${Util.formatDate(m.date)}</td>
        <td>${m.assignmentNumber || '—'}</td>
        <td>${m.subjectAddress || '—'}</td>
        <td>${(m.comparables || []).filter(c=>c.visited).length} of ${(m.comparables||[]).length}</td>
        <td><strong>${m.totalMiles}</strong> mi${m.manualOverride ? ' *' : ''}</td>
        <td>${Util.currency(m.deduction)}</td>
        <td>${m.notes || ''}</td>
        <td class="actions-cell">
          <button class="btn-sm btn-secondary" onclick="MileageModule.editTrip('${m.id}')">Edit</button>
          <button class="btn-sm btn-danger" onclick="MileageModule.deleteTrip('${m.id}')">Delete</button>
        </td>
      </tr>
    `).join('') : '<tr><td colspan="8" class="empty-state">No mileage entries for this period</td></tr>';
  },

  filterByPeriod(entries, period) {
    const now = new Date();
    return entries.filter(m => {
      const d = new Date(m.date);
      switch(period) {
        case 'week': { const weekAgo = new Date(now.getTime() - 7*86400000); return d >= weekAgo; }
        case 'month': return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        case 'quarter': { const q = Math.floor(now.getMonth()/3); return Math.floor(d.getMonth()/3) === q && d.getFullYear() === now.getFullYear(); }
        case 'year': return d.getFullYear() === now.getFullYear();
        default: return true;
      }
    });
  },

  showLogModal(assignmentId) {
    const assignments = DB.getAll('assignments');
    const selected = assignmentId ? assignments.find(a => a.id === assignmentId) : null;
    const settings = DB.get('settings') || {};

    const body = `
      <form class="admin-form">
        <div class="form-row">
          <div class="form-group"><label>Assignment</label>
            <select id="mi-assignment" onchange="MileageModule.prefillAssignment()">
              <option value="">Select assignment</option>
              ${assignments.filter(a=>a.status!=='Delivered').map(a => `<option value="${a.id}" ${a.id===assignmentId?'selected':''}>${a.assignmentNumber} — ${a.clientName}</option>`).join('')}
            </select>
          </div>
          <div class="form-group"><label>Trip Date</label><input type="date" id="mi-date" value="${new Date().toISOString().split('T')[0]}"></div>
        </div>
        <div class="form-group"><label>Starting Location</label><input type="text" id="mi-start" value="${settings.startLocation || 'Durham, NC'}"></div>
        <div class="form-group"><label>Subject Property Address</label><input type="text" id="mi-subject" value="${selected?.propertyAddress || ''}" onchange="MileageModule.recalcMileage()"></div>
        <div id="mi-comps-container">
          <label>Comparable Properties Visited</label>
          <div class="comp-row">
            <input type="text" class="comp-address" placeholder="Comparable address">
            <label class="comp-visited"><input type="checkbox" class="comp-check" checked onchange="MileageModule.recalcMileage()"> Visited</label>
          </div>
        </div>
        <button type="button" class="btn-sm btn-secondary" onclick="MileageModule.addComp()" style="margin:0.5rem 0;">+ Add Comparable</button>

        <div class="form-row" style="margin-top:1rem;">
          <div class="form-group">
            <label>Route: Start → Subject → Comps → Return</label>
            <p id="mi-route-desc" style="color:#5A6275; font-size:0.875rem;">Enter stops and the system will estimate mileage</p>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group"><label>Estimated Mileage</label><input type="number" id="mi-estimated" value="0" readonly></div>
          <div class="form-group"><label><input type="checkbox" id="mi-override" onchange="MileageModule.toggleOverride()"> Manual Override</label><input type="number" id="mi-manual" placeholder="Enter actual miles" disabled></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>IRS Rate ($/mile)</label><input type="number" id="mi-rate" value="${settings.irsRate || 0.70}" step="0.005" readonly></div>
          <div class="form-group"><label>Estimated Deduction</label><input type="text" id="mi-deduction" value="$0.00" readonly></div>
        </div>
        <div class="form-group"><label>Notes</label><textarea id="mi-notes" rows="2"></textarea></div>
      </form>
    `;
    const footer = `<button class="btn-primary" onclick="MileageModule.saveTrip()">Save Trip</button>`;
    AdminApp.showModal('Log Mileage Trip', body, footer);
    if (selected) setTimeout(() => this.recalcMileage(), 100);
  },

  addComp() {
    const container = document.getElementById('mi-comps-container');
    const row = document.createElement('div');
    row.className = 'comp-row';
    row.innerHTML = '<input type="text" class="comp-address" placeholder="Comparable address"><label class="comp-visited"><input type="checkbox" class="comp-check" checked onchange="MileageModule.recalcMileage()"> Visited</label><button type="button" class="btn-sm btn-danger" onclick="this.parentElement.remove(); MileageModule.recalcMileage();">&times;</button>';
    container.appendChild(row);
  },

  prefillAssignment() {
    const aId = document.getElementById('mi-assignment').value;
    if (!aId) return;
    const a = DB.getAll('assignments').find(x => x.id === aId);
    if (a) {
      document.getElementById('mi-subject').value = a.propertyAddress || '';
      this.recalcMileage();
    }
  },

  toggleOverride() {
    const override = document.getElementById('mi-override').checked;
    document.getElementById('mi-manual').disabled = !override;
    if (!override) {
      document.getElementById('mi-manual').value = '';
      this.recalcMileage();
    }
  },

  recalcMileage() {
    const visitedCount = [...document.querySelectorAll('.comp-check')].filter(c => c.checked).length;
    const estimated = Util.estimateMileage(visitedCount);
    document.getElementById('mi-estimated').value = estimated;

    const override = document.getElementById('mi-override').checked;
    const miles = override ? (parseFloat(document.getElementById('mi-manual').value) || estimated) : estimated;
    const rate = parseFloat(document.getElementById('mi-rate').value) || 0.70;
    document.getElementById('mi-deduction').value = Util.currency(miles * rate);

    // Route description
    const start = document.getElementById('mi-start').value || 'Office';
    const subject = document.getElementById('mi-subject').value || 'Subject';
    const compAddrs = [...document.querySelectorAll('.comp-address')].map(el => el.value || 'Comp').filter((_, i) => document.querySelectorAll('.comp-check')[i]?.checked);
    const routeParts = [start, subject, ...compAddrs, start];
    document.getElementById('mi-route-desc').textContent = routeParts.join(' → ');
  },

  saveTrip() {
    const override = document.getElementById('mi-override').checked;
    const visitedCount = [...document.querySelectorAll('.comp-check')].filter(c => c.checked).length;
    const estimated = Util.estimateMileage(visitedCount);
    const miles = override ? (parseFloat(document.getElementById('mi-manual').value) || estimated) : estimated;
    const rate = parseFloat(document.getElementById('mi-rate').value) || 0.70;
    const assignmentId = document.getElementById('mi-assignment').value || null;
    const assignment = assignmentId ? DB.getAll('assignments').find(a => a.id === assignmentId) : null;

    const comps = [...document.querySelectorAll('.comp-row')].map(row => ({
      address: row.querySelector('.comp-address').value,
      visited: row.querySelector('.comp-check').checked
    }));

    const trip = {
      id: Util.id(),
      date: document.getElementById('mi-date').value,
      assignmentId,
      assignmentNumber: assignment?.assignmentNumber || '',
      subjectAddress: document.getElementById('mi-subject').value,
      startLocation: document.getElementById('mi-start').value,
      comparables: comps,
      totalMiles: miles,
      manualOverride: override,
      irsRate: rate,
      deduction: Math.round(miles * rate * 100) / 100,
      notes: document.getElementById('mi-notes').value.trim()
    };
    DB.add('mileage', trip);
    DB.addActivity(`Mileage logged: ${miles} miles${assignment ? ' for ' + assignment.assignmentNumber : ''}`);
    AdminApp.closeModal();
    AdminApp.toast(`Trip logged: ${miles} miles`, 'success');
    this.render();
  },

  editTrip(id) {
    const m = DB.getAll('mileage').find(x => x.id === id);
    if (!m) return;
    const settings = DB.get('settings') || {};
    const compsHTML = (m.comparables || []).map(c => `
      <div class="comp-row">
        <input type="text" class="comp-address" value="${c.address}" placeholder="Comparable address">
        <label class="comp-visited"><input type="checkbox" class="comp-check" ${c.visited?'checked':''} onchange="MileageModule.recalcMileage()"> Visited</label>
        <button type="button" class="btn-sm btn-danger" onclick="this.parentElement.remove(); MileageModule.recalcMileage();">&times;</button>
      </div>
    `).join('');

    const body = `
      <form class="admin-form">
        <div class="form-group"><label>Trip Date</label><input type="date" id="mi-date" value="${m.date}"></div>
        <div class="form-group"><label>Starting Location</label><input type="text" id="mi-start" value="${m.startLocation || settings.startLocation || 'Durham, NC'}"></div>
        <div class="form-group"><label>Subject Property</label><input type="text" id="mi-subject" value="${m.subjectAddress}" onchange="MileageModule.recalcMileage()"></div>
        <div id="mi-comps-container"><label>Comparables</label>${compsHTML}</div>
        <button type="button" class="btn-sm btn-secondary" onclick="MileageModule.addComp()" style="margin:0.5rem 0;">+ Add Comparable</button>
        <div class="form-row">
          <div class="form-group"><label>Estimated</label><input type="number" id="mi-estimated" value="${m.totalMiles}" readonly></div>
          <div class="form-group"><label><input type="checkbox" id="mi-override" ${m.manualOverride?'checked':''} onchange="MileageModule.toggleOverride()"> Manual Override</label><input type="number" id="mi-manual" value="${m.manualOverride?m.totalMiles:''}" ${m.manualOverride?'':'disabled'}></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>IRS Rate</label><input type="number" id="mi-rate" value="${m.irsRate || 0.70}" step="0.005" readonly></div>
          <div class="form-group"><label>Deduction</label><input type="text" id="mi-deduction" value="${Util.currency(m.deduction)}" readonly></div>
        </div>
        <p id="mi-route-desc" style="color:#5A6275;"></p>
        <div class="form-group"><label>Notes</label><textarea id="mi-notes" rows="2">${m.notes||''}</textarea></div>
      </form>
    `;
    const footer = `<button class="btn-primary" onclick="MileageModule.updateTrip('${id}')">Save Changes</button>`;
    AdminApp.showModal('Edit Mileage Trip', body, footer);
    setTimeout(() => this.recalcMileage(), 100);
  },

  updateTrip(id) {
    const override = document.getElementById('mi-override').checked;
    const visitedCount = [...document.querySelectorAll('.comp-check')].filter(c => c.checked).length;
    const estimated = Util.estimateMileage(visitedCount);
    const miles = override ? (parseFloat(document.getElementById('mi-manual').value) || estimated) : estimated;
    const rate = parseFloat(document.getElementById('mi-rate').value) || 0.70;
    const comps = [...document.querySelectorAll('.comp-row')].map(row => ({
      address: row.querySelector('.comp-address').value,
      visited: row.querySelector('.comp-check').checked
    }));

    DB.update('mileage', id, {
      date: document.getElementById('mi-date').value,
      startLocation: document.getElementById('mi-start').value,
      subjectAddress: document.getElementById('mi-subject').value,
      comparables: comps,
      totalMiles: miles,
      manualOverride: override,
      irsRate: rate,
      deduction: Math.round(miles * rate * 100) / 100,
      notes: document.getElementById('mi-notes').value.trim()
    });
    AdminApp.closeModal();
    AdminApp.toast('Trip updated', 'success');
    this.render();
  },

  deleteTrip(id) {
    if (confirm('Delete this mileage entry?')) {
      DB.remove('mileage', id);
      AdminApp.toast('Trip deleted', 'info');
      this.render();
    }
  },

  exportCSV() {
    const entries = DB.getAll('mileage');
    const period = document.getElementById('mileage-period')?.value || 'all';
    const filtered = period === 'all' ? entries : this.filterByPeriod(entries, period);
    let csv = 'Date,Assignment,Subject Property,Start Location,Stops Visited,Total Miles,IRS Rate,Deduction,Manual Override,Notes\n';
    filtered.forEach(m => {
      const visited = (m.comparables||[]).filter(c=>c.visited).length;
      csv += `${m.date},${m.assignmentNumber||''},${m.subjectAddress||''},${m.startLocation||''},${visited},${m.totalMiles},${m.irsRate},${m.deduction},${m.manualOverride?'Yes':'No'},${(m.notes||'').replace(/,/g,';')}\n`;
    });
    InvoicesModule.downloadCSV(csv, 'dhres-mileage-log.csv');
  },

  printLog() {
    window.print();
  }
};

// =====================================================
// CLIENTS MODULE
// =====================================================
const ClientsModule = {
  render() {
    const clients = DB.getAll('clients');
    const typeFilter = document.getElementById('clients-filter-type')?.value || 'all';
    let filtered = clients;
    if (typeFilter !== 'all') filtered = filtered.filter(c => c.type === typeFilter);

    const assignments = DB.getAll('assignments');
    const invoices = DB.getAll('invoices');

    const tbody = document.getElementById('clients-tbody');
    tbody.innerHTML = filtered.length ? filtered.map(c => {
      const clientAssignments = assignments.filter(a => a.clientId === c.id);
      const clientInvoices = invoices.filter(i => i.clientName === c.name && i.status === 'Paid');
      const revenue = clientInvoices.reduce((s, i) => s + (i.total || 0), 0);
      const lastActivity = clientAssignments.length ? clientAssignments.sort((a,b)=>new Date(b.createdDate)-new Date(a.createdDate))[0].createdDate : '';
      return `
        <tr>
          <td><a href="#" onclick="ClientsModule.showDetail('${c.id}'); return false;">${c.name}</a></td>
          <td>${c.email || ''}</td>
          <td>${c.phone || ''}</td>
          <td>${c.type || 'Other'}</td>
          <td>${clientAssignments.length}</td>
          <td>${Util.currency(revenue)}</td>
          <td>${Util.formatDate(lastActivity)}</td>
          <td><button class="btn-sm btn-secondary" onclick="ClientsModule.editClient('${c.id}')">Edit</button></td>
        </tr>
      `;
    }).join('') : '<tr><td colspan="8" class="empty-state">No clients found</td></tr>';
  },

  showAddModal() {
    const body = `
      <form class="admin-form">
        <div class="form-row">
          <div class="form-group"><label>Name *</label><input type="text" id="cl-name" required></div>
          <div class="form-group"><label>Email</label><input type="email" id="cl-email"></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Phone</label><input type="tel" id="cl-phone"></div>
          <div class="form-group"><label>Type</label>
            <select id="cl-type">${['Attorney','Homeowner','Estate Rep','CPA','Lender','Investor','Developer','Government','Other'].map(t=>`<option>${t}</option>`).join('')}</select>
          </div>
        </div>
        <div class="form-group"><label>Notes</label><textarea id="cl-notes" rows="3"></textarea></div>
      </form>
    `;
    const footer = `<button class="btn-primary" onclick="ClientsModule.saveClient()">Save Client</button>`;
    AdminApp.showModal('Add Client', body, footer);
  },

  saveClient() {
    const name = document.getElementById('cl-name').value.trim();
    if (!name) { AdminApp.toast('Name required', 'error'); return; }
    DB.add('clients', {
      id: Util.id(), name,
      email: document.getElementById('cl-email').value.trim(),
      phone: document.getElementById('cl-phone').value.trim(),
      type: document.getElementById('cl-type').value,
      notes: document.getElementById('cl-notes').value.trim()
    });
    AdminApp.closeModal();
    AdminApp.toast('Client added', 'success');
    this.render();
  },

  showDetail(id) {
    const c = DB.getAll('clients').find(x => x.id === id);
    if (!c) return;
    const assignments = DB.getAll('assignments').filter(a => a.clientId === id);
    const invoices = DB.getAll('invoices').filter(i => i.clientName === c.name);
    const body = `
      <div class="detail-section">
        <p><strong>Name:</strong> ${c.name}</p>
        <p><strong>Email:</strong> ${c.email || '—'}</p>
        <p><strong>Phone:</strong> ${c.phone || '—'}</p>
        <p><strong>Type:</strong> ${c.type}</p>
        <p><strong>Notes:</strong> ${c.notes || '—'}</p>
      </div>
      <div class="detail-section"><h4>Assignments (${assignments.length})</h4>
        ${assignments.map(a => `<p>${a.assignmentNumber}: ${a.serviceType} — ${Util.statusBadge(a.status)}</p>`).join('') || '<p>No assignments</p>'}
      </div>
      <div class="detail-section"><h4>Invoices (${invoices.length})</h4>
        ${invoices.map(i => `<p>${i.invoiceNumber}: ${Util.currency(i.total)} — ${Util.statusBadge(i.status)}</p>`).join('') || '<p>No invoices</p>'}
      </div>
      <div class="detail-actions"><button class="btn-sm btn-secondary" onclick="ClientsModule.editClient('${id}')">Edit</button><button class="btn-sm btn-danger" onclick="ClientsModule.deleteClient('${id}')">Delete</button></div>
    `;
    AdminApp.showDetail('Client Details', body);
  },

  editClient(id) {
    const c = DB.getAll('clients').find(x => x.id === id);
    if (!c) return;
    const body = `
      <form class="admin-form">
        <div class="form-row">
          <div class="form-group"><label>Name</label><input type="text" id="cl-name" value="${c.name}"></div>
          <div class="form-group"><label>Email</label><input type="email" id="cl-email" value="${c.email||''}"></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Phone</label><input type="tel" id="cl-phone" value="${c.phone||''}"></div>
          <div class="form-group"><label>Type</label>
            <select id="cl-type">${['Attorney','Homeowner','Estate Rep','CPA','Lender','Investor','Developer','Government','Other'].map(t=>`<option ${t===c.type?'selected':''}>${t}</option>`).join('')}</select>
          </div>
        </div>
        <div class="form-group"><label>Notes</label><textarea id="cl-notes" rows="3">${c.notes||''}</textarea></div>
      </form>
    `;
    const footer = `<button class="btn-primary" onclick="ClientsModule.saveEdit('${id}')">Save Changes</button>`;
    AdminApp.showModal('Edit Client', body, footer);
  },

  saveEdit(id) {
    DB.update('clients', id, {
      name: document.getElementById('cl-name').value.trim(),
      email: document.getElementById('cl-email').value.trim(),
      phone: document.getElementById('cl-phone').value.trim(),
      type: document.getElementById('cl-type').value,
      notes: document.getElementById('cl-notes').value.trim()
    });
    AdminApp.closeModal();
    AdminApp.closeDetail();
    AdminApp.toast('Client updated', 'success');
    this.render();
  },

  deleteClient(id) {
    if (confirm('Delete this client?')) {
      DB.remove('clients', id);
      AdminApp.closeDetail();
      AdminApp.toast('Client deleted', 'info');
      this.render();
    }
  }
};

// =====================================================
// REPORTS MODULE
// =====================================================
const ReportsModule = {
  render() {
    const assignments = DB.getAll('assignments').filter(a => ['Report Complete', 'Awaiting Payment', 'Delivered', 'In Review', 'Inspected'].includes(a.status));
    assignments.sort((a, b) => new Date(b.createdDate) - new Date(a.createdDate));

    const tbody = document.getElementById('reports-tbody');
    tbody.innerHTML = assignments.length ? assignments.map(a => `
      <tr>
        <td>${a.assignmentNumber}</td>
        <td>${a.clientName}</td>
        <td>${a.propertyAddress}</td>
        <td>${Util.statusBadge(a.reportStatus || 'Not Started')}</td>
        <td>${Util.statusBadge(a.paymentStatus || 'Unpaid')}</td>
        <td class="actions-cell">
          ${a.reportStatus !== 'Delivered' ? `<button class="btn-sm btn-secondary" onclick="ReportsModule.updateReportStatus('${a.id}')">Update Report</button>` : ''}
          ${(a.reportStatus === 'Complete' || a.reportStatus === 'Ready for Delivery') && a.paymentStatus === 'Paid' ? `<button class="btn-sm btn-primary" onclick="ReportsModule.releaseReport('${a.id}')">Release Report</button>` : ''}
          ${(a.reportStatus === 'Complete' || a.reportStatus === 'Ready for Delivery') && a.paymentStatus !== 'Paid' ? `<span class="text-warning" style="font-size:0.8rem;">Payment required before release</span>` : ''}
          <button class="btn-sm btn-secondary" onclick="ReportsModule.uploadReport('${a.id}')">Upload</button>
        </td>
      </tr>
    `).join('') : '<tr><td colspan="6" class="empty-state">No reports to manage</td></tr>';
  },

  updateReportStatus(id) {
    const a = DB.getAll('assignments').find(x => x.id === id);
    const body = `
      <div class="form-group"><label>Report Status</label>
        <select id="report-status">
          ${['Not Started','In Progress','Complete','Ready for Delivery','Delivered'].map(s => `<option ${s===a?.reportStatus?'selected':''}>${s}</option>`).join('')}
        </select>
      </div>
    `;
    const footer = `<button class="btn-primary" onclick="ReportsModule.saveReportStatus('${id}')">Update</button>`;
    AdminApp.showModal('Update Report Status', body, footer);
  },

  saveReportStatus(id) {
    const status = document.getElementById('report-status').value;
    DB.update('assignments', id, {reportStatus: status});
    if (status === 'Complete') DB.update('assignments', id, {status: 'Report Complete'});
    if (status === 'Ready for Delivery') DB.update('assignments', id, {status: 'Awaiting Payment'});
    DB.addActivity(`Report status updated: ${status}`);
    AdminApp.closeModal();
    AdminApp.toast('Report status updated', 'success');
    this.render();
  },

  releaseReport(id) {
    const a = DB.getAll('assignments').find(x => x.id === id);
    if (a?.paymentStatus !== 'Paid') {
      AdminApp.toast('Cannot release: payment required', 'error');
      return;
    }
    DB.update('assignments', id, {status: 'Delivered', reportStatus: 'Delivered', completedDate: new Date().toISOString().split('T')[0]});
    DB.addActivity(`Report released: ${a.assignmentNumber} — ${a.clientName}`);
    AdminApp.toast('Report released to client portal', 'success');
    this.render();
  },

  uploadReport(id) {
    const a = DB.getAll('assignments').find(x => x.id === id);
    const body = `
      <div class="form-group">
        <label>Upload Report (simulated)</label>
        <div style="border:2px dashed #E2E5EB; padding:2rem; text-align:center; border-radius:0.5rem; cursor:pointer;">
          <p style="font-size:1.5rem;">📄</p>
          <p>Click to select file or drag & drop</p>
          <p style="font-size:0.8rem; color:#5A6275;">PDF, DOC, DOCX — Max 25MB</p>
          <input type="file" style="display:none;" accept=".pdf,.doc,.docx">
        </div>
        <p style="margin-top:0.5rem; font-size:0.85rem; color:#5A6275;">File will be recorded in the system. In production, this uploads to secure cloud storage.</p>
      </div>
    `;
    const footer = `<button class="btn-primary" onclick="ReportsModule.confirmUpload('${id}')">Confirm Upload</button>`;
    AdminApp.showModal('Upload Report — ' + a?.assignmentNumber, body, footer);
  },

  confirmUpload(id) {
    DB.update('assignments', id, {reportStatus: 'Complete', reportUploadDate: new Date().toISOString()});
    DB.addActivity('Report uploaded for assignment');
    AdminApp.closeModal();
    AdminApp.toast('Report uploaded successfully', 'success');
    this.render();
  }
};

// =====================================================
// LENDER MODULE
// =====================================================
const LenderModule = {
  render() {
    const inquiries = DB.getAll('lenderInquiries');
    inquiries.sort((a, b) => new Date(b.date) - new Date(a.date));

    const tbody = document.getElementById('lender-tbody');
    tbody.innerHTML = inquiries.length ? inquiries.map(l => `
      <tr>
        <td>${Util.formatDate(l.date)}</td>
        <td>${l.company}</td>
        <td>${l.contactName}</td>
        <td>${l.email}</td>
        <td>${l.inquiryType || '—'}</td>
        <td>${Util.statusBadge(l.status)}</td>
        <td class="actions-cell">
          <button class="btn-sm btn-secondary" onclick="LenderModule.showDetail('${l.id}')">View</button>
          <button class="btn-sm btn-secondary" onclick="LenderModule.updateStatus('${l.id}')">Status</button>
        </td>
      </tr>
    `).join('') : '<tr><td colspan="7" class="empty-state">No lender inquiries</td></tr>';
  },

  showAddModal() {
    const body = `
      <form class="admin-form">
        <div class="form-row">
          <div class="form-group"><label>Company/Institution *</label><input type="text" id="lnd-company" required></div>
          <div class="form-group"><label>Contact Name *</label><input type="text" id="lnd-contact" required></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Email *</label><input type="email" id="lnd-email" required></div>
          <div class="form-group"><label>Phone</label><input type="tel" id="lnd-phone"></div>
        </div>
        <div class="form-group"><label>Inquiry Type</label>
          <select id="lnd-type"><option>Add to Approved Panel</option><option>Fee Schedule Request</option><option>Coverage Area Inquiry</option><option>General Inquiry</option><option>Other</option></select>
        </div>
        <div class="form-group"><label>Notes</label><textarea id="lnd-notes" rows="3"></textarea></div>
      </form>
    `;
    const footer = `<button class="btn-primary" onclick="LenderModule.saveInquiry()">Save Inquiry</button>`;
    AdminApp.showModal('Add Lender Inquiry', body, footer);
  },

  saveInquiry() {
    const company = document.getElementById('lnd-company').value.trim();
    if (!company) { AdminApp.toast('Company name required', 'error'); return; }
    DB.add('lenderInquiries', {
      id: Util.id(),
      date: new Date().toISOString().split('T')[0],
      company,
      contactName: document.getElementById('lnd-contact').value.trim(),
      email: document.getElementById('lnd-email').value.trim(),
      phone: document.getElementById('lnd-phone').value.trim(),
      inquiryType: document.getElementById('lnd-type').value,
      status: 'New',
      notes: document.getElementById('lnd-notes').value.trim()
    });
    DB.addActivity(`New lender inquiry: ${company}`);
    AdminApp.closeModal();
    AdminApp.toast('Inquiry saved', 'success');
    this.render();
  },

  showDetail(id) {
    const l = DB.getAll('lenderInquiries').find(x => x.id === id);
    if (!l) return;
    const body = `
      <div class="detail-section">
        <p><strong>Company:</strong> ${l.company}</p>
        <p><strong>Contact:</strong> ${l.contactName}</p>
        <p><strong>Email:</strong> ${l.email}</p>
        <p><strong>Phone:</strong> ${l.phone || '—'}</p>
        <p><strong>Type:</strong> ${l.inquiryType}</p>
        <p><strong>Status:</strong> ${Util.statusBadge(l.status)}</p>
        <p><strong>Date:</strong> ${Util.formatDate(l.date)}</p>
        <p><strong>Notes:</strong> ${l.notes || '—'}</p>
      </div>
      <div class="detail-actions">
        <button class="btn-sm btn-secondary" onclick="LenderModule.updateStatus('${id}')">Update Status</button>
        <button class="btn-sm btn-danger" onclick="LenderModule.deleteInquiry('${id}')">Delete</button>
      </div>
    `;
    AdminApp.showDetail('Lender Inquiry', body);
  },

  updateStatus(id) {
    const l = DB.getAll('lenderInquiries').find(x => x.id === id);
    const body = `<div class="form-group"><label>Status</label>
      <select id="lnd-new-status">${['New','Reviewed','Responded','Added to Panel','Declined'].map(s=>`<option ${s===l?.status?'selected':''}>${s}</option>`).join('')}</select></div>`;
    const footer = `<button class="btn-primary" onclick="LenderModule.saveStatus('${id}')">Update</button>`;
    AdminApp.showModal('Update Status', body, footer);
  },

  saveStatus(id) {
    const status = document.getElementById('lnd-new-status').value;
    DB.update('lenderInquiries', id, {status});
    AdminApp.closeModal();
    AdminApp.closeDetail();
    AdminApp.toast('Status updated', 'success');
    this.render();
  },

  deleteInquiry(id) {
    if (confirm('Delete this inquiry?')) {
      DB.remove('lenderInquiries', id);
      AdminApp.closeDetail();
      AdminApp.toast('Inquiry deleted', 'info');
      this.render();
    }
  }
};

// =====================================================
// SETTINGS MODULE
// =====================================================
const SettingsModule = {
  render() {
    const settings = DB.get('settings') || {};
    document.getElementById('setting-start-location').value = settings.startLocation || 'Durham, NC';
    document.getElementById('setting-irs-rate').value = settings.irsRate || 0.70;
    document.getElementById('setting-base-miles').value = settings.baseMiles || 15;
    document.getElementById('setting-per-stop-miles').value = settings.perStopMiles || 5;
    document.getElementById('setting-due-days').value = settings.dueDays || 15;
    document.getElementById('setting-payment-instructions').value = settings.paymentInstructions || '';
    document.getElementById('setting-biz-name').value = settings.bizName || 'Designer Homes Real Estate Services';
    document.getElementById('setting-biz-phone').value = settings.bizPhone || '';
    document.getElementById('setting-biz-email').value = settings.bizEmail || 'info@designerhomesre.com';
    document.getElementById('setting-license').value = settings.license || 'A9156';
  },

  saveSettings() {
    const settings = DB.get('settings') || {};
    settings.startLocation = document.getElementById('setting-start-location').value;
    settings.irsRate = parseFloat(document.getElementById('setting-irs-rate').value) || 0.70;
    settings.baseMiles = parseInt(document.getElementById('setting-base-miles').value) || 15;
    settings.perStopMiles = parseInt(document.getElementById('setting-per-stop-miles').value) || 5;
    settings.dueDays = parseInt(document.getElementById('setting-due-days').value) || 15;
    settings.paymentInstructions = document.getElementById('setting-payment-instructions').value;
    settings.bizName = document.getElementById('setting-biz-name').value;
    settings.bizPhone = document.getElementById('setting-biz-phone').value;
    settings.bizEmail = document.getElementById('setting-biz-email').value;
    settings.license = document.getElementById('setting-license').value;
    DB.save('settings', settings);
    AdminApp.toast('Settings saved', 'success');
  },

  async changePassword() {
    const newPw = document.getElementById('new-password').value;
    if (!newPw || newPw.length < 8) {
      AdminApp.toast('Password must be at least 8 characters', 'error');
      return;
    }
    // Enforce basic complexity: at least one letter and one number
    if (!/[a-zA-Z]/.test(newPw) || !/[0-9]/.test(newPw)) {
      AdminApp.toast('Password must contain at least one letter and one number', 'error');
      return;
    }
    try {
      const hashedPw = await SecurityUtils.hash(newPw);
      localStorage.setItem('dhres-admin-password-hash', hashedPw);
      // Remove legacy plaintext key if it exists
      localStorage.removeItem('dhres-admin-password');
      document.getElementById('new-password').value = '';
      AdminApp.toast('Password updated securely', 'success');
    } catch (err) {
      console.error('Password change error:', err);
      AdminApp.toast('Failed to update password. Please try again.', 'error');
    }
  },

  exportAllData() {
    const data = {
      leads: DB.getAll('leads'),
      assignments: DB.getAll('assignments'),
      invoices: DB.getAll('invoices'),
      mileage: DB.getAll('mileage'),
      clients: DB.getAll('clients'),
      lenderInquiries: DB.getAll('lenderInquiries'),
      activity: DB.getAll('activity'),
      settings: DB.get('settings')
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'dhres-backup-' + new Date().toISOString().split('T')[0] + '.json';
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    AdminApp.toast('Data exported', 'success');
  },

  importData() {
    document.getElementById('import-file').click();
  },

  handleImport(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (data.leads) DB.saveAll('leads', data.leads);
        if (data.assignments) DB.saveAll('assignments', data.assignments);
        if (data.invoices) DB.saveAll('invoices', data.invoices);
        if (data.mileage) DB.saveAll('mileage', data.mileage);
        if (data.clients) DB.saveAll('clients', data.clients);
        if (data.lenderInquiries) DB.saveAll('lenderInquiries', data.lenderInquiries);
        if (data.activity) DB.saveAll('activity', data.activity);
        if (data.settings) DB.save('settings', data.settings);
        AdminApp.toast('Data imported successfully', 'success');
        AdminApp.navigateTo('dashboard');
      } catch (err) {
        AdminApp.toast('Import failed: invalid file', 'error');
      }
    };
    reader.readAsText(file);
  },

  clearAllData() {
    if (confirm('Are you sure you want to clear ALL data? This cannot be undone.')) {
      if (confirm('This will permanently delete all leads, assignments, invoices, mileage, and client data. Continue?')) {
        ['leads','assignments','invoices','mileage','clients','lenderInquiries','activity'].forEach(key => {
          localStorage.removeItem('dhres-' + key);
        });
        localStorage.removeItem('dhres-initialized');
        localStorage.removeItem('dhres-next-assignment');
        localStorage.removeItem('dhres-next-invoice');
        AdminApp.toast('All data cleared', 'info');
        AdminApp.seedData();
        AdminApp.navigateTo('dashboard');
      }
    }
  }
};
