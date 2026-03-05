/**
 * Payment Transparency Engine
 * Calculates expected fees, classifies discrepancies, and detects anomalies.
 */

/**
 * Severity levels for anomaly detection
 */
export const SEVERITY = {
    INFO: 'info',
    WARNING: 'warning',
    CRITICAL: 'critical',
};

const SEVERITY_META = {
    [SEVERITY.INFO]: { label: 'Info', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
    [SEVERITY.WARNING]: { label: 'Warning', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
    [SEVERITY.CRITICAL]: { label: 'Critical', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
};

export const getSeverityMeta = (severity) => SEVERITY_META[severity] || SEVERITY_META[SEVERITY.INFO];

/**
 * Processes a single transaction to determine its tax/fee health
 */
export const processSingleTransaction = (event, merchantPricing) => {
    const { mdrPercentage, gstPercentage, refundFee } = merchantPricing;
    const isRefund = event.status === 'refund';

    // 1. Calculate Expected Charges
    let expectedMdr = 0;
    let expectedGst = 0;
    let expectedFixed = 0;

    if (isRefund) {
        expectedFixed = refundFee || 0;
    } else {
        expectedMdr = (event.transaction_amount * mdrPercentage) / 100;
        expectedGst = (expectedMdr * gstPercentage) / 100;
    }

    const expectedDeduction = expectedMdr + expectedGst + expectedFixed;

    // 2. Analyze Discrepancy
    const settledAmount = event.settled_amount || 0;
    const actualDeduction = event.transaction_amount - settledAmount;
    const rawDiff = actualDeduction - expectedDeduction;
    const difference = Math.abs(rawDiff) < 0.01 ? 0 : rawDiff; // Rounding tolerance

    // 3. Attribution Logic
    let attribution = 'Correct Settlement';
    let explanation = 'The settlement amount perfectly matches the agreed pricing rules.';
    let confidence = 'High';

    if (difference > 0) {
        if (isRefund) {
            attribution = 'Additional Refund Fee (Anomaly)';
            explanation = `The deduction (₹${actualDeduction.toFixed(2)}) exceeded the expected refund fee (₹${expectedDeduction.toFixed(2)}). Possible causes: extra currency conversion or platform-specific penalty.`;
        } else if (event.payment_method === 'international_card') {
            attribution = 'Currency Conversion / Cross-border Fee';
            explanation = `The extra deduction of ₹${difference.toFixed(2)} is likely a currency conversion fee (1-2%) not explicitly mentioned in the base MDR.`;
        } else if (difference > 100) {
            attribution = 'Unexplained Anomaly';
            explanation = 'A significant unexplained deduction was detected. This requires urgent reconciliation with the gateway support team.';
            confidence = 'Medium';
        } else {
            attribution = 'Service Surcharge';
            explanation = `Minor unexplained deduction of ₹${difference.toFixed(2)}, possibly a platform fee or network surcharge.`;
            confidence = 'High';
        }
    } else if (difference < 0) {
        attribution = 'Promotional Credit / Waiver';
        explanation = 'The deduction was less than expected, indicating a possible fee waiver or promotional credit from the gateway.';
    }

    // 4. Severity Classification
    const absDiff = Math.abs(difference);
    const diffPercent = event.transaction_amount > 0 ? (absDiff / event.transaction_amount) * 100 : 0;
    let severity = SEVERITY.INFO;

    if (absDiff > 100 || diffPercent > 5) {
        severity = SEVERITY.CRITICAL;
    } else if (absDiff > 10 || diffPercent > 1) {
        severity = SEVERITY.WARNING;
    }

    // 5. Anomaly Flags — detect abnormal patterns
    const anomalyFlags = [];

    if (settledAmount < 0) {
        anomalyFlags.push('Negative settlement amount detected');
        severity = SEVERITY.CRITICAL;
    }

    if (!isRefund && expectedMdr > 0) {
        const effectiveMdrRate = (actualDeduction / event.transaction_amount) * 100;
        if (effectiveMdrRate > mdrPercentage * 2.5) {
            anomalyFlags.push(`Unusually high effective rate: ${effectiveMdrRate.toFixed(1)}% (expected ~${mdrPercentage}%)`);
            severity = SEVERITY.CRITICAL;
        }
    }

    if (settledAmount > event.transaction_amount) {
        anomalyFlags.push('Settled amount exceeds transaction amount');
        severity = SEVERITY.CRITICAL;
    }

    if (difference > 0 && !isRefund) {
        anomalyFlags.push(`Overcharged by ₹${absDiff.toFixed(2)}`);
    }

    if (difference < 0) {
        anomalyFlags.push(`Undercharged by ₹${absDiff.toFixed(2)} — possible waiver`);
    }

    return {
        ...event,
        expected_deduction: expectedDeduction,
        actual_deduction: actualDeduction,
        difference,
        attribution,
        explanation,
        confidence,
        severity,
        anomalyFlags,
        breakdown: {
            mdr: expectedMdr,
            gst: expectedGst,
            fixedFees: expectedFixed,
        },
    };
};

/**
 * Original batch processing (legacy/utility)
 */
export const processTransactions = (webhooks, settlements, pricing) => {
    return webhooks.map((event) => {
        // Find matching settlement report for actual_deduction
        const settlement = settlements.find((s) => s.transaction_id === event.transaction_id);
        const settled_amount = settlement ? (settlement.settled_amount ?? settlement.net_settlement) : (event.settlement_amount || event.transaction_amount);

        const enrichedEvent = { ...event, settled_amount };
        return processSingleTransaction(enrichedEvent, pricing);
    });
};
