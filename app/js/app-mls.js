/**
 * DESIGNER HOMES APPRAISAL PLATFORM
 * MLS CSV Import Engine — Phase 3
 *
 * Parses Spark/Synapse MLS CSV exports (up to 3 datasets per assignment).
 * Auto-detects column mapping, normalizes data, detects duplicates.
 * Stores parsed records in localStorage linked to active assignment.
 *
 * Dependencies: App, DB, Util (from app-core.js)
 */

// ============================================================================
// COLUMN MAPPING: Spark CSV Header → Internal Field Name
// ============================================================================

const MLS_COLUMN_MAP = {
  // Primary identifiers
  'MLS #':                  'mls_number',
  'Address':                'address',
  'Unparsed Address':       'unparsed_address',
  'City':                   'city',
  'State':                  'state',
  'Postal Code':            'zip',
  'County':                 'county',
  'Neighborhood':           'neighborhood',
  'Subdivision':            'subdivision',
  'Parcel Num':             'parcel_number',

  // Pricing
  'Close Price':            'close_price',
  'List Price':             'list_price',
  'Original Price':         'original_price',
  'Concessions Amount':     'concessions_amount',
  'Concessions':            'concessions',

  // Dates
  'Close Date':             'close_date',
  'Listing Contract Date':  'listing_date',
  'Off Market Date':        'off_market_date',
  'Purchase Contract Date': 'contract_date',

  // Market time
  'Days On Market':         'dom',
  'Cumulative DOM':         'cdom',

  // Size & structure
  'Above Grade Finished Area': 'gla',
  'Living Area':            'living_area',
  'Lot Size Acres':         'lot_acres',
  'Lot Size Square Feet':   'lot_sqft',
  'Foundation Area':        'foundation_area',
  'Below Grade Finished Area':   'basement_finished',
  'Below Grade Unfinished Area': 'basement_unfinished',
  'Stories':                'stories',
  'Rooms Total':            'rooms_total',

  // Rooms
  'Bedrooms Total':         'bedrooms',
  'Bathrooms Full':         'full_baths',
  'Bathrooms Half':         'half_baths',
  'Bathrooms Three Quarter':'three_quarter_baths',

  // Garage / Parking
  'Garage Spaces':          'garage_spaces',
  'Garage YN':              'garage_yn',
  'Attached Garage YN':     'attached_garage_yn',
  'Carport Spaces':         'carport_spaces',
  'Carport YN':             'carport_yn',
  'Covered Spaces':         'covered_spaces',
  'Open Parking Spaces':    'open_parking',

  // Features
  'Pool Private YN':        'pool_yn',
  'Spa YN':                 'spa_yn',
  'Fireplaces Total':       'fireplaces',
  'Year Built':             'year_built',

  // Property classification
  'Property Type':          'property_type',
  'Property Sub Type':      'property_sub_type',
  'Property Attached YN':   'attached_yn',
  'Status':                 'listing_status',

  // Financials
  'Tax Ann Amount':         'tax_annual',
  'Tax Year':               'tax_year',
  'Association Fee':        'hoa_fee',
  'Association Fee 2':      'hoa_fee_2',
  'Association Fee Frequency': 'hoa_frequency',
  'Association Name':       'hoa_name',

  // Descriptive
  'Public Remarks':         'public_remarks',
  'Architectural Style':    'architectural_style',
  'Construction Materials': 'construction',
  'Roof':                   'roof',
  'Foundation Details':     'foundation_type',
  'Heating':                'heating',
  'Cooling':                'cooling',
  'Exterior Features':      'exterior_features',
  'Interior Features':      'interior_features',
  'Flooring':               'flooring',
  'Property Condition':     'condition',
  'Basement':               'basement_type',
  'Patio And Porch Features':'patio_porch',

  // Other
  'Entry Location':         'entry_location',
  'Entry Level':            'entry_level',
  'Levels':                 'levels',
  'Buyer Financing':        'buyer_financing',
  'Land Lease YN':          'land_lease',
  'Sewer':                  'sewer',
  'Water Source':            'water_source',
  'Utilities':              'utilities'
};

// Fields that should be parsed as numbers (strip $, commas)
const NUMERIC_FIELDS = new Set([
  'close_price', 'list_price', 'original_price', 'concessions_amount',
  'gla', 'living_area', 'lot_acres', 'lot_sqft', 'foundation_area',
  'basement_finished', 'basement_unfinished', 'stories', 'rooms_total',
  'bedrooms', 'full_baths', 'half_baths', 'three_quarter_baths',
  'garage_spaces', 'carport_spaces', 'covered_spaces', 'open_parking',
  'fireplaces', 'year_built', 'dom', 'cdom',
  'tax_annual', 'tax_year', 'hoa_fee', 'hoa_fee_2'
]);

// Key fields shown in the import preview
const PREVIEW_FIELDS = [
  'mls_number', 'address', 'city', 'close_price', 'gla', 'year_built',
  'bedrooms', 'full_baths', 'lot_sqft', 'close_date'
];


// ============================================================================
// CSV PARSER — handles quoted fields, commas, newlines
// ============================================================================

function parseCSV(text) {
  const rows = [];
  let current = [];
  let field = '';
  let inQuotes = false;
  let i = 0;

  while (i < text.length) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        // Check for escaped quote ""
        if (i + 1 < text.length && text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        // End of quoted field
        inQuotes = false;
        i++;
        continue;
      }
      field += ch;
      i++;
    } else {
      if (ch === '"') {
        inQuotes = true;
        i++;
      } else if (ch === ',') {
        current.push(field.trim());
        field = '';
        i++;
      } else if (ch === '\n' || ch === '\r') {
        current.push(field.trim());
        if (current.length > 1 || (current.length === 1 && current[0] !== '')) {
          rows.push(current);
        }
        current = [];
        field = '';
        // Handle \r\n
        if (ch === '\r' && i + 1 < text.length && text[i + 1] === '\n') {
          i += 2;
        } else {
          i++;
        }
      } else {
        field += ch;
        i++;
      }
    }
  }

  // Push last field/row
  current.push(field.trim());
  if (current.length > 1 || (current.length === 1 && current[0] !== '')) {
    rows.push(current);
  }

  return rows;
}


// ============================================================================
// MLS MODULE
// ============================================================================

const MLSModule = {
  // Temporary storage for pending imports per slot
  _pending: { 1: null, 2: null, 3: null },

  /**
   * Render the MLS Import section
   */
  render() {
    // Update slot statuses based on stored imports for active assignment
    if (App.activeAssignment) {
      const imports = DB.where('mls_imports', m => m.assignment_id === App.activeAssignment);
      imports.forEach((imp, i) => {
        const slotNum = i + 1;
        if (slotNum <= 3) {
          const statusEl = document.getElementById(`import-status-${slotNum}`);
          if (statusEl) {
            statusEl.innerHTML = `
              <span class="badge-green">✓ Imported</span>
              <small>${imp.record_count} records · ${imp.filename} · ${Util.formatDate(imp.imported_at)}</small>
              <button class="btn-sm btn-link" onclick="MLSModule.viewDataset(${slotNum})" style="margin-left:8px;">View</button>
              <button class="btn-sm btn-link btn-danger" onclick="MLSModule.removeDataset('${imp.id}', ${slotNum})" style="margin-left:4px;">Remove</button>
            `;
          }
        }
      });
    } else {
      // No active assignment — prompt user
      for (let i = 1; i <= 3; i++) {
        const statusEl = document.getElementById(`import-status-${i}`);
        if (statusEl && !this._pending[i]) {
          statusEl.innerHTML = '<span class="text-muted">Select an active assignment from the top bar before importing.</span>';
        }
      }
    }
  },

  /**
   * Handle file drop on upload zone
   */
  handleDrop(event, slotNumber) {
    event.preventDefault();
    event.stopPropagation();
    const dropzone = document.getElementById(`dropzone-${slotNumber}`);
    if (dropzone) dropzone.classList.remove('drag-over');

    const files = event.dataTransfer.files;
    if (files.length > 0) {
      this._processFile(files[0], slotNumber);
    }
  },

  /**
   * Handle file input change
   */
  handleFile(event, slotNumber) {
    const files = event.target.files;
    if (files.length > 0) {
      this._processFile(files[0], slotNumber);
    }
  },

  /**
   * Process uploaded CSV file
   */
  _processFile(file, slotNumber) {
    if (!App.activeAssignment) {
      App.toast('Please select an active assignment first', 'warning');
      return;
    }

    if (!file.name.toLowerCase().endsWith('.csv')) {
      App.toast('Please upload a CSV file', 'warning');
      return;
    }

    const statusEl = document.getElementById(`import-status-${slotNumber}`);
    if (statusEl) {
      statusEl.innerHTML = '<span class="badge-amber">⏳ Parsing CSV...</span>';
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target.result;
        const parsed = this._parseAndMap(text, file.name);

        if (parsed.errors.length > 0) {
          statusEl.innerHTML = `<span class="badge-red">⚠ Parse errors</span><br><small>${parsed.errors.join('<br>')}</small>`;
          return;
        }

        // Store pending import
        this._pending[slotNumber] = {
          filename: file.name,
          fileSize: file.size,
          records: parsed.records,
          headers: parsed.headers,
          mappedFields: parsed.mappedFields,
          unmappedHeaders: parsed.unmappedHeaders,
          stats: parsed.stats
        };

        // Show preview
        this._showPreview(slotNumber, parsed);

      } catch (err) {
        statusEl.innerHTML = `<span class="badge-red">⚠ Error: ${err.message}</span>`;
        console.error('MLS Parse Error:', err);
      }
    };

    reader.onerror = () => {
      statusEl.innerHTML = '<span class="badge-red">⚠ Could not read file</span>';
    };

    reader.readAsText(file);
  },

  /**
   * Parse CSV text and map columns to internal fields
   */
  _parseAndMap(text, filename) {
    const rows = parseCSV(text);
    const errors = [];

    if (rows.length < 2) {
      errors.push('CSV must contain at least a header row and one data row.');
      return { records: [], headers: [], mappedFields: [], unmappedHeaders: [], stats: {}, errors };
    }

    const headers = rows[0];
    const dataRows = rows.slice(1);

    // Build column mapping
    const mappedFields = [];
    const unmappedHeaders = [];
    const fieldIndices = {};

    headers.forEach((header, index) => {
      const cleanHeader = header.replace(/^"|"$/g, '').trim();
      const internalName = MLS_COLUMN_MAP[cleanHeader];
      if (internalName) {
        mappedFields.push({ index, csvHeader: cleanHeader, field: internalName });
        fieldIndices[internalName] = index;
      } else {
        unmappedHeaders.push(cleanHeader);
      }
    });

    // Parse data rows into records
    const records = [];
    for (let r = 0; r < dataRows.length; r++) {
      const row = dataRows[r];
      if (row.length < 3) continue; // Skip empty/malformed rows

      const record = {};
      mappedFields.forEach(({ index, field }) => {
        let value = index < row.length ? row[index] : '';
        value = value.replace(/^"|"$/g, '').trim();

        if (NUMERIC_FIELDS.has(field)) {
          // Strip $, commas, and parse as number
          const cleaned = value.replace(/[$,]/g, '').trim();
          const num = parseFloat(cleaned);
          record[field] = isNaN(num) ? null : num;
        } else {
          record[field] = value || null;
        }
      });

      // Skip rows without MLS # (likely empty)
      if (!record.mls_number) continue;

      // Compute derived fields
      if (record.close_price && record.gla && record.gla > 0) {
        record.price_per_sqft = Math.round((record.close_price / record.gla) * 100) / 100;
      }
      if (record.close_price && record.list_price && record.list_price > 0) {
        record.sp_lp_ratio = Math.round((record.close_price / record.list_price) * 10000) / 10000;
      }

      records.push(record);
    }

    // Compute stats
    const prices = records.filter(r => r.close_price).map(r => r.close_price);
    const glas = records.filter(r => r.gla).map(r => r.gla);
    const doms = records.filter(r => r.dom !== null && r.dom !== undefined).map(r => r.dom);
    const pricePerSqfts = records.filter(r => r.price_per_sqft).map(r => r.price_per_sqft);

    const stats = {
      total_records: records.length,
      mapped_columns: mappedFields.length,
      unmapped_columns: unmappedHeaders.length,
      price_min: prices.length ? Math.min(...prices) : null,
      price_max: prices.length ? Math.max(...prices) : null,
      price_mean: prices.length ? Math.round(prices.reduce((s, v) => s + v, 0) / prices.length) : null,
      price_median: prices.length ? this._median(prices) : null,
      gla_min: glas.length ? Math.min(...glas) : null,
      gla_max: glas.length ? Math.max(...glas) : null,
      gla_mean: glas.length ? Math.round(glas.reduce((s, v) => s + v, 0) / glas.length) : null,
      dom_mean: doms.length ? Math.round(doms.reduce((s, v) => s + v, 0) / doms.length) : null,
      ppsf_min: pricePerSqfts.length ? Math.min(...pricePerSqfts).toFixed(2) : null,
      ppsf_max: pricePerSqfts.length ? Math.max(...pricePerSqfts).toFixed(2) : null,
      ppsf_mean: pricePerSqfts.length ? (pricePerSqfts.reduce((s, v) => s + v, 0) / pricePerSqfts.length).toFixed(2) : null
    };

    return { records, headers, mappedFields, unmappedHeaders, stats, errors };
  },

  /**
   * Calculate median of an array
   */
  _median(arr) {
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
  },

  /**
   * Show import preview with stats and sample data
   */
  _showPreview(slotNumber, parsed) {
    const statusEl = document.getElementById(`import-status-${slotNumber}`);
    const { stats, records, mappedFields, unmappedHeaders, errors } = parsed;
    const pending = this._pending[slotNumber];

    // Check for duplicates against existing data
    const existingRecords = DB.where('mls_data', d => d.assignment_id === App.activeAssignment);
    const existingMLSNums = new Set(existingRecords.map(r => r.mls_number));
    const duplicates = records.filter(r => existingMLSNums.has(r.mls_number));

    statusEl.innerHTML = `
      <div class="import-preview-card">
        <div class="preview-header">
          <span class="badge-teal">✓ Parsed Successfully</span>
          <small>${pending.filename} (${(pending.fileSize / 1024).toFixed(1)} KB)</small>
        </div>

        <div class="preview-stats">
          <div class="preview-stat">
            <strong>${stats.total_records}</strong>
            <span>Records</span>
          </div>
          <div class="preview-stat">
            <strong>${stats.mapped_columns}</strong>
            <span>Mapped Cols</span>
          </div>
          <div class="preview-stat">
            <strong>${stats.unmapped_columns}</strong>
            <span>Unmapped</span>
          </div>
          ${duplicates.length > 0 ? `
            <div class="preview-stat warn">
              <strong>${duplicates.length}</strong>
              <span>Duplicates</span>
            </div>
          ` : ''}
        </div>

        <div class="preview-metrics">
          <div class="preview-metric">
            <label>Price Range</label>
            <span>${Util.currency(stats.price_min)} — ${Util.currency(stats.price_max)}</span>
          </div>
          <div class="preview-metric">
            <label>Median Price</label>
            <span>${Util.currency(stats.price_median)}</span>
          </div>
          <div class="preview-metric">
            <label>GLA Range</label>
            <span>${stats.gla_min ? stats.gla_min.toLocaleString() : 'N/A'} — ${stats.gla_max ? stats.gla_max.toLocaleString() : 'N/A'} sqft</span>
          </div>
          <div class="preview-metric">
            <label>Avg $/SqFt</label>
            <span>$${stats.ppsf_mean || 'N/A'}</span>
          </div>
          <div class="preview-metric">
            <label>Avg DOM</label>
            <span>${stats.dom_mean || 'N/A'} days</span>
          </div>
        </div>

        <details class="preview-sample">
          <summary>Preview First 5 Records</summary>
          <div class="preview-table-wrap">
            <table class="data-table compact">
              <thead>
                <tr>
                  <th>MLS#</th><th>Address</th><th>City</th><th>Close Price</th><th>GLA</th><th>$/SF</th><th>Yr Built</th><th>Beds</th><th>Baths</th>
                </tr>
              </thead>
              <tbody>
                ${records.slice(0, 5).map(r => `
                  <tr>
                    <td>${r.mls_number || ''}</td>
                    <td>${r.address || ''}</td>
                    <td>${r.city || ''}</td>
                    <td>${Util.currency(r.close_price)}</td>
                    <td>${r.gla ? r.gla.toLocaleString() : ''}</td>
                    <td>${r.price_per_sqft ? '$' + r.price_per_sqft.toFixed(2) : ''}</td>
                    <td>${r.year_built || ''}</td>
                    <td>${r.bedrooms || ''}</td>
                    <td>${r.full_baths || ''}${r.half_baths ? '/' + r.half_baths : ''}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </details>

        ${unmappedHeaders.length > 0 ? `
          <details class="preview-unmapped">
            <summary>${unmappedHeaders.length} Unmapped Columns (click to view)</summary>
            <p class="text-muted">${unmappedHeaders.join(', ')}</p>
          </details>
        ` : ''}

        ${duplicates.length > 0 ? `
          <div class="preview-warning">
            <strong>⚠ ${duplicates.length} duplicate MLS numbers found:</strong>
            <span>${duplicates.slice(0, 5).map(d => d.mls_number).join(', ')}${duplicates.length > 5 ? '...' : ''}</span>
            <p class="text-muted">Duplicates will be skipped during import.</p>
          </div>
        ` : ''}

        <div class="preview-actions">
          <button class="btn-primary" onclick="MLSModule.confirmImport(${slotNumber})">Import ${stats.total_records - duplicates.length} Records</button>
          <button class="btn-secondary" onclick="MLSModule.cancelImport(${slotNumber})">Cancel</button>
        </div>
      </div>
    `;
  },

  /**
   * Confirm and finalize the import for a slot
   */
  confirmImport(slotNumber) {
    const pending = this._pending[slotNumber];
    if (!pending) {
      App.toast('No pending import to confirm', 'warning');
      return;
    }

    if (!App.activeAssignment) {
      App.toast('No active assignment selected', 'warning');
      return;
    }

    // Check for duplicates
    const existingRecords = DB.where('mls_data', d => d.assignment_id === App.activeAssignment);
    const existingMLSNums = new Set(existingRecords.map(r => r.mls_number));

    let importedCount = 0;
    let skippedCount = 0;

    pending.records.forEach(record => {
      if (existingMLSNums.has(record.mls_number)) {
        skippedCount++;
        return;
      }

      // Add assignment reference and import metadata
      record.assignment_id = App.activeAssignment;
      record.dataset_slot = slotNumber;
      record.imported_at = new Date().toISOString();
      record.tag = 'candidate'; // Default tag for comp selection

      DB.add('mls_data', record);
      importedCount++;
    });

    // Save import metadata
    const importRecord = {
      assignment_id: App.activeAssignment,
      slot: slotNumber,
      filename: pending.filename,
      record_count: importedCount,
      skipped_duplicates: skippedCount,
      stats: pending.stats,
      mapped_fields: pending.mappedFields.length,
      imported_at: new Date().toISOString()
    };
    DB.add('mls_imports', importRecord);

    // Clear pending
    this._pending[slotNumber] = null;

    // Update status
    const statusEl = document.getElementById(`import-status-${slotNumber}`);
    if (statusEl) {
      statusEl.innerHTML = `
        <span class="badge-green">✓ Imported</span>
        <small>${importedCount} records imported${skippedCount > 0 ? ` (${skippedCount} duplicates skipped)` : ''} · ${pending.filename}</small>
        <button class="btn-sm btn-link" onclick="MLSModule.viewDataset(${slotNumber})" style="margin-left:8px;">View</button>
      `;
    }

    App.toast(`Imported ${importedCount} MLS records${skippedCount > 0 ? `, ${skippedCount} duplicates skipped` : ''}`, 'success');

    // Log to audit trail
    DB.logAudit('import', 'mls_data', null, App.activeAssignment, null, { count: importedCount, filename: pending.filename, slot: slotNumber });
  },

  /**
   * Cancel a pending import
   */
  cancelImport(slotNumber) {
    this._pending[slotNumber] = null;
    const statusEl = document.getElementById(`import-status-${slotNumber}`);
    if (statusEl) {
      statusEl.innerHTML = '';
    }
    App.toast('Import cancelled', 'info');
  },

  /**
   * View imported dataset in a modal table
   */
  viewDataset(slotNumber) {
    if (!App.activeAssignment) return;

    const records = DB.where('mls_data', d =>
      d.assignment_id === App.activeAssignment && d.dataset_slot === slotNumber
    );

    if (records.length === 0) {
      App.toast('No records in this dataset', 'info');
      return;
    }

    const body = `
      <div class="dataset-view">
        <div class="dataset-toolbar">
          <span><strong>${records.length}</strong> records in Dataset ${slotNumber}</span>
          <button class="btn-sm btn-secondary" onclick="MLSModule.exportDataset(${slotNumber})">Export CSV</button>
        </div>
        <div class="preview-table-wrap" style="max-height: 500px; overflow-y: auto;">
          <table class="data-table compact">
            <thead>
              <tr>
                <th>MLS#</th><th>Address</th><th>City</th><th>Close Price</th><th>GLA</th>
                <th>$/SF</th><th>Yr Built</th><th>Beds</th><th>Full Bath</th><th>Half Bath</th>
                <th>Garage</th><th>Lot SF</th><th>DOM</th><th>Close Date</th><th>Tag</th>
              </tr>
            </thead>
            <tbody>
              ${records.map(r => `
                <tr>
                  <td>${r.mls_number || ''}</td>
                  <td>${r.address || ''}</td>
                  <td>${r.city || ''}</td>
                  <td>${Util.currency(r.close_price)}</td>
                  <td>${r.gla ? r.gla.toLocaleString() : ''}</td>
                  <td>${r.price_per_sqft ? '$' + r.price_per_sqft.toFixed(2) : ''}</td>
                  <td>${r.year_built || ''}</td>
                  <td>${r.bedrooms || ''}</td>
                  <td>${r.full_baths || ''}</td>
                  <td>${r.half_baths || ''}</td>
                  <td>${r.garage_spaces || ''}</td>
                  <td>${r.lot_sqft ? r.lot_sqft.toLocaleString() : ''}</td>
                  <td>${r.dom || ''}</td>
                  <td>${r.close_date || ''}</td>
                  <td><span class="badge-blue">${r.tag || 'candidate'}</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

    App.showModal(`MLS Dataset ${slotNumber}`, body, '<button class="btn-secondary" onclick="App.closeModal()">Close</button>');
  },

  /**
   * Remove an imported dataset
   */
  removeDataset(importId, slotNumber) {
    if (!confirm('Remove this dataset? All imported records for this slot will be deleted.')) return;

    // Remove data records for this slot
    const records = DB.where('mls_data', d =>
      d.assignment_id === App.activeAssignment && d.dataset_slot === slotNumber
    );
    records.forEach(r => DB.remove('mls_data', r.id));

    // Remove import metadata
    DB.remove('mls_imports', importId);

    // Clear status
    const statusEl = document.getElementById(`import-status-${slotNumber}`);
    if (statusEl) statusEl.innerHTML = '';

    App.toast('Dataset removed', 'success');
    DB.logAudit('delete', 'mls_data', null, App.activeAssignment, { count: records.length, slot: slotNumber }, null);
  },

  /**
   * Export dataset to CSV
   */
  exportDataset(slotNumber) {
    const records = DB.where('mls_data', d =>
      d.assignment_id === App.activeAssignment && d.dataset_slot === slotNumber
    );

    if (records.length === 0) {
      App.toast('No records to export', 'warning');
      return;
    }

    // Build CSV from key fields
    const fields = [
      'mls_number', 'address', 'city', 'zip', 'close_price', 'list_price',
      'gla', 'year_built', 'bedrooms', 'full_baths', 'half_baths',
      'garage_spaces', 'lot_sqft', 'lot_acres', 'basement_finished',
      'dom', 'close_date', 'price_per_sqft', 'sp_lp_ratio', 'tag',
      'neighborhood', 'subdivision', 'county'
    ];

    const header = fields.join(',');
    const rows = records.map(r =>
      fields.map(f => {
        const val = r[f];
        if (val === null || val === undefined) return '';
        if (typeof val === 'string' && (val.includes(',') || val.includes('"'))) {
          return `"${val.replace(/"/g, '""')}"`;
        }
        return val;
      }).join(',')
    );

    Util.downloadCSV([header, ...rows].join('\n'), `MLS_Dataset_${slotNumber}_export.csv`);
    App.toast('Dataset exported', 'success');
  },

  /**
   * Get all MLS records for the active assignment
   */
  getRecords(assignmentId) {
    return DB.where('mls_data', d => d.assignment_id === (assignmentId || App.activeAssignment));
  },

  /**
   * Get records filtered by tag
   */
  getByTag(tag, assignmentId) {
    return this.getRecords(assignmentId).filter(r => r.tag === tag);
  },

  /**
   * Update a record's tag (candidate, selected, visited, excluded)
   */
  setTag(recordId, tag) {
    DB.update('mls_data', recordId, { tag: tag });
  }
};
