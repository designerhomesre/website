/**
 * DESIGNER HOMES APPRAISAL PLATFORM
 * Valuation Approaches
 *
 * Phase 7: Cost Approach (DwellingCost manual entry integration)
 * Phase 8: Income Approach (GRM/GIM)
 */

// ============================================================================
// COST APPROACH MODULE (Phase 7) — Full Implementation
// ============================================================================

const CostApproachModule = {
  render() {
    const contentEl = document.getElementById('cost-approach-content');
    if (!contentEl) return;

    if (!App.activeAssignmentId) {
      contentEl.innerHTML = `<div class="empty-state"><p>Select an assignment to begin cost approach calculations</p></div>`;
      return;
    }

    // Load saved cost approach data
    const saved = DB.where('cost_approaches', c => c.assignment_id === App.activeAssignmentId)[0];
    const d = saved || {};

    contentEl.innerHTML = `
      <div class="cost-approach-layout">
        <p class="approach-instructions">
          Enter component costs from <strong>DwellingCost.com</strong> report. The system calculates Replacement Cost New (RCN),
          applies depreciation, and adds land value to produce the cost approach indication.
        </p>

        <div class="approach-section">
          <h3>Replacement Cost New — Component Breakdown</h3>
          <div class="cost-grid">
            <div class="form-row">
              <div class="form-group">
                <label>Base Structure ($/sqft)</label>
                <input type="number" id="cost-base-sqft" step="0.01" value="${d.base_per_sqft || ''}" placeholder="e.g., 135.00" onchange="CostApproachModule.recalculate()">
              </div>
              <div class="form-group">
                <label>GLA (sqft)</label>
                <input type="number" id="cost-gla" value="${d.gla || ''}" placeholder="e.g., 2200" onchange="CostApproachModule.recalculate()">
              </div>
              <div class="form-group">
                <label>Base Structure Cost</label>
                <input type="text" id="cost-base-total" class="calc-field" readonly>
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Garage ($/sqft)</label>
                <input type="number" id="cost-garage-sqft" step="0.01" value="${d.garage_per_sqft || ''}" placeholder="e.g., 45.00" onchange="CostApproachModule.recalculate()">
              </div>
              <div class="form-group">
                <label>Garage Area (sqft)</label>
                <input type="number" id="cost-garage-area" value="${d.garage_area || ''}" placeholder="e.g., 400" onchange="CostApproachModule.recalculate()">
              </div>
              <div class="form-group">
                <label>Garage Cost</label>
                <input type="text" id="cost-garage-total" class="calc-field" readonly>
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Porch/Patio ($/sqft)</label>
                <input type="number" id="cost-porch-sqft" step="0.01" value="${d.porch_per_sqft || ''}" placeholder="e.g., 25.00" onchange="CostApproachModule.recalculate()">
              </div>
              <div class="form-group">
                <label>Porch/Patio Area (sqft)</label>
                <input type="number" id="cost-porch-area" value="${d.porch_area || ''}" placeholder="e.g., 150" onchange="CostApproachModule.recalculate()">
              </div>
              <div class="form-group">
                <label>Porch/Patio Cost</label>
                <input type="text" id="cost-porch-total" class="calc-field" readonly>
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Basement Finished ($/sqft)</label>
                <input type="number" id="cost-bsmt-fin-sqft" step="0.01" value="${d.bsmt_fin_per_sqft || ''}" placeholder="e.g., 65.00" onchange="CostApproachModule.recalculate()">
              </div>
              <div class="form-group">
                <label>Finished Area (sqft)</label>
                <input type="number" id="cost-bsmt-fin-area" value="${d.bsmt_fin_area || ''}" placeholder="e.g., 600" onchange="CostApproachModule.recalculate()">
              </div>
              <div class="form-group">
                <label>Basement Fin. Cost</label>
                <input type="text" id="cost-bsmt-fin-total" class="calc-field" readonly>
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Other Improvements</label>
                <input type="number" id="cost-other" step="0.01" value="${d.other_improvements || ''}" placeholder="Pool, fence, etc." onchange="CostApproachModule.recalculate()">
              </div>
              <div class="form-group">
                <label>Description</label>
                <input type="text" id="cost-other-desc" value="${d.other_description || ''}" placeholder="Pool, fencing, deck...">
              </div>
              <div class="form-group">
                <label>RCN Total</label>
                <input type="text" id="cost-rcn-total" class="calc-field calc-highlight" readonly>
              </div>
            </div>
          </div>
        </div>

        <div class="approach-section">
          <h3>Depreciation</h3>
          <div class="form-row">
            <div class="form-group">
              <label>Effective Age (years)</label>
              <input type="number" id="cost-effective-age" value="${d.effective_age || ''}" placeholder="e.g., 10" onchange="CostApproachModule.recalculate()">
            </div>
            <div class="form-group">
              <label>Economic Life (years)</label>
              <input type="number" id="cost-economic-life" value="${d.economic_life || 60}" placeholder="60" onchange="CostApproachModule.recalculate()">
            </div>
            <div class="form-group">
              <label>Physical Depreciation %</label>
              <input type="text" id="cost-phys-depr-pct" class="calc-field" readonly>
            </div>
            <div class="form-group">
              <label>Physical Depreciation $</label>
              <input type="text" id="cost-phys-depr" class="calc-field" readonly>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Functional Obsolescence $</label>
              <input type="number" id="cost-func-obsol" step="0.01" value="${d.functional_obsolescence || ''}" placeholder="0" onchange="CostApproachModule.recalculate()">
            </div>
            <div class="form-group">
              <label>External Obsolescence $</label>
              <input type="number" id="cost-ext-obsol" step="0.01" value="${d.external_obsolescence || ''}" placeholder="0" onchange="CostApproachModule.recalculate()">
            </div>
            <div class="form-group">
              <label>Total Depreciation</label>
              <input type="text" id="cost-total-depr" class="calc-field" readonly>
            </div>
            <div class="form-group">
              <label>Depreciated Value</label>
              <input type="text" id="cost-depreciated" class="calc-field calc-highlight" readonly>
            </div>
          </div>
        </div>

        <div class="approach-section">
          <h3>Land Value & Final Indication</h3>
          <div class="form-row">
            <div class="form-group">
              <label>Land Value (from sales comparison or allocation)</label>
              <input type="number" id="cost-land-value" step="0.01" value="${d.land_value || ''}" placeholder="e.g., 85000" onchange="CostApproachModule.recalculate()">
            </div>
            <div class="form-group">
              <label>Land Value Source</label>
              <select id="cost-land-source">
                <option value="sales_comparison" ${d.land_source === 'sales_comparison' ? 'selected' : ''}>Comparable Land Sales</option>
                <option value="allocation" ${d.land_source === 'allocation' ? 'selected' : ''}>Allocation Method</option>
                <option value="extraction" ${d.land_source === 'extraction' ? 'selected' : ''}>Extraction Method</option>
                <option value="assessor" ${d.land_source === 'assessor' ? 'selected' : ''}>Assessor Records</option>
              </select>
            </div>
          </div>
          <div class="cost-summary-box" id="cost-summary-box">
            <div class="summary-row"><span>Replacement Cost New (RCN)</span><span id="sum-rcn">$0</span></div>
            <div class="summary-row"><span>Less: Total Depreciation</span><span id="sum-depr">-$0</span></div>
            <div class="summary-row"><span>Depreciated Improvement Value</span><span id="sum-depr-val">$0</span></div>
            <div class="summary-row"><span>Plus: Land Value</span><span id="sum-land">+$0</span></div>
            <div class="summary-row summary-total"><span>Cost Approach Indication</span><span id="sum-total">$0</span></div>
          </div>
        </div>

        <div class="approach-section">
          <h3>Appraiser Notes</h3>
          <textarea id="cost-notes" rows="4" placeholder="Notes on cost sources, depreciation rationale, etc...">${d.notes || ''}</textarea>
        </div>
      </div>
    `;

    // Recalculate after DOM render
    setTimeout(() => this.recalculate(), 50);
  },

  /**
   * Recalculate all cost approach values
   */
  recalculate() {
    const val = id => parseFloat(document.getElementById(id)?.value) || 0;
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };

    // Component costs
    const baseTotal = val('cost-base-sqft') * val('cost-gla');
    const garageTotal = val('cost-garage-sqft') * val('cost-garage-area');
    const porchTotal = val('cost-porch-sqft') * val('cost-porch-area');
    const bsmtFinTotal = val('cost-bsmt-fin-sqft') * val('cost-bsmt-fin-area');
    const otherImprov = val('cost-other');

    set('cost-base-total', Util.currency(baseTotal));
    set('cost-garage-total', Util.currency(garageTotal));
    set('cost-porch-total', Util.currency(porchTotal));
    set('cost-bsmt-fin-total', Util.currency(bsmtFinTotal));

    const rcn = baseTotal + garageTotal + porchTotal + bsmtFinTotal + otherImprov;
    set('cost-rcn-total', Util.currency(rcn));

    // Depreciation
    const effectiveAge = val('cost-effective-age');
    const economicLife = val('cost-economic-life') || 60;
    const physDeprPct = economicLife > 0 ? (effectiveAge / economicLife * 100) : 0;
    const physDepr = rcn * (physDeprPct / 100);
    const funcObsol = val('cost-func-obsol');
    const extObsol = val('cost-ext-obsol');
    const totalDepr = physDepr + funcObsol + extObsol;
    const depreciatedVal = Math.max(rcn - totalDepr, 0);

    set('cost-phys-depr-pct', physDeprPct.toFixed(1) + '%');
    set('cost-phys-depr', Util.currency(physDepr));
    set('cost-total-depr', Util.currency(totalDepr));
    set('cost-depreciated', Util.currency(depreciatedVal));

    // Land & total
    const landValue = val('cost-land-value');
    const totalIndication = depreciatedVal + landValue;

    set('sum-rcn', Util.currency(rcn));
    set('sum-depr', '-' + Util.currency(totalDepr));
    set('sum-depr-val', Util.currency(depreciatedVal));
    set('sum-land', '+' + Util.currency(landValue));
    set('sum-total', Util.currency(totalIndication));
  },

  /**
   * Save cost approach to DB
   */
  saveApproach() {
    if (!App.activeAssignmentId) {
      App.toast('No active assignment', 'warning');
      return;
    }

    const val = id => parseFloat(document.getElementById(id)?.value) || 0;
    const data = {
      assignment_id: App.activeAssignmentId,
      base_per_sqft: val('cost-base-sqft'),
      gla: val('cost-gla'),
      garage_per_sqft: val('cost-garage-sqft'),
      garage_area: val('cost-garage-area'),
      porch_per_sqft: val('cost-porch-sqft'),
      porch_area: val('cost-porch-area'),
      bsmt_fin_per_sqft: val('cost-bsmt-fin-sqft'),
      bsmt_fin_area: val('cost-bsmt-fin-area'),
      other_improvements: val('cost-other'),
      other_description: document.getElementById('cost-other-desc')?.value?.trim() || '',
      effective_age: val('cost-effective-age'),
      economic_life: val('cost-economic-life'),
      functional_obsolescence: val('cost-func-obsol'),
      external_obsolescence: val('cost-ext-obsol'),
      land_value: val('cost-land-value'),
      land_source: document.getElementById('cost-land-source')?.value || 'sales_comparison',
      notes: document.getElementById('cost-notes')?.value?.trim() || ''
    };

    const existing = DB.where('cost_approaches', c => c.assignment_id === App.activeAssignmentId)[0];
    if (existing) {
      DB.update('cost_approaches', existing.id, data);
    } else {
      DB.add('cost_approaches', data);
    }
    App.toast('Cost approach saved', 'success');
  }
};


// ============================================================================
// INCOME APPROACH MODULE (Phase 8) — Full Implementation (GRM/GIM)
// ============================================================================

const IncomeApproachModule = {
  render() {
    const contentEl = document.getElementById('income-approach-content');
    if (!contentEl) return;

    if (!App.activeAssignmentId) {
      contentEl.innerHTML = `<div class="empty-state"><p>Select an assignment to begin income approach analysis</p></div>`;
      return;
    }

    // Load saved income approach data
    const saved = DB.where('income_approaches', i => i.assignment_id === App.activeAssignmentId)[0];
    const d = saved || {};

    // Load income comps
    const comps = DB.where('income_comps', c => c.assignment_id === App.activeAssignmentId);

    contentEl.innerHTML = `
      <div class="income-approach-layout">
        <p class="approach-instructions">
          The income approach uses <strong>Gross Rent Multiplier (GRM)</strong> and/or <strong>Gross Income Multiplier (GIM)</strong>
          to estimate value based on rental income. Enter comparable rental data and the subject's estimated rent to calculate the value indication.
        </p>

        <div class="approach-section">
          <h3>Subject Property Rental Estimate</h3>
          <div class="form-row">
            <div class="form-group">
              <label>Estimated Monthly Rent</label>
              <input type="number" id="income-monthly-rent" step="1" value="${d.monthly_rent || ''}" placeholder="e.g., 1800" onchange="IncomeApproachModule.recalculate()">
            </div>
            <div class="form-group">
              <label>Gross Annual Income</label>
              <input type="text" id="income-annual" class="calc-field" readonly>
            </div>
            <div class="form-group">
              <label>Rent Source</label>
              <select id="income-rent-source">
                <option value="market_survey" ${d.rent_source === 'market_survey' ? 'selected' : ''}>Market Survey</option>
                <option value="actual_rent" ${d.rent_source === 'actual_rent' ? 'selected' : ''}>Actual Rent</option>
                <option value="comparable_rentals" ${d.rent_source === 'comparable_rentals' ? 'selected' : ''}>Comparable Rentals</option>
              </select>
            </div>
          </div>
        </div>

        <div class="approach-section">
          <h3>Rental Comparables</h3>
          <div id="income-comps-table">
            <table class="data-table compact">
              <thead>
                <tr>
                  <th>Address</th>
                  <th>Sale Price</th>
                  <th>Monthly Rent</th>
                  <th>GRM</th>
                  <th>Annual Income</th>
                  <th>GIM</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody id="income-comps-tbody">
                ${comps.length === 0 ? '<tr><td colspan="7" style="text-align:center;">No rental comps added yet</td></tr>' :
                  comps.map(c => {
                    const grm = c.monthly_rent > 0 ? (c.sale_price / c.monthly_rent).toFixed(1) : '-';
                    const annual = c.monthly_rent * 12;
                    const gim = annual > 0 ? (c.sale_price / annual).toFixed(2) : '-';
                    return `<tr>
                      <td>${c.address || '-'}</td>
                      <td>${Util.currency(c.sale_price)}</td>
                      <td>${Util.currency(c.monthly_rent)}</td>
                      <td>${grm}</td>
                      <td>${Util.currency(annual)}</td>
                      <td>${gim}</td>
                      <td><button class="btn-link btn-danger" onclick="IncomeApproachModule.removeComp('${c.id}')">Remove</button></td>
                    </tr>`;
                  }).join('')}
              </tbody>
            </table>
            <button class="btn-secondary" onclick="IncomeApproachModule.addComp()" style="margin-top: 12px;">+ Add Rental Comparable</button>
          </div>
        </div>

        <div class="approach-section">
          <h3>GRM/GIM Analysis</h3>
          <div id="income-analysis-results" class="income-analysis-grid"></div>
        </div>

        <div class="approach-section">
          <h3>Value Indication</h3>
          <div class="form-row">
            <div class="form-group">
              <label>Selected GRM</label>
              <input type="number" id="income-selected-grm" step="0.1" value="${d.selected_grm || ''}" placeholder="Enter your selected GRM" onchange="IncomeApproachModule.recalculate()">
            </div>
            <div class="form-group">
              <label>GRM Indication</label>
              <input type="text" id="income-grm-indication" class="calc-field calc-highlight" readonly>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Selected GIM</label>
              <input type="number" id="income-selected-gim" step="0.01" value="${d.selected_gim || ''}" placeholder="Enter your selected GIM" onchange="IncomeApproachModule.recalculate()">
            </div>
            <div class="form-group">
              <label>GIM Indication</label>
              <input type="text" id="income-gim-indication" class="calc-field calc-highlight" readonly>
            </div>
          </div>
          <div class="income-summary-box" id="income-summary">
            <div class="summary-row"><span>GRM Indication (Monthly Rent x GRM)</span><span id="income-sum-grm">$0</span></div>
            <div class="summary-row"><span>GIM Indication (Annual Income x GIM)</span><span id="income-sum-gim">$0</span></div>
            <div class="summary-row summary-total"><span>Reconciled Income Approach Indication</span>
              <input type="number" id="income-reconciled" step="1" value="${d.reconciled_value || ''}" placeholder="Your reconciled value" style="max-width:150px; text-align:right;">
            </div>
          </div>
        </div>

        <div class="approach-section">
          <h3>Appraiser Notes</h3>
          <textarea id="income-notes" rows="4" placeholder="Notes on rental market, GRM selection rationale, etc...">${d.notes || ''}</textarea>
        </div>
      </div>
    `;

    // Calculate and render analysis
    setTimeout(() => {
      this.recalculate();
      this._renderAnalysis(comps);
    }, 50);
  },

  /**
   * Recalculate GRM/GIM values
   */
  recalculate() {
    const val = id => parseFloat(document.getElementById(id)?.value) || 0;
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };

    const monthlyRent = val('income-monthly-rent');
    const annualIncome = monthlyRent * 12;
    set('income-annual', Util.currency(annualIncome));

    const selectedGRM = val('income-selected-grm');
    const selectedGIM = val('income-selected-gim');

    const grmIndication = monthlyRent * selectedGRM;
    const gimIndication = annualIncome * selectedGIM;

    set('income-grm-indication', Util.currency(grmIndication));
    set('income-gim-indication', Util.currency(gimIndication));

    const sumGrmEl = document.getElementById('income-sum-grm');
    const sumGimEl = document.getElementById('income-sum-gim');
    if (sumGrmEl) sumGrmEl.textContent = Util.currency(grmIndication);
    if (sumGimEl) sumGimEl.textContent = Util.currency(gimIndication);
  },

  /**
   * Render GRM/GIM analysis from comps
   */
  _renderAnalysis(comps) {
    const el = document.getElementById('income-analysis-results');
    if (!el || comps.length === 0) {
      if (el) el.innerHTML = '<p style="color: var(--text-muted);">Add rental comparables to see GRM/GIM analysis.</p>';
      return;
    }

    const grms = comps.filter(c => c.monthly_rent > 0).map(c => c.sale_price / c.monthly_rent);
    const gims = comps.filter(c => c.monthly_rent > 0).map(c => c.sale_price / (c.monthly_rent * 12));

    const median = arr => {
      if (!arr.length) return 0;
      const s = [...arr].sort((a, b) => a - b);
      const m = Math.floor(s.length / 2);
      return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
    };
    const mean = arr => arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : 0;

    el.innerHTML = `
      <div class="form-row">
        <div class="card" style="flex:1;">
          <h4>GRM Summary</h4>
          <table class="data-table compact">
            <tr><td>Range</td><td>${grms.length ? grms[0].toFixed(1) + ' – ' + grms[grms.length-1].toFixed(1) : '-'}</td></tr>
            <tr><td>Mean</td><td>${mean(grms).toFixed(1)}</td></tr>
            <tr><td>Median</td><td>${median(grms).toFixed(1)}</td></tr>
          </table>
        </div>
        <div class="card" style="flex:1;">
          <h4>GIM Summary</h4>
          <table class="data-table compact">
            <tr><td>Range</td><td>${gims.length ? gims[0].toFixed(2) + ' – ' + gims[gims.length-1].toFixed(2) : '-'}</td></tr>
            <tr><td>Mean</td><td>${mean(gims).toFixed(2)}</td></tr>
            <tr><td>Median</td><td>${median(gims).toFixed(2)}</td></tr>
          </table>
        </div>
      </div>
    `;
  },

  /**
   * Add rental comparable
   */
  addComp() {
    const body = `
      <form id="income-comp-form">
        <div class="form-row">
          <div class="form-group"><label>Address *</label><input type="text" id="ic-address" required placeholder="123 Main St"></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Sale Price *</label><input type="number" id="ic-sale-price" required placeholder="e.g., 350000"></div>
          <div class="form-group"><label>Monthly Rent *</label><input type="number" id="ic-monthly-rent" required placeholder="e.g., 1750"></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>GLA (sqft)</label><input type="number" id="ic-gla" placeholder="e.g., 1800"></div>
          <div class="form-group"><label>Bedrooms</label><input type="number" id="ic-beds" placeholder="e.g., 3"></div>
          <div class="form-group"><label>Year Built</label><input type="number" id="ic-year" placeholder="e.g., 2010"></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Notes</label><input type="text" id="ic-notes" placeholder="Source, condition, etc."></div>
        </div>
      </form>
    `;
    const footer = `
      <button class="btn-secondary" onclick="App.closeModal()">Cancel</button>
      <button class="btn-primary" onclick="IncomeApproachModule.saveComp()">Add Comparable</button>
    `;
    App.showModal('Add Rental Comparable', body, footer);
  },

  /**
   * Save rental comparable
   */
  saveComp() {
    const address = document.getElementById('ic-address')?.value?.trim();
    const salePrice = parseFloat(document.getElementById('ic-sale-price')?.value);
    const monthlyRent = parseFloat(document.getElementById('ic-monthly-rent')?.value);

    if (!address || isNaN(salePrice) || isNaN(monthlyRent)) {
      App.toast('Address, sale price, and monthly rent are required', 'warning');
      return;
    }

    DB.add('income_comps', {
      assignment_id: App.activeAssignmentId,
      address: address,
      sale_price: salePrice,
      monthly_rent: monthlyRent,
      gla: parseFloat(document.getElementById('ic-gla')?.value) || null,
      bedrooms: parseInt(document.getElementById('ic-beds')?.value) || null,
      year_built: parseInt(document.getElementById('ic-year')?.value) || null,
      notes: document.getElementById('ic-notes')?.value?.trim() || ''
    });

    App.closeModal();
    App.toast('Rental comparable added', 'success');
    this.render();
  },

  /**
   * Remove rental comparable
   */
  removeComp(id) {
    if (!confirm('Remove this rental comparable?')) return;
    DB.remove('income_comps', id);
    App.toast('Comparable removed', 'success');
    this.render();
  },

  /**
   * Save income approach to DB
   */
  saveApproach() {
    if (!App.activeAssignmentId) {
      App.toast('No active assignment', 'warning');
      return;
    }

    const val = id => parseFloat(document.getElementById(id)?.value) || 0;
    const data = {
      assignment_id: App.activeAssignmentId,
      monthly_rent: val('income-monthly-rent'),
      rent_source: document.getElementById('income-rent-source')?.value || 'market_survey',
      selected_grm: val('income-selected-grm'),
      selected_gim: val('income-selected-gim'),
      reconciled_value: val('income-reconciled'),
      notes: document.getElementById('income-notes')?.value?.trim() || ''
    };

    const existing = DB.where('income_approaches', i => i.assignment_id === App.activeAssignmentId)[0];
    if (existing) {
      DB.update('income_approaches', existing.id, data);
    } else {
      DB.add('income_approaches', data);
    }
    App.toast('Income approach saved', 'success');
  }
};
