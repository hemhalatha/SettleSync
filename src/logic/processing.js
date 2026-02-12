/**
 * Payment Transparency Engine
 * Calculates expected fees and classifies discrepancies
 */

/**
 * Processes a single transaction to determine its tax/fee health
 */
export const processSingleTransaction = (event, merchantPricing) => {
    const { mdrPercentage, gstPercentage, refundFee, chargebackFee } = merchantPricing;
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
    const expectedSettlement = event.transaction_amount - expectedDeduction;

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

    return {
        ...event,
        expected_deduction: expectedDeduction,
        actual_deduction: actualDeduction,
        difference,
        attribution,
        explanation,
        confidence,
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
        const settled_amount = settlement ? settlement.net_settlement : event.settlement_amount || event.transaction_amount;

        const enrichedEvent = { ...event, settled_amount };
        return processSingleTransaction(enrichedEvent, pricing);
    });
};
