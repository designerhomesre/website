/**
 * DESIGNER HOMES APPRAISAL PLATFORM
 * Statistical Methods Engine — 13 Adjustment Calculation Methods
 *
 * All methods operate on paired data arrays:
 *   x[] = feature values (e.g., GLA in sqft)
 *   y[] = sale prices (or price per unit)
 *
 * Each method returns: { value, low, high, confidence, n, method, label, notes }
 */

// ============================================================================
// STATISTICAL UTILITY FUNCTIONS
// ============================================================================

const StatUtils = {
  /** Mean of an array */
  mean(arr) {
    if (!arr || arr.length === 0) return 0;
    return arr.reduce((s, v) => s + v, 0) / arr.length;
  },

  /** Median of an array */
  median(arr) {
    if (!arr || arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  },

  /** Standard deviation */
  stdev(arr) {
    if (!arr || arr.length < 2) return 0;
    const m = this.mean(arr);
    const sumSqDiff = arr.reduce((s, v) => s + Math.pow(v - m, 2), 0);
    return Math.sqrt(sumSqDiff / (arr.length - 1));
  },

  /** Median Absolute Deviation */
  mad(arr) {
    if (!arr || arr.length === 0) return 0;
    const med = this.median(arr);
    const deviations = arr.map(v => Math.abs(v - med));
    return this.median(deviations);
  },

  /** Interquartile Range */
  iqr(arr) {
    if (!arr || arr.length < 4) return { q1: 0, q3: 0, iqr: 0 };
    const sorted = [...arr].sort((a, b) => a - b);
    const n = sorted.length;
    const q1Idx = Math.floor(n * 0.25);
    const q3Idx = Math.floor(n * 0.75);
    const q1 = sorted[q1Idx];
    const q3 = sorted[q3Idx];
    return { q1, q3, iqr: q3 - q1 };
  },

  /** Percentile */
  percentile(arr, p) {
    if (!arr || arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const idx = (p / 100) * (sorted.length - 1);
    const lo = Math.floor(idx);
    const hi = Math.ceil(idx);
    if (lo === hi) return sorted[lo];
    return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
  },

  /** R-squared for regression fit */
  rSquared(observed, predicted) {
    const meanObs = this.mean(observed);
    const ssTot = observed.reduce((s, v) => s + Math.pow(v - meanObs, 2), 0);
    const ssRes = observed.reduce((s, v, i) => s + Math.pow(v - predicted[i], 2), 0);
    return ssTot > 0 ? 1 - (ssRes / ssTot) : 0;
  },

  /** Generate all unique pairs from indices */
  pairs(n) {
    const result = [];
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        result.push([i, j]);
      }
    }
    return result;
  },

  /** Combinations C(n,k) */
  combinations(n, k) {
    if (k > n) return 0;
    if (k === 0 || k === n) return 1;
    let result = 1;
    for (let i = 0; i < k; i++) {
      result = result * (n - i) / (i + 1);
    }
    return Math.round(result);
  }
};


// ============================================================================
// 13 STATISTICAL METHODS
// ============================================================================

const StatisticalMethods = {

  /**
   * 1. GROUPED DATA ANALYSIS
   * Splits comps into groups by feature value (above/below median) and
   * compares mean sale prices to estimate adjustment per unit of difference.
   */
  grouped_data(x, y, subjectVal) {
    if (x.length < 4) return { value: null, error: 'Need at least 4 data points' };

    const medX = StatUtils.median(x);
    const groupHigh = [], groupLow = [];
    const xHigh = [], xLow = [];

    x.forEach((val, i) => {
      if (val >= medX) { groupHigh.push(y[i]); xHigh.push(val); }
      else { groupLow.push(y[i]); xLow.push(val); }
    });

    if (groupHigh.length === 0 || groupLow.length === 0) {
      return { value: null, error: 'All values in same group — no split possible' };
    }

    const meanPriceHigh = StatUtils.mean(groupHigh);
    const meanPriceLow = StatUtils.mean(groupLow);
    const meanFeatHigh = StatUtils.mean(xHigh);
    const meanFeatLow = StatUtils.mean(xLow);

    const featDiff = meanFeatHigh - meanFeatLow;
    if (Math.abs(featDiff) < 0.001) return { value: null, error: 'No feature difference between groups' };

    const adjustPerUnit = (meanPriceHigh - meanPriceLow) / featDiff;

    // Confidence based on group sizes and price variance
    const allPriceStd = StatUtils.stdev(y);
    const se = allPriceStd > 0 ? Math.abs(adjustPerUnit) / (allPriceStd / Math.sqrt(x.length)) : 0.5;
    const confidence = Math.min(0.95, Math.max(0.3, 0.5 + se * 0.1));

    return {
      value: Math.round(adjustPerUnit * 100) / 100,
      low: Math.round((adjustPerUnit * 0.75) * 100) / 100,
      high: Math.round((adjustPerUnit * 1.25) * 100) / 100,
      confidence: Math.round(confidence * 100),
      n: x.length,
      method: 'grouped_data',
      label: 'Grouped Data',
      notes: `Split at median ${medX.toFixed(1)}: High group (n=${groupHigh.length}, mean price ${Util.currency(meanPriceHigh)}), Low group (n=${groupLow.length}, mean price ${Util.currency(meanPriceLow)})`
    };
  },

  /**
   * 2. TRUE PAIRED SALES
   * Finds pairs of sales that differ only in the target feature and are
   * otherwise similar. Computes price difference per unit of feature difference.
   */
  true_paired(x, y, subjectVal, extras) {
    if (x.length < 2) return { value: null, error: 'Need at least 2 data points' };

    const pairs = StatUtils.pairs(x.length);
    const adjustments = [];

    pairs.forEach(([i, j]) => {
      const featDiff = x[i] - x[j];
      if (Math.abs(featDiff) < 0.001) return; // Same feature value, skip

      const priceDiff = y[i] - y[j];
      const adjPerUnit = priceDiff / featDiff;

      // Filter out extreme outliers (>3x median)
      adjustments.push({ adjPerUnit, priceDiff, featDiff, i, j });
    });

    if (adjustments.length === 0) return { value: null, error: 'No valid pairs with feature differences' };

    const values = adjustments.map(a => a.adjPerUnit);
    const med = StatUtils.median(values);
    const mad = StatUtils.mad(values);

    // Filter to reasonable range (within 3 MAD of median)
    const filtered = mad > 0
      ? values.filter(v => Math.abs(v - med) <= 3 * mad)
      : values;

    const result = StatUtils.median(filtered);
    const stdev = StatUtils.stdev(filtered);

    return {
      value: Math.round(result * 100) / 100,
      low: Math.round((result - stdev) * 100) / 100,
      high: Math.round((result + stdev) * 100) / 100,
      confidence: Math.round(Math.min(0.9, Math.max(0.3, 0.5 + (filtered.length / pairs.length) * 0.4)) * 100),
      n: filtered.length,
      method: 'true_paired',
      label: 'True Paired Sales',
      notes: `${pairs.length} total pairs, ${filtered.length} valid pairs after outlier removal`
    };
  },

  /**
   * 3. ADJUSTED PAIRED SALES
   * Like true paired but allows for adjustments to other known differences
   * between pairs before isolating the target feature contribution.
   */
  adjusted_paired(x, y, subjectVal, extras) {
    // Without full adjustment grid data, this falls back to paired with weighting
    if (x.length < 2) return { value: null, error: 'Need at least 2 data points' };

    const pairs = StatUtils.pairs(x.length);
    const adjustments = [];

    pairs.forEach(([i, j]) => {
      const featDiff = x[i] - x[j];
      if (Math.abs(featDiff) < 0.001) return;

      const priceDiff = y[i] - y[j];
      const adjPerUnit = priceDiff / featDiff;

      // Weight by inverse of absolute feature difference (closer pairs = more weight)
      const weight = 1 / (1 + Math.abs(featDiff));
      adjustments.push({ adjPerUnit, weight });
    });

    if (adjustments.length === 0) return { value: null, error: 'No valid pairs' };

    // Weighted mean
    const totalWeight = adjustments.reduce((s, a) => s + a.weight, 0);
    const weightedMean = adjustments.reduce((s, a) => s + a.adjPerUnit * a.weight, 0) / totalWeight;

    const values = adjustments.map(a => a.adjPerUnit);
    const stdev = StatUtils.stdev(values);

    return {
      value: Math.round(weightedMean * 100) / 100,
      low: Math.round((weightedMean - stdev) * 100) / 100,
      high: Math.round((weightedMean + stdev) * 100) / 100,
      confidence: Math.round(Math.min(0.85, 0.4 + adjustments.length * 0.05) * 100),
      n: adjustments.length,
      method: 'adjusted_paired',
      label: 'Adjusted Paired Sales',
      notes: `${adjustments.length} weighted pairs, weight-adjusted for feature difference magnitude`
    };
  },

  /**
   * 4. SENSITIVITY ANALYSIS
   * Tests how much the value conclusion changes per unit change in the feature.
   * Uses price-per-unit-of-feature across all comps.
   */
  sensitivity(x, y, subjectVal) {
    if (x.length < 3) return { value: null, error: 'Need at least 3 data points' };

    // Price per unit of feature for each comp
    const ppUnit = x.map((val, i) => val > 0 ? y[i] / val : null).filter(v => v !== null);

    if (ppUnit.length < 2) return { value: null, error: 'Insufficient valid data' };

    const mean = StatUtils.mean(ppUnit);
    const med = StatUtils.median(ppUnit);
    const stdev = StatUtils.stdev(ppUnit);
    const cv = mean > 0 ? stdev / mean : 1;

    // The adjustment per unit is the median price-per-unit
    // Sensitivity = how much does total price change per 1 unit of feature
    return {
      value: Math.round(med * 100) / 100,
      low: Math.round(StatUtils.percentile(ppUnit, 25) * 100) / 100,
      high: Math.round(StatUtils.percentile(ppUnit, 75) * 100) / 100,
      confidence: Math.round(Math.max(0.3, Math.min(0.9, 1 - cv)) * 100),
      n: ppUnit.length,
      method: 'sensitivity',
      label: 'Sensitivity Analysis',
      notes: `Price/unit: median ${Util.currency(med)}, mean ${Util.currency(mean)}, CV=${(cv * 100).toFixed(1)}%`
    };
  },

  /**
   * 5. ALLOCATION
   * Estimates feature value contribution as a percentage of total property value.
   */
  allocation(x, y, subjectVal, extras) {
    if (x.length < 3) return { value: null, error: 'Need at least 3 data points' };

    // Ratio of feature to price across all comps
    const ratios = [];
    x.forEach((val, i) => {
      if (val > 0 && y[i] > 0) {
        ratios.push(val / y[i]);
      }
    });

    if (ratios.length < 2) return { value: null, error: 'Insufficient data for allocation' };

    const medianRatio = StatUtils.median(ratios);
    const meanPrice = StatUtils.mean(y);

    // The allocated value per unit
    const allocatedPerUnit = meanPrice * medianRatio / StatUtils.mean(x.filter(v => v > 0));

    return {
      value: Math.round(allocatedPerUnit * 100) / 100,
      low: Math.round(allocatedPerUnit * 0.8 * 100) / 100,
      high: Math.round(allocatedPerUnit * 1.2 * 100) / 100,
      confidence: Math.round(Math.min(0.7, 0.3 + ratios.length * 0.05) * 100),
      n: ratios.length,
      method: 'allocation',
      label: 'Allocation',
      notes: `Median feature/price ratio: ${(medianRatio * 100).toFixed(2)}%, mean price ${Util.currency(meanPrice)}`
    };
  },

  /**
   * 6. DEPRECIATED COST
   * Uses replacement cost data to estimate the adjustment.
   * Requires extras.costPerUnit and extras.depreciationRate
   */
  depreciated_cost(x, y, subjectVal, extras) {
    const costPerUnit = extras?.costPerUnit || 0;
    const depRate = extras?.depreciationRate || 0;

    if (!costPerUnit) {
      // Estimate from data if no cost provided
      if (x.length < 3) return { value: null, error: 'Need cost data or 3+ comparables' };

      // Rough estimate: price difference per unit difference
      const sorted = x.map((val, i) => ({ x: val, y: y[i] })).sort((a, b) => a.x - b.x);
      const diffs = [];
      for (let i = 1; i < sorted.length; i++) {
        const dx = sorted[i].x - sorted[i - 1].x;
        if (dx > 0) diffs.push((sorted[i].y - sorted[i - 1].y) / dx);
      }

      if (diffs.length === 0) return { value: null, error: 'Cannot estimate cost per unit from data' };

      const estCost = StatUtils.median(diffs);
      return {
        value: Math.round(estCost * 100) / 100,
        low: Math.round(estCost * 0.7 * 100) / 100,
        high: Math.round(estCost * 1.3 * 100) / 100,
        confidence: 40,
        n: diffs.length,
        method: 'depreciated_cost',
        label: 'Depreciated Cost',
        notes: `Estimated from market data (no cost source provided). Consider entering DwellingCost.com data for better results.`
      };
    }

    const depreciatedValue = costPerUnit * (1 - depRate);

    return {
      value: Math.round(depreciatedValue * 100) / 100,
      low: Math.round(depreciatedValue * 0.85 * 100) / 100,
      high: Math.round(depreciatedValue * 1.15 * 100) / 100,
      confidence: 65,
      n: 1,
      method: 'depreciated_cost',
      label: 'Depreciated Cost',
      notes: `Cost ${Util.currency(costPerUnit)}/unit, depreciation ${(depRate * 100).toFixed(1)}%, net ${Util.currency(depreciatedValue)}/unit`
    };
  },

  /**
   * 7. OLS REGRESSION (Ordinary Least Squares)
   * Standard linear regression: y = a + b*x
   * The slope (b) is the adjustment per unit.
   */
  ols_regression(x, y, subjectVal) {
    if (x.length < 3) return { value: null, error: 'Need at least 3 data points' };

    const n = x.length;
    const meanX = StatUtils.mean(x);
    const meanY = StatUtils.mean(y);

    let ssXX = 0, ssXY = 0, ssYY = 0;
    for (let i = 0; i < n; i++) {
      const dx = x[i] - meanX;
      const dy = y[i] - meanY;
      ssXX += dx * dx;
      ssXY += dx * dy;
      ssYY += dy * dy;
    }

    if (ssXX < 0.001) return { value: null, error: 'No variance in feature values' };

    const slope = ssXY / ssXX;
    const intercept = meanY - slope * meanX;

    // R-squared
    const predicted = x.map(v => intercept + slope * v);
    const r2 = StatUtils.rSquared(y, predicted);

    // Standard error of slope
    const residuals = y.map((v, i) => v - predicted[i]);
    const ssResid = residuals.reduce((s, r) => s + r * r, 0);
    const mse = ssResid / (n - 2);
    const seSlope = Math.sqrt(mse / ssXX);

    // 95% confidence interval for slope
    const tCrit = n > 30 ? 1.96 : 2.0 + 5 / n; // Approximate t-critical
    const low = slope - tCrit * seSlope;
    const high = slope + tCrit * seSlope;

    return {
      value: Math.round(slope * 100) / 100,
      low: Math.round(low * 100) / 100,
      high: Math.round(high * 100) / 100,
      confidence: Math.round(Math.min(0.95, Math.max(0.3, r2)) * 100),
      n: n,
      method: 'ols_regression',
      label: 'OLS Regression',
      notes: `y = ${Util.currency(intercept)} + ${Util.currency(slope)} * x, R² = ${(r2 * 100).toFixed(1)}%, SE(slope) = ${Util.currency(seSlope)}`,
      r2: Math.round(r2 * 1000) / 1000,
      intercept: Math.round(intercept * 100) / 100,
      seSlope: Math.round(seSlope * 100) / 100
    };
  },

  /**
   * 8. THEIL-SEN ESTIMATOR
   * Robust regression: median of all pairwise slopes. Resistant to outliers.
   */
  theil_sen(x, y, subjectVal) {
    if (x.length < 3) return { value: null, error: 'Need at least 3 data points' };

    const slopes = [];
    const pairs = StatUtils.pairs(x.length);

    pairs.forEach(([i, j]) => {
      const dx = x[i] - x[j];
      if (Math.abs(dx) > 0.001) {
        slopes.push((y[i] - y[j]) / dx);
      }
    });

    if (slopes.length === 0) return { value: null, error: 'No valid slopes' };

    const medSlope = StatUtils.median(slopes);
    const medX = StatUtils.median(x);
    const medY = StatUtils.median(y);
    const intercept = medY - medSlope * medX;

    // Confidence interval using IQR of slopes
    const { q1, q3 } = StatUtils.iqr(slopes);

    // R-squared equivalent
    const predicted = x.map(v => intercept + medSlope * v);
    const r2 = StatUtils.rSquared(y, predicted);

    return {
      value: Math.round(medSlope * 100) / 100,
      low: Math.round(q1 * 100) / 100,
      high: Math.round(q3 * 100) / 100,
      confidence: Math.round(Math.min(0.9, Math.max(0.35, r2 + 0.1)) * 100),
      n: slopes.length,
      method: 'theil_sen',
      label: 'Theil-Sen',
      notes: `Median of ${slopes.length} pairwise slopes, R² = ${(r2 * 100).toFixed(1)}% (robust, outlier-resistant)`,
      r2: Math.round(r2 * 1000) / 1000
    };
  },

  /**
   * 9. LAD — Least Absolute Deviations
   * Minimizes sum of absolute residuals instead of squared residuals.
   * More robust to outliers than OLS. Uses iterative weighted least squares.
   */
  lad(x, y, subjectVal) {
    if (x.length < 3) return { value: null, error: 'Need at least 3 data points' };

    // IRLS (Iteratively Reweighted Least Squares) for LAD
    let slope, intercept;

    // Initialize with OLS
    const meanX = StatUtils.mean(x);
    const meanY = StatUtils.mean(y);
    let ssXX = 0, ssXY = 0;
    x.forEach((v, i) => { ssXX += (v - meanX) ** 2; ssXY += (v - meanX) * (y[i] - meanY); });
    slope = ssXX > 0 ? ssXY / ssXX : 0;
    intercept = meanY - slope * meanX;

    // Iterate
    for (let iter = 0; iter < 50; iter++) {
      const weights = y.map((v, i) => {
        const resid = Math.abs(v - (intercept + slope * x[i]));
        return resid > 0.001 ? 1 / resid : 1000; // L1 weight
      });

      // Weighted regression
      const wSum = weights.reduce((s, w) => s + w, 0);
      const wMeanX = weights.reduce((s, w, i) => s + w * x[i], 0) / wSum;
      const wMeanY = weights.reduce((s, w, i) => s + w * y[i], 0) / wSum;

      let wSSXX = 0, wSSXY = 0;
      weights.forEach((w, i) => {
        wSSXX += w * (x[i] - wMeanX) ** 2;
        wSSXY += w * (x[i] - wMeanX) * (y[i] - wMeanY);
      });

      const newSlope = wSSXX > 0 ? wSSXY / wSSXX : slope;
      const newIntercept = wMeanY - newSlope * wMeanX;

      if (Math.abs(newSlope - slope) < 0.01) break;
      slope = newSlope;
      intercept = newIntercept;
    }

    const predicted = x.map(v => intercept + slope * v);
    const r2 = StatUtils.rSquared(y, predicted);
    const residuals = y.map((v, i) => Math.abs(v - predicted[i]));
    const mae = StatUtils.mean(residuals);

    return {
      value: Math.round(slope * 100) / 100,
      low: Math.round(slope * 0.85 * 100) / 100,
      high: Math.round(slope * 1.15 * 100) / 100,
      confidence: Math.round(Math.min(0.9, Math.max(0.3, r2 + 0.05)) * 100),
      n: x.length,
      method: 'lad',
      label: 'LAD (Least Absolute)',
      notes: `L1 regression via IRLS, R² = ${(r2 * 100).toFixed(1)}%, MAE = ${Util.currency(mae)}`
    };
  },

  /**
   * 10. LMS — Least Median of Squares
   * Finds the regression line minimizing the median of squared residuals.
   * Very robust — can tolerate up to ~50% outliers.
   * Uses random subsampling for computational feasibility.
   */
  lms(x, y, subjectVal) {
    if (x.length < 3) return { value: null, error: 'Need at least 3 data points' };

    const n = x.length;
    const maxIter = Math.min(500, StatUtils.combinations(n, 2));
    let bestMedianSqResid = Infinity;
    let bestSlope = 0, bestIntercept = 0;

    // Random subsampling: draw pairs and fit lines
    const pairs = StatUtils.pairs(n);
    const samplePairs = pairs.length <= maxIter ? pairs : [];
    if (pairs.length > maxIter) {
      // Random sample
      const indices = new Set();
      while (indices.size < maxIter) indices.add(Math.floor(Math.random() * pairs.length));
      indices.forEach(idx => samplePairs.push(pairs[idx]));
    }

    samplePairs.forEach(([i, j]) => {
      const dx = x[i] - x[j];
      if (Math.abs(dx) < 0.001) return;

      const slope = (y[i] - y[j]) / dx;
      const intercept = y[i] - slope * x[i];

      const sqResids = y.map((v, k) => Math.pow(v - (intercept + slope * x[k]), 2));
      const medSqResid = StatUtils.median(sqResids);

      if (medSqResid < bestMedianSqResid) {
        bestMedianSqResid = medSqResid;
        bestSlope = slope;
        bestIntercept = intercept;
      }
    });

    const predicted = x.map(v => bestIntercept + bestSlope * v);
    const r2 = StatUtils.rSquared(y, predicted);

    return {
      value: Math.round(bestSlope * 100) / 100,
      low: Math.round(bestSlope * 0.8 * 100) / 100,
      high: Math.round(bestSlope * 1.2 * 100) / 100,
      confidence: Math.round(Math.min(0.85, Math.max(0.3, r2 + 0.1)) * 100),
      n: samplePairs.length,
      method: 'lms',
      label: 'LMS (Least Median)',
      notes: `Least Median of Squares over ${samplePairs.length} subsamples, R² = ${(r2 * 100).toFixed(1)}% (highly robust)`
    };
  },

  /**
   * 11. ROBUST SIMPLE REGRESSION
   * Uses M-estimation with Huber weights for robust regression.
   */
  robust_simple(x, y, subjectVal) {
    if (x.length < 3) return { value: null, error: 'Need at least 3 data points' };

    // Start with Theil-Sen as initial estimate
    const slopes = [];
    StatUtils.pairs(x.length).forEach(([i, j]) => {
      const dx = x[i] - x[j];
      if (Math.abs(dx) > 0.001) slopes.push((y[i] - y[j]) / dx);
    });

    let slope = StatUtils.median(slopes);
    let intercept = StatUtils.median(y) - slope * StatUtils.median(x);

    // Huber M-estimation iterations
    const k = 1.345; // Huber tuning constant
    for (let iter = 0; iter < 30; iter++) {
      const residuals = y.map((v, i) => v - (intercept + slope * x[i]));
      const madResid = StatUtils.mad(residuals);
      const scale = madResid > 0 ? madResid / 0.6745 : 1;

      // Huber weights
      const weights = residuals.map(r => {
        const u = Math.abs(r / scale);
        return u <= k ? 1 : k / u;
      });

      // Weighted regression
      const wSum = weights.reduce((s, w) => s + w, 0);
      const wMeanX = weights.reduce((s, w, i) => s + w * x[i], 0) / wSum;
      const wMeanY = weights.reduce((s, w, i) => s + w * y[i], 0) / wSum;

      let wSSXX = 0, wSSXY = 0;
      weights.forEach((w, i) => {
        wSSXX += w * (x[i] - wMeanX) ** 2;
        wSSXY += w * (x[i] - wMeanX) * (y[i] - wMeanY);
      });

      const newSlope = wSSXX > 0 ? wSSXY / wSSXX : slope;
      if (Math.abs(newSlope - slope) < 0.01) break;
      slope = newSlope;
      intercept = wMeanY - slope * wMeanX;
    }

    const predicted = x.map(v => intercept + slope * v);
    const r2 = StatUtils.rSquared(y, predicted);

    return {
      value: Math.round(slope * 100) / 100,
      low: Math.round(slope * 0.85 * 100) / 100,
      high: Math.round(slope * 1.15 * 100) / 100,
      confidence: Math.round(Math.min(0.9, Math.max(0.35, r2 + 0.1)) * 100),
      n: x.length,
      method: 'robust_simple',
      label: 'Robust Simple',
      notes: `Huber M-estimation (k=${k}), R² = ${(r2 * 100).toFixed(1)}%`
    };
  },

  /**
   * 12. MODIFIED QUANTILE REGRESSION
   * Estimates the slope at various quantiles (25th, 50th, 75th) to provide
   * a range of adjustments reflecting different market segments.
   */
  modified_quantile(x, y, subjectVal) {
    if (x.length < 4) return { value: null, error: 'Need at least 4 data points' };

    // Quantile regression via iterative weighted approach
    const quantiles = [0.25, 0.50, 0.75];
    const results = {};

    quantiles.forEach(tau => {
      // Initialize with OLS
      const meanX = StatUtils.mean(x);
      const meanY = StatUtils.mean(y);
      let ssXX = 0, ssXY = 0;
      x.forEach((v, i) => { ssXX += (v - meanX) ** 2; ssXY += (v - meanX) * (y[i] - meanY); });
      let slope = ssXX > 0 ? ssXY / ssXX : 0;
      let intercept = meanY - slope * meanX;

      // IRLS for quantile regression
      for (let iter = 0; iter < 50; iter++) {
        const residuals = y.map((v, i) => v - (intercept + slope * x[i]));
        const weights = residuals.map(r => {
          if (Math.abs(r) < 0.001) return 1;
          return r > 0 ? tau / Math.abs(r) : (1 - tau) / Math.abs(r);
        });

        const wSum = weights.reduce((s, w) => s + w, 0);
        const wMeanX = weights.reduce((s, w, i) => s + w * x[i], 0) / wSum;
        const wMeanY = weights.reduce((s, w, i) => s + w * y[i], 0) / wSum;

        let wSSXX = 0, wSSXY = 0;
        weights.forEach((w, i) => {
          wSSXX += w * (x[i] - wMeanX) ** 2;
          wSSXY += w * (x[i] - wMeanX) * (y[i] - wMeanY);
        });

        const newSlope = wSSXX > 0 ? wSSXY / wSSXX : slope;
        if (Math.abs(newSlope - slope) < 0.01) break;
        slope = newSlope;
        intercept = wMeanY - slope * wMeanX;
      }

      results[tau] = { slope, intercept };
    });

    const medSlope = results[0.5].slope;

    return {
      value: Math.round(medSlope * 100) / 100,
      low: Math.round(results[0.25].slope * 100) / 100,
      high: Math.round(results[0.75].slope * 100) / 100,
      confidence: Math.round(Math.min(0.85, 0.4 + x.length * 0.04) * 100),
      n: x.length,
      method: 'modified_quantile',
      label: 'Modified Quantile',
      notes: `Q25=${Util.currency(results[0.25].slope)}/unit, Q50=${Util.currency(results[0.5].slope)}/unit, Q75=${Util.currency(results[0.75].slope)}/unit`
    };
  },

  /**
   * 13. SURVEY / MANUAL ENTRY
   * Allows the appraiser to enter a value directly with supporting notes.
   */
  survey(x, y, subjectVal, extras) {
    const manualValue = extras?.surveyValue || null;
    const surveySource = extras?.surveySource || 'Appraiser judgment';

    if (manualValue === null || manualValue === undefined) {
      return {
        value: null,
        error: 'Enter a survey/manual value in the Selected Adjustment field',
        method: 'survey',
        label: 'Survey / Manual'
      };
    }

    return {
      value: parseFloat(manualValue),
      low: parseFloat(manualValue) * 0.9,
      high: parseFloat(manualValue) * 1.1,
      confidence: 50,
      n: 1,
      method: 'survey',
      label: 'Survey / Manual',
      notes: `Source: ${surveySource}. This is a manually entered value supported by the appraiser's knowledge of the market.`
    };
  },

  /**
   * Special: PEER ADJUSTMENTS
   * Compares results across all methods and produces a consensus range.
   */
  peerConsensus(results) {
    const validResults = results.filter(r => r.value !== null && !r.error);
    if (validResults.length === 0) return null;

    const values = validResults.map(r => r.value);
    const weights = validResults.map(r => (r.confidence || 50) / 100);

    // Weighted mean
    const totalWeight = weights.reduce((s, w) => s + w, 0);
    const weightedMean = values.reduce((s, v, i) => s + v * weights[i], 0) / totalWeight;

    // Consensus range
    const allLows = validResults.map(r => r.low).filter(v => v != null);
    const allHighs = validResults.map(r => r.high).filter(v => v != null);

    return {
      value: Math.round(weightedMean * 100) / 100,
      low: Math.round(StatUtils.percentile(allLows, 25) * 100) / 100,
      high: Math.round(StatUtils.percentile(allHighs, 75) * 100) / 100,
      confidence: Math.round(StatUtils.mean(validResults.map(r => r.confidence || 50))),
      n: validResults.length,
      method: 'peer_consensus',
      label: 'Peer Consensus',
      notes: `Weighted consensus of ${validResults.length} methods (${validResults.map(r => r.label).join(', ')})`
    };
  }
};


// ============================================================================
// ADJUSTMENT GUARDRAILS — Configurable limits per feature type
// ============================================================================

const AdjustmentGuardrails = {
  /** Default guardrail ranges (matches Adjustment Tool v2 GUARDRAILS) */
  defaults: {
    gla:       { typical: [40, 130],   broad: [20, 300],   maxTotal: null,  unit: '$/sf',    label: 'GLA' },
    fullbath:  { typical: [3000, 15000], broad: [1000, 35000], maxTotal: 20000, unit: '$/unit', label: 'Full Bath' },
    halfbath:  { typical: [2000, 8000],  broad: [500, 18000],  maxTotal: 20000, unit: '$/unit', label: 'Half Bath' },
    garage:    { typical: [5000, 15000], broad: [2000, 30000], maxTotal: 20000, unit: '$/space', label: 'Garage' },
    basement:  { typical: [15, 40],    broad: [5, 60],     maxTotal: null,  unit: '$/sf',    label: 'Basement' },
    bedrooms:  { typical: [3000, 12000], broad: [1000, 50000], maxTotal: 20000, unit: '$/unit', label: 'Bedrooms' },
    lotsize:   { typical: [1, 5],      broad: [0.5, 8],    maxTotal: null,  unit: '$/sf (×1k)', label: 'Lot Size' },
    age:       { typical: [300, 1500], broad: [100, 3000],  maxTotal: null,  unit: '$/year',  label: 'Age' }
  },

  /** Get guardrails (user overrides from settings, or defaults) */
  get(featureType) {
    const custom = this._loadCustom();
    return custom[featureType] || this.defaults[featureType] || null;
  },

  /** Get all guardrails */
  getAll() {
    const custom = this._loadCustom();
    return { ...this.defaults, ...custom };
  },

  /** Save custom guardrail override for a feature */
  saveCustom(featureType, guardrail) {
    const custom = this._loadCustom();
    custom[featureType] = { ...this.defaults[featureType], ...guardrail };
    localStorage.setItem('dh_guardrails', JSON.stringify(custom));
  },

  /** Reset a feature type to default */
  resetToDefault(featureType) {
    const custom = this._loadCustom();
    delete custom[featureType];
    localStorage.setItem('dh_guardrails', JSON.stringify(custom));
  },

  /** Check an adjustment value against guardrails. Returns { status, message } */
  check(featureType, value) {
    const g = this.get(featureType);
    if (!g) return { status: 'unknown', message: 'No guardrails defined' };

    const absVal = Math.abs(value);

    if (absVal < g.broad[0] || absVal > g.broad[1]) {
      return { status: 'hard_fail', message: `${g.label} adjustment $${absVal.toFixed(2)} ${g.unit} exceeds hard limit [${g.broad[0]} – ${g.broad[1]}]`, severity: 'error' };
    }
    if (absVal < g.typical[0] || absVal > g.typical[1]) {
      return { status: 'soft_warning', message: `${g.label} adjustment $${absVal.toFixed(2)} ${g.unit} outside typical range [${g.typical[0]} – ${g.typical[1]}]`, severity: 'warning' };
    }
    if (g.maxTotal !== null && absVal > g.maxTotal) {
      return { status: 'max_exceeded', message: `${g.label} total adjustment exceeds $${g.maxTotal.toLocaleString()} maximum`, severity: 'warning' };
    }
    return { status: 'pass', message: `Within typical range`, severity: 'success' };
  },

  _loadCustom() {
    try {
      return JSON.parse(localStorage.getItem('dh_guardrails')) || {};
    } catch (e) {
      return {};
    }
  }
};


// ============================================================================
// COMPARABILITY SCORE — Auto-rank comps by similarity to subject
// ============================================================================

const ComparabilityScore = {
  /**
   * Score a comp against the subject property.
   * @param {Object} subject - { gla, year_built, bedrooms, full_baths, lot_sqft, close_date, zip, subdivision }
   * @param {Object} comp - same fields as subject, plus close_price
   * @returns {{ total: number, breakdown: Object }} score 0-100
   */
  score(subject, comp) {
    const breakdown = {};
    let totalWeight = 0;
    let weightedScore = 0;

    // GLA difference (weight: 25%)
    if (subject.gla && comp.gla) {
      const pctDiff = Math.abs(comp.gla - subject.gla) / subject.gla;
      const score = pctDiff <= 0.10 ? 100 : pctDiff <= 0.20 ? 80 : pctDiff <= 0.30 ? 60 : pctDiff <= 0.40 ? 40 : 20;
      breakdown.gla = { score, diff: Math.round(comp.gla - subject.gla), pctDiff: Math.round(pctDiff * 100) };
      weightedScore += score * 0.25;
      totalWeight += 0.25;
    }

    // Age difference (weight: 15%)
    if (subject.year_built && comp.year_built) {
      const ageDiff = Math.abs(comp.year_built - subject.year_built);
      const score = ageDiff <= 3 ? 100 : ageDiff <= 5 ? 85 : ageDiff <= 10 ? 65 : ageDiff <= 15 ? 45 : 20;
      breakdown.age = { score, diff: comp.year_built - subject.year_built };
      weightedScore += score * 0.15;
      totalWeight += 0.15;
    }

    // Sale date proximity (weight: 20%)
    if (comp.close_date) {
      const saleDate = new Date(comp.close_date);
      const now = new Date();
      const monthsAgo = (now - saleDate) / (1000 * 60 * 60 * 24 * 30.44);
      const score = monthsAgo <= 3 ? 100 : monthsAgo <= 6 ? 80 : monthsAgo <= 9 ? 60 : monthsAgo <= 12 ? 40 : 20;
      breakdown.recency = { score, monthsAgo: Math.round(monthsAgo * 10) / 10 };
      weightedScore += score * 0.20;
      totalWeight += 0.20;
    }

    // Location proximity (weight: 20%)
    if (subject.subdivision && comp.subdivision) {
      const sameSub = subject.subdivision.toLowerCase().trim() === comp.subdivision.toLowerCase().trim();
      const sameZip = subject.zip && comp.zip && subject.zip === comp.zip;
      const score = sameSub ? 100 : sameZip ? 70 : 30;
      breakdown.location = { score, sameSubdivision: sameSub, sameZip: sameZip };
      weightedScore += score * 0.20;
      totalWeight += 0.20;
    } else if (subject.zip && comp.zip) {
      const score = subject.zip === comp.zip ? 70 : 30;
      breakdown.location = { score, sameZip: subject.zip === comp.zip };
      weightedScore += score * 0.20;
      totalWeight += 0.20;
    }

    // Feature match: beds, baths, garage (weight: 20%)
    let featureScore = 0;
    let featureCount = 0;
    if (subject.bedrooms && comp.bedrooms) {
      const diff = Math.abs(comp.bedrooms - subject.bedrooms);
      featureScore += diff === 0 ? 100 : diff === 1 ? 75 : diff === 2 ? 40 : 10;
      featureCount++;
    }
    if (subject.full_baths && comp.full_baths) {
      const diff = Math.abs(comp.full_baths - subject.full_baths);
      featureScore += diff === 0 ? 100 : diff === 1 ? 70 : 30;
      featureCount++;
    }
    if (subject.garage_spaces !== undefined && comp.garage_spaces !== undefined) {
      const diff = Math.abs((comp.garage_spaces || 0) - (subject.garage_spaces || 0));
      featureScore += diff === 0 ? 100 : diff === 1 ? 70 : 30;
      featureCount++;
    }
    if (featureCount > 0) {
      const avgFeature = featureScore / featureCount;
      breakdown.features = { score: Math.round(avgFeature), items: featureCount };
      weightedScore += avgFeature * 0.20;
      totalWeight += 0.20;
    }

    // Normalize if not all weights applied
    const total = totalWeight > 0 ? Math.round(weightedScore / totalWeight) : 0;

    return {
      total,
      grade: total >= 85 ? 'A' : total >= 70 ? 'B' : total >= 55 ? 'C' : total >= 40 ? 'D' : 'F',
      breakdown
    };
  },

  /**
   * Rank an array of comps by similarity to subject. Returns sorted array with scores.
   * @param {Object} subject
   * @param {Array} comps
   * @param {number} [topN] - return only top N (optional)
   */
  rank(subject, comps, topN) {
    const scored = comps.map(comp => ({
      ...comp,
      _comparability: this.score(subject, comp)
    }));

    scored.sort((a, b) => b._comparability.total - a._comparability.total);

    return topN ? scored.slice(0, topN) : scored;
  },

  /**
   * Auto-recommend the best comps (score >= 60, max 6)
   */
  recommend(subject, comps) {
    const ranked = this.rank(subject, comps);
    return ranked.filter(c => c._comparability.total >= 60).slice(0, 6);
  }
};
