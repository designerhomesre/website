/**
 * DESIGNER HOMES APPRAISAL PLATFORM
 * Comments Generator — AI-Assisted, Rule-Based, USPAP-Conscious
 *
 * Supports: General Comments, Sales Comparison, Market Analysis,
 *   Adjustment Support, Cost Approach, Income Approach,
 *   Revision Response Addendum, Special Insert Statements
 *
 * Architecture: Rule-based assembly → Optional AI refinement → Appraiser review
 */

// ============================================================================
// SPECIAL STATEMENTS LIBRARY — Conditional Insert Templates
// ============================================================================

const StatementsLibrary = {
  _defaults: [
    // LEAD PAINT
    {
      id: 'stmt-lead-paint',
      statement_type: 'Lead-Based Paint',
      trigger_type: 'pre_1978',
      category: 'compliance',
      statement_text: 'The subject property was constructed prior to 1978. The appraiser is not qualified to detect the presence of lead-based paint or other hazardous materials. The appraisal was completed under the assumption that no hazardous materials exist on the property. If the presence of lead-based paint or hazardous substances is suspected, the client is advised to retain a qualified professional for testing and remediation.'
    },
    // 2055 EXTRAORDINARY ASSUMPTION
    {
      id: 'stmt-2055-ea',
      statement_type: '2055 Extraordinary Assumption',
      trigger_type: '2055_exterior',
      category: 'scope',
      statement_text: 'This appraisal was completed as a 2055 Exterior-Only inspection. The appraiser was not provided interior access to the subject property. The interior condition, quality, and layout are based on available public records, MLS data, prior appraisals (if available), and observations from the exterior inspection. This appraisal is subject to the extraordinary assumption that the interior of the property is consistent with the exterior observations and available data. If this assumption is found to be incorrect, the appraiser reserves the right to modify the opinion of value.'
    },
    // PUBLIC WATER + SEPTIC
    {
      id: 'stmt-public-septic',
      statement_type: 'Public Water / Septic',
      trigger_type: 'septic',
      category: 'utilities',
      statement_text: 'The subject property is served by public water and a private septic system. The septic system was not inspected as part of this appraisal. No adverse conditions related to the septic system were observed during the exterior inspection. The appraiser makes no representations regarding the condition or functionality of the septic system. If concerns exist, the client is advised to obtain a septic inspection from a qualified professional.'
    },
    // WELL + SEPTIC
    {
      id: 'stmt-well-septic',
      statement_type: 'Well / Septic',
      trigger_type: 'well',
      category: 'utilities',
      statement_text: 'The subject property is served by a private well and private septic system. Neither system was inspected as part of this appraisal. No adverse conditions related to either system were observed during the inspection. The appraiser makes no representations regarding the condition, functionality, or water quality of the well or the condition of the septic system. If concerns exist, the client is advised to obtain appropriate inspections from qualified professionals.'
    },
    // FSBO / NO MLS HISTORY
    {
      id: 'stmt-fsbo',
      statement_type: 'FSBO / No MLS History',
      trigger_type: 'fsbo',
      category: 'listing',
      statement_text: 'The subject property was not listed on the MLS and is being sold as a private sale (FSBO). The current contract price was provided by the parties to the transaction. The appraiser has verified the contract terms to the extent possible based on available documentation. The lack of MLS listing history does not adversely affect the appraisal analysis, as the market value opinion is based on comparable sales and market data independent of the subject listing.'
    },
    // NO MLS HISTORY
    {
      id: 'stmt-no-mls',
      statement_type: 'No MLS History',
      trigger_type: 'no_mls',
      category: 'listing',
      statement_text: 'A search of the MLS revealed no prior listing history for the subject property within the past three years. This does not adversely affect the appraisal analysis. The opinion of value is based on comparable market data and is not dependent on the subject property having been previously listed.'
    },
    // BELOW-GRADE GLA / SPLIT LEVEL
    {
      id: 'stmt-below-grade',
      statement_type: 'Below-Grade GLA / Split Level',
      trigger_type: 'below_grade',
      category: 'design',
      statement_text: 'The subject property is a split-level design with living area that is partially below grade. Per Fannie Mae guidelines, below-grade living area is not included in the above-grade gross living area (GLA) calculation, even if it is finished and functional. The below-grade area is addressed as a separate line item in the sales comparison grid. The appraiser has considered the contributory value of the below-grade finished area in the overall analysis and reconciliation.'
    },
    // ACTIVE LISTING USED
    {
      id: 'stmt-active-listing',
      statement_type: 'Active Listing Used',
      trigger_type: 'active_listing',
      category: 'comps',
      statement_text: 'An active listing has been included in the comparable analysis to provide additional market context and to demonstrate current market pricing expectations. Active listings are not given equal weight to closed sales in the final reconciliation, as they represent asking prices rather than market-confirmed transaction prices. The listing is included to support market trend analysis and to bracket the value indication.'
    },
    // LIMITED COMPS
    {
      id: 'stmt-limited-comps',
      statement_type: 'Limited Comparable Availability',
      trigger_type: 'limited_comps',
      category: 'comps',
      statement_text: 'The comparable selection reflects a limited number of truly similar properties available in the subject market area. The appraiser has expanded the search parameters as necessary to identify the most comparable sales. Across-the-board adjustments and/or larger-than-typical adjustments may be present in the sales comparison grid due to the limited availability of directly comparable sales. The appraiser has exercised professional judgment in reconciling the adjusted values.'
    },
    // RENOVATIONS / UPDATES
    {
      id: 'stmt-renovations',
      statement_type: 'Renovations / Updates',
      trigger_type: 'renovations',
      category: 'condition',
      statement_text: 'The subject property has been updated and/or renovated. The appraiser has considered the quality and extent of the updates in the condition and quality ratings and in the adjustment analysis. The comparable sales were selected to reflect properties in similar updated condition where available. Where comparable sales in similar condition were limited, the appraiser has made appropriate condition adjustments supported by market data.'
    },
    // FLOOD ZONE
    {
      id: 'stmt-flood',
      statement_type: 'Flood Zone',
      trigger_type: 'flood',
      category: 'site',
      statement_text: 'The subject property is located in a designated flood zone. The comparable sales were reviewed for similar flood zone status. Market data indicates that flood zone location may impact marketability and value in this area. The appraiser has considered this factor in the comparable selection and adjustment analysis.'
    },
    // ADU
    {
      id: 'stmt-adu',
      statement_type: 'ADU / Accessory Dwelling',
      trigger_type: 'adu',
      category: 'design',
      statement_text: 'The subject property includes an accessory dwelling unit (ADU). The ADU has been considered in the overall property analysis. The appraiser has noted the ADU in the property description and has considered its contributory value based on market data for similar properties with accessory units in the subject market area.'
    },
    // SUBJECT-TO / ARV
    {
      id: 'stmt-arv',
      statement_type: 'Subject-To / ARV',
      trigger_type: 'arv',
      category: 'scope',
      statement_text: 'This appraisal includes an opinion of value subject to completion of the proposed improvements and/or repairs as described in this report. The as-is condition of the property has been observed, and the prospective value assumes all work is completed in a workmanlike manner consistent with the plans and specifications provided. The appraiser reserves the right to modify this opinion if the completed improvements differ materially from the described scope of work.'
    },
    // ENGINEER CERTIFICATION
    {
      id: 'stmt-engineer',
      statement_type: 'Engineer Certification',
      trigger_type: 'engineer',
      category: 'compliance',
      statement_text: 'The appraiser is not a licensed structural engineer and does not offer opinions on structural adequacy. Any comments regarding the condition of the improvements are based on visual observation only. If structural concerns exist, the client is advised to obtain an inspection and certification from a licensed structural engineer prior to making lending decisions.'
    },
    // MANUFACTURED HOME
    {
      id: 'stmt-manufactured',
      statement_type: 'Manufactured Home',
      trigger_type: 'manufactured',
      category: 'design',
      statement_text: 'The subject is a manufactured home. The appraiser has verified the HUD data plate and/or label information where accessible. The comparable sales include manufactured homes of similar design and quality where available. Site-built homes may be included for comparison purposes if manufactured home sales are limited in the market area.'
    }
  ],

  /**
   * Initialize default statements if not present
   */
  init() {
    const existing = DB.getAll('special_statements');
    if (existing.length === 0) {
      this._defaults.forEach(stmt => {
        DB.add('special_statements', { ...stmt });
      });
    }
  },

  /**
   * Get all statements, optionally filtered by category
   */
  getAll(category) {
    const all = DB.getAll('special_statements');
    if (category && category !== 'all') {
      return all.filter(s => s.category === category);
    }
    return all;
  },

  /**
   * Get statements matching active triggers
   */
  getTriggered(triggers) {
    const all = DB.getAll('special_statements');
    return all.filter(s => triggers.includes(s.trigger_type));
  },

  /**
   * Get categories
   */
  getCategories() {
    return [
      { key: 'all', label: 'All' },
      { key: 'compliance', label: 'Compliance' },
      { key: 'scope', label: 'Scope of Work' },
      { key: 'utilities', label: 'Utilities' },
      { key: 'listing', label: 'Listing / Sales' },
      { key: 'design', label: 'Design / Structure' },
      { key: 'comps', label: 'Comparables' },
      { key: 'condition', label: 'Condition' },
      { key: 'site', label: 'Site' }
    ];
  },

  /**
   * Add a custom statement
   */
  addCustom(type, trigger, category, text) {
    return DB.add('special_statements', {
      statement_type: type,
      trigger_type: trigger || 'manual',
      category: category || 'compliance',
      statement_text: text
    });
  }
};


// ============================================================================
// COMMENT TEMPLATES — Rule-Based Paragraph Assembly
// ============================================================================

const CommentTemplates = {

  /**
   * Gather all relevant data for the active assignment
   */
  gatherData() {
    const aid = App.activeAssignmentId;
    if (!aid) return null;

    const assignment = DB.getById('assignments', aid);
    if (!assignment) return null;

    const settings = SettingsModule.getSettings();
    const comps = DB.where('mls_data', d => d.tag === 'selected');
    const allComps = DB.where('mls_data', d => d.tag && d.tag !== 'excluded');
    const marketAnalysis = DB.where('market_analyses', m => m.assignment_id === aid)[0];
    const costApproach = DB.where('cost_approaches', c => c.assignment_id === aid)[0];
    const incomeApproach = DB.where('income_approaches', i => i.assignment_id === aid)[0];
    const incomeComps = DB.where('income_comps', c => c.assignment_id === aid);
    const adjustments = DB.where('adjustments', a => a.assignment_id === aid);

    return {
      assignment,
      settings,
      comps,
      allComps,
      marketAnalysis,
      costApproach,
      incomeApproach,
      incomeComps,
      adjustments,
      // Convenience accessors
      address: assignment.address || '[Address]',
      city: assignment.city || '[City]',
      state: assignment.state || 'NC',
      zip: assignment.zip || '',
      county: assignment.county || '',
      subdivision: assignment.subdivision || assignment.neighborhood || '',
      propertyType: assignment.property_type || 'Single Family',
      style: assignment.style || assignment.design || '',
      gla: assignment.gla || 0,
      belowGrade: assignment.below_grade_area || 0,
      bedrooms: assignment.bedrooms || 0,
      bathrooms: assignment.bathrooms || 0,
      halfBaths: assignment.half_baths || 0,
      garageSpaces: assignment.garage_spaces || 0,
      lotSize: assignment.lot_size || '',
      yearBuilt: assignment.year_built || 0,
      effectiveAge: assignment.effective_age || 0,
      condition: assignment.condition || '',
      quality: assignment.quality || '',
      updates: assignment.updates || assignment.renovations || '',
      deferredMaint: assignment.deferred_maintenance || false,
      utilities: assignment.utilities || '',
      fsbo: assignment.fsbo || false,
      transactionType: assignment.transaction_type || 'purchase',
      loanType: assignment.loan_type || 'conventional',
      formType: assignment.form_type || '1004',
      effectiveDate: assignment.effective_date || '',
      pre1978: assignment.year_built ? assignment.year_built < 1978 : false,
      splitLevel: assignment.split_level || false,
      manufactured: assignment.manufactured || false,
      exteriorOnly: assignment.exterior_only || false,
      subjectTo: assignment.subject_to || assignment.arv || false,
      searchRadius: assignment.search_radius || '1.0 mile',
      dateRange: assignment.date_range || '12 months',
      emphasisPeriod: assignment.emphasis_period || '90 days',
      subdivisionSearch: assignment.subdivision_search || false,
      activeListingUsed: comps.some(c => c.status === 'Active' || c.status === 'A'),
      area: assignment.city ? `${assignment.city}, ${assignment.state}` : 'the subject market area'
    };
  },

  // ========================================================================
  // GENERAL COMMENTS
  // ========================================================================

  generateGeneralComments(data, templateMode, inserts) {
    if (!data) return '[No assignment data available. Select an active assignment first.]';

    const paragraphs = [];

    // PARAGRAPH 1: Subject identification & area description
    let p1 = `The subject property is located at ${data.address}, ${data.city}, ${data.state} ${data.zip}`;
    if (data.county) p1 += `, ${data.county} County`;
    p1 += '.';
    if (data.subdivision) {
      p1 += ` The property is situated in the ${data.subdivision} subdivision`;
      if (data.city) p1 += ` in ${data.city}`;
      p1 += '.';
    }
    p1 += ` The neighborhood consists primarily of ${data.propertyType.toLowerCase()} residential properties`;
    if (data.yearBuilt) p1 += ` with development ranging from the ${Math.floor(data.yearBuilt / 10) * 10}s to present`;
    p1 += '.';
    paragraphs.push(p1);

    // PARAGRAPH 2: Condition / maintenance / updates
    let p2 = '';
    if (data.condition) {
      p2 += `The subject property is in ${data.condition.toLowerCase()} condition`;
    } else {
      p2 += 'The subject property is in average condition';
    }
    if (data.quality) p2 += ` with ${data.quality.toLowerCase()} quality construction`;
    p2 += '.';

    if (data.updates) {
      p2 += ` The property features updates including ${data.updates}.`;
    }
    if (!data.deferredMaint) {
      p2 += ' No observable deferred maintenance was noted during the inspection.';
    } else {
      p2 += ' Some deferred maintenance items were observed during the inspection and have been considered in the analysis.';
    }
    paragraphs.push(p2);

    // PARAGRAPH 3: Special design considerations
    if (data.splitLevel || inserts.includes('below_grade')) {
      let p3 = `The subject is a split-level design with ${data.gla ? data.gla + ' square feet of' : ''} above-grade gross living area`;
      if (data.belowGrade) {
        p3 += ` and approximately ${data.belowGrade} square feet of below-grade finished living area`;
      }
      p3 += '. Per Fannie Mae guidelines, the below-grade area is not included in the above-grade GLA calculation but is addressed as a separate line item in the sales comparison analysis.';
      p3 += ' The split-level design is common in certain areas of the market but may limit the number of directly comparable sales.';
      paragraphs.push(p3);
    } else if (data.manufactured || templateMode === '1004c_manufactured') {
      paragraphs.push('The subject is a manufactured home. The appraiser has verified the HUD data plate and label information where accessible. The comparable sales reflect manufactured homes of similar design and quality where available in the market area.');
    } else if (data.style) {
      paragraphs.push(`The subject is a ${data.style.toLowerCase()} design with ${data.gla ? data.gla + ' square feet of' : ''} gross living area, ${data.bedrooms} bedroom(s), ${data.bathrooms} full bath(s)${data.halfBaths ? ', ' + data.halfBaths + ' half bath(s)' : ''}${data.garageSpaces ? ', and a ' + data.garageSpaces + '-car garage' : ''}.`);
    }

    // PARAGRAPH 4: Utilities, listing history, FSBO
    let p4 = '';
    if (data.utilities) {
      p4 += `Utilities serving the property include ${data.utilities}. `;
    }
    if (inserts.includes('septic') || inserts.includes('well')) {
      // Statement will be appended from library
    }

    if (data.fsbo || inserts.includes('fsbo')) {
      p4 += 'The subject property was not listed on the MLS and is being sold as a private sale. The current contract price was provided by the parties to the transaction and has been verified to the extent possible. ';
    } else if (inserts.includes('no_mls')) {
      p4 += 'A search of the MLS revealed no prior listing history for the subject property within the past three years. ';
    }
    if (p4.trim()) paragraphs.push(p4.trim());

    // PARAGRAPH 5: Assignment & inspection disclaimer
    let p5 = '';
    if (templateMode === '2055_exterior' || data.exteriorOnly || inserts.includes('2055_exterior')) {
      p5 += 'This appraisal was completed as a 2055 Exterior-Only inspection. The appraiser was not provided interior access to the subject property. The interior condition, quality, and layout are based on available public records, MLS data, and observations from the exterior inspection. ';
    }
    if (data.subjectTo || inserts.includes('arv') || templateMode === 'subject_to_arv') {
      p5 += 'This appraisal includes an opinion of value subject to completion of the proposed improvements and/or repairs as described. The as-is condition has been observed, and the prospective value assumes all work is completed in a workmanlike manner consistent with the described scope. ';
    }
    p5 += 'The appraiser has performed this assignment in compliance with the Uniform Standards of Professional Appraisal Practice (USPAP) and applicable Fannie Mae guidelines. ';
    p5 += 'The appraiser is not a home inspector and this appraisal is not a substitute for a home inspection. The client is advised to obtain a home inspection if one has not already been completed.';
    paragraphs.push(p5);

    // CONDITIONAL INSERTS from Statements Library
    const triggeredInserts = this._getTriggeredStatements(data, inserts);
    triggeredInserts.forEach(stmt => {
      paragraphs.push(stmt.statement_text);
    });

    return paragraphs.join('\n\n');
  },

  // ========================================================================
  // SALES COMPARISON COMMENTS
  // ========================================================================

  generateSalesComparisonComments(data, templateMode, inserts) {
    if (!data) return '[No assignment data available.]';
    const paragraphs = [];

    // PARAGRAPH 1: Subject ID + scope of work
    let p1 = `The Sales Comparison Approach was developed for the subject property located at ${data.address}, ${data.city}, ${data.state}.`;
    p1 += ` The appraiser searched for comparable sales within a ${data.searchRadius} radius of the subject`;
    if (data.subdivisionSearch || templateMode === 'subdivision') {
      p1 += `, focusing primarily on sales within the ${data.subdivision || 'subject'} subdivision`;
    }
    p1 += `, with emphasis on sales within the most recent ${data.emphasisPeriod}`;
    p1 += ` and extending to ${data.dateRange} as needed to identify adequate comparables.`;
    paragraphs.push(p1);

    // PARAGRAPH 2: Comparable selection & weighting
    if (data.comps.length > 0) {
      let p2 = `${data.comps.length} comparable sale${data.comps.length !== 1 ? 's were' : ' was'} selected based on similarity to the subject in terms of location, design, size, condition, and overall market appeal.`;
      const prices = data.comps.filter(c => c.close_price).map(c => parseFloat(c.close_price));
      if (prices.length > 0) {
        p2 += ` Sale prices range from ${Util.currency(Math.min(...prices))} to ${Util.currency(Math.max(...prices))}.`;
      }
      // Most weight
      const bestComp = data.comps.find(c => c.most_weight || c.notes?.includes('most weight'));
      if (bestComp) {
        p2 += ` The most weight in reconciliation was given to Comparable ${bestComp.comp_number || '1'} due to its overall similarity to the subject in terms of location, size, condition, and recency of sale.`;
      } else {
        p2 += ' The most weight in reconciliation was given to the comparable(s) requiring the fewest and smallest adjustments, as these are considered the most reliable indicators of market value.';
      }
      paragraphs.push(p2);
    }

    // PARAGRAPH 3: Adjustments
    let p3 = 'Adjustments were derived from market data including paired sales analysis, grouped data analysis, and other recognized methods. ';
    if (inserts.includes('limited_comps') || templateMode === 'limited_comps') {
      p3 += 'Due to limited directly comparable sales of similar design and size, the comparable selection was expanded to include properties with some differences from the subject. Across-the-board adjustments and/or larger-than-typical individual adjustments may be present and are a reflection of the limited availability of directly comparable sales rather than an indication of unreliable data. ';
    }
    if (data.splitLevel || inserts.includes('below_grade')) {
      p3 += 'The split-level design of the subject limits the number of directly comparable sales. The appraiser has considered the below-grade living area as a separate line item and has made appropriate adjustments for design and utility differences. ';
    }
    p3 += 'Each adjustment reflects the appraiser\'s analysis of how the market reacts to differences between the subject and comparable properties.';
    paragraphs.push(p3);

    // PARAGRAPH 4: Active/pending listings
    if (data.activeListingUsed || inserts.includes('active_listing')) {
      let p4 = 'An active listing has been included to provide additional market context and to demonstrate current pricing expectations in the subject market area.';
      p4 += ' The active listing is not given equal weight to closed sales in the final reconciliation, as it represents an asking price rather than a confirmed transaction price.';
      p4 += ' It is included to support market trend analysis and to bracket the value indication.';
      paragraphs.push(p4);
    }

    // PARAGRAPH 5: Reconciliation
    let p5 = 'Based on the analysis of the comparable sales data and reconciliation of the adjusted values, the appraiser has developed an opinion of market value supported by the Sales Comparison Approach.';
    p5 += ' Additional commentary regarding specific adjustments and comparable selection rationale is provided in the addendum section of this report.';
    paragraphs.push(p5);

    return paragraphs.join('\n\n');
  },

  // ========================================================================
  // MARKET ANALYSIS COMMENTS
  // ========================================================================

  generateMarketAnalysisComments(data, templateMode, inserts) {
    if (!data) return '[No assignment data available.]';
    const paragraphs = [];

    const ma = data.marketAnalysis;
    if (ma && ma.results) {
      const r = ma.results;
      let p1 = `Based on analysis of ${r.totalRecords || 'available'} comparable properties in ${data.area}, the market exhibits `;
      if (r.priceTrend) p1 += `${r.priceTrend.toLowerCase()} price trends`;
      else p1 += 'stable conditions';
      p1 += '.';
      if (r.priceStats) {
        p1 += ` The median sale price is ${Util.currency(r.priceStats.median)} with an average of ${Util.currency(r.priceStats.mean)}.`;
        if (r.ppSqftStats) {
          p1 += ` The median price per square foot is ${Util.currency(r.ppSqftStats.median)}.`;
        }
      }
      paragraphs.push(p1);

      let p2 = '';
      if (r.domStats) {
        p2 += `The median days on market is ${r.domStats.median} days, `;
        if (r.domTrend) p2 += `reflecting ${r.domTrend.toLowerCase()} marketing times. `;
        else p2 += 'which is consistent with typical marketing times for the area. ';
      }
      if (r.spLpRatio) {
        p2 += `The list-to-sale price ratio is ${(r.spLpRatio * 100).toFixed(1)}%, indicating `;
        if (r.spLpRatio >= 0.99) p2 += 'strong buyer demand and competitive market conditions.';
        else if (r.spLpRatio >= 0.96) p2 += 'typical market negotiation patterns.';
        else p2 += 'some buyer negotiation leverage in the current market.';
      }
      if (p2.trim()) paragraphs.push(p2.trim());

      if (r.monthsSupply) {
        let p3 = `The current supply of ${r.monthsSupply} months `;
        if (r.monthsSupply < 4) p3 += "indicates a seller's market with limited inventory.";
        else if (r.monthsSupply > 7) p3 += "indicates a buyer's market with elevated inventory levels.";
        else p3 += 'indicates a balanced market condition.';
        paragraphs.push(p3);
      }
    } else if (ma && ma.narrative) {
      paragraphs.push(ma.narrative);
    } else {
      paragraphs.push('[Market analysis data not yet available. Run analysis in the Market Analysis module first.]');
    }

    paragraphs.push('Market conditions and trends cited are based on data available as of the effective date of this appraisal and may change over time. The appraiser\'s conclusions regarding market conditions are supported by the data analyzed and reflect conditions as observed in the subject market area.');

    return paragraphs.join('\n\n');
  },

  // ========================================================================
  // ADJUSTMENT SUPPORT COMMENTS
  // ========================================================================

  generateAdjustmentSupportComments(data, templateMode, inserts) {
    if (!data) return '[No assignment data available.]';
    const paragraphs = [];

    // Transactional intro
    paragraphs.push('The following transactional items were accounted for in the order shown prior to calculating any property feature adjustment results: Property Rights, Financing Terms, Distressed Sales, Seller Concessions, and Market Conditions. These items were reviewed for each comparable sale and adjusted where applicable based on market data and analysis.');

    // Per-feature adjustment comments
    if (data.adjustments && data.adjustments.length > 0) {
      data.adjustments.forEach(adj => {
        let stmt = `The ${adj.feature_name || adj.feature || '[Feature]'} adjustment was developed at ${adj.selected_adjustment ? Util.currency(adj.selected_adjustment) : '[amount]'}.`;
        if (adj.support_low !== undefined && adj.support_high !== undefined) {
          stmt += ` The results, based on all adjustment methods that were calculated and considered relevant, provide an adjustment range from ${Util.currency(adj.support_low)} to ${Util.currency(adj.support_high)}.`;
        }
        if (adj.methods_used) {
          stmt += ` ${adj.methods_used} were the adjustment methods used to develop this adjustment.`;
        }
        if (adj.narrative_notes) {
          stmt += ` ${adj.narrative_notes}`;
        }
        paragraphs.push(stmt);
      });
    } else {
      paragraphs.push('Adjustments are supported through analysis of paired sales, grouped data analysis, and other market-derived methods available within the subject\'s competitive market area. The appraiser has applied these methods as tools to inform professional judgment, not as automatic determinants of adjustment values. Each adjustment reflects the appraiser\'s analysis of how the market reacts to differences between the subject and comparable properties.');
    }

    paragraphs.push('The adjustment methods referenced above are analytical tools used to support the appraiser\'s professional judgment. No single method was relied upon exclusively. The appraiser has considered the full range of results and applied judgment based on the quality, quantity, and reliability of the data analyzed.');

    return paragraphs.join('\n\n');
  },

  // ========================================================================
  // COST APPROACH COMMENTS
  // ========================================================================

  generateCostApproachComments(data, templateMode, inserts) {
    if (!data) return '[No assignment data available.]';

    const ca = data.costApproach;
    if (!ca) return '[Cost approach data not yet entered. Complete the Cost Approach module first.]';

    const paragraphs = [];

    let p1 = 'The cost approach is based on the estimated replacement cost new of the improvements.';
    p1 += ' Cost estimates were derived from DwellingCost.com, a recognized residential cost service, as of the date of the appraisal.';
    paragraphs.push(p1);

    let p2 = '';
    const rcn = (ca.base_per_sqft * ca.gla) + (ca.garage_per_sqft * ca.garage_area) +
                (ca.porch_per_sqft * ca.porch_area) + (ca.bsmt_fin_per_sqft * ca.bsmt_fin_area) +
                ca.other_improvements;
    p2 += `The replacement cost new is estimated at ${Util.currency(rcn)} based on a gross living area of ${ca.gla} square feet`;
    if (ca.garage_area) p2 += `, a ${ca.garage_area}-square-foot garage`;
    p2 += ', and applicable site improvements.';
    paragraphs.push(p2);

    let p3 = `Depreciation is estimated using the age-life method with an effective age of ${ca.effective_age} years and an economic life of ${ca.economic_life} years.`;
    const physDeprPct = ca.economic_life > 0 ? ((ca.effective_age / ca.economic_life) * 100).toFixed(1) : '0';
    p3 += ` Physical depreciation is estimated at ${physDeprPct}%.`;
    if (ca.functional_obsolescence) p3 += ` Functional obsolescence of ${Util.currency(ca.functional_obsolescence)} has been applied.`;
    if (ca.external_obsolescence) p3 += ` External obsolescence of ${Util.currency(ca.external_obsolescence)} has been applied.`;
    paragraphs.push(p3);

    if (ca.land_value) {
      paragraphs.push(`The land value of ${Util.currency(ca.land_value)} is based on ${(ca.land_source || 'comparable land sales').replace(/_/g, ' ')} analysis. The cost approach indication of value provides a useful check against the sales comparison approach.`);
    }

    return paragraphs.join('\n\n');
  },

  // ========================================================================
  // INCOME APPROACH COMMENTS
  // ========================================================================

  generateIncomeApproachComments(data, templateMode, inserts) {
    if (!data) return '[No assignment data available.]';

    const ia = data.incomeApproach;
    if (!ia || !ia.monthly_rent) return '[Income approach data not yet entered. Complete the Income Approach module first.]';

    const paragraphs = [];

    let p1 = 'The income approach is developed using the Gross Rent Multiplier (GRM) method.';
    p1 += ` The subject's estimated market rent of ${Util.currency(ia.monthly_rent)} per month is based on ${(ia.rent_source || 'market survey').replace(/_/g, ' ')} data.`;
    paragraphs.push(p1);

    if (data.incomeComps && data.incomeComps.length > 0) {
      const grms = data.incomeComps.filter(c => c.grm).map(c => c.grm);
      let p2 = `Analysis of ${data.incomeComps.length} rental comparable${data.incomeComps.length !== 1 ? 's' : ''} was performed.`;
      if (grms.length > 0) {
        p2 += ` The GRM range from the rental comparables is ${Math.min(...grms).toFixed(1)} to ${Math.max(...grms).toFixed(1)}.`;
      }
      paragraphs.push(p2);
    }

    if (ia.selected_grm) {
      let p3 = `The selected GRM of ${ia.selected_grm} `;
      if (ia.grm_reasoning) {
        p3 += `was chosen based on ${ia.grm_reasoning}. `;
      } else {
        p3 += 'reflects the appraiser\'s reconciliation of the rental comparable data. ';
      }
      p3 += `The resulting income approach indication of value is ${Util.currency(ia.monthly_rent * ia.selected_grm)}.`;
      paragraphs.push(p3);
    }

    paragraphs.push('The income approach provides supplemental support for the value conclusion. The subject property type is primarily owner-occupied, and investor activity in the subject market area is limited. Therefore, the sales comparison approach is given primary weight in the final reconciliation.');

    return paragraphs.join('\n\n');
  },

  // ========================================================================
  // REVISION RESPONSE ADDENDUM
  // ========================================================================

  generateRevisionResponse(items) {
    if (!items || items.length === 0) return '[No revision items provided.]';

    const paragraphs = [];
    paragraphs.push('REVISION RESPONSE ADDENDUM');
    paragraphs.push('The following items are provided in response to the reviewer\'s request for clarification and/or additional information:');

    items.forEach((item, idx) => {
      if (item.request && item.response) {
        paragraphs.push(`${idx + 1}. ${item.request}\n\n${item.response}`);
      }
    });

    paragraphs.push('The appraiser has reviewed the above items and provides this additional information and/or clarification in support of the original appraisal report. The opinion of value remains unchanged unless specifically noted above.');

    return paragraphs.join('\n\n');
  },

  // ========================================================================
  // SHORT ADDENDUM
  // ========================================================================

  generateShortAddendum(data, templateMode, inserts) {
    if (!data) return '[No assignment data available.]';

    const paragraphs = [];
    paragraphs.push('ADDENDUM');
    paragraphs.push(`This addendum is provided in support of the appraisal report for the property located at ${data.address}, ${data.city}, ${data.state} ${data.zip}.`);

    // Pull in any triggered statements
    const triggeredInserts = this._getTriggeredStatements(data, inserts);
    triggeredInserts.forEach(stmt => {
      paragraphs.push(stmt.statement_text);
    });

    if (paragraphs.length <= 2) {
      paragraphs.push('[Add addendum content here. Toggle conditional inserts above to include standard language, or type your own content in the editor.]');
    }

    return paragraphs.join('\n\n');
  },

  // ========================================================================
  // HELPERS
  // ========================================================================

  /**
   * Get statements that should be triggered based on data + manual inserts
   */
  _getTriggeredStatements(data, inserts) {
    // Build trigger list from data auto-detection + manual toggles
    const triggers = new Set(inserts || []);

    // Auto-detect from data
    if (data.pre1978) triggers.add('pre_1978');
    if (data.exteriorOnly) triggers.add('2055_exterior');
    if (data.splitLevel || data.belowGrade > 0) triggers.add('below_grade');
    if (data.fsbo) triggers.add('fsbo');
    if (data.manufactured) triggers.add('manufactured');
    if (data.subjectTo) triggers.add('arv');
    if (data.activeListingUsed) triggers.add('active_listing');

    return StatementsLibrary.getTriggered([...triggers]);
  }
};


// ============================================================================
// COMMENTS MODULE — Main Controller (Replaces old CommentsModule)
// ============================================================================

const CommentsModule = {
  currentOutput: 'general',
  currentTemplate: '1004_standard',
  dataReviewOpen: false,

  /**
   * Initialize the module
   */
  init() {
    StatementsLibrary.init();
  },

  /**
   * Render when section becomes active
   */
  render() {
    if (!App.activeAssignmentId) {
      const output = document.getElementById('cg-generated-output');
      if (output) output.innerHTML = '<div class="cg-placeholder">Select an assignment to begin generating comments.</div>';
      return;
    }

    this._updateDataStatus();
    this._autoDetectInserts();
    this._loadSavedComment();
  },

  /**
   * Switch output type tab
   */
  selectOutput(type) {
    this.currentOutput = type;

    // Update tab UI
    document.querySelectorAll('.cg-tab').forEach(t => t.classList.remove('active'));
    const activeTab = document.querySelector(`.cg-tab[data-output="${type}"]`);
    if (activeTab) activeTab.classList.add('active');

    // Show/hide revision fields
    const revFields = document.getElementById('cg-revision-fields');
    if (revFields) revFields.style.display = type === 'revision' ? 'block' : 'none';

    // Clear current output
    const output = document.getElementById('cg-generated-output');
    if (output) output.innerHTML = '<div class="cg-placeholder">Click Generate Draft to create comments for this section.</div>';
    const editor = document.getElementById('cg-edited-output');
    if (editor) editor.value = '';

    // Load saved if exists
    this._loadSavedComment();
  },

  /**
   * Handle template mode change
   */
  onTemplateChange() {
    const sel = document.getElementById('cg-template-mode');
    this.currentTemplate = sel?.value || '1004_standard';
    this._autoDetectInserts();
  },

  /**
   * Toggle data review panel
   */
  toggleDataReview() {
    this.dataReviewOpen = !this.dataReviewOpen;
    const grid = document.getElementById('cg-data-grid');
    const arrow = document.querySelector('.cg-toggle-arrow');
    if (grid) grid.style.display = this.dataReviewOpen ? 'grid' : 'none';
    if (arrow) arrow.textContent = this.dataReviewOpen ? '▲' : '▼';

    if (this.dataReviewOpen) this._populateDataGrid();
  },

  /**
   * Auto-detect conditional inserts from assignment data
   */
  _autoDetectInserts() {
    const data = CommentTemplates.gatherData();
    if (!data) return;

    const autoChecks = {
      'cg-insert-pre1978': data.pre1978,
      'cg-insert-2055': data.exteriorOnly || this.currentTemplate === '2055_exterior',
      'cg-insert-septic': (data.utilities || '').toLowerCase().includes('septic'),
      'cg-insert-well': (data.utilities || '').toLowerCase().includes('well'),
      'cg-insert-fsbo': data.fsbo,
      'cg-insert-no-mls': false, // manual only
      'cg-insert-below-grade': data.splitLevel || data.belowGrade > 0,
      'cg-insert-limited-comps': this.currentTemplate === 'limited_comps',
      'cg-insert-active-listing': data.activeListingUsed,
      'cg-insert-renovations': !!data.updates,
      'cg-insert-flood': false, // manual only
      'cg-insert-adu': false // manual only
    };

    Object.entries(autoChecks).forEach(([id, val]) => {
      const el = document.getElementById(id);
      if (el && val) el.checked = true;
    });
  },

  /**
   * Get currently toggled inserts
   */
  _getActiveInserts() {
    const inserts = [];
    const map = {
      'cg-insert-pre1978': 'pre_1978',
      'cg-insert-2055': '2055_exterior',
      'cg-insert-septic': 'septic',
      'cg-insert-well': 'well',
      'cg-insert-no-mls': 'no_mls',
      'cg-insert-fsbo': 'fsbo',
      'cg-insert-below-grade': 'below_grade',
      'cg-insert-limited-comps': 'limited_comps',
      'cg-insert-active-listing': 'active_listing',
      'cg-insert-renovations': 'renovations',
      'cg-insert-flood': 'flood',
      'cg-insert-adu': 'adu'
    };

    Object.entries(map).forEach(([id, trigger]) => {
      const el = document.getElementById(id);
      if (el && el.checked) inserts.push(trigger);
    });

    return inserts;
  },

  /**
   * Handle insert toggle change
   */
  onInsertChange() {
    // Could auto-regenerate here, but we'll keep it manual for control
  },

  /**
   * GENERATE DRAFT — Core generation function
   */
  async generateDraft() {
    if (!App.activeAssignmentId) {
      App.toast('Select an assignment first', 'warning');
      return;
    }

    const statusEl = document.getElementById('cg-gen-status');
    if (statusEl) statusEl.textContent = 'Generating...';

    const data = CommentTemplates.gatherData();
    if (!data) {
      App.toast('Could not load assignment data', 'error');
      if (statusEl) statusEl.textContent = '';
      return;
    }

    const templateMode = this.currentTemplate;
    const inserts = this._getActiveInserts();
    let draft = '';

    // Step 1: Rule-based assembly
    switch (this.currentOutput) {
      case 'general':
        draft = CommentTemplates.generateGeneralComments(data, templateMode, inserts);
        break;
      case 'sales_comparison':
        draft = CommentTemplates.generateSalesComparisonComments(data, templateMode, inserts);
        break;
      case 'addendum':
        draft = CommentTemplates.generateShortAddendum(data, templateMode, inserts);
        break;
      case 'revision':
        draft = this._generateRevisionFromUI();
        break;
      case 'special':
        draft = this._generateSpecialInserts(inserts);
        break;
      case 'market_analysis':
        draft = CommentTemplates.generateMarketAnalysisComments(data, templateMode, inserts);
        break;
      case 'adjustment_support':
        draft = CommentTemplates.generateAdjustmentSupportComments(data, templateMode, inserts);
        break;
      case 'cost_approach':
        draft = CommentTemplates.generateCostApproachComments(data, templateMode, inserts);
        break;
      case 'income_approach':
        draft = CommentTemplates.generateIncomeApproachComments(data, templateMode, inserts);
        break;
    }

    // Step 2: AI refinement (if available and not revision/special)
    if (AIService.isAvailable() && this.currentOutput !== 'revision' && this.currentOutput !== 'special') {
      if (statusEl) statusEl.textContent = 'AI refining...';

      const systemPrompt = AIService.getSystemPrompt();
      const userPrompt = this._buildAIPrompt(draft, data, templateMode);

      const result = await AIService.generate(systemPrompt, userPrompt, {
        assignmentId: App.activeAssignmentId,
        commentType: this.currentOutput,
        maxTokens: 2500
      });

      if (result.text) {
        draft = result.text;
        if (statusEl) statusEl.textContent = `AI refined (${result.provider} / ${result.model})`;
      } else if (result.fallback) {
        if (statusEl) statusEl.textContent = result.error ? `Rule-based only: ${result.error}` : 'Rule-based generation';
      }
    } else {
      if (statusEl) statusEl.textContent = AIService.isAvailable() ? 'Generated' : 'Rule-based (no AI configured)';
    }

    // Step 3: Display
    const outputEl = document.getElementById('cg-generated-output');
    if (outputEl) {
      outputEl.innerHTML = `<div class="cg-generated-text">${this._escapeHtml(draft).replace(/\n/g, '<br>')}</div>`;
    }

    // Copy to editor
    const editorEl = document.getElementById('cg-edited-output');
    if (editorEl) editorEl.value = draft;

    // Add compliance footer
    this._addComplianceFooter();

    App.toast('Draft generated — review and edit before use', 'success');
  },

  /**
   * Regenerate (same as generate, but clears first)
   */
  async regenerate() {
    const outputEl = document.getElementById('cg-generated-output');
    if (outputEl) outputEl.innerHTML = '';
    const editorEl = document.getElementById('cg-edited-output');
    if (editorEl) editorEl.value = '';
    await this.generateDraft();
  },

  /**
   * Build AI prompt from structured data + rule-based draft
   */
  _buildAIPrompt(draft, data, templateMode) {
    let prompt = `Please refine the following appraisal comment draft into polished, professional language. Maintain all factual content and compliance language. Match the style of USPAP-conscious, Fannie Mae/UAD-aligned appraisal writing.\n\n`;
    prompt += `COMMENT TYPE: ${this.currentOutput.replace(/_/g, ' ').toUpperCase()}\n`;
    prompt += `TEMPLATE: ${templateMode.replace(/_/g, ' ')}\n`;
    prompt += `PROPERTY: ${data.address}, ${data.city}, ${data.state}\n`;
    if (data.gla) prompt += `GLA: ${data.gla} sqft\n`;
    if (data.yearBuilt) prompt += `YEAR BUILT: ${data.yearBuilt}\n`;
    if (data.condition) prompt += `CONDITION: ${data.condition}\n`;
    prompt += `\nDRAFT TO REFINE:\n${draft}\n\n`;
    prompt += `INSTRUCTIONS: Improve clarity and readability. Remove any awkward phrasing. Ensure professional tone throughout. Do not add facts not present in the draft. Do not change the meaning or conclusions. Return only the refined text.`;
    return prompt;
  },

  /**
   * Generate revision response from UI inputs
   */
  _generateRevisionFromUI() {
    const items = [];
    document.querySelectorAll('.cg-revision-item').forEach(el => {
      const request = el.querySelector('.cg-revision-request')?.value?.trim();
      const response = el.querySelector('.cg-revision-response')?.value?.trim();
      if (request || response) items.push({ request: request || '[Request]', response: response || '[Response]' });
    });
    return CommentTemplates.generateRevisionResponse(items);
  },

  /**
   * Generate special inserts text
   */
  _generateSpecialInserts(inserts) {
    const statements = StatementsLibrary.getTriggered(inserts);
    if (statements.length === 0) {
      return '[No conditional inserts selected. Toggle the inserts above or open the Statements Library to choose specific language.]';
    }
    return statements.map(s => `[${s.statement_type}]\n${s.statement_text}`).join('\n\n');
  },

  /**
   * Add revision item to UI
   */
  addRevisionItem() {
    const container = document.getElementById('cg-revision-items');
    if (!container) return;
    const count = container.querySelectorAll('.cg-revision-item').length + 1;
    const div = document.createElement('div');
    div.className = 'cg-revision-item';
    div.innerHTML = `
      <span class="cg-revision-num">${count}.</span>
      <input type="text" class="cg-revision-request" placeholder="Reviewer request / question...">
      <textarea class="cg-revision-response" rows="3" placeholder="Your response..."></textarea>
      <button class="btn-link btn-sm" onclick="this.parentElement.remove()">✕</button>
    `;
    container.appendChild(div);
  },

  /**
   * Save current draft
   */
  saveDraft() {
    if (!App.activeAssignmentId) {
      App.toast('No active assignment', 'warning');
      return;
    }

    const editorEl = document.getElementById('cg-edited-output');
    const text = editorEl?.value?.trim();
    if (!text) {
      App.toast('No content to save', 'warning');
      return;
    }

    const generatedEl = document.getElementById('cg-generated-output');
    const generatedText = generatedEl?.innerText || '';
    const aiSettings = AIService.getSettings();

    const existing = DB.where('comments', c =>
      c.assignment_id === App.activeAssignmentId && c.comment_type === this.currentOutput
    )[0];

    const record = {
      assignment_id: App.activeAssignmentId,
      comment_type: this.currentOutput,
      template_mode: this.currentTemplate,
      generated_text: generatedText,
      edited_text: text,
      final_text: '',
      ai_provider: aiSettings.enabled ? aiSettings.provider : 'none',
      ai_model: aiSettings.enabled ? (aiSettings.model || '') : '',
      generation_prompt_version: '1.0',
      is_final: false,
      updated_at: new Date().toISOString()
    };

    if (existing) {
      DB.update('comments', existing.id, record);
    } else {
      record.created_at = new Date().toISOString();
      DB.add('comments', record);
    }

    App.toast(`${this._getOutputLabel()} draft saved`, 'success');
  },

  /**
   * Mark comment as final
   */
  finalize() {
    if (!App.activeAssignmentId) return;

    const editorEl = document.getElementById('cg-edited-output');
    const text = editorEl?.value?.trim();
    if (!text) {
      App.toast('No content to finalize', 'warning');
      return;
    }

    if (!confirm(`Mark the ${this._getOutputLabel()} as final? You can still edit it later.`)) return;

    const existing = DB.where('comments', c =>
      c.assignment_id === App.activeAssignmentId && c.comment_type === this.currentOutput
    )[0];

    const record = {
      assignment_id: App.activeAssignmentId,
      comment_type: this.currentOutput,
      template_mode: this.currentTemplate,
      generated_text: document.getElementById('cg-generated-output')?.innerText || '',
      edited_text: text,
      final_text: text,
      is_final: true,
      finalized_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (existing) {
      DB.update('comments', existing.id, record);
    } else {
      record.created_at = new Date().toISOString();
      DB.add('comments', record);
    }

    App.toast(`${this._getOutputLabel()} finalized`, 'success');
  },

  /**
   * Copy generated text to clipboard
   */
  copyGenerated() {
    const el = document.getElementById('cg-generated-output');
    const text = el?.innerText || '';
    if (!text || text.includes('Click Generate')) {
      App.toast('Nothing to copy', 'warning');
      return;
    }
    navigator.clipboard.writeText(text).then(() => App.toast('Copied to clipboard', 'success'));
  },

  /**
   * Copy generated output into editor
   */
  copyFromGenerated() {
    const el = document.getElementById('cg-generated-output');
    const editor = document.getElementById('cg-edited-output');
    if (el && editor) {
      editor.value = el.innerText || '';
    }
  },

  /**
   * Clear editor
   */
  clearEditor() {
    const editor = document.getElementById('cg-edited-output');
    if (editor) editor.value = '';
  },

  /**
   * Export current comment as .txt
   */
  exportText() {
    const editor = document.getElementById('cg-edited-output');
    const text = editor?.value?.trim();
    if (!text) {
      App.toast('No content to export', 'warning');
      return;
    }

    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${this.currentOutput}_comments_${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    App.toast('Exported', 'success');
  },

  /**
   * Export all finalized comments for the assignment
   */
  exportAllComments() {
    if (!App.activeAssignmentId) return;

    const comments = DB.where('comments', c =>
      c.assignment_id === App.activeAssignmentId
    );

    if (comments.length === 0) {
      App.toast('No saved comments to export', 'warning');
      return;
    }

    const assignment = DB.getById('assignments', App.activeAssignmentId);
    let output = `APPRAISAL COMMENTS\n`;
    output += `Property: ${assignment?.address || 'N/A'}, ${assignment?.city || ''}, ${assignment?.state || ''}\n`;
    output += `Generated: ${new Date().toLocaleString()}\n`;
    output += `${'='.repeat(60)}\n\n`;

    const typeOrder = ['general', 'sales_comparison', 'market_analysis', 'adjustment_support', 'cost_approach', 'income_approach', 'addendum', 'revision', 'special'];

    typeOrder.forEach(type => {
      const c = comments.find(cc => cc.comment_type === type);
      if (c) {
        const text = c.final_text || c.edited_text || c.generated_text;
        if (text) {
          output += `--- ${this._getOutputLabel(type)} ---\n\n`;
          output += text + '\n\n';
        }
      }
    });

    output += `${'='.repeat(60)}\n`;
    output += 'All generated comments are draft support language for appraiser review.\n';
    output += 'Final appraisal conclusions and report content remain the responsibility of the appraiser.\n';

    const blob = new Blob([output], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `all_comments_${assignment?.address?.replace(/\s/g, '_') || 'export'}_${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    App.toast('All comments exported', 'success');
  },

  // ========================================================================
  // STATEMENTS LIBRARY MODAL
  // ========================================================================

  openStatementsLibrary() {
    document.getElementById('cg-statements-modal').style.display = 'flex';
    this._renderStatementsLibrary('all');
  },

  closeStatementsLibrary() {
    document.getElementById('cg-statements-modal').style.display = 'none';
  },

  _renderStatementsLibrary(category) {
    // Categories
    const catEl = document.getElementById('cg-stmt-categories');
    if (catEl) {
      catEl.innerHTML = StatementsLibrary.getCategories().map(c =>
        `<button class="btn-sm ${c.key === category ? 'btn-primary' : 'btn-secondary'}" onclick="CommentsModule._renderStatementsLibrary('${c.key}')">${c.label}</button>`
      ).join('');
    }

    // Statements list
    const listEl = document.getElementById('cg-stmt-list');
    if (listEl) {
      const stmts = StatementsLibrary.getAll(category);
      listEl.innerHTML = stmts.map(s => `
        <div class="cg-stmt-item">
          <label>
            <input type="checkbox" class="cg-stmt-check" data-id="${s.id}" value="${s.trigger_type}">
            <strong>${s.statement_type}</strong>
            <span class="cg-stmt-category">${s.category}</span>
          </label>
          <p class="cg-stmt-preview">${s.statement_text.substring(0, 200)}${s.statement_text.length > 200 ? '...' : ''}</p>
        </div>
      `).join('');
    }
  },

  insertSelectedStatements() {
    const checks = document.querySelectorAll('.cg-stmt-check:checked');
    if (checks.length === 0) {
      App.toast('No statements selected', 'warning');
      return;
    }

    const editor = document.getElementById('cg-edited-output');
    if (!editor) return;

    const ids = [...checks].map(c => c.dataset.id);
    const allStmts = DB.getAll('special_statements');
    const selected = allStmts.filter(s => ids.includes(s.id));

    let text = editor.value || '';
    if (text) text += '\n\n';
    text += selected.map(s => s.statement_text).join('\n\n');
    editor.value = text;

    this.closeStatementsLibrary();
    App.toast(`${selected.length} statement(s) inserted`, 'success');
  },

  addCustomStatement() {
    const type = prompt('Statement name:');
    if (!type) return;
    const text = prompt('Statement text:');
    if (!text) return;
    const category = prompt('Category (compliance, scope, utilities, listing, design, comps, condition, site):') || 'compliance';

    StatementsLibrary.addCustom(type, 'manual', category, text);
    this._renderStatementsLibrary('all');
    App.toast('Custom statement added', 'success');
  },

  // ========================================================================
  // SAVED COMMENTS MODAL
  // ========================================================================

  openSavedComments() {
    if (!App.activeAssignmentId) {
      App.toast('Select an assignment first', 'warning');
      return;
    }

    const modal = document.getElementById('cg-saved-modal');
    modal.style.display = 'flex';

    const comments = DB.where('comments', c => c.assignment_id === App.activeAssignmentId);
    const listEl = document.getElementById('cg-saved-list');

    if (comments.length === 0) {
      listEl.innerHTML = '<p class="empty-state">No saved comments for this assignment.</p>';
      return;
    }

    listEl.innerHTML = comments.map(c => `
      <div class="cg-saved-item ${c.is_final ? 'cg-finalized' : ''}">
        <div class="cg-saved-header">
          <strong>${this._getOutputLabel(c.comment_type)}</strong>
          <span>${c.is_final ? '✅ Final' : '📝 Draft'}</span>
          <span>${c.updated_at ? Util.formatDate(c.updated_at) : ''}</span>
        </div>
        <p class="cg-saved-preview">${(c.edited_text || c.generated_text || '').substring(0, 200)}...</p>
        <div class="cg-saved-actions">
          <button class="btn-link btn-sm" onclick="CommentsModule._loadComment('${c.id}')">Load</button>
          <button class="btn-link btn-sm" onclick="CommentsModule._deleteComment('${c.id}')">Delete</button>
        </div>
      </div>
    `).join('');
  },

  closeSavedComments() {
    document.getElementById('cg-saved-modal').style.display = 'none';
  },

  _loadComment(id) {
    const c = DB.getById('comments', id);
    if (!c) return;

    this.currentOutput = c.comment_type;
    this.selectOutput(c.comment_type);

    if (c.template_mode) {
      this.currentTemplate = c.template_mode;
      const sel = document.getElementById('cg-template-mode');
      if (sel) sel.value = c.template_mode;
    }

    const outputEl = document.getElementById('cg-generated-output');
    if (outputEl && c.generated_text) {
      outputEl.innerHTML = `<div class="cg-generated-text">${this._escapeHtml(c.generated_text).replace(/\n/g, '<br>')}</div>`;
    }

    const editorEl = document.getElementById('cg-edited-output');
    if (editorEl) editorEl.value = c.edited_text || c.generated_text || '';

    this.closeSavedComments();
    App.toast('Comment loaded', 'success');
  },

  _deleteComment(id) {
    if (!confirm('Delete this saved comment?')) return;
    DB.remove('comments', id);
    this.openSavedComments(); // Refresh
    App.toast('Comment deleted', 'success');
  },

  // ========================================================================
  // INTERNAL HELPERS
  // ========================================================================

  _loadSavedComment() {
    if (!App.activeAssignmentId) return;

    const saved = DB.where('comments', c =>
      c.assignment_id === App.activeAssignmentId && c.comment_type === this.currentOutput
    )[0];

    if (saved) {
      const outputEl = document.getElementById('cg-generated-output');
      if (outputEl && saved.generated_text) {
        outputEl.innerHTML = `<div class="cg-generated-text">${this._escapeHtml(saved.generated_text).replace(/\n/g, '<br>')}</div>`;
      }
      const editorEl = document.getElementById('cg-edited-output');
      if (editorEl) editorEl.value = saved.edited_text || saved.generated_text || '';
    }
  },

  _updateDataStatus() {
    const statusEl = document.getElementById('cg-data-status');
    if (!statusEl) return;

    const data = CommentTemplates.gatherData();
    if (!data) {
      statusEl.textContent = 'No assignment selected';
      statusEl.className = 'cg-data-status status-warning';
      return;
    }

    const fields = [data.address, data.city, data.yearBuilt, data.gla, data.condition];
    const filled = fields.filter(f => f).length;
    statusEl.textContent = `${filled}/${fields.length} key fields populated`;
    statusEl.className = `cg-data-status ${filled >= 4 ? 'status-good' : 'status-warning'}`;
  },

  _populateDataGrid() {
    const grid = document.getElementById('cg-data-grid');
    if (!grid) return;

    const data = CommentTemplates.gatherData();
    if (!data) {
      grid.innerHTML = '<p>No assignment data available.</p>';
      return;
    }

    const fields = [
      ['Address', data.address], ['City', data.city], ['State', data.state],
      ['Zip', data.zip], ['County', data.county], ['Subdivision', data.subdivision],
      ['Property Type', data.propertyType], ['Style', data.style],
      ['GLA', data.gla ? `${data.gla} sqft` : ''], ['Below Grade', data.belowGrade ? `${data.belowGrade} sqft` : ''],
      ['Bedrooms', data.bedrooms], ['Bathrooms', data.bathrooms],
      ['Year Built', data.yearBuilt], ['Effective Age', data.effectiveAge],
      ['Condition', data.condition], ['Quality', data.quality],
      ['Updates', data.updates], ['Utilities', data.utilities],
      ['Transaction', data.transactionType], ['Loan Type', data.loanType],
      ['Form Type', data.formType], ['FSBO', data.fsbo ? 'Yes' : 'No'],
      ['Pre-1978', data.pre1978 ? 'Yes' : 'No'], ['Split Level', data.splitLevel ? 'Yes' : 'No'],
      ['Exterior Only', data.exteriorOnly ? 'Yes' : 'No'], ['Subject-To/ARV', data.subjectTo ? 'Yes' : 'No'],
      ['Comps Selected', data.comps.length], ['Market Analysis', data.marketAnalysis ? 'Complete' : 'Pending'],
      ['Cost Approach', data.costApproach ? 'Complete' : 'Pending'], ['Income Approach', data.incomeApproach ? 'Complete' : 'Pending']
    ];

    grid.innerHTML = fields.map(([label, val]) =>
      `<div class="cg-data-field"><span class="cg-field-label">${label}</span><span class="cg-field-value ${val ? '' : 'cg-field-empty'}">${val || '—'}</span></div>`
    ).join('');
  },

  _addComplianceFooter() {
    const outputEl = document.getElementById('cg-generated-output');
    if (outputEl) {
      const footer = document.createElement('div');
      footer.className = 'cg-compliance-footer';
      footer.textContent = 'All generated comments are draft support language for appraiser review. Final appraisal conclusions and report content remain the responsibility of the appraiser.';
      outputEl.appendChild(footer);
    }
  },

  _getOutputLabel(type) {
    const labels = {
      'general': 'General Comments',
      'sales_comparison': 'Sales Comparison Comments',
      'market_analysis': 'Market Analysis',
      'adjustment_support': 'Adjustment Support',
      'cost_approach': 'Cost Approach',
      'income_approach': 'Income Approach',
      'addendum': 'Short Addendum',
      'revision': 'Revision Response',
      'special': 'Special Inserts'
    };
    return labels[type || this.currentOutput] || 'Comment';
  },

  _escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
};
