/**
 * DESIGNER HOMES APPRAISAL PLATFORM
 * Analysis Modules
 *
 * Phase 4: CompsModule (Comparable Workspace) — IMPLEMENTED
 * Phase 5: MarketModule / MarketAnalysisModule (Market Analysis)
 * Phase 6: AdjustmentModule / AdjustmentsModule (Adjustment Support Engine)
 * Phase 9+: CommentsModule (Comment / Narrative Drafting)
 */

// ============================================================================
// COMPARABLES MODULE (Phase 4) — Full Implementation
// ============================================================================

const CompsModule = {
  currentView: 'table',

  /**
   * Render the comparables workspace
   */
  render() {
    if (!App.activeAssignmentId) {
      const compContent = document.getElementById('comps-content');
      if (compContent) {
        compContent.innerHTML = `
          <div class="empty-state">
            <div class="empty-icon">🏠</div>
            <p>Select an assignment from the dropdown above to load its comparable workspace.</p>
          </div>
        `;
      }
      return;
    }

    // Get all MLS records for this assignment
    const records = this._getRecords();
    const filtered = this._applyFilters(records);

    // Render stats bar
    this._renderStats(records, filtered);

    // Render based on current view
    const compContent = document.getElementById('comps-content');
    if (!compContent) return;

    if (records.length === 0) {
      compContent.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📊</div>
          <p>No MLS data imported for this assignment yet.</p>
          <button class="btn-primary" onclick="App.navigateTo('mls-import')">Import MLS Data</button>
        </div>
      `;
      return;
    }

    switch (this.currentView) {
      case 'table':
        this._renderTable(filtered);
        break;
      case 'grid':
        this._renderGrid(filtered);
        break;
      case 'compare':
        this._renderCompare(filtered);
        break;
    }
  },

  /**
   * Get MLS records for the active assignment
   */
  _getRecords() {
    const imports = DB.where('mls_imports', m => m.assignment_id === App.activeAssignmentId);
    let records = [];
    imports.forEach(imp => {
      const data = DB.getAll('mls_data').filter(d => d.import_id === imp.id);
      records = records.concat(data);
    });

    // Also check for manually added comps
    const manualComps = DB.where('comparables', c => c.assignment_id === App.activeAssignmentId);
    records = records.concat(manualComps);

    return records;
  },

  /**
   * Apply current filter settings
   */
  _applyFilters(records) {
    let filtered = [...records];

    const tag = document.getElementById('comp-filter-tag')?.value;
    const minPrice = parseFloat(document.getElementById('comp-filter-min-price')?.value);
    const maxPrice = parseFloat(document.getElementById('comp-filter-max-price')?.value);
    const minGla = parseFloat(document.getElementById('comp-filter-min-gla')?.value);
    const maxGla = parseFloat(document.getElementById('comp-filter-max-gla')?.value);

    if (tag && tag !== 'all') {
      filtered = filtered.filter(r => r.tag === tag);
    }
    if (!isNaN(minPrice)) {
      filtered = filtered.filter(r => (r.close_price || r.list_price || 0) >= minPrice);
    }
    if (!isNaN(maxPrice)) {
      filtered = filtered.filter(r => (r.close_price || r.list_price || 0) <= maxPrice);
    }
    if (!isNaN(minGla)) {
      filtered = filtered.filter(r => (r.gla || r.above_grade_sqft || 0) >= minGla);
    }
    if (!isNaN(maxGla)) {
      filtered = filtered.filter(r => (r.gla || r.above_grade_sqft || 0) <= maxGla);
    }

    return filtered;
  },

  /**
   * Render summary stats
   */
  _renderStats(all, filtered) {
    const statsEl = document.getElementById('comps-stats');
    if (!statsEl) return;

    const selected = filtered.filter(r => r.tag === 'selected');
    const candidates = filtered.filter(r => r.tag === 'candidate');
    const prices = filtered.map(r => r.close_price || r.list_price || 0).filter(p => p > 0);
    const median = prices.length ? this._median(prices) : 0;
    const avgPpSqft = filtered.length ? (filtered.reduce((s, r) => s + (r.price_per_sqft || 0), 0) / filtered.length) : 0;

    statsEl.innerHTML = `
      <div class="comp-stat"><span class="stat-num">${all.length}</span> Total Records</div>
      <div class="comp-stat"><span class="stat-num">${filtered.length}</span> Filtered</div>
      <div class="comp-stat"><span class="stat-num badge-green">${selected.length}</span> Selected</div>
      <div class="comp-stat"><span class="stat-num badge-blue">${candidates.length}</span> Candidates</div>
      <div class="comp-stat">Median: <strong>${Util.currency(median)}</strong></div>
      <div class="comp-stat">Avg $/sqft: <strong>${avgPpSqft > 0 ? '$' + avgPpSqft.toFixed(2) : '-'}</strong></div>
    `;
  },

  /**
   * Render table view
   */
  _renderTable(records) {
    const compContent = document.getElementById('comps-content');
    if (!compContent) return;

    const rows = records.map(r => {
      const price = r.close_price || r.list_price || 0;
      const gla = r.gla || r.above_grade_sqft || 0;
      const tagClass = r.tag === 'selected' ? 'badge-green' : r.tag === 'candidate' ? 'badge-blue' : r.tag === 'excluded' ? 'badge-red' : 'badge-gray';
      const tagLabel = r.tag ? r.tag.charAt(0).toUpperCase() + r.tag.slice(1) : 'Untagged';

      return `
        <tr class="${r.tag === 'selected' ? 'row-selected' : r.tag === 'excluded' ? 'row-excluded' : ''}">
          <td>
            <select class="tag-select" onchange="CompsModule.setTag('${r.id}', this.value)">
              <option value="" ${!r.tag ? 'selected' : ''}>—</option>
              <option value="candidate" ${r.tag === 'candidate' ? 'selected' : ''}>Candidate</option>
              <option value="selected" ${r.tag === 'selected' ? 'selected' : ''}>Selected</option>
              <option value="visited" ${r.tag === 'visited' ? 'selected' : ''}>Visited</option>
              <option value="excluded" ${r.tag === 'excluded' ? 'selected' : ''}>Excluded</option>
            </select>
          </td>
          <td>${r.mls_number || r.listing_id || '-'}</td>
          <td>${r.address || r.street_address || '-'}</td>
          <td>${Util.currency(price)}</td>
          <td>${gla ? gla.toLocaleString() : '-'}</td>
          <td>${r.price_per_sqft ? '$' + r.price_per_sqft.toFixed(2) : '-'}</td>
          <td>${r.bedrooms || r.beds || '-'}/${r.full_baths || r.bathrooms || '-'}</td>
          <td>${r.year_built || '-'}</td>
          <td>${r.dom || r.days_on_market || '-'}</td>
          <td>${r.close_date ? Util.formatDate(r.close_date) : '-'}</td>
          <td>${r.sp_lp_ratio ? (r.sp_lp_ratio * 100).toFixed(1) + '%' : '-'}</td>
          <td>
            <button class="btn-link btn-sm" onclick="CompsModule.viewDetail('${r.id}')">Detail</button>
          </td>
        </tr>
      `;
    }).join('');

    compContent.innerHTML = `
      <div class="table-responsive">
        <table class="data-table compact">
          <thead>
            <tr>
              <th style="width:100px;">Tag</th>
              <th>MLS #</th>
              <th>Address</th>
              <th>Price</th>
              <th>GLA</th>
              <th>$/sqft</th>
              <th>Beds/Baths</th>
              <th>Year</th>
              <th>DOM</th>
              <th>Close Date</th>
              <th>SP/LP</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${rows || '<tr><td colspan="12" style="text-align:center;">No records match current filters</td></tr>'}
          </tbody>
        </table>
      </div>
    `;
  },

  /**
   * Render grid/card view
   */
  _renderGrid(records) {
    const compContent = document.getElementById('comps-content');
    if (!compContent) return;

    const cards = records.map(r => {
      const price = r.close_price || r.list_price || 0;
      const gla = r.gla || r.above_grade_sqft || 0;
      const tagClass = r.tag === 'selected' ? 'comp-card-selected' : r.tag === 'excluded' ? 'comp-card-excluded' : '';

      return `
        <div class="comp-card ${tagClass}" onclick="CompsModule.viewDetail('${r.id}')">
          <div class="comp-card-header">
            <span class="comp-mls">${r.mls_number || r.listing_id || 'N/A'}</span>
            <select class="tag-select-sm" onclick="event.stopPropagation()" onchange="CompsModule.setTag('${r.id}', this.value)">
              <option value="" ${!r.tag ? 'selected' : ''}>—</option>
              <option value="candidate" ${r.tag === 'candidate' ? 'selected' : ''}>Candidate</option>
              <option value="selected" ${r.tag === 'selected' ? 'selected' : ''}>Selected</option>
              <option value="visited" ${r.tag === 'visited' ? 'selected' : ''}>Visited</option>
              <option value="excluded" ${r.tag === 'excluded' ? 'selected' : ''}>Excluded</option>
            </select>
          </div>
          <div class="comp-card-address">${r.address || r.street_address || 'No address'}</div>
          <div class="comp-card-price">${Util.currency(price)}</div>
          <div class="comp-card-details">
            <span>${gla ? gla.toLocaleString() + ' sqft' : '-'}</span>
            <span>${r.bedrooms || r.beds || '-'}bd / ${r.full_baths || r.bathrooms || '-'}ba</span>
            <span>Built ${r.year_built || '-'}</span>
          </div>
          <div class="comp-card-footer">
            <span>${r.price_per_sqft ? '$' + r.price_per_sqft.toFixed(2) + '/sqft' : ''}</span>
            <span>${r.dom || r.days_on_market || '-'} DOM</span>
          </div>
        </div>
      `;
    }).join('');

    compContent.innerHTML = `<div class="comp-grid">${cards}</div>`;
  },

  /**
   * Render comparison view (selected comps side-by-side)
   */
  _renderCompare(records) {
    const compContent = document.getElementById('comps-content');
    if (!compContent) return;

    const selected = records.filter(r => r.tag === 'selected');

    if (selected.length === 0) {
      compContent.innerHTML = `
        <div class="empty-state">
          <p>No comps selected for comparison yet.</p>
          <small>Tag records as "Selected" in table or grid view to compare them side by side.</small>
        </div>
      `;
      return;
    }

    // Subject property
    const assignment = DB.getById('assignments', App.activeAssignmentId);
    const subject = assignment ? {
      address: assignment.subject_address,
      gla: assignment.gla || '-',
      bedrooms: assignment.bedrooms || '-',
      full_baths: assignment.full_baths || '-',
      half_baths: assignment.half_baths || '-',
      year_built: assignment.year_built || '-',
      garage_spaces: assignment.garage_spaces || '-',
      lot_size: assignment.lot_size || '-',
      basement_sqft: assignment.basement_sqft || '-',
      below_grade_sqft: assignment.below_grade_sqft || '-'
    } : null;

    const features = [
      { label: 'Address', key: r => r.address || r.street_address || '-' },
      { label: 'Sale Price', key: r => Util.currency(r.close_price || r.list_price || 0) },
      { label: 'GLA (sqft)', key: r => (r.gla || r.above_grade_sqft || '-').toLocaleString() },
      { label: '$/sqft', key: r => r.price_per_sqft ? '$' + r.price_per_sqft.toFixed(2) : '-' },
      { label: 'Bedrooms', key: r => r.bedrooms || r.beds || '-' },
      { label: 'Full Baths', key: r => r.full_baths || r.bathrooms || '-' },
      { label: 'Half Baths', key: r => r.half_baths || '-' },
      { label: 'Year Built', key: r => r.year_built || '-' },
      { label: 'Garage', key: r => r.garage_spaces || r.garage || '-' },
      { label: 'Lot Size', key: r => r.lot_size || r.lot_sqft || '-' },
      { label: 'Basement (sqft)', key: r => r.basement_sqft || r.below_grade_sqft || '-' },
      { label: 'Close Date', key: r => r.close_date ? Util.formatDate(r.close_date) : '-' },
      { label: 'DOM', key: r => r.dom || r.days_on_market || '-' },
      { label: 'SP/LP Ratio', key: r => r.sp_lp_ratio ? (r.sp_lp_ratio * 100).toFixed(1) + '%' : '-' },
      { label: 'Style', key: r => r.style || r.arch_style || '-' },
      { label: 'Condition', key: r => r.condition || '-' },
      { label: 'Location', key: r => r.subdivision || r.neighborhood || '-' },
      { label: 'Concessions', key: r => r.concessions || r.seller_concessions || '-' }
    ];

    const headerCells = (subject ? '<th class="compare-subject">Subject</th>' : '') +
      selected.map(r => `<th>${r.mls_number || r.listing_id || 'Comp'}</th>`).join('');

    const bodyRows = features.map(f => {
      const subjectVal = subject ? `<td class="compare-subject">${f.key(subject)}</td>` : '';
      const compVals = selected.map(r => `<td>${f.key(r)}</td>`).join('');
      return `<tr><td class="compare-label">${f.label}</td>${subjectVal}${compVals}</tr>`;
    }).join('');

    compContent.innerHTML = `
      <div class="table-responsive">
        <table class="data-table compare-table">
          <thead>
            <tr>
              <th class="compare-label">Feature</th>
              ${headerCells}
            </tr>
          </thead>
          <tbody>
            ${bodyRows}
          </tbody>
        </table>
      </div>
    `;
  },

  /**
   * Set view mode
   */
  setView(view) {
    this.currentView = view;
    const buttons = document.querySelectorAll('#section-comps .view-toggle .btn-sm');
    buttons.forEach(btn => {
      btn.classList.toggle('active', btn.textContent.toLowerCase() === view);
    });
    this.render();
  },

  /**
   * Apply filters and re-render
   */
  applyFilters() {
    this.render();
  },

  /**
   * Clear all filters
   */
  clearFilters() {
    const filterIds = ['comp-filter-tag', 'comp-filter-min-price', 'comp-filter-max-price', 'comp-filter-min-gla', 'comp-filter-max-gla'];
    filterIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        if (el.tagName === 'SELECT') el.selectedIndex = 0;
        else el.value = '';
      }
    });
    this.render();
  },

  /**
   * Set tag on a record
   */
  setTag(recordId, tag) {
    // Try mls_data first, then comparables
    let record = DB.getById('mls_data', recordId);
    if (record) {
      DB.update('mls_data', recordId, { tag: tag || null });
    } else {
      record = DB.getById('comparables', recordId);
      if (record) {
        DB.update('comparables', recordId, { tag: tag || null });
      }
    }
    this.render();
  },

  /**
   * View detail for a comp record
   */
  viewDetail(recordId) {
    let record = DB.getById('mls_data', recordId) || DB.getById('comparables', recordId);
    if (!record) { App.toast('Record not found', 'error'); return; }

    const fields = Object.entries(record)
      .filter(([k, v]) => v && !['id', 'created_at', 'updated_at', 'import_id', 'assignment_id'].includes(k))
      .map(([k, v]) => {
        const label = k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        const value = typeof v === 'number' && k.includes('price') ? Util.currency(v) : v;
        return `<div class="info-item"><span class="info-label">${label}</span><span class="info-value">${value}</span></div>`;
      }).join('');

    const body = `
      <div class="info-grid" style="grid-template-columns: 1fr 1fr;">
        ${fields}
      </div>
      <div style="margin-top: 16px;">
        <label>Tag:</label>
        <select onchange="CompsModule.setTag('${recordId}', this.value); App.closeDetail();">
          <option value="" ${!record.tag ? 'selected' : ''}>Untagged</option>
          <option value="candidate" ${record.tag === 'candidate' ? 'selected' : ''}>Candidate</option>
          <option value="selected" ${record.tag === 'selected' ? 'selected' : ''}>Selected</option>
          <option value="visited" ${record.tag === 'visited' ? 'selected' : ''}>Visited</option>
          <option value="excluded" ${record.tag === 'excluded' ? 'selected' : ''}>Excluded</option>
        </select>
      </div>
    `;

    App.showDetail(record.address || record.street_address || 'Property Detail', body);
  },

  /**
   * Median helper
   */
  _median(arr) {
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }
};


// ============================================================================
// MARKET ANALYSIS MODULE (Phase 5) — Full Implementation
// ============================================================================

const MarketModule = {
  _lastAnalysis: null,

  /**
   * Render market analysis section
   */
  render() {
    if (!App.activeAssignmentId) {
      const statsEl = document.getElementById('market-stats');
      if (statsEl) statsEl.innerHTML = '';
      const resultsEl = document.getElementById('market-results');
      if (resultsEl) resultsEl.innerHTML = `<div class="empty-state"><p>Select an assignment to run market analysis.</p></div>`;
      return;
    }

    // Load any saved analysis
    const saved = DB.where('market_analyses', m => m.assignment_id === App.activeAssignmentId)[0];
    if (saved && saved.narrative) {
      const textArea = document.getElementById('market-narrative-text');
      if (textArea && !textArea.value) textArea.value = saved.narrative;
    }
    if (saved && saved.results) {
      this._lastAnalysis = saved.results;
      this._renderResults(saved.results);
    }
  },

  /**
   * Run market analysis on imported MLS data
   */
  runAnalysis() {
    if (!App.activeAssignmentId) {
      App.toast('Select an assignment first', 'warning');
      return;
    }

    // Get MLS data for this assignment
    const imports = DB.where('mls_imports', m => m.assignment_id === App.activeAssignmentId);
    let records = [];
    imports.forEach(imp => {
      records = records.concat(DB.getAll('mls_data').filter(d => d.import_id === imp.id));
    });

    if (records.length === 0) {
      App.toast('No MLS data to analyze. Import data first.', 'warning');
      return;
    }

    // Apply filters
    const dateStart = document.getElementById('ma-date-start')?.value;
    const dateEnd = document.getElementById('ma-date-end')?.value;
    const statusFilter = document.getElementById('ma-status-filter')?.value;
    const neighborhood = document.getElementById('ma-neighborhood')?.value?.toLowerCase().trim();

    let filtered = [...records];
    if (dateStart) filtered = filtered.filter(r => r.close_date >= dateStart);
    if (dateEnd) filtered = filtered.filter(r => r.close_date <= dateEnd);
    if (statusFilter && statusFilter !== 'all') {
      filtered = filtered.filter(r => {
        const status = (r.listing_status || '').toLowerCase();
        return status.includes(statusFilter);
      });
    }
    if (neighborhood) {
      filtered = filtered.filter(r =>
        (r.neighborhood || '').toLowerCase().includes(neighborhood) ||
        (r.subdivision || '').toLowerCase().includes(neighborhood)
      );
    }

    if (filtered.length === 0) {
      App.toast('No records match your filters', 'warning');
      return;
    }

    // Run calculations
    const results = this._calculate(filtered);
    this._lastAnalysis = results;
    this._renderResults(results);
    App.toast(`Analysis complete: ${filtered.length} records analyzed`, 'success');
  },

  /**
   * Core market analysis calculations
   */
  _calculate(records) {
    const sold = records.filter(r => r.close_price > 0);
    const active = records.filter(r => !r.close_price && r.list_price > 0);

    const closePrices = sold.map(r => r.close_price).sort((a, b) => a - b);
    const listPrices = records.map(r => r.list_price || 0).filter(p => p > 0);
    const glas = records.map(r => r.gla || 0).filter(g => g > 0);
    const doms = records.map(r => r.dom || 0).filter(d => d > 0);
    const ppSqfts = records.map(r => r.price_per_sqft || 0).filter(p => p > 0);
    const spLpRatios = sold.filter(r => r.sp_lp_ratio).map(r => r.sp_lp_ratio);
    const lotSizes = records.map(r => r.lot_sqft || 0).filter(l => l > 0);
    const yearBuilts = records.map(r => r.year_built || 0).filter(y => y > 0);

    const median = arr => {
      if (!arr.length) return 0;
      const s = [...arr].sort((a, b) => a - b);
      const m = Math.floor(s.length / 2);
      return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
    };
    const mean = arr => arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : 0;
    const stdDev = arr => {
      if (arr.length < 2) return 0;
      const m = mean(arr);
      return Math.sqrt(arr.reduce((s, v) => s + Math.pow(v - m, 2), 0) / (arr.length - 1));
    };

    // Monthly sales for absorption rate
    const salesByMonth = {};
    sold.forEach(r => {
      if (r.close_date) {
        const key = r.close_date.substring(0, 7); // YYYY-MM
        salesByMonth[key] = (salesByMonth[key] || 0) + 1;
      }
    });
    const monthKeys = Object.keys(salesByMonth).sort();
    const monthlyAvg = monthKeys.length ? Object.values(salesByMonth).reduce((s, v) => s + v, 0) / monthKeys.length : 0;
    const monthsSupply = active.length > 0 && monthlyAvg > 0 ? (active.length / monthlyAvg).toFixed(1) : 'N/A';

    // Price trend (simple linear regression on sold prices by date)
    let priceTrend = 'Stable';
    if (sold.length >= 4) {
      const sortedSold = [...sold].filter(r => r.close_date).sort((a, b) => a.close_date.localeCompare(b.close_date));
      if (sortedSold.length >= 4) {
        const half = Math.floor(sortedSold.length / 2);
        const firstHalf = median(sortedSold.slice(0, half).map(r => r.close_price));
        const secondHalf = median(sortedSold.slice(half).map(r => r.close_price));
        const change = ((secondHalf - firstHalf) / firstHalf * 100);
        if (change > 3) priceTrend = 'Increasing';
        else if (change < -3) priceTrend = 'Declining';
        else priceTrend = 'Stable';
      }
    }

    // DOM trend
    let domTrend = 'Stable';
    if (sold.length >= 4) {
      const sortedDom = [...sold].filter(r => r.close_date && r.dom).sort((a, b) => a.close_date.localeCompare(b.close_date));
      if (sortedDom.length >= 4) {
        const half = Math.floor(sortedDom.length / 2);
        const firstDom = mean(sortedDom.slice(0, half).map(r => r.dom));
        const secondDom = mean(sortedDom.slice(half).map(r => r.dom));
        if (secondDom > firstDom * 1.15) domTrend = 'Increasing';
        else if (secondDom < firstDom * 0.85) domTrend = 'Declining';
      }
    }

    // Supply/demand classification
    let marketCondition = 'Balanced';
    if (monthsSupply !== 'N/A') {
      const ms = parseFloat(monthsSupply);
      if (ms < 4) marketCondition = "Seller's Market";
      else if (ms > 7) marketCondition = "Buyer's Market";
    }

    return {
      totalRecords: records.length,
      soldCount: sold.length,
      activeCount: active.length,
      priceStats: {
        min: Math.min(...closePrices.length ? closePrices : [0]),
        max: Math.max(...closePrices.length ? closePrices : [0]),
        mean: mean(closePrices),
        median: median(closePrices),
        stdDev: stdDev(closePrices)
      },
      glaStats: {
        min: Math.min(...glas.length ? glas : [0]),
        max: Math.max(...glas.length ? glas : [0]),
        mean: mean(glas),
        median: median(glas)
      },
      domStats: {
        min: Math.min(...doms.length ? doms : [0]),
        max: Math.max(...doms.length ? doms : [0]),
        mean: mean(doms),
        median: median(doms)
      },
      ppSqftStats: {
        min: Math.min(...ppSqfts.length ? ppSqfts : [0]),
        max: Math.max(...ppSqfts.length ? ppSqfts : [0]),
        mean: mean(ppSqfts),
        median: median(ppSqfts)
      },
      spLpRatio: {
        mean: mean(spLpRatios),
        median: median(spLpRatios)
      },
      lotStats: {
        mean: mean(lotSizes),
        median: median(lotSizes)
      },
      yearBuiltStats: {
        min: Math.min(...yearBuilts.length ? yearBuilts : [0]),
        max: Math.max(...yearBuilts.length ? yearBuilts : [0]),
        median: median(yearBuilts)
      },
      absorptionRate: monthlyAvg.toFixed(1),
      monthsSupply: monthsSupply,
      salesByMonth: salesByMonth,
      priceTrend: priceTrend,
      domTrend: domTrend,
      marketCondition: marketCondition
    };
  },

  /**
   * Render analysis results
   */
  _renderResults(r) {
    // Stats cards
    const statsEl = document.getElementById('market-stats');
    if (statsEl) {
      statsEl.innerHTML = `
        <div class="market-stat-grid">
          <div class="metric-card"><div class="metric-label">Records Analyzed</div><div class="metric-value">${r.totalRecords}</div><div class="metric-change">${r.soldCount} sold / ${r.activeCount} active</div></div>
          <div class="metric-card"><div class="metric-label">Median Sale Price</div><div class="metric-value">${Util.currency(r.priceStats.median)}</div><div class="metric-change">Range: ${Util.currency(r.priceStats.min)} – ${Util.currency(r.priceStats.max)}</div></div>
          <div class="metric-card"><div class="metric-label">Avg $/sqft</div><div class="metric-value">$${r.ppSqftStats.mean.toFixed(2)}</div><div class="metric-change">Median: $${r.ppSqftStats.median.toFixed(2)}</div></div>
          <div class="metric-card"><div class="metric-label">Median DOM</div><div class="metric-value">${r.domStats.median}</div><div class="metric-change">Mean: ${r.domStats.mean.toFixed(0)} days</div></div>
          <div class="metric-card"><div class="metric-label">SP/LP Ratio</div><div class="metric-value">${r.spLpRatio.mean ? (r.spLpRatio.mean * 100).toFixed(1) + '%' : 'N/A'}</div><div class="metric-change">Median: ${r.spLpRatio.median ? (r.spLpRatio.median * 100).toFixed(1) + '%' : 'N/A'}</div></div>
          <div class="metric-card"><div class="metric-label">Absorption Rate</div><div class="metric-value">${r.absorptionRate}/mo</div><div class="metric-change">${r.monthsSupply} months supply</div></div>
          <div class="metric-card"><div class="metric-label">Market Condition</div><div class="metric-value">${r.marketCondition}</div></div>
          <div class="metric-card"><div class="metric-label">Price Trend</div><div class="metric-value">${r.priceTrend}</div><div class="metric-change">DOM Trend: ${r.domTrend}</div></div>
        </div>
      `;
    }

    // Detailed results
    const resultsEl = document.getElementById('market-results');
    if (resultsEl) {
      resultsEl.innerHTML = `
        <div class="market-detail-grid">
          <div class="card">
            <h4>Price Distribution</h4>
            <table class="data-table compact">
              <tr><td>Minimum</td><td>${Util.currency(r.priceStats.min)}</td></tr>
              <tr><td>Maximum</td><td>${Util.currency(r.priceStats.max)}</td></tr>
              <tr><td>Mean</td><td>${Util.currency(r.priceStats.mean)}</td></tr>
              <tr><td>Median</td><td>${Util.currency(r.priceStats.median)}</td></tr>
              <tr><td>Std Deviation</td><td>${Util.currency(r.priceStats.stdDev)}</td></tr>
            </table>
          </div>
          <div class="card">
            <h4>Size Distribution (GLA)</h4>
            <table class="data-table compact">
              <tr><td>Minimum</td><td>${r.glaStats.min.toLocaleString()} sqft</td></tr>
              <tr><td>Maximum</td><td>${r.glaStats.max.toLocaleString()} sqft</td></tr>
              <tr><td>Mean</td><td>${r.glaStats.mean.toFixed(0).toLocaleString()} sqft</td></tr>
              <tr><td>Median</td><td>${r.glaStats.median.toLocaleString()} sqft</td></tr>
            </table>
          </div>
          <div class="card">
            <h4>Marketing Time (DOM)</h4>
            <table class="data-table compact">
              <tr><td>Minimum</td><td>${r.domStats.min} days</td></tr>
              <tr><td>Maximum</td><td>${r.domStats.max} days</td></tr>
              <tr><td>Mean</td><td>${r.domStats.mean.toFixed(0)} days</td></tr>
              <tr><td>Median</td><td>${r.domStats.median} days</td></tr>
              <tr><td>Trend</td><td>${r.domTrend}</td></tr>
            </table>
          </div>
          <div class="card">
            <h4>Supply & Demand</h4>
            <table class="data-table compact">
              <tr><td>Active Listings</td><td>${r.activeCount}</td></tr>
              <tr><td>Closed Sales</td><td>${r.soldCount}</td></tr>
              <tr><td>Absorption Rate</td><td>${r.absorptionRate} sales/month</td></tr>
              <tr><td>Months Supply</td><td>${r.monthsSupply}</td></tr>
              <tr><td>Market Condition</td><td><strong>${r.marketCondition}</strong></td></tr>
            </table>
          </div>
        </div>
      `;
    }

    // Monthly sales trend
    const trendsEl = document.getElementById('market-trends');
    if (trendsEl && r.salesByMonth) {
      const months = Object.keys(r.salesByMonth).sort();
      if (months.length > 1) {
        const maxSales = Math.max(...Object.values(r.salesByMonth));
        const bars = months.map(m => {
          const count = r.salesByMonth[m];
          const pct = maxSales > 0 ? (count / maxSales * 100) : 0;
          return `<div class="trend-bar-wrapper"><div class="trend-bar" style="height:${pct}%"><span class="trend-count">${count}</span></div><div class="trend-label">${m.substring(5)}</div></div>`;
        }).join('');
        trendsEl.innerHTML = `<h4>Monthly Closed Sales</h4><div class="trend-chart">${bars}</div>`;
      } else {
        trendsEl.innerHTML = '';
      }
    }
  },

  /**
   * Generate USPAP-safe market narrative from analysis data
   */
  generateNarrative() {
    const r = this._lastAnalysis;
    if (!r) {
      App.toast('Run analysis first to generate a narrative', 'warning');
      return;
    }

    const assignment = DB.getById('assignments', App.activeAssignmentId);
    const area = assignment ? `the ${assignment.city || ''} ${assignment.state || ''} area` : 'the subject market area';

    let narrative = `The market analysis of ${area} is based on ${r.totalRecords} properties, including ${r.soldCount} closed sale${r.soldCount !== 1 ? 's' : ''} and ${r.activeCount} active listing${r.activeCount !== 1 ? 's' : ''}. `;

    narrative += `Closed sale prices range from ${Util.currency(r.priceStats.min)} to ${Util.currency(r.priceStats.max)}, with a median of ${Util.currency(r.priceStats.median)} and mean of ${Util.currency(r.priceStats.mean)}. `;

    narrative += `The median price per square foot is $${r.ppSqftStats.median.toFixed(2)}, indicating the typical unit rate for the market. `;

    if (r.spLpRatio.mean) {
      narrative += `The average sale price to list price ratio is ${(r.spLpRatio.mean * 100).toFixed(1)}%, `;
      if (r.spLpRatio.mean > 0.99) {
        narrative += `suggesting sellers are achieving at or near asking price. `;
      } else if (r.spLpRatio.mean > 0.96) {
        narrative += `reflecting limited negotiating by buyers. `;
      } else {
        narrative += `indicating some buyer negotiation from list price. `;
      }
    }

    narrative += `\n\nMarketing time (DOM) ranges from ${r.domStats.min} to ${r.domStats.max} days, with a median of ${r.domStats.median} days. `;
    narrative += `DOM is ${r.domTrend.toLowerCase()}, `;
    if (r.domTrend === 'Declining') {
      narrative += `suggesting increasing buyer demand. `;
    } else if (r.domTrend === 'Increasing') {
      narrative += `which may indicate softening demand. `;
    } else {
      narrative += `reflecting consistent market activity. `;
    }

    narrative += `\n\nThe absorption rate is approximately ${r.absorptionRate} sales per month`;
    if (r.monthsSupply !== 'N/A') {
      narrative += `, resulting in ${r.monthsSupply} months of housing supply. `;
      narrative += `This is consistent with a ${r.marketCondition.toLowerCase()} condition. `;
    } else {
      narrative += `. `;
    }

    narrative += `Overall, property values appear to be ${r.priceTrend.toLowerCase()} based on the data analyzed. `;

    narrative += `\n\n[Note: This is a system-generated draft based on available MLS data. The appraiser is responsible for verifying all market conclusions and ensuring they reflect the appraiser's independent judgment.]`;

    document.getElementById('market-narrative-text').value = narrative;
    App.toast('Narrative draft generated', 'success');
  },

  /**
   * Save narrative to assignment
   */
  saveNarrative() {
    if (!App.activeAssignmentId) {
      App.toast('No active assignment', 'warning');
      return;
    }
    const text = document.getElementById('market-narrative-text')?.value?.trim();
    if (!text) {
      App.toast('No narrative to save', 'warning');
      return;
    }

    this.saveAnalysis();
  },

  /**
   * Save full analysis (results + narrative) to DB
   */
  saveAnalysis() {
    if (!App.activeAssignmentId) {
      App.toast('No active assignment', 'warning');
      return;
    }

    const existing = DB.where('market_analyses', m => m.assignment_id === App.activeAssignmentId)[0];
    const data = {
      assignment_id: App.activeAssignmentId,
      results: this._lastAnalysis,
      narrative: document.getElementById('market-narrative-text')?.value?.trim() || '',
      saved_at: new Date().toISOString()
    };

    if (existing) {
      DB.update('market_analyses', existing.id, data);
    } else {
      DB.add('market_analyses', data);
    }
    App.toast('Market analysis saved', 'success');
  }
};

// Alias used by renderSection in app-core.js
const MarketAnalysisModule = MarketModule;


// ============================================================================
// ADJUSTMENT SUPPORT MODULE (Phase 6) — Full Statistical Engine
// ============================================================================

const AdjustmentModule = {
  currentFeature: 'gla',
  _lastResults: null,

  // Default features with MLS field mapping and unit labels
  _defaultFeatures: {
    'gla': { label: 'GLA', field: 'living_area', unit: 'sqft' },
    'bath': { label: 'Full Bath', field: 'baths_full', unit: 'count' },
    'half-bath': { label: 'Half Bath', field: 'baths_half', unit: 'count' },
    'garage': { label: 'Garage', field: 'garage_spaces', unit: 'spaces' },
    'basement': { label: 'Basement', field: 'basement_area', unit: 'sqft' },
    'lot': { label: 'Lot Size', field: 'lot_sqft', unit: 'sqft' }
  },

  /**
   * Get all features (default + custom)
   */
  getFeatures() {
    const custom = DB.get('custom_adjustment_features') || {};
    const merged = {};
    Object.entries(this._defaultFeatures).forEach(([k, v]) => { merged[k] = v; });
    Object.entries(custom).forEach(([k, v]) => {
      merged[k] = typeof v === 'string' ? { label: v, field: k, unit: '' } : v;
    });
    return merged;
  },

  /**
   * Add a custom feature
   */
  addFeature() {
    const body = `
      <form id="add-feature-form">
        <div class="form-group">
          <label>Feature Key (lowercase, no spaces)</label>
          <input type="text" id="feature-key" placeholder="e.g., below-grade, pool" required>
        </div>
        <div class="form-group">
          <label>Display Name</label>
          <input type="text" id="feature-label" placeholder="e.g., Below Grade Area" required>
        </div>
        <div class="form-group">
          <label>MLS Field (optional)</label>
          <input type="text" id="feature-field" placeholder="e.g., basement_finished_area">
        </div>
        <div class="form-group">
          <label>Unit</label>
          <input type="text" id="feature-unit" placeholder="e.g., sqft, count, spaces" value="sqft">
        </div>
      </form>
    `;
    App.showModal('Add Adjustment Feature', body, `
      <button class="btn-secondary" onclick="App.closeModal()">Cancel</button>
      <button class="btn-primary" onclick="AdjustmentModule.saveFeature()">Add Feature</button>
    `);
  },

  saveFeature() {
    const key = document.getElementById('feature-key').value.trim().toLowerCase().replace(/\s+/g, '-');
    const label = document.getElementById('feature-label').value.trim();
    const field = document.getElementById('feature-field')?.value?.trim() || key;
    const unit = document.getElementById('feature-unit')?.value?.trim() || '';

    if (!key || !label) { App.toast('Key and name required', 'warning'); return; }
    if (this.getFeatures()[key]) { App.toast('Already exists', 'warning'); return; }

    const custom = DB.get('custom_adjustment_features') || {};
    custom[key] = { label, field, unit };
    DB.save('custom_adjustment_features', custom);
    App.closeModal();
    App.toast(`"${label}" added`, 'success');
    this._rebuildFeatureTabs();
  },

  /**
   * Rebuild feature tab bar
   */
  _rebuildFeatureTabs() {
    const container = document.getElementById('adjustment-features');
    if (!container) return;
    const features = this.getFeatures();

    container.innerHTML = Object.entries(features).map(([key, feat]) =>
      `<button class="feature-tab ${key === this.currentFeature ? 'active' : ''}" onclick="AdjustmentModule.selectFeature('${key}')">${feat.label}</button>`
    ).join('') +
    `<button class="feature-tab feature-tab-add" onclick="AdjustmentModule.addFeature()">+ Add</button>`;
  },

  /**
   * Render — called when section becomes active
   */
  render() {
    this._rebuildFeatureTabs();
    this.selectFeature(this.currentFeature);
  },

  /**
   * Select a feature tab and load its data
   */
  selectFeature(feature) {
    this.currentFeature = feature;
    this._lastResults = null;

    // Update tab UI
    const features = this.getFeatures();
    document.querySelectorAll('#adjustment-features .feature-tab').forEach(tab => {
      tab.classList.remove('active');
      const feat = features[feature];
      if (feat && tab.textContent.trim() === feat.label) tab.classList.add('active');
    });

    const feat = features[feature];
    if (!feat) return;

    // Update header
    const titleEl = document.getElementById('adj-feature-title');
    const unitEl = document.getElementById('adj-unit');
    const selUnitEl = document.getElementById('adj-selected-unit');
    if (titleEl) titleEl.textContent = feat.label;
    if (unitEl) unitEl.textContent = feat.unit || '';
    if (selUnitEl) selUnitEl.textContent = `$/${feat.unit || 'unit'}`;

    // Load saved adjustment for this feature
    this._loadSaved(feature);

    // Populate pairs table from selected comps
    this._populatePairsTable(feature);

    // Hide results until analysis is run
    const resultsEl = document.getElementById('adj-results-section');
    if (resultsEl) resultsEl.style.display = 'none';
  },

  /**
   * Handle subject value change
   */
  onSubjectValueChange() {
    // Update difference column in pairs table
    const subVal = parseFloat(document.getElementById('adj-subject-value')?.value) || 0;
    document.querySelectorAll('.adj-diff-cell').forEach(cell => {
      const compVal = parseFloat(cell.dataset.compValue) || 0;
      cell.textContent = (subVal - compVal).toFixed(1);
    });
  },

  /**
   * Populate the comp pairs table from selected MLS data
   */
  _populatePairsTable(feature) {
    const tbody = document.getElementById('adj-pairs-body');
    if (!tbody) return;

    const feat = this.getFeatures()[feature];
    if (!feat) return;

    const comps = DB.where('mls_data', d => d.tag === 'selected' || d.tag === 'candidate');
    const subVal = parseFloat(document.getElementById('adj-subject-value')?.value) || 0;

    if (comps.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="empty-state">Select comparables in the Comparable Workspace first</td></tr>';
      document.getElementById('adj-pair-count').textContent = '0 comps';
      return;
    }

    document.getElementById('adj-pair-count').textContent = `${comps.length} comps`;

    tbody.innerHTML = comps.map((c, idx) => {
      const val = parseFloat(c[feat.field]) || 0;
      const price = parseFloat(c.close_price || c.list_price) || 0;
      const diff = subVal ? (subVal - val).toFixed(1) : '—';

      return `<tr>
        <td><strong>${c.comp_number || idx + 1}</strong><br><small>${(c.address || c.full_address || '').substring(0, 25)}</small></td>
        <td>${Util.currency(price)}</td>
        <td>${val} ${feat.unit || ''}</td>
        <td class="adj-diff-cell" data-comp-value="${val}">${diff}</td>
        <td><input type="checkbox" class="adj-use-comp" data-idx="${idx}" checked></td>
      </tr>`;
    }).join('');
  },

  /**
   * RUN ANALYSIS — Core calculation function
   */
  runAnalysis() {
    if (!App.activeAssignmentId) {
      App.toast('Select an assignment first', 'warning');
      return;
    }

    const feat = this.getFeatures()[this.currentFeature];
    if (!feat) return;

    const subVal = parseFloat(document.getElementById('adj-subject-value')?.value) || 0;
    const comps = DB.where('mls_data', d => d.tag === 'selected' || d.tag === 'candidate');

    // Get checked comps only
    const useCheckboxes = document.querySelectorAll('.adj-use-comp:checked');
    const useIndices = new Set([...useCheckboxes].map(cb => parseInt(cb.dataset.idx)));

    const filteredComps = comps.filter((_, i) => useIndices.has(i));

    if (filteredComps.length < 2) {
      App.toast('Need at least 2 comparables to run analysis', 'warning');
      return;
    }

    // Extract x (feature values) and y (sale prices)
    const x = filteredComps.map(c => parseFloat(c[feat.field]) || 0);
    const y = filteredComps.map(c => parseFloat(c.close_price || c.list_price) || 0);

    // Filter out zero prices
    const validPairs = x.map((xVal, i) => ({ x: xVal, y: y[i] })).filter(p => p.y > 0);
    const xClean = validPairs.map(p => p.x);
    const yClean = validPairs.map(p => p.y);

    if (xClean.length < 2) {
      App.toast('Not enough valid data points', 'warning');
      return;
    }

    // Get selected methods
    const selectedMethods = [];
    document.querySelectorAll('#adj-methods-grid input[type="checkbox"]:checked').forEach(cb => {
      selectedMethods.push(cb.dataset.method);
    });

    if (selectedMethods.length === 0) {
      App.toast('Select at least one method', 'warning');
      return;
    }

    // Get extras for depreciated cost / survey
    const costApproach = DB.where('cost_approaches', c => c.assignment_id === App.activeAssignmentId)[0];
    const extras = {
      costPerUnit: costApproach ? costApproach.base_per_sqft || 0 : 0,
      depreciationRate: costApproach && costApproach.economic_life > 0
        ? (costApproach.effective_age / costApproach.economic_life)
        : 0,
      surveyValue: parseFloat(document.getElementById('adj-selected-value')?.value) || null,
      surveySource: 'Appraiser judgment'
    };

    // Run each selected method
    const results = [];
    selectedMethods.forEach(method => {
      if (typeof StatisticalMethods[method] === 'function') {
        try {
          const result = StatisticalMethods[method](xClean, yClean, subVal, extras);
          results.push(result);
        } catch (err) {
          results.push({
            value: null, error: err.message, method, label: method.replace(/_/g, ' ')
          });
        }
      }
    });

    // Peer consensus
    const consensus = StatisticalMethods.peerConsensus(results);
    if (consensus) results.push(consensus);

    this._lastResults = results;
    this._renderResults(results, feat);
  },

  /**
   * Render results with range bars and summary
   */
  _renderResults(results, feat) {
    const resultsSection = document.getElementById('adj-results-section');
    if (resultsSection) resultsSection.style.display = 'block';

    const chartEl = document.getElementById('adj-range-chart');
    const statsEl = document.getElementById('adj-summary-stats');

    // Get global range for scaling
    const allValues = results.filter(r => r.value != null).flatMap(r => [r.value, r.low, r.high].filter(v => v != null));
    if (allValues.length === 0) {
      chartEl.innerHTML = '<div class="empty-state">No valid results from any method</div>';
      return;
    }

    const globalMin = Math.min(...allValues);
    const globalMax = Math.max(...allValues);
    const range = globalMax - globalMin || 1;
    const padding = range * 0.15;
    const scaleMin = globalMin - padding;
    const scaleMax = globalMax + padding;
    const scaleRange = scaleMax - scaleMin || 1;

    const toPercent = (val) => ((val - scaleMin) / scaleRange * 100).toFixed(1);

    // Render range bars
    chartEl.innerHTML = `
      <div class="adj-scale-bar">
        <span class="adj-scale-label">${Util.currency(scaleMin)}</span>
        <div class="adj-scale-track"></div>
        <span class="adj-scale-label">${Util.currency(scaleMax)}</span>
      </div>
      ${results.map(r => {
        if (r.value === null) {
          return `<div class="adj-result-row adj-result-error">
            <span class="adj-result-label">${r.label || r.method}</span>
            <span class="adj-result-error-msg">${r.error || 'No result'}</span>
          </div>`;
        }

        const valPos = toPercent(r.value);
        const lowPos = r.low != null ? toPercent(r.low) : valPos;
        const highPos = r.high != null ? toPercent(r.high) : valPos;
        const barLeft = Math.min(lowPos, highPos);
        const barWidth = Math.abs(highPos - lowPos);
        const isConsensus = r.method === 'peer_consensus';
        const confClass = r.confidence >= 70 ? 'conf-high' : r.confidence >= 50 ? 'conf-med' : 'conf-low';

        return `<div class="adj-result-row ${isConsensus ? 'adj-result-consensus' : ''}">
          <span class="adj-result-label">${r.label}
            <span class="adj-conf-badge ${confClass}">${r.confidence}%</span>
          </span>
          <div class="adj-result-bar-wrap">
            <div class="adj-result-range" style="left:${barLeft}%;width:${barWidth}%"></div>
            <div class="adj-result-dot" style="left:${valPos}%"></div>
          </div>
          <span class="adj-result-value">${Util.currency(r.value)}</span>
        </div>`;
      }).join('')}
    `;

    // Summary statistics
    const validResults = results.filter(r => r.value != null && r.method !== 'peer_consensus');
    const values = validResults.map(r => r.value);
    const consensus = results.find(r => r.method === 'peer_consensus');

    statsEl.innerHTML = `
      <div class="adj-stats-grid">
        <div class="adj-stat"><span class="adj-stat-label">Methods Run</span><span class="adj-stat-value">${validResults.length}</span></div>
        <div class="adj-stat"><span class="adj-stat-label">Consensus</span><span class="adj-stat-value">${consensus ? Util.currency(consensus.value) : '—'}</span></div>
        <div class="adj-stat"><span class="adj-stat-label">Range</span><span class="adj-stat-value">${Util.currency(Math.min(...values))} – ${Util.currency(Math.max(...values))}</span></div>
        <div class="adj-stat"><span class="adj-stat-label">Median</span><span class="adj-stat-value">${Util.currency(StatUtils.median(values))}</span></div>
        <div class="adj-stat"><span class="adj-stat-label">Std Dev</span><span class="adj-stat-value">${Util.currency(StatUtils.stdev(values))}</span></div>
        <div class="adj-stat"><span class="adj-stat-label">Avg Confidence</span><span class="adj-stat-value">${Math.round(StatUtils.mean(validResults.map(r => r.confidence)))}%</span></div>
      </div>
      <div class="adj-method-details">
        ${validResults.map(r => `<div class="adj-method-note"><strong>${r.label}:</strong> ${r.notes || ''}</div>`).join('')}
      </div>
    `;

    // Pre-fill selected value with consensus
    if (consensus) {
      const selEl = document.getElementById('adj-selected-value');
      if (selEl && !selEl.value) selEl.value = consensus.value;
    }

    App.toast(`Analysis complete: ${validResults.length} methods calculated`, 'success');
  },

  /**
   * Save the selected adjustment value
   */
  saveAdjustment() {
    if (!App.activeAssignmentId) { App.toast('No assignment', 'warning'); return; }

    const feat = this.getFeatures()[this.currentFeature];
    const selectedValue = parseFloat(document.getElementById('adj-selected-value')?.value);
    const notes = document.getElementById('adj-support-notes')?.value?.trim() || '';

    if (isNaN(selectedValue)) {
      App.toast('Enter a selected adjustment value', 'warning');
      return;
    }

    // Find existing or create new
    const existing = DB.where('adjustments', a =>
      a.assignment_id === App.activeAssignmentId && a.feature_key === this.currentFeature
    )[0];

    const record = {
      assignment_id: App.activeAssignmentId,
      feature_key: this.currentFeature,
      feature_name: feat?.label || this.currentFeature,
      selected_adjustment: selectedValue,
      subject_value: parseFloat(document.getElementById('adj-subject-value')?.value) || 0,
      methods_used: this._lastResults
        ? this._lastResults.filter(r => r.value != null && r.method !== 'peer_consensus').map(r => r.label).join(', ')
        : '',
      support_low: this._lastResults
        ? Math.min(...this._lastResults.filter(r => r.value != null).map(r => r.value))
        : selectedValue,
      support_high: this._lastResults
        ? Math.max(...this._lastResults.filter(r => r.value != null).map(r => r.value))
        : selectedValue,
      narrative_notes: notes,
      results_json: this._lastResults ? JSON.stringify(this._lastResults) : '',
      updated_at: new Date().toISOString()
    };

    if (existing) {
      DB.update('adjustments', existing.id, record);
    } else {
      record.created_at = new Date().toISOString();
      DB.add('adjustments', record);
    }

    App.toast(`${feat?.label || 'Adjustment'} saved: ${Util.currency(selectedValue)}/${feat?.unit || 'unit'}`, 'success');
  },

  /**
   * Load saved adjustment for current feature
   */
  _loadSaved(feature) {
    if (!App.activeAssignmentId) return;

    const saved = DB.where('adjustments', a =>
      a.assignment_id === App.activeAssignmentId && a.feature_key === feature
    )[0];

    if (saved) {
      const subEl = document.getElementById('adj-subject-value');
      const selEl = document.getElementById('adj-selected-value');
      const notesEl = document.getElementById('adj-support-notes');

      if (subEl && saved.subject_value) subEl.value = saved.subject_value;
      if (selEl && saved.selected_adjustment) selEl.value = saved.selected_adjustment;
      if (notesEl && saved.narrative_notes) notesEl.value = saved.narrative_notes;

      // Restore results if available
      if (saved.results_json) {
        try {
          const results = JSON.parse(saved.results_json);
          const feat = this.getFeatures()[feature];
          this._lastResults = results;
          this._renderResults(results, feat);
        } catch (e) { /* ignore parse errors */ }
      }
    } else {
      // Clear fields
      const subEl = document.getElementById('adj-subject-value');
      const selEl = document.getElementById('adj-selected-value');
      const notesEl = document.getElementById('adj-support-notes');
      if (subEl) subEl.value = '';
      if (selEl) selEl.value = '';
      if (notesEl) notesEl.value = '';
    }
  },

  /**
   * View summary grid of all saved adjustments
   */
  viewSummary() {
    if (!App.activeAssignmentId) { App.toast('Select an assignment', 'warning'); return; }

    const allAdj = DB.where('adjustments', a => a.assignment_id === App.activeAssignmentId);

    if (allAdj.length === 0) {
      App.toast('No saved adjustments yet', 'info');
      return;
    }

    const body = `
      <table class="data-table">
        <thead>
          <tr><th>Feature</th><th>Selected</th><th>Range</th><th>Methods</th><th>Confidence</th></tr>
        </thead>
        <tbody>
          ${allAdj.map(a => `
            <tr>
              <td><strong>${a.feature_name}</strong></td>
              <td>${Util.currency(a.selected_adjustment)}</td>
              <td>${Util.currency(a.support_low)} – ${Util.currency(a.support_high)}</td>
              <td><small>${a.methods_used || '—'}</small></td>
              <td>${a.results_json ? (() => {
                try {
                  const r = JSON.parse(a.results_json).filter(x => x.value != null && x.method !== 'peer_consensus');
                  return Math.round(StatUtils.mean(r.map(x => x.confidence))) + '%';
                } catch(e) { return '—'; }
              })() : '—'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <p style="font-size:11px;color:#666;margin-top:12px;">All adjustments reflect the appraiser's professional judgment supported by market data and analytical methods.</p>
    `;

    App.showModal('Adjustment Summary — All Features', body);
  },

  /**
   * Export all adjustment results as text
   */
  exportResults() {
    if (!App.activeAssignmentId) return;

    const allAdj = DB.where('adjustments', a => a.assignment_id === App.activeAssignmentId);
    if (allAdj.length === 0) { App.toast('No adjustments to export', 'warning'); return; }

    const assignment = DB.getById('assignments', App.activeAssignmentId);
    let output = `ADJUSTMENT SUPPORT REPORT\n`;
    output += `Property: ${assignment?.address || 'N/A'}\n`;
    output += `Generated: ${new Date().toLocaleString()}\n`;
    output += `${'='.repeat(60)}\n\n`;

    allAdj.forEach(a => {
      output += `--- ${a.feature_name} ---\n`;
      output += `Selected Adjustment: ${Util.currency(a.selected_adjustment)}\n`;
      output += `Support Range: ${Util.currency(a.support_low)} – ${Util.currency(a.support_high)}\n`;
      output += `Methods: ${a.methods_used || 'N/A'}\n`;
      if (a.narrative_notes) output += `Notes: ${a.narrative_notes}\n`;
      output += '\n';
    });

    output += `${'='.repeat(60)}\n`;
    output += 'Adjustment methods are analytical tools supporting appraiser judgment.\n';

    const blob = new Blob([output], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `adjustments_${assignment?.address?.replace(/\s/g, '_') || 'export'}_${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    App.toast('Exported', 'success');
  }
};

// Alias used by renderSection in app-core.js
const AdjustmentsModule = AdjustmentModule;


// ============================================================================
// COMMENTS MODULE — Now in app-comments.js (AI-Assisted Generator)
// ============================================================================
// CommentsModule has been moved to app-comments.js with full rule-based
// + AI-assisted generation, conditional inserts, statements library,
// revision response, and provider-agnostic AI integration.
